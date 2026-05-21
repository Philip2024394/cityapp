import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// PATCH /api/admin/gateway/receipts/bulk-decide
// ----------------------------------------------------------------------------
// Bulk-approve / bulk-reject a list of pending receipts. Body:
//   { "ids": ["uuid", "uuid", …], "decision": "approved" | "rejected",
//     "rejection_reason"?: "Same screenshot uploaded twice" }
//
// Iterates one-by-one so a single bad row doesn't block the rest. Returns
// per-id outcome so the admin UI can show what landed and what didn't.
// ============================================================================

export const dynamic = 'force-dynamic'

type Body = { ids?: string[]; decision?: string; rejection_reason?: string }

export const PATCH = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  let body: Body
  try { body = (await req.json()) as Body }
  catch { return fail('Invalid JSON', 400) }

  if (!Array.isArray(body.ids) || body.ids.length === 0) return fail('ids required', 400)
  if (body.decision !== 'approved' && body.decision !== 'rejected') return fail('decision must be approved or rejected', 400)
  const reason = (body.rejection_reason || '').slice(0, 500) || null
  const now = new Date().toISOString()

  const results: Array<{ id: string; ok: boolean; error?: string }> = []
  for (const id of body.ids.slice(0, 200)) {
    const { data: existing } = await admin.from('payment_receipts').select('id, status').eq('id', id).maybeSingle()
    if (!existing) { results.push({ id, ok: false, error: 'not found' }); continue }
    if (existing.status !== 'pending_review') { results.push({ id, ok: false, error: 'not pending' }); continue }

    if (body.decision === 'rejected') {
      const { error: revertErr } = await admin.rpc('revert_receipt_activation', { p_receipt_id: id })
      if (revertErr) { results.push({ id, ok: false, error: revertErr.message }); continue }
    }
    const { error } = await admin.from('payment_receipts').update({
      status: body.decision,
      admin_reviewed_at: now,
      ...(body.decision === 'rejected' ? { rejection_reason: reason } : {}),
    }).eq('id', id)
    results.push({ id, ok: !error, error: error?.message })
  }

  return ok({ results, total: results.length, succeeded: results.filter(r => r.ok).length })
})

export const OPTIONS = withGateway(async () => ok({}))
