import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { sendDriverPush } from '@/lib/notify/fcm'
import { rateLimit } from '@/lib/security/rateLimit'

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
  // Partner Program attribution (optional). If the customer arrived via a
  // hotel/villa QR code or partner link, these fields ride along so we can
  // write a partner_bookings row and credit the partner with 8%.
  partnerSlug?: string
  fareIdr?: number
  pickupName?: string
  dropoffName?: string
  serviceType?: string
}

type DriverRow = {
  user_id: string
  name: string | null
  city: string | null
  business_name: string | null
}

type RecentPing = { pinged_at: string }

// UUID v4-ish guard so random strings can't insert into a uuid column
// and so we can short-circuit fake driverIds without a DB roundtrip.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const driverId = typeof body.driverId === 'string' ? body.driverId.trim() : ''
  if (!driverId) return NextResponse.json({ error: 'driverId required' }, { status: 400 })
  if (!UUID_RE.test(driverId)) {
    return NextResponse.json({ error: 'driverId must be a UUID' }, { status: 400 })
  }

  const source = body.source && ['cari_rider', 'business', 'profile_card'].includes(body.source)
    ? body.source
    : 'other'
  const customerAnonId = typeof body.customerAnonId === 'string'
    ? body.customerAnonId.slice(0, 64)
    : null

  // Per-IP throttle (audit 2026-05). Previous rate limit was keyed on
  // (driverId, customerAnonId) — bypassable by rotating customerAnonId.
  // 20 calls / 60s per IP is enough for a legitimate browsing session
  // but stops a script from blasting push toward arbitrary drivers.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const ipLimit = rateLimit(`contactPing:ip:${ip}`, 20, 60_000)
  if (!ipLimit.ok) {
    return NextResponse.json(
      { ok: true, skipped: 'rate_limited_ip' },
      { headers: { 'Retry-After': String(Math.ceil(ipLimit.resetMs / 1000)) } },
    )
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ ok: true, skipped: 'admin_not_configured' })

  // Verify driver actually exists + is active before firing push, so a
  // random UUID can't blast a notification toward (or pollute the pings
  // table for) someone who isn't a current rider.
  const { data: gateRow } = await admin
    .from('drivers')
    .select('user_id, status')
    .eq('user_id', driverId)
    .maybeSingle()
  if (!gateRow || (gateRow as { status?: string }).status !== 'active') {
    return NextResponse.json({ ok: true, skipped: 'driver_not_active' })
  }

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
    .select('user_id, name, city, business_name, partner_program_status')
    .eq('user_id', driverId)
    .maybeSingle()
  const driver = driverRow as (DriverRow & { partner_program_status?: string }) | null
  const customerArea = source === 'business' ? 'a business buyer' : 'a customer'

  // ──────────────────────────────────────────────────────────────────────
  // Partner Program attribution
  // If the guest arrived via a hotel/villa QR code (partnerSlug set in
  // localStorage by /lib/partners/attribution and posted here by the
  // Contact button), look up the partner, write a partner_bookings row,
  // and enrich the push so the driver sees "FROM HOTEL X · Komisi Rp X".
  // We skip silently on any error — attribution is best-effort and must
  // never block the customer's wa.me handoff.
  // ──────────────────────────────────────────────────────────────────────
  let partnerInfo: { name: string; commission_idr: number } | null = null
  const partnerSlug = typeof body.partnerSlug === 'string'
    ? body.partnerSlug.trim().toLowerCase().slice(0, 64)
    : ''
  const fareIdr = typeof body.fareIdr === 'number' && body.fareIdr > 0
    ? Math.round(body.fareIdr)
    : null

  if (partnerSlug && fareIdr && /^[a-z0-9_-]+$/.test(partnerSlug)) {
    // Eligibility gate — a suspended driver is invisible to partner-QR
    // attribution. They can still be contacted directly; they just don't
    // accrue more partner debt while in the penalty box.
    const eligible = driver?.partner_program_status !== 'suspended'
    if (eligible) {
      const { data: partnerRow } = await admin
        .from('partners')
        .select('id, name, commission_rate, status')
        .eq('slug', partnerSlug)
        .maybeSingle()
      if (partnerRow && partnerRow.status === 'active') {
        const rate = Number(partnerRow.commission_rate) || 0.08
        const commission = Math.round(fareIdr * rate)
        const { error: insErr } = await admin.from('partner_bookings').insert({
          partner_id: partnerRow.id,
          driver_user_id: driverId,
          pickup_name: (body.pickupName || '').slice(0, 200) || null,
          dropoff_name: (body.dropoffName || '').slice(0, 200) || null,
          service_type: (body.serviceType || '').slice(0, 32) || null,
          fare_idr: fareIdr,
          commission_idr: commission,
          rider_anon_id: customerAnonId,
        })
        if (!insErr) {
          partnerInfo = { name: partnerRow.name, commission_idr: commission }
        }
      }
    }
  }

  // Build the push body. Partner-attributed bookings get a louder, more
  // explicit title so the driver knows commission is on the line BEFORE
  // they accept the WhatsApp handover.
  const idr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
  const pushTitle = partnerInfo
    ? `Booking dari ${partnerInfo.name}`
    : 'New booking inquiry'
  const pushBody = partnerInfo
    ? `Komisi mitra ${idr(partnerInfo.commission_idr)} — buka WhatsApp sekarang`
    : `${customerArea} just tapped Contact — check WhatsApp now`

  // Fire-and-forget — don't await. The customer's wa.me handoff on the
  // client side should not wait for FCM delivery.
  void sendDriverPush(driverId, {
    title: pushTitle,
    body: pushBody,
    data: {
      kind: partnerInfo ? 'partner_booking' : 'contact_ping',
      pingId,
      source,
      ...(partnerInfo ? { partnerName: partnerInfo.name, commissionIdr: String(partnerInfo.commission_idr) } : {}),
    },
  }).catch(() => {
    // swallow — telemetry not yet wired
  })

  return NextResponse.json({
    ok: true,
    pingId,
    driver: driver ? { name: driver.name } : null,
    partner: partnerInfo,
  })
}
