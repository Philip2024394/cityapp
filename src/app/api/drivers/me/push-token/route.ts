import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/security/rateLimit'

// ============================================================================
// POST   /api/drivers/me/push-token   — register/refresh a device token
// DELETE /api/drivers/me/push-token   — remove a token (sign-out, revoke)
//
// Called by the Capacitor wrapper after permission grant + FCM token mint
// (also by the PWA Service Worker on subscription change). The token is
// the long opaque string the OS issues — we never derive it ourselves.
//
// Idempotent on (token): re-registering the same token bumps last_seen_at.
// ============================================================================

type RegisterBody = {
  token?: string
  platform?: 'android' | 'ios' | 'web'
  deviceLabel?: string | null
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // Per-user throttle. A legitimate device registers once per app
  // foreground (a few times an hour at most). 10 calls per 5 min window
  // covers reinstall + multi-device + retry while stopping a script
  // from spamming token-string variations.
  const limit = rateLimit(`pt:${user.id}`, 10, 5 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many token-register calls — try again later' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetMs / 1000)) } },
    )
  }

  let body: RegisterBody
  try { body = (await req.json()) as RegisterBody } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const platform = body.platform
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'token required' }, { status: 400 })
  }
  if (platform !== 'android' && platform !== 'ios' && platform !== 'web') {
    return NextResponse.json({ error: 'platform must be android|ios|web' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  const deviceLabel = typeof body.deviceLabel === 'string' ? body.deviceLabel.slice(0, 80) : null

  // Upsert: token is unique, so re-registering from the same device just
  // refreshes last_seen_at + reassigns to the current driver if the
  // device was re-signed-in under a different account.
  const { error } = await admin
    .from('driver_push_tokens')
    .upsert(
      {
        driver_user_id: user.id,
        token,
        platform,
        device_label: deviceLabel,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token query param required' }, { status: 400 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  await admin
    .from('driver_push_tokens')
    .delete()
    .eq('driver_user_id', user.id)
    .eq('token', token)

  return NextResponse.json({ ok: true })
}
