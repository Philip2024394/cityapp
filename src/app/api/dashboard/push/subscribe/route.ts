// ============================================================================
// /api/dashboard/push/subscribe
//   GET  — returns { vapid_public }; client uses it to subscribe.
//   POST — upserts a push_subscriptions row keyed by endpoint.
// ----------------------------------------------------------------------------
// Auth: server-side cookie session. driver_id in body must equal the
// authenticated user's id (defence in depth — RLS already gates reads
// but we use the admin client to write).
// ============================================================================

import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

export async function GET() {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY || ''
  return NextResponse.json({ vapid_public: vapidPublic })
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase()
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  let body: { driver_id?: unknown; endpoint?: unknown; p256dh?: unknown; auth_key?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const driverId = typeof body.driver_id === 'string' ? body.driver_id : ''
  const endpoint = typeof body.endpoint  === 'string' ? body.endpoint  : ''
  const p256dh   = typeof body.p256dh    === 'string' ? body.p256dh    : ''
  const authKey  = typeof body.auth_key  === 'string' ? body.auth_key  : ''
  if (driverId !== user.id) return NextResponse.json({ error: 'driver_id_mismatch' }, { status: 403 })
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const userAgent = req.headers.get('user-agent')?.slice(0, 256) ?? null

  // Upsert by endpoint (the unique index in 0146). If the same device
  // re-subscribes, we refresh user_agent + last_seen_at.
  await admin
    .from('push_subscriptions')
    .upsert(
      {
        driver_id:     driverId,
        endpoint,
        p256dh,
        auth_key:      authKey,
        user_agent:    userAgent,
        last_seen_at:  new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

  return NextResponse.json({ ok: true })
}
