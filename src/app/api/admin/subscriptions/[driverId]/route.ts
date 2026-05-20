import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'

// ============================================================================
// PATCH /api/admin/subscriptions/[driverId]
// ----------------------------------------------------------------------------
// Admin marks a rider's fee as received. Pushes the subscription
// status to 'active' and bumps current_period_end. If the rider
// already has a future period_end, we extend from THAT date so paying
// early doesn't burn the unused tail.
//
// Actions:
//   mark_paid          → +30 days   (Rp 38.000/month)
//   mark_paid_yearly   → +365 days  (Rp 350.000/year)
//   cancel             → status='canceled'
// ============================================================================

const MONTHLY_DAYS = 30
const YEARLY_DAYS = 365
const MONTHLY_AMOUNT_IDR = 38000
const YEARLY_AMOUNT_IDR = 350000

type PatchPayload = {
  action: 'mark_paid' | 'mark_paid_yearly' | 'cancel'
  payment_reference?: string
  notes?: string
}

export async function PATCH(req: Request, ctx: { params: Promise<{ driverId: string }> }) {
  const me = await assertAdminFromCookies()
  if (!me) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { driverId } = await ctx.params
  let body: PatchPayload
  try { body = (await req.json()) as PatchPayload }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { data: before } = await admin.from('subscriptions').select('*').eq('driver_id', driverId).maybeSingle()
  // A subscription row should always exist for a registered driver (seeded by
  // the on_driver_created trigger). If not, treat as 404 — admin can't pay
  // for a rider who hasn't onboarded.
  if (!before) return NextResponse.json({ error: 'Subscription row not found' }, { status: 404 })

  if (body.action === 'mark_paid' || body.action === 'mark_paid_yearly') {
    const isYearly = body.action === 'mark_paid_yearly'
    const days = isYearly ? YEARLY_DAYS : MONTHLY_DAYS
    const amount = isYearly ? YEARLY_AMOUNT_IDR : MONTHLY_AMOUNT_IDR

    const now = new Date()
    const baseline = before.current_period_end && new Date(before.current_period_end) > now
      ? new Date(before.current_period_end)
      : now
    const nextEnd = new Date(baseline)
    nextEnd.setUTCDate(nextEnd.getUTCDate() + days)
    const update = {
      status: 'active' as const,
      current_period_end: nextEnd.toISOString(),
      amount_idr: amount,
      payment_reference: body.payment_reference?.trim() || before.payment_reference,
      notes: body.notes?.trim() || before.notes,
    }
    const { error } = await admin.from('subscriptions').update(update).eq('driver_id', driverId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit({
      actorId: me.id, action: `subscription.${body.action}`,
      entityType: 'subscription', entityId: driverId,
      before: { status: before.status, current_period_end: before.current_period_end, amount_idr: before.amount_idr },
      after: update,
    })
    return NextResponse.json({ ok: true, current_period_end: update.current_period_end })
  }

  if (body.action === 'cancel') {
    const { error } = await admin.from('subscriptions')
      .update({ status: 'canceled' })
      .eq('driver_id', driverId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit({
      actorId: me.id, action: 'subscription.cancel',
      entityType: 'subscription', entityId: driverId,
      before: { status: before.status },
      after: { status: 'canceled' },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
