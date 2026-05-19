import { NextResponse } from 'next/server'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/admin/payouts/aggregate
// ----------------------------------------------------------------------------
// Run-able by admin (or by a Vercel cron with the right header). Groups
// approved affiliate_referrals that don't yet have a payout_id into a
// single affiliate_payouts row per agent.
//
// Idempotent: skipping any referral already linked to a payout.
// Returns a summary of payouts created.
//
// Cron caller path: GET /api/admin/payouts/aggregate?secret=$CRON_SECRET
// (handled below for header-less Vercel cron calls).
// ============================================================================

type AggResult = {
  ok: boolean
  created_payouts: number
  total_amount_idr: number
  total_referrals: number
}

async function runAggregation(): Promise<AggResult> {
  const admin = getAdminSupabase()
  if (!admin) throw new Error('Server not configured')

  // Find all referrals approved but not yet in a payout
  const { data: ready, error } = await admin
    .from('affiliate_referrals')
    .select('id, agent_id, commission_amount')
    .eq('status', 'approved')
    .is('payout_id', null)
  if (error) throw new Error(error.message)
  if (!ready || ready.length === 0) {
    return { ok: true, created_payouts: 0, total_amount_idr: 0, total_referrals: 0 }
  }

  // Group by agent
  const byAgent = new Map<string, { ids: string[]; sum: number }>()
  for (const r of ready) {
    const cur = byAgent.get(r.agent_id) ?? { ids: [], sum: 0 }
    cur.ids.push(r.id)
    cur.sum += (r.commission_amount as number) || 0
    byAgent.set(r.agent_id, cur)
  }

  let createdPayouts = 0
  let totalAmount = 0
  let totalReferrals = 0

  for (const [agentId, bucket] of byAgent.entries()) {
    if (bucket.sum <= 0) continue  // never create a Rp 0 payout

    // Snapshot the agent's bank details onto the payout row
    const { data: agent } = await admin
      .from('affiliate_agents')
      .select('bank_name, bank_account, bank_holder')
      .eq('id', agentId)
      .maybeSingle()

    const { data: payout, error: insErr } = await admin
      .from('affiliate_payouts')
      .insert({
        agent_id: agentId,
        amount_idr: bucket.sum,
        referral_count: bucket.ids.length,
        status: 'pending',
        provider: 'manual',
        bank_name: agent?.bank_name ?? null,
        bank_account: agent?.bank_account ?? null,
        bank_holder: agent?.bank_holder ?? null,
      })
      .select('id')
      .single()
    if (insErr || !payout) continue

    // Link all referrals to the new payout
    await admin
      .from('affiliate_referrals')
      .update({ payout_id: payout.id })
      .in('id', bucket.ids)

    createdPayouts++
    totalAmount += bucket.sum
    totalReferrals += bucket.ids.length
  }

  return { ok: true, created_payouts: createdPayouts, total_amount_idr: totalAmount, total_referrals: totalReferrals }
}

export async function POST() {
  const me = await assertAdminFromCookies()
  if (!me) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  try {
    const result = await runAggregation()
    await writeAudit({
      actorId: me.id,
      action: 'payouts.aggregate',
      entityType: 'payout',
      before: null,
      after: result as unknown as Record<string, unknown>,
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Aggregation failed' }, { status: 500 })
  }
}

// GET — used by Vercel cron, which can only do GET requests with no
// auth cookies. Gate it with CRON_SECRET in the env.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const result = await runAggregation()
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Aggregation failed' }, { status: 500 })
  }
}
