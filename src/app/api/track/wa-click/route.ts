import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/track/wa-click
// ----------------------------------------------------------------------------
// Lightweight beacon-friendly endpoint every "Contact via WhatsApp" button
// across the StreetLocal product family POSTs to before opening wa.me.
//
// Body: { app_id, context, target_phone?, referrer?, meta? }
//   app_id   — 'cityrider' | 'donut' | 'food-basic' | 'landing' | 'affiliate'
//   context  — short tag (e.g. 'driver_profile', 'rental_card',
//              'tour_guide_detail', 'vendor_card')
//
// PDP-safe: phone + IP are SHA-256 hashed server-side; user_id is read
// from the auth cookie when present (anonymous otherwise).
//
// CORS: open to ALL origins because this is called cross-domain from
// landing/donut/food-basic. Returns 204 fast so navigator.sendBeacon
// doesn't delay the wa.me open.
// ============================================================================

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '600',
}

type Body = {
  app_id?: string
  context?: string
  target_phone?: string
  referrer?: string
  meta?: Record<string, unknown>
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function ipFromRequest(req: Request): string | null {
  const h = req.headers
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return h.get('x-real-ip')
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(req: Request) {
  // Fire-and-forget by design — always return 204 fast.
  let body: Body
  try { body = (await req.json()) as Body }
  catch {
    return new Response(null, { status: 204, headers: CORS })
  }

  // Validate minimal fields. Bad rows are dropped silently so beacons
  // never break navigation.
  const app_id = (body.app_id || '').toString().trim().slice(0, 32)
  const context = (body.context || '').toString().trim().slice(0, 64)
  if (!app_id || !context) {
    return new Response(null, { status: 204, headers: CORS })
  }

  const admin = getAdminSupabase()
  if (!admin) {
    return new Response(null, { status: 204, headers: CORS })
  }

  const phoneRaw = (body.target_phone || '').toString().replace(/[^\d+]/g, '')
  const phoneHash = phoneRaw ? sha256(phoneRaw) : null
  const ip = ipFromRequest(req)
  const ipHash = ip ? sha256(ip + (process.env.IP_SALT || 'salt-v1')) : null

  // Try to grab user_id from the request cookies (no-op if anon).
  let userId: string | null = null
  try {
    const cookieHeader = req.headers.get('cookie') ?? ''
    // Very cheap parse — only need the supabase auth cookie presence.
    if (cookieHeader.includes('sb-')) {
      // Read user via the server client (only works when cookie is valid).
      const { getServerSupabase } = await import('@/lib/supabase/server')
      const s = await getServerSupabase()
      if (s) {
        const { data: { user } } = await s.auth.getUser()
        userId = user?.id ?? null
      }
    }
  } catch { /* ignore — anon is fine */ }

  // Insert. We swallow errors so the user's nav proceeds regardless —
  // a failed analytics ping must never break the WhatsApp open.
  try {
    await admin.from('wa_click_events').insert({
      app_id,
      context,
      target_phone_hash: phoneHash,
      user_id: userId,
      ip_hash: ipHash,
      country: req.headers.get('x-vercel-ip-country') || null,
      city:    req.headers.get('x-vercel-ip-city') || null,
      referrer: (body.referrer || req.headers.get('referer') || '').toString().slice(0, 500) || null,
      meta: body.meta ?? null,
    })
  } catch { /* swallow */ }

  return new Response(null, { status: 204, headers: CORS })
}
