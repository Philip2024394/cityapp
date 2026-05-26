import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'

// ============================================================================
// POST /api/admin/subscriptions/[id]/approve
// ----------------------------------------------------------------------------
// Admin verifies that a pending QRIS subscription payment screenshot is
// genuine. We only mark the row 'approved' + stamp reviewer/timestamp —
// drivers.paid_until was already bumped on upload (optimistic
// activation), so the listing remains active and no further state
// change is needed.
//
// Idempotent: re-approving an already-approved row is a no-op.
// Rejecting an already-approved row is allowed via the reject endpoint
// (handles edge case where admin mis-clicked Approve).
// ============================================================================

type PaymentRow = {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  period_end: string
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await assertAdminFromCookies()
  if (!me) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing payment id' }, { status: 400 })

  // Load before-state for the audit trail + sanity checks.
  const { data: beforeData, error: beforeErr } = await admin
    .from('subscription_payments')
    .select('id, user_id, status, admin_notes, reviewed_at, reviewed_by, period_end')
    .eq('id', id)
    .maybeSingle()
  if (beforeErr) return NextResponse.json({ error: beforeErr.message }, { status: 500 })
  const before = beforeData as PaymentRow | null
  if (!before) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  const update = {
    status: 'approved' as const,
    reviewed_at: new Date().toISOString(),
    reviewed_by: me.id,
    admin_notes: null, // clear any prior rejection note
  }

  const { error: updateErr } = await admin
    .from('subscription_payments')
    .update(update)
    .eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await writeAudit({
    actorId: me.id,
    action: 'subscription_payment.approve',
    entityType: 'subscription_payment',
    entityId: id,
    before: {
      status: before.status,
      admin_notes: before.admin_notes,
      reviewed_at: before.reviewed_at,
      reviewed_by: before.reviewed_by,
    },
    after: update,
  })

  return NextResponse.json({ ok: true })
}
