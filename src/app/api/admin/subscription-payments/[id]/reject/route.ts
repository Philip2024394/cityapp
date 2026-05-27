import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'

// ============================================================================
// POST /api/admin/subscriptions/[id]/reject
// ----------------------------------------------------------------------------
// Admin marks a QRIS payment screenshot as invalid (wrong amount,
// unreadable, fraudulent, etc.). We:
//   1. Stamp the subscription_payments row as 'rejected' with admin_notes.
//   2. Revert drivers.paid_until to the most recent OTHER approved payment's
//      period_end for the same user, or NULL if none exists. This drops the
//      listing out of the marketplace.
//
// Body: { notes: string }  // min 5 chars per the admin UI validation
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

type DriverRow = { user_id: string; paid_until: string | null }

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await assertAdminFromCookies()
  if (!me) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing payment id' }, { status: 400 })

  // Parse + validate body
  let body: { notes?: string }
  try {
    body = (await req.json()) as { notes?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const notes = (body.notes ?? '').trim()
  if (notes.length < 5) {
    return NextResponse.json(
      { error: 'notes must be at least 5 characters' },
      { status: 400 },
    )
  }

  // 1. Load the target payment
  const { data: beforeData, error: beforeErr } = await admin
    .from('subscription_payments')
    .select('id, user_id, status, admin_notes, reviewed_at, reviewed_by, period_end')
    .eq('id', id)
    .maybeSingle()
  if (beforeErr) return NextResponse.json({ error: beforeErr.message }, { status: 500 })
  const before = beforeData as PaymentRow | null
  if (!before) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  // 2. Find the LATEST other approved payment for this user (to determine
  //    what paid_until should revert to). Exclude the row we're rejecting
  //    in case it was previously approved.
  const { data: prevApprovedData } = await admin
    .from('subscription_payments')
    .select('id, period_end, reviewed_at')
    .eq('user_id', before.user_id)
    .eq('status', 'approved')
    .neq('id', id)
    .order('period_end', { ascending: false })
    .limit(1)
  const prevApproved = (prevApprovedData as { id: string; period_end: string }[] | null) ?? []
  const revertedPaidUntil: string | null = prevApproved[0]?.period_end ?? null

  // 3. Load driver before-state for the audit trail
  const { data: driverBeforeData } = await admin
    .from('drivers')
    .select('user_id, paid_until')
    .eq('user_id', before.user_id)
    .maybeSingle()
  const driverBefore = (driverBeforeData as DriverRow | null) ?? null

  // 4. Update payment row
  const paymentUpdate = {
    status: 'rejected' as const,
    admin_notes: notes,
    reviewed_at: new Date().toISOString(),
    reviewed_by: me.id,
  }
  const { error: updateErr } = await admin
    .from('subscription_payments')
    .update(paymentUpdate)
    .eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 5. Revert drivers.paid_until. Done unconditionally — even if the
  //    current paid_until matches the previous approval, writing it is
  //    a safe no-op. If the driver row doesn't exist (deleted account?)
  //    we silently skip.
  if (driverBefore) {
    const { error: driverErr } = await admin
      .from('drivers')
      .update({ paid_until: revertedPaidUntil })
      .eq('user_id', before.user_id)
    if (driverErr) {
      // Payment is already marked rejected; surface the partial failure so
      // admin can re-fire from /admin/drivers if needed.
      return NextResponse.json(
        {
          ok: true,
          warning: `Payment rejected but failed to revert driver.paid_until: ${driverErr.message}`,
        },
        { status: 207 },
      )
    }
  }

  await writeAudit({
    actorId: me.id,
    action: 'subscription_payment.reject',
    entityType: 'subscription_payment',
    entityId: id,
    before: {
      status: before.status,
      admin_notes: before.admin_notes,
      reviewed_at: before.reviewed_at,
      reviewed_by: before.reviewed_by,
      driver_paid_until: driverBefore?.paid_until ?? null,
    },
    after: {
      ...paymentUpdate,
      driver_paid_until: revertedPaidUntil,
    },
  })

  return NextResponse.json({ ok: true, revertedPaidUntil })
}
