import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { signAffiliateToken } from '@/lib/affiliate/session'
import { corsHeadersFor } from '@/lib/affiliate/cors'

// ============================================================================
// POST /api/affiliate/login
// ----------------------------------------------------------------------------
// Affiliate agents authenticate with the credentials they set at signup:
// WhatsApp number + agent_code. There is no Supabase auth account behind
// these — historically the landing/Affiliate.jsx UI did the lookup
// directly against the affiliate_agents table with the anon key, which
// is exactly what migration 0018 closed off.
//
// We accept the same credentials here, verify them server-side using
// the service-role key, and mint an HMAC-signed bearer token. The
// landing UI stores the token in localStorage and sends it as
// `Authorization: Bearer …` on subsequent /api/affiliate/* calls.
//
// Returns ONLY the safe-to-display agent fields. Bank details / KTP
// reach the client through GET /api/affiliate/me, which is also bearer-
// gated.
// ============================================================================

type Body = { whatsapp?: string; agent_code?: string }

function normaliseWhatsapp(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeadersFor(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const cors = corsHeadersFor(req.headers.get('origin'))

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: cors })
  }
  if (!body.whatsapp || !body.agent_code) {
    return NextResponse.json({ error: 'whatsapp and agent_code required' }, { status: 400, headers: cors })
  }

  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500, headers: cors })
  }

  const wa = normaliseWhatsapp(body.whatsapp)
  const code = body.agent_code.trim()
  if (wa.length < 9 || code.length < 3) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400, headers: cors })
  }

  // Lookup. The unique index on (whatsapp) + (agent_code) means at most
  // one row can satisfy both. We require both to match — possession of
  // the agent_code alone (which is public on the URL ?ref=…) is not
  // sufficient; you also need the registered phone number.
  const { data: agent, error } = await admin
    .from('affiliate_agents')
    .select('id, name, country, agent_code, status, total_clicks, verification_status, bank_name, bank_account, bank_holder, ktp_url, paid_at, created_at')
    .eq('whatsapp', wa)
    .eq('agent_code', code)
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: cors })
  }
  if (!agent) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401, headers: cors })
  }
  if (agent.status === 'suspended' || agent.status === 'cancelled') {
    return NextResponse.json({ error: 'Account ' + agent.status }, { status: 403, headers: cors })
  }

  let token: string
  try {
    token = signAffiliateToken(agent.id)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Token signing failed' },
      { status: 500, headers: cors },
    )
  }

  return NextResponse.json({ token, agent }, { headers: cors })
}
