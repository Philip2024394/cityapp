import { getAdminSupabase } from '@/lib/supabase/admin'
import { corsHeadersFor } from '@/lib/affiliate/cors'
import { rateLimit } from '@/lib/rateLimit/inMemory'
import { verifyTurnstile } from '@/lib/security/turnstile'

// ============================================================================
// POST /api/affiliate/track-share
// ----------------------------------------------------------------------------
// Lightweight beacon-friendly endpoint the StreetLocal landing app
// (Affiliate.jsx → Banner Studio) posts to whenever an agent fires a
// share or copy action from a banner card.
//
// Body: { agent_code, banner_id, platform, referrer? }
//   agent_code — uppercase agent code (e.g. "AB12CD"), [A-Za-z0-9_-]{1,48}
//   banner_id  — opaque id from the landing banner library,
//                [a-z0-9-]{1,32} (e.g. "cr-fb-001")
//   platform   — whatsapp | facebook | twitter | telegram |
//                copy_link | copy_code | copy_text | email | direct | other
//   referrer   — optional URL, max 512 chars, must parse via new URL()
//
// Also called from cityriders.id home-page client effect when a visitor
// lands with BOTH ?ref=... AND ?b=... — platform='direct' for those rows.
//
// Hardening:
//   - Body bytes capped via content-length (≤2KB).
//   - Strict regex on agent_code / banner_id / platform; 400 on miss.
//   - HTML tag chars (< or >) in any string field → 400.
//   - referrer dropped silently if invalid (best-effort context only).
//   - In-process per-IP rate limit (30 / 60s) → 429 with Retry-After.
//   - agent_code upper-cased + platform lower-cased+trimmed before insert
//     (defence-in-depth — never trust the client to send canonical case).
//
// Success returns 204 (no body) so sendBeacon does not delay navigation.
// ============================================================================

export const dynamic = 'force-dynamic'

type Body = {
  agent_code?: unknown
  banner_id?: unknown
  platform?: unknown
  referrer?: unknown
  turnstile_token?: unknown
}

const ALLOWED_PLATFORMS = new Set([
  'whatsapp', 'facebook', 'twitter', 'telegram',
  'copy_link', 'copy_code', 'copy_text', 'email', 'direct', 'other',
])

const AGENT_CODE_RE = /^[A-Za-z0-9_-]{1,48}$/
const BANNER_ID_RE  = /^[a-z0-9-]{1,32}$/
const MAX_BODY_BYTES = 2048
const REFERRER_MAX_LEN = 512
const USER_AGENT_MAX_LEN = 256

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 30

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xri = req.headers.get('x-real-ip')
  if (xri) return xri
  return 'unknown'
}

function hasHtmlChars(s: string): boolean {
  return s.indexOf('<') !== -1 || s.indexOf('>') !== -1
}

function safeUrl(s: string): string | null {
  try {
    const u = new URL(s)
    return u.toString().slice(0, REFERRER_MAX_LEN)
  } catch {
    return null
  }
}

export async function OPTIONS(req: Request) {
  const headers = corsHeadersFor(req.headers.get('origin'))
  return new Response(null, { status: 204, headers })
}

export async function POST(req: Request) {
  const headers = corsHeadersFor(req.headers.get('origin'))

  // Fast pre-check on declared body size — refuse oversized payloads
  // before reading them.
  const declaredLen = req.headers.get('content-length')
  if (declaredLen) {
    const n = Number.parseInt(declaredLen, 10)
    if (Number.isFinite(n) && n > MAX_BODY_BYTES) {
      return new Response(null, { status: 400, headers })
    }
  }

  // Per-IP rate limit before parsing — keeps a flood cheap.
  const ip = clientIp(req)
  const rl = rateLimit(`track-share:${ip}`, { windowMs: RATE_WINDOW_MS, max: RATE_MAX })
  if (!rl.allowed) {
    return new Response(null, {
      status: 429,
      headers: { ...headers, 'Retry-After': String(rl.retryAfterSec) },
    })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return new Response(null, { status: 400, headers })
  }
  if (!body || typeof body !== 'object') {
    return new Response(null, { status: 400, headers })
  }

  const rawAgent    = typeof body.agent_code === 'string' ? body.agent_code.trim() : ''
  const rawBanner   = typeof body.banner_id  === 'string' ? body.banner_id.trim()  : ''
  const rawPlatform = typeof body.platform   === 'string' ? body.platform.trim().toLowerCase() : ''
  const rawReferrer = typeof body.referrer   === 'string' ? body.referrer          : ''

  // HTML-tag-character spam check — reject anything that looks like
  // injection in any string field, including the optional referrer.
  if (
    hasHtmlChars(rawAgent) ||
    hasHtmlChars(rawBanner) ||
    hasHtmlChars(rawPlatform) ||
    hasHtmlChars(rawReferrer)
  ) {
    return new Response(null, { status: 400, headers })
  }

  if (!AGENT_CODE_RE.test(rawAgent)) {
    return new Response(null, { status: 400, headers })
  }
  if (!BANNER_ID_RE.test(rawBanner)) {
    return new Response(null, { status: 400, headers })
  }
  if (!ALLOWED_PLATFORMS.has(rawPlatform)) {
    return new Response(null, { status: 400, headers })
  }

  // Referrer is best-effort context — drop silently if invalid / too long.
  let referrer: string | null = null
  if (rawReferrer && rawReferrer.length <= REFERRER_MAX_LEN) {
    referrer = safeUrl(rawReferrer)
  }
  if (!referrer) {
    const headerReferer = req.headers.get('referer') || ''
    if (headerReferer && headerReferer.length <= REFERRER_MAX_LEN) {
      referrer = safeUrl(headerReferer)
    }
  }

  const userAgent = (req.headers.get('user-agent') || '').slice(0, USER_AGENT_MAX_LEN) || null
  const country = req.headers.get('x-vercel-ip-country') || null

  // Defence-in-depth: canonicalise what we store, never trust the wire.
  const agent_code = rawAgent.toUpperCase()
  const banner_id  = rawBanner
  const platform   = rawPlatform

  // Turnstile gate. When TURNSTILE_SECRET_KEY is unset the helper short-
  // circuits to ok:true so local/first-deploy stays open (degraded mode).
  const rawToken = typeof body.turnstile_token === 'string' ? body.turnstile_token : null
  const ts = await verifyTurnstile(rawToken, { remoteIp: ip === 'unknown' ? undefined : ip })
  if (!ts.ok) {
    return new Response(null, { status: 403, headers })
  }

  const admin = getAdminSupabase()
  if (!admin) {
    return new Response(null, { status: 204, headers })
  }

  try {
    await admin.from('affiliate_banner_shares').insert({
      agent_code,
      banner_id,
      platform,
      referrer_url: referrer,
      user_agent: userAgent,
      ip: ip === 'unknown' ? null : ip,
      country_code: country,
    })
  } catch {
    // swallow — never break the caller's share flow
  }

  return new Response(null, { status: 204, headers })
}
