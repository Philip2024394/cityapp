import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'

// ============================================================================
// PATCH /api/admin/subscriptions/[driverId]
// ----------------------------------------------------------------------------
// Admin marks a rider's monthly fee as received. Pushes the subscription
// status to 'active' and bumps current_period_end by 30 days. If the rider
// already has a future period_end, we extend from THAT date so paying
// early doesn't burn the unused tail.
// ============================================================================

const PERIOD_DAYS = 30

type PatchPayload = {
  action: 'mark_paid' | 'cancel'
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

  if (body.action === 'mark_paid') {
    const now = new Date()
    const baseline = before.current_period_end && new Date(before.current_period_end) > now
      ? new Date(before.current_period_end)
      : now
    const nextEnd = new Date(baseline)
    nextEnd.setUTCDate(nextEnd.getUTCDate() + PERIOD_DAYS)
    const update = {
      status: 'active' as const,
      current_period_end: nextEnd.toISOString(),
      payment_reference: body.payment_reference?.trim() || before.payment_reference,
      notes: body.notes?.trim() || before.notes,
    }
    const { error } = await admin.from('subscriptions').update(update).eq('driver_id', driverId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit({
      actorId: me.id, action: 'subscription.mark_paid',
      entityType: 'subscription', entityId: driverId,
      before: { status: before.status, current_period_end: before.current_period_end },
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
