import { createHash } from 'crypto'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/track/share-click
// ----------------------------------------------------------------------------
// Logs one row to profile_share_events (migration 0177) when a visitor
// taps a share target in SocialShareSheet (WhatsApp / Facebook / Copy link
// / QR view / QR download).
//
// Body: { provider_type, provider_id, platform, anon_session_id?, referrer?, meta? }
//
// PDP-safe: IP is SHA-256 hashed with IP_SALT before insert; user_id is
// read from the auth cookie when present (anonymous otherwise).
//
// CORS open + 204 fast so navigator.sendBeacon doesn't delay the share
// intent open. Never throws — share intent must succeed even if logging
// fails.
// ============================================================================

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '600',
}

const ALLOWED_PROVIDER_TYPES = new Set([
  'driver', 'bike_rental', 'tour_guide',
  'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
])

const ALLOWED_PLATFORMS = new Set([
  'whatsapp', 'facebook', 'copy_link', 'qr_view', 'qr_download',
])

type Body = {
  provider_type?: string
  provider_id?: string
  platform?: string
  anon_session_id?: string
  referrer?: string
  meta?: Record<string, unknown>
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function ipFromRequest(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip')
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(req: Request) {
  let body: Body
  try { body = (await req.json()) as Body }
  catch { return new Response(null, { status: 204, headers: CORS }) }

  const providerType = (body.provider_type || '').toString().trim()
  const providerId = (body.provider_id || '').toString().trim()
  const platform = (body.platform || '').toString().trim()

  if (!ALLOWED_PROVIDER_TYPES.has(providerType)) {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (!/^[0-9a-f-]{36}$/i.test(providerId)) {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (!ALLOWED_PLATFORMS.has(platform)) {
    return new Response(null, { status: 204, headers: CORS })
  }

  const admin = getAdminSupabase()
  if (!admin) return new Response(null, { status: 204, headers: CORS })

  const ip = ipFromRequest(req)
  const ipHash = ip ? sha256(ip + (process.env.IP_SALT || 'salt-v1')) : null
  const anon = (body.anon_session_id || '').slice(0, 64) || null

  let userId: string | null = null
  try {
    const cookieHeader = req.headers.get('cookie') ?? ''
    if (cookieHeader.includes('sb-')) {
      const { getServerSupabase } = await import('@/lib/supabase/server')
      const s = await getServerSupabase()
      if (s) {
        const { data: { user } } = await s.auth.getUser()
        userId = user?.id ?? null
      }
    }
  } catch { /* anon is fine */ }

  try {
    await admin.from('profile_share_events').insert({
      provider_type: providerType,
      provider_id: providerId,
      platform,
      ip_hash: ipHash,
      country: req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || null,
      city: req.headers.get('x-vercel-ip-city') || null,
      user_id: userId,
      anon_session_id: anon,
      referrer: (body.referrer || req.headers.get('referer') || '').toString().slice(0, 500) || null,
      meta: body.meta ?? null,
    })
  } catch { /* swallow — share intent must not be blocked */ }

  return new Response(null, { status: 204, headers: CORS })
}
