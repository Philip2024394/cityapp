// Live connection check for vendor-supplied payment credentials. Both
// branches reach out to the provider with the stored secret + report
// success / a sanitised error string back to the dashboard. The route
// never leaks the secret key in any direction — only the upstream HTTP
// status is reflected to the client.

import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { decryptKey } from '@/lib/security/keyVault'

export const runtime = 'nodejs'

type Body = { provider?: 'stripe' | 'midtrans' }

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ ok: false, error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ ok: false, error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = await req.json() } catch { body = {} }
  const target = body.provider === 'midtrans' ? 'midtrans' : 'stripe'

  const { data, error } = await admin
    .from('skincare_providers')
    .select('stripe_secret_key_enc, midtrans_server_key_enc, midtrans_is_production')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 500 })

  if (target === 'stripe') {
    const enc = data.stripe_secret_key_enc as string | null
    if (!enc) return NextResponse.json({ ok: false, error: 'no_key' }, { status: 400 })
    let secret: string
    try { secret = decryptKey(enc) } catch {
      return NextResponse.json({ ok: false, error: 'decrypt_failed' }, { status: 500 })
    }
    try {
      const r = await fetch('https://api.stripe.com/v1/balance', {
        method:  'GET',
        headers: { Authorization: `Bearer ${secret}` },
        // Stripe is global; 10s is plenty for a single balance fetch.
        signal: AbortSignal.timeout(10_000),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({})) as { error?: { message?: string } }
        return NextResponse.json({ ok: false, error: j?.error?.message || `stripe_${r.status}` }, { status: 200 })
      }
      return NextResponse.json({ ok: true })
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error).message || 'network_error' }, { status: 200 })
    }
  }

  // target === 'midtrans' — hit /v2/ping which only requires the server
  // key as basic-auth. We don't store any merchant id so we can't probe
  // a specific transaction; ping is the documented health check.
  const enc = data.midtrans_server_key_enc as string | null
  if (!enc) return NextResponse.json({ ok: false, error: 'no_key' }, { status: 400 })
  let serverKey: string
  try { serverKey = decryptKey(enc) } catch {
    return NextResponse.json({ ok: false, error: 'decrypt_failed' }, { status: 500 })
  }
  const isProd = !!data.midtrans_is_production
  const base = isProd ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
  try {
    const r = await fetch(`${base}/v2/ping`, {
      method:  'GET',
      headers: { Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64') },
      signal:  AbortSignal.timeout(10_000),
    })
    // Midtrans ping returns 200 "pong" when the credentials parse;
    // 401 when they don't. Any other status is treated as failure.
    if (r.status === 200) return NextResponse.json({ ok: true })
    if (r.status === 401) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 200 })
    return NextResponse.json({ ok: false, error: `midtrans_${r.status}` }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || 'network_error' }, { status: 200 })
  }
}
