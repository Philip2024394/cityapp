import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'

// ============================================================================
// PATCH /api/admin/places/[id]
// ----------------------------------------------------------------------------
// Moderation actions on a places row. Mirrors /api/admin/drivers/[id] in
// shape: assert admin → load before → mutate via service role → audit.
//
// Actions:
//   approve              → status='approved', verified=true, paid_until=today+60d (2-month trial)
//   reject               → status='rejected', rejection_note=<required>
//   mark_paid            → paid_until += 30 days, listing_tier='paid' (Rp 38K/month)
//   mark_paid_yearly     → paid_until += 365 days, listing_tier='paid' (Rp 350K/year)
//   suspend              → status='suspended'
//   reactivate           → status='approved' (from suspended)
// ============================================================================

type PatchPayload =
  | { action: 'approve' }
  | { action: 'reject';            rejection_note: string }
  | { action: 'mark_paid';         payment_reference?: string }
  | { action: 'mark_paid_yearly';  payment_reference?: string }
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
    .from('places')
    .select('id, status, verified, listing_tier, paid_until, rejection_note, name')
    .eq('id', id)
    .maybeSingle()
  if (beforeErr) return NextResponse.json({ error: beforeErr.message }, { status: 500 })
  if (!before)   return NextResponse.json({ error: 'Place not found' }, { status: 404 })

  let update: Record<string, unknown> = {}

  switch (body.action) {
    case 'approve': {
      // Auto-grants a 7-day free trial: paid_until = today + 7 days,
      // listing_tier stays 'free' so renewal flow still applies.
      // Trial shortened from 60 → 7 days because the public driver
      // page is now demoable — drivers can see the product before
      // signing up, so we no longer need to pay them in time.
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 7)
      update = {
        status: 'approved',
        verified: true,
        rejection_note: null,
        paid_until: trialEnd.toISOString().slice(0, 10),
      }
      break
    }
    case 'reject':
      if (!body.rejection_note?.trim()) {
        return NextResponse.json({ error: 'rejection_note required' }, { status: 400 })
      }
      update = { status: 'rejected', rejection_note: body.rejection_note.trim() }
      break
    case 'mark_paid': {
      // Extends paid_until by 30 days; if existing paid_until is in the
      // past, starts from today. Monthly billing model (Rp 38K/month).
      const basis = before.paid_until ? new Date(before.paid_until) : new Date()
      if (basis.getTime() < Date.now()) basis.setTime(Date.now())
      basis.setDate(basis.getDate() + 30)
      update = {
        paid_until: basis.toISOString().slice(0, 10),
        listing_tier: 'paid',
      }
      break
    }
    case 'mark_paid_yearly': {
      // Yearly billing model (Rp 350K/year). Same extension rule as monthly
      // but +365 days.
      const basis = before.paid_until ? new Date(before.paid_until) : new Date()
      if (basis.getTime() < Date.now()) basis.setTime(Date.now())
      basis.setDate(basis.getDate() + 365)
      update = {
        paid_until: basis.toISOString().slice(0, 10),
        listing_tier: 'paid',
      }
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

  const { error: updateErr } = await admin.from('places').update(update).eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await writeAudit({
    actorId: me.id,
    action: `place.${body.action}`,
    entityType: 'place',
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
