import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/drivers/me/push-ack
// ----------------------------------------------------------------------------
// Driver tapped "Got it — open WhatsApp" on the alert screen. Records the
// ack timestamp so we can compute response time for B2B scoring and
// dashboard analytics.
//
// REQUEST:
//   { pingId: string,
//     via?: 'app_button' | 'app_foreground' | 'wa_opened' }
//
// NOTHING is sent to the customer. The customer never knows the driver
// tapped a button — this is a private platform event. Directory posture
// preserved.
//
// The "stop the loud sound" half is handled client-side by the native
// notification cancel call when the driver taps the alert; this endpoint
// just records that it happened.
// ============================================================================

type Body = {
  pingId?: string
  via?: 'app_button' | 'app_foreground' | 'wa_opened'
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const pingId = typeof body.pingId === 'string' ? body.pingId.trim() : ''
  if (!pingId) return NextResponse.json({ error: 'pingId required' }, { status: 400 })

  const via = body.via && ['app_button', 'app_foreground', 'wa_opened'].includes(body.via)
    ? body.via
    : 'app_button'

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  // Only update if it's THIS driver's ping AND it hasn't already been
  // acknowledged (idempotent — first ack wins for response-time math).
  const { error } = await admin
    .from('driver_contact_pings')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_via: via,
    })
    .eq('id', pingId)
    .eq('driver_user_id', user.id)
    .is('acknowledged_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
