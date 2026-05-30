import { NextResponse } from 'next/server'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

// ============================================================================
// PATCH /api/admin/payouts/[id]
// ----------------------------------------------------------------------------
// Admin actions on a single payout row.
//
// Actions:
//   mark_paid     — payout completed; status='paid', paid_at=now,
//                   provider_txn_id=<bank ref / xendit id>. Also flips
//                   the linked affiliate_referrals to status='paid'.
//   cancel        — refuse the payout; status='cancelled', notes=<reason>.
//                   Unlinks the referrals so they can re-aggregate later.
//   processing    — manual hold mid-flight.
// ============================================================================

type PatchPayload =
  | { action: 'mark_paid';  provider_txn_id?: string; provider?: 'manual'|'xendit'|'iris'; notes?: string }
  | { action: 'cancel';     notes: string }
  | { action: 'processing' }

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
    .from('affiliate_payouts')
    .select('id, status, agent_id, amount_idr, referral_count')
    .eq('id', id)
    .maybeSingle()
  if (beforeErr) return NextResponse.json({ error: beforeErr.message }, { status: 500 })
  if (!before)   return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

  let update: TableUpdate<'affiliate_payouts'> = {}

  switch (body.action) {
    case 'mark_paid':
      update = {
        status: 'paid',
        paid_at: new Date().toISOString(),
        provider: body.provider ?? 'manual',
        provider_txn_id: body.provider_txn_id ?? null,
        notes: body.notes ?? null,
      }
      break
    case 'cancel':
      if (!body.notes?.trim()) {
        return NextResponse.json({ error: 'notes required for cancel' }, { status: 400 })
      }
      update = { status: 'cancelled', notes: body.notes.trim() }
      break
    case 'processing':
      update = { status: 'processing' }
      break
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { error: updErr } = await admin
    .from('affiliate_payouts')
    .update(update)
    .eq('id', id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Cascade onto the linked affiliate_referrals rows
  if (body.action === 'mark_paid') {
    await admin
      .from('affiliate_referrals')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('payout_id', id)
  } else if (body.action === 'cancel') {
    // Unlink so the next aggregation run picks them up
    await admin
      .from('affiliate_referrals')
      .update({ payout_id: null })
      .eq('payout_id', id)
  }

  await writeAudit({
    actorId: me.id,
    action: `payout.${body.action}`,
    entityType: 'payout',
    entityId: id,
    before: { status: before.status, agent_id: before.agent_id, amount_idr: before.amount_idr },
    after: update,
  })

  return NextResponse.json({ ok: true, ...update })
}
