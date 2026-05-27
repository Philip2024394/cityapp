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
  vehicle_type: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  period_end: string
}

type DriverRow = { user_id: string; paid_until: string | null }
type PlaceRow = { id: string; owner_user_id: string; paid_until: string | null }

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

  // 1. Load the target payment (vehicle_type tells us which listing
  //    bucket to revert).
  const { data: beforeData, error: beforeErr } = await admin
    .from('subscription_payments')
    .select('id, user_id, vehicle_type, status, admin_notes, reviewed_at, reviewed_by, period_end')
    .eq('id', id)
    .maybeSingle()
  if (beforeErr) return NextResponse.json({ error: beforeErr.message }, { status: 500 })
  const before = beforeData as PaymentRow | null
  if (!before) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  // 2. Find the LATEST other approved payment of the SAME listing kind
  //    (so a rejected car payment doesn't revert paid_until to a place
  //    payment's period_end). Exclude the row we're rejecting in case
  //    it was previously approved.
  const { data: prevApprovedData } = await admin
    .from('subscription_payments')
    .select('id, period_end, reviewed_at')
    .eq('user_id', before.user_id)
    .eq('vehicle_type', before.vehicle_type)
    .eq('status', 'approved')
    .neq('id', id)
    .order('period_end', { ascending: false })
    .limit(1)
  const prevApproved = (prevApprovedData as { id: string; period_end: string }[] | null) ?? []
  const revertedPaidUntil: string | null = prevApproved[0]?.period_end ?? null

  const isPlace = before.vehicle_type === 'place'

  // 3. Load before-state for the audit trail (different table by kind)
  let driverBefore: DriverRow | null = null
  let placeBefore: PlaceRow | null = null
  if (isPlace) {
    const { data } = await admin
      .from('places')
      .select('id, owner_user_id, paid_until')
      .eq('owner_user_id', before.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    placeBefore = (data as PlaceRow | null) ?? null
  } else {
    const { data } = await admin
      .from('drivers')
      .select('user_id, paid_until')
      .eq('user_id', before.user_id)
      .maybeSingle()
    driverBefore = (data as DriverRow | null) ?? null
  }

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

  // 5. Revert the listing's paid_until. Branches on listing kind.
  //    Silently skip when the corresponding row no longer exists
  //    (deleted account / listing).
  if (isPlace && placeBefore) {
    const { error: placeErr } = await admin
      .from('places')
      .update({ paid_until: revertedPaidUntil })
      .eq('id', placeBefore.id)
    if (placeErr) {
      return NextResponse.json(
        {
          ok: true,
          warning: `Payment rejected but failed to revert places.paid_until: ${placeErr.message}`,
        },
        { status: 207 },
      )
    }
  } else if (!isPlace && driverBefore) {
    const { error: driverErr } = await admin
      .from('drivers')
      .update({ paid_until: revertedPaidUntil })
      .eq('user_id', before.user_id)
    if (driverErr) {
      return NextResponse.json(
        {
          ok: true,
          warning: `Payment rejected but failed to revert drivers.paid_until: ${driverErr.message}`,
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
      listing_kind: isPlace ? 'place' : 'vehicle',
      listing_paid_until: isPlace ? placeBefore?.paid_until ?? null : driverBefore?.paid_until ?? null,
    },
    after: {
      ...paymentUpdate,
      listing_kind: isPlace ? 'place' : 'vehicle',
      listing_paid_until: revertedPaidUntil,
    },
  })

  return NextResponse.json({ ok: true, revertedPaidUntil, listingKind: isPlace ? 'place' : 'vehicle' })
}
