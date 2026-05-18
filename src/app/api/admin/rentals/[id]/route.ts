import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'

// ============================================================================
// PATCH /api/admin/rentals/[id]
// ----------------------------------------------------------------------------
// Moderation actions on a bike_rentals row. Mirrors /api/admin/places/[id]:
// assert admin → load before → mutate via service role → audit.
//
// Actions:
//   approve         → status='approved', verified=true
//   reject          → status='rejected', rejection_note=<required>
//   mark_paid       → paid_until=now()+1y, listing_tier='paid'
//   suspend         → status='suspended'
//   reactivate      → status='approved' (from suspended)
// ============================================================================

type PatchPayload =
  | { action: 'approve' }
  | { action: 'reject';     rejection_note: string }
  | { action: 'mark_paid';  payment_reference?: string }
  | { action: 'suspend' }
  | { action: 'reactivate' }

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await assertAdminFromCookies()
  if (!me) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { id } = await ctx.params

  let body: PatchPayload
  try { body = (await req.json()) as PatchPayload }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { data: before, error: beforeErr } = await admin
    .from('bike_rentals')
    .select('id, status, verified, listing_tier, paid_until, rejection_note, brand, model')
    .eq('id', id)
    .maybeSingle()
  if (beforeErr) return NextResponse.json({ error: beforeErr.message }, { status: 500 })
  if (!before)   return NextResponse.json({ error: 'Rental not found' }, { status: 404 })

  let update: Record<string, unknown> = {}

  switch (body.action) {
    case 'approve':
      update = { status: 'approved', verified: true, rejection_note: null }
      break
    case 'reject':
      if (!body.rejection_note?.trim()) {
        return NextResponse.json({ error: 'rejection_note required' }, { status: 400 })
      }
      update = { status: 'rejected', rejection_note: body.rejection_note.trim() }
      break
    case 'mark_paid': {
      const oneYearFromNow = new Date()
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
      update = { paid_until: oneYearFromNow.toISOString().slice(0, 10), listing_tier: 'paid' }
      break
    }
    case 'suspend':
      update = { status: 'suspended' }
      break
    case 'reactivate':
      update = { status: 'approved' }
      break
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { error: updateErr } = await admin.from('bike_rentals').update(update).eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await writeAudit({
    actorId: me.id,
    action: `rental.${body.action}`,
    entityType: 'rental',
    entityId: id,
    before: {
      status: before.status,
      verified: before.verified,
      listing_tier: before.listing_tier,
      paid_until: before.paid_until,
      rejection_note: before.rejection_note,
    },
    after: {
      ...update,
      payment_reference: 'payment_reference' in body ? body.payment_reference ?? null : undefined,
    },
  })

  return NextResponse.json({ ok: true, ...update })
}
