import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { signAffiliateToken } from '@/lib/affiliate/session'
import { corsHeadersFor } from '@/lib/affiliate/cors'
import { rateLimit } from '@/lib/rateLimit/inMemory'
import { verifyTurnstile } from '@/lib/security/turnstile'

// ============================================================================
// POST /api/affiliate/signup
// ----------------------------------------------------------------------------
// Public signup for the StreetLocal Agent Programme. Previously the landing
// SPA inserted directly into `affiliate_agents` with the anon key — that's a
// spam magnet. This route moves the insert server-side behind a Cloudflare
// Turnstile token + per-IP rate limit, then mints a bearer token so the SPA
// can hit the existing /api/affiliate/me PATCH route for payment proof + bank.
//
// Body: { name, country, whatsapp, agent_code, turnstile_token? }
//   name          — non-empty trimmed string ≤ 80 chars
//   country       — ISO 3166-1 alpha-2 (2 chars)
//   whatsapp      — digits only, 9-20 chars (server normalises)
//   agent_code    — [A-Za-z0-9_-]{3,48}, lowercased before insert
//   turnstile_token — Cloudflare Turnstile widget token (optional locally;
//                     when TURNSTILE_SECRET_KEY is set, required)
//
// Returns { token, agent } on success, 4xx on validation / duplicate / captcha
// failure. Mirrors the login route's success contract so the client can re-use
// crSetToken() without branching.
// ============================================================================

type Body = {
  name?: unknown
  country?: unknown
  whatsapp?: unknown
  agent_code?: unknown
  turnstile_token?: unknown
}

const AGENT_CODE_RE = /^[A-Za-z0-9_-]{3,48}$/
const COUNTRY_RE = /^[A-Z]{2}$/
const NAME_MAX = 80
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 5

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

function normaliseWhatsapp(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeadersFor(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const cors = corsHeadersFor(req.headers.get('origin'))

  const ip = clientIp(req)
  const rl = rateLimit(`affiliate-signup:${ip}`, { windowMs: RATE_WINDOW_MS, max: RATE_MAX })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many signup attempts, please wait' },
      { status: 429, headers: { ...cors, 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: cors })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: cors })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const country = typeof body.country === 'string' ? body.country.trim().toUpperCase() : ''
  const waRaw = typeof body.whatsapp === 'string' ? body.whatsapp : ''
  const codeRaw = typeof body.agent_code === 'string' ? body.agent_code.trim() : ''

  if (!name || name.length > NAME_MAX) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400, headers: cors })
  }
  if (!COUNTRY_RE.test(country)) {
    return NextResponse.json({ error: 'Invalid country' }, { status: 400, headers: cors })
  }
  const whatsapp = normaliseWhatsapp(waRaw)
  if (whatsapp.length < 9 || whatsapp.length > 20) {
    return NextResponse.json({ error: 'Invalid WhatsApp number' }, { status: 400, headers: cors })
  }
  if (!AGENT_CODE_RE.test(codeRaw)) {
    return NextResponse.json({ error: 'Invalid agent code' }, { status: 400, headers: cors })
  }

  // Turnstile gate (skipped when secret unset — see verifyTurnstile docs).
  const rawToken = typeof body.turnstile_token === 'string' ? body.turnstile_token : null
  const ts = await verifyTurnstile(rawToken, { remoteIp: ip === 'unknown' ? undefined : ip })
  if (!ts.ok) {
    return NextResponse.json({ error: 'Captcha verification failed' }, { status: 403, headers: cors })
  }

  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500, headers: cors })
  }

  // Duplicate WhatsApp check — friendlier than swallowing the unique-index
  // constraint error from Postgres.
  const { data: existingWa } = await admin
    .from('affiliate_agents')
    .select('id')
    .eq('whatsapp', whatsapp)
    .maybeSingle()
  if (existingWa) {
    return NextResponse.json({ error: 'This WhatsApp number is already registered' }, { status: 409, headers: cors })
  }

  // Agent-code collision: append two digits and retry once. Same shape as
  // the old client-side flow so the UX matches.
  let agentCode = codeRaw
  const { data: codeExists } = await admin
    .from('affiliate_agents')
    .select('id')
    .eq('agent_code', agentCode)
    .maybeSingle()
  if (codeExists) {
    agentCode = `${codeRaw}${Math.floor(10 + Math.random() * 90)}`
  }

  const { data, error } = await admin
    .from('affiliate_agents')
    .insert({ name, country, whatsapp, agent_code: agentCode })
    .select('id, name, country, agent_code, status, total_clicks, verification_status, created_at')
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: cors })
  }

  let token: string
  try {
    token = signAffiliateToken(data.id)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Token signing failed' },
      { status: 500, headers: cors },
    )
  }

  return NextResponse.json({ token, agent: data }, { headers: cors })
}
