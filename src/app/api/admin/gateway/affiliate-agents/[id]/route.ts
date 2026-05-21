import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// PATCH /api/admin/gateway/affiliate-agents/[id]
// ----------------------------------------------------------------------------
// Admin (via landing/Admin.jsx through the gateway) updates an agent's
// status, verification, or bank details. Whitelist of writable fields so a
// rogue caller can't flip e.g. agent_code or total_clicks.
//
// Body example:
//   { "status": "active" }
//   { "verification_status": "verified" }
//   { "bank_name": "BCA", "bank_account": "1234567890", "bank_holder": "Budi" }
// ============================================================================

export const dynamic = 'force-dynamic'

const EDITABLE = [
  'status',
  'verification_status',
  'bank_name',
  'bank_account',
  'bank_holder',
  'payment_proof',
  'paid_at',
  'ktp_url',
] as const
type Field = (typeof EDITABLE)[number]

const ALLOWED_STATUS = new Set([
  'pending_payment', 'pending_verification', 'active', 'suspended', 'cancelled',
])
const ALLOWED_VERIFICATION = new Set(['none', 'submitted', 'verified', 'rejected'])

export const PATCH = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  const id = url.pathname.split('/').pop() ?? ''
  if (!id) return fail('Missing id', 400)

  let body: Record<string, unknown>
  try { body = (await req.json()) as Record<string, unknown> }
  catch { return fail('Invalid JSON', 400) }

  const patch: Partial<Record<Field, unknown>> = {}
  for (const key of EDITABLE) {
    if (key in body) patch[key] = body[key]
  }
  if (Object.keys(patch).length === 0) return fail('No editable fields supplied', 400)

  if (typeof patch.status === 'string' && !ALLOWED_STATUS.has(patch.status)) {
    return fail(`Invalid status (must be one of: ${[...ALLOWED_STATUS].join(', ')})`, 400)
  }
  if (typeof patch.verification_status === 'string' && !ALLOWED_VERIFICATION.has(patch.verification_status)) {
    return fail('Invalid verification_status', 400)
  }

  const { data, error } = await admin
    .from('affiliate_agents')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) return fail(error.message, 500)
  if (!data)  return fail('Agent not found', 404)

  return ok({ agent: data })
})

export const OPTIONS = withGateway(async () => ok({}))
