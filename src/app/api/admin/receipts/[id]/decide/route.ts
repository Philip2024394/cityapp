import { NextResponse } from 'next/server'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// PATCH /api/admin/receipts/:id/decide
// ----------------------------------------------------------------------------
// Body: { decision: 'approved' | 'rejected', rejection_reason?: string }
//
//   - 'approved'  → flips status='approved'. No-op for entitlement: the
//     activate_on_receipt_insert trigger already granted access at upload
//     time. We just record the audit decision.
//   - 'rejected'  → calls public.revert_receipt_activation(p_receipt_id)
//     which cancels the payment_intent and rolls back the entitlement
//     (drivers → past_due, rental_company → expired + listings paused,
//     tour_guide → expired + listings paused).
//
// In both cases admin_reviewed_at + admin_reviewed_by are stamped.
// ============================================================================

export const dynamic = 'force-dynamic'

type Decision = { decision: 'approved' | 'rejected'; rejection_reason?: string }

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await assertAdminFromCookies()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing receipt id' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as Partial<Decision>
  if (body.decision !== 'approved' && body.decision !== 'rejected') {
    return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('payment_receipts')
    .select('id, status, user_id, product, amount_idr')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  if (existing.status !== 'pending_review') {
    return NextResponse.json({ error: `Receipt already ${existing.status}` }, { status: 409 })
  }

  // ── Reject: revert the entitlement BEFORE flipping the status so a
  //   second admin clicking concurrently doesn't double-revert.
  if (body.decision === 'rejected') {
    const reason = (body.rejection_reason ?? '').toString().slice(0, 500) || null
    const { error: revertErr } = await admin.rpc('revert_receipt_activation', { p_receipt_id: id })
    if (revertErr) return NextResponse.json({ error: revertErr.message }, { status: 500 })

    const { error: updateErr } = await admin
      .from('payment_receipts')
      .update({
        status: 'rejected',
        admin_reviewed_at: new Date().toISOString(),
        admin_reviewed_by: profile.id,
        rejection_reason: reason,
      })
      .eq('id', id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    await writeAudit({
      actorId: profile.id, action: 'receipt_reject',
      entityType: 'payment_receipts', entityId: id,
      after: { product: existing.product, amount_idr: existing.amount_idr, reason },
    })
    return NextResponse.json({ ok: true, decision: 'rejected' })
  }

  // ── Approve: just stamp the row. Entitlement already granted at upload.
  const { error } = await admin
    .from('payment_receipts')
    .update({
      status: 'approved',
      admin_reviewed_at: new Date().toISOString(),
      admin_reviewed_by: profile.id,
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    actorId: profile.id, action: 'receipt_approve',
    entityType: 'payment_receipts', entityId: id,
    after: { product: existing.product, amount_idr: existing.amount_idr },
  })

  return NextResponse.json({ ok: true, decision: 'approved' })
}
