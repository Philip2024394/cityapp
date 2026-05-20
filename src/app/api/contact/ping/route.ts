import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { sendDriverPush } from '@/lib/notify/fcm'

// ============================================================================
// POST /api/contact/ping
// ----------------------------------------------------------------------------
// Fires the moment a customer taps the Contact button on /business or
// /cari/rider — BEFORE wa.me is opened. Records the ping + dispatches a
// HIGH-priority push to every device the driver has registered.
//
// REQUEST (anonymous, no auth):
//   { driverId: string,
//     customerAnonId?: string,        // browser-stored cookie / device id
//     source: 'cari_rider' | 'business' | 'profile_card' }
//
// SIDE EFFECTS:
//   1. INSERT driver_contact_pings row → returns pingId
//   2. sendDriverPush(driverId, ...) — fire-and-forget; never blocks reply
//   3. RESPOND with pingId so client can wire the optional ack callback
//
// RATE LIMIT:
//   Same (driverId, customerAnonId) → max 1 ping per 10 minutes. Prevents
//   accidental double-tap floods. NO error on duplicate — silently
//   returns ok=true with skipped=true so the customer's WhatsApp launch
//   never blocks waiting for our push.
//
// LEGAL POSTURE (PM 12/2019):
//   We notify our OWN user (the driver) about activity ON OUR OWN page
//   (the Contact tap). Customer is unaware of the ack mechanism — we
//   never confirm anything to them. Directory posture preserved.
// ============================================================================

type Body = {
  driverId?: string
  customerAnonId?: string
  source?: 'cari_rider' | 'business' | 'profile_card'
}

type DriverRow = {
  user_id: string
  name: string | null
  city: string | null
  business_name: string | null
}

type RecentPing = { pinged_at: string }

export async function POST(req: Request) {
  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const driverId = typeof body.driverId === 'string' ? body.driverId.trim() : ''
  if (!driverId) return NextResponse.json({ error: 'driverId required' }, { status: 400 })

  const source = body.source && ['cari_rider', 'business', 'profile_card'].includes(body.source)
    ? body.source
    : 'other'
  const customerAnonId = typeof body.customerAnonId === 'string'
    ? body.customerAnonId.slice(0, 64)
    : null

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ ok: true, skipped: 'admin_not_configured' })

  // Rate-limit: same anon+driver within 10 min → no-op (return ok so the
  // wa.me handoff on the client is never blocked).
  if (customerAnonId) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('driver_contact_pings')
      .select('pinged_at')
      .eq('driver_user_id', driverId)
      .eq('customer_anon_id', customerAnonId)
      .gte('pinged_at', tenMinutesAgo)
      .order('pinged_at', { ascending: false })
      .limit(1)
    const rows = (recent ?? []) as unknown as RecentPing[]
    if (rows.length > 0) {
      return NextResponse.json({ ok: true, skipped: 'rate_limited' })
    }
  }

  // Insert the ping row first so the driver's "Got it" callback has a
  // record to ack against.
  const { data: insertResult, error: insertError } = await admin
    .from('driver_contact_pings')
    .insert({
      driver_user_id: driverId,
      customer_anon_id: customerAnonId,
      source_page: source,
    })
    .select('id')
    .single()
  if (insertError) {
    // Don't fail the customer — log and continue.
    return NextResponse.json({ ok: true, skipped: 'insert_failed' })
  }
  const pingId = (insertResult as { id: string }).id

  // Pull driver's display name so the push body is human-readable.
  const { data: driverRow } = await admin
    .from('drivers')
    .select('user_id, name, city, business_name')
    .eq('user_id', driverId)
    .maybeSingle()
  const driver = driverRow as DriverRow | null
  const customerArea = source === 'business' ? 'a business buyer' : 'a customer'

  // Fire-and-forget — don't await. The customer's wa.me handoff on the
  // client side should not wait for FCM delivery.
  void sendDriverPush(driverId, {
    title: 'New booking inquiry',
    body: `${customerArea} just tapped Contact — check WhatsApp now`,
    data: {
      kind: 'contact_ping',
      pingId,
      source,
    },
  }).catch(() => {
    // swallow — telemetry not yet wired
  })

  return NextResponse.json({ ok: true, pingId, driver: driver ? { name: driver.name } : null })
}
