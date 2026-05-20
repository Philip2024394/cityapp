import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/drivers/me/booking-alerts-consent
// ----------------------------------------------------------------------------
// Driver flips the booking-alerts toggle ON/OFF. Body: { enabled: boolean }.
//
// This is the LEGAL CONSENT record (UU PDP) that we have permission to
// send push notifications. The OS-level permission is separate (granted
// in Android settings); both must be true for sendDriverPush() to deliver.
//
// First time enabled, booking_alerts_consented_at is stamped. Disabling
// keeps the timestamp — useful audit trail (driver previously consented
// on date X then revoked on date Y).
// ============================================================================

type Body = { enabled?: boolean }

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  const { data: prior } = await admin
    .from('drivers')
    .select('booking_alerts_consented_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const update: Record<string, unknown> = { booking_alerts_enabled: body.enabled }
  if (
    body.enabled &&
    !(prior as { booking_alerts_consented_at?: string | null } | null)?.booking_alerts_consented_at
  ) {
    update.booking_alerts_consented_at = new Date().toISOString()
  }

  const { error } = await admin
    .from('drivers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, enabled: body.enabled })
}
