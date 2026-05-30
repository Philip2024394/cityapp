import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { verifyAffiliateToken, bearerFromHeader } from '@/lib/affiliate/session'
import { corsHeadersFor } from '@/lib/affiliate/cors'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

// ============================================================================
// GET    /api/affiliate/me
// PATCH  /api/affiliate/me
// ----------------------------------------------------------------------------
// Bearer-gated. Reads/updates the authenticated agent's own row, server-
// side, using the service-role key (which bypasses the admin-only RLS
// installed in migration 0018).
//
// PATCH whitelist — agents can only touch their own profile fields, not
// status/agent_code/verification_status. Sensitive operational fields
// (status, verification_status) move via admin actions in the audit log.
// ============================================================================

const PATCHABLE = new Set([
  'name',
  'country',
  'bank_name',
  'bank_account',
  'bank_holder',
  'ktp_url',
  'payment_proof',
])

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeadersFor(req.headers.get('origin')),
  })
}

async function authedAgentId(req: Request): Promise<{ agentId: string | null; cors: Record<string, string> }> {
  const cors = corsHeadersFor(req.headers.get('origin'))
  const tok = bearerFromHeader(req.headers.get('authorization'))
  const session = verifyAffiliateToken(tok)
  return { agentId: session?.agentId ?? null, cors }
}

export async function GET(req: Request) {
  const { agentId, cors } = await authedAgentId(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500, headers: cors })

  const { data, error } = await admin
    .from('affiliate_agents')
    .select('id, name, country, whatsapp, agent_code, status, total_clicks, verification_status, bank_name, bank_account, bank_holder, ktp_url, payment_proof, paid_at, created_at, updated_at')
    .eq('id', agentId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: cors })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: cors })
  return NextResponse.json({ agent: data }, { headers: cors })
}

export async function PATCH(req: Request) {
  const { agentId, cors } = await authedAgentId(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: cors })
  }

  // Whitelist + light sanitisation. Reject anything outside the allowed
  // set rather than silently ignoring — keeps the API contract clear.
  const update: TableUpdate<'affiliate_agents'> = {}
  for (const k of Object.keys(body)) {
    if (!PATCHABLE.has(k)) {
      return NextResponse.json({ error: `Field not patchable: ${k}` }, { status: 400, headers: cors })
    }
    const v = body[k]
    if (typeof v !== 'string' && v !== null) {
      return NextResponse.json({ error: `Field ${k} must be a string or null` }, { status: 400, headers: cors })
    }
    ;(update as Record<string, unknown>)[k] = typeof v === 'string' ? v.trim() : null
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: cors })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500, headers: cors })

  // Atomic state auto-flips. We read the current row first so we can
  // apply the right transition rules in a single UPDATE — keeps the
  // status machine in sync with the data the agent just submitted.
  // Agents cannot directly set status / verification_status — only the
  // auto-flip logic here can.
  const { data: cur } = await admin
    .from('affiliate_agents')
    .select('status, verification_status, paid_at')
    .eq('id', agentId)
    .maybeSingle()

  if (cur) {
    const submittingPaymentProof = 'payment_proof' in update && update.payment_proof
    if (submittingPaymentProof && cur.status === 'pending_payment') {
      update.status = 'pending_verification'
      if (!cur.paid_at) update.paid_at = new Date().toISOString()
    }
    const submittingBankAndKtp =
      'bank_account' in update && 'bank_holder' in update && 'bank_name' in update &&
      update.bank_account && update.bank_holder && update.bank_name
    if (submittingBankAndKtp && (cur.verification_status === 'none' || cur.verification_status == null)) {
      update.verification_status = 'submitted'
    }
  }

  const { data, error } = await admin
    .from('affiliate_agents')
    .update(update)
    .eq('id', agentId)
    .select('id, name, country, whatsapp, agent_code, status, total_clicks, verification_status, bank_name, bank_account, bank_holder, ktp_url, payment_proof, paid_at, created_at, updated_at')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: cors })
  return NextResponse.json({ agent: data }, { headers: cors })
}
