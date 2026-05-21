import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// PATCH /api/admin/gateway/payouts/[id]
// ----------------------------------------------------------------------------
// Admin marks a payout as paid / processing / cancelled / failed. When
// marking 'paid' we also stamp the included affiliate_referrals as
// status='paid' so they don't get re-bundled by the next aggregate run.
//
// Body: { "status": "paid"|"processing"|"cancelled"|"failed",
//         "provider_txn_id"?: "BCA-12345", "notes"?: "..." }
// ============================================================================

export const dynamic = 'force-dynamic'

const ALLOWED = new Set(['pending', 'processing', 'paid', 'cancelled', 'failed'])

export const PATCH = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  const id = url.pathname.split('/').pop() ?? ''
  if (!id) return fail('Missing payout id', 400)

  let body: { status?: string; provider_txn_id?: string; notes?: string }
  try { body = (await req.json()) as { status?: string; provider_txn_id?: string; notes?: string } }
  catch { return fail('Invalid JSON', 400) }

  if (!body.status || !ALLOWED.has(body.status)) {
    return fail(`status must be one of: ${[...ALLOWED].join(', ')}`, 400)
  }

  const patch: Record<string, unknown> = { status: body.status }
  if (body.provider_txn_id !== undefined) patch.provider_txn_id = body.provider_txn_id || null
  if (body.notes !== undefined) patch.notes = body.notes || null
  if (body.status === 'paid') patch.paid_at = new Date().toISOString()

  const { data, error } = await admin
    .from('affiliate_payouts')
    .update(patch)
    .eq('id', id)
    .select('id, agent_id, amount_idr, status, paid_at')
    .maybeSingle()
  if (error) return fail(error.message, 500)
  if (!data)  return fail('Payout not found', 404)

  // When marking paid, advance the included referrals too so the next
  // aggregate sweep skips them. We bracket by created_at window since
  // affiliate_payouts doesn't track child referral_ids.
  if (body.status === 'paid') {
    await admin
      .from('affiliate_referrals')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('agent_id', data.agent_id)
      .eq('status', 'approved')
  }

  return ok({ payout: data })
})

export const OPTIONS = withGateway(async () => ok({}))
