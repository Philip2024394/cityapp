import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// PATCH /api/admin/gateway/receipts/[id]/decide
// ----------------------------------------------------------------------------
// Cross-app version of /api/admin/receipts/[id]/decide. Body:
//   { "decision": "approved" | "rejected", "rejection_reason"?: string }
//
// Approved   → stamp the row (account already provisionally active).
// Rejected   → call revert_receipt_activation RPC which cancels the
//              payment_intent + rolls back the entitlement (drivers,
//              rental_company, tour_guide).
// ============================================================================

export const dynamic = 'force-dynamic'

export const PATCH = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  // /api/admin/gateway/receipts/<id>/decide → take the segment 2-from-end
  const segs = url.pathname.split('/').filter(Boolean)
  const id = segs[segs.length - 2]
  if (!id) return fail('Missing receipt id', 400)

  let body: { decision?: string; rejection_reason?: string }
  try { body = (await req.json()) as { decision?: string; rejection_reason?: string } }
  catch { return fail('Invalid JSON', 400) }

  if (body.decision !== 'approved' && body.decision !== 'rejected') {
    return fail('decision must be approved or rejected', 400)
  }

  const { data: existing } = await admin
    .from('payment_receipts')
    .select('id, status, user_id, product, amount_idr')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return fail('Receipt not found', 404)
  if (existing.status !== 'pending_review') {
    return fail(`Receipt already ${existing.status}`, 409)
  }

  if (body.decision === 'rejected') {
    const reason = (body.rejection_reason ?? '').toString().slice(0, 500) || null
    const { error: revertErr } = await admin.rpc('revert_receipt_activation', { p_receipt_id: id })
    if (revertErr) return fail(revertErr.message, 500)

    const { error: updateErr } = await admin
      .from('payment_receipts')
      .update({
        status: 'rejected',
        admin_reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', id)
    if (updateErr) return fail(updateErr.message, 500)
    return ok({ decision: 'rejected' })
  }

  const { error } = await admin
    .from('payment_receipts')
    .update({
      status: 'approved',
      admin_reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return fail(error.message, 500)

  return ok({ decision: 'approved' })
})

export const OPTIONS = withGateway(async () => ok({}))
