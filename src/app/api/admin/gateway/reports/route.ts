import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/gateway/reports
// ----------------------------------------------------------------------------
// Aggregates the unified admin needs to draw the Reports tab in one round
// trip:
//   - revenue_30d / revenue_90d (sum of paid payment_intents, grouped by product)
//   - mrr_estimate (count of active recurring subs × Rp 38K)
//   - members_total / members_30d / members_90d (auth.users counts)
//   - top_affiliates (top 5 by approved_referral count + Rp earned)
//   - wa_clicks_30d (count + breakdown by app_id, by context)
//   - revenue_by_day (last 30 days, paid_at bucket for chart)
// ============================================================================

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

export const GET = withGateway(async () => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const now = Date.now()
  const day30 = new Date(now - 30 * DAY_MS).toISOString()
  const day90 = new Date(now - 90 * DAY_MS).toISOString()

  // ── Revenue: paid payment_intents in window ────────────────────────
  const [paid30, paid90] = await Promise.all([
    admin.from('payment_intents').select('product, amount_idr, paid_at').eq('status', 'paid').gte('paid_at', day30),
    admin.from('payment_intents').select('product, amount_idr, paid_at').eq('status', 'paid').gte('paid_at', day90),
  ])

  function summarise(rows: Array<{ product: string; amount_idr: number; paid_at: string }>) {
    const byProduct: Record<string, { count: number; idr: number }> = {}
    let total = 0
    for (const r of rows || []) {
      total += r.amount_idr || 0
      const p = byProduct[r.product] ?? { count: 0, idr: 0 }
      p.count += 1
      p.idr += r.amount_idr || 0
      byProduct[r.product] = p
    }
    return { total_idr: total, count: (rows || []).length, by_product: byProduct }
  }

  // ── Revenue by day (last 30 d) ─────────────────────────────────────
  const byDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS).toISOString().slice(0, 10)
    byDay[d] = 0
  }
  for (const r of (paid30.data ?? []) as Array<{ amount_idr: number; paid_at: string }>) {
    const key = (r.paid_at || '').slice(0, 10)
    if (key in byDay) byDay[key] += r.amount_idr || 0
  }
  const revenueByDay = Object.entries(byDay).map(([day, idr]) => ({ day, idr }))

  // ── Members counts ─────────────────────────────────────────────────
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const users = usersData?.users ?? []
  const members_total = users.length
  const members_30d = users.filter((u) => u.created_at >= day30).length
  const members_90d = users.filter((u) => u.created_at >= day90).length

  // ── Active recurring subscriptions for MRR estimate ────────────────
  const [{ data: activeDriverSubs }, { data: activeUserAccounts }] = await Promise.all([
    admin.from('subscriptions').select('driver_id, status, amount_idr').eq('status', 'active'),
    admin.from('user_accounts').select('user_id, account_type, subscription_status, tour_guide_status'),
  ])
  const driverActive = (activeDriverSubs ?? []).length
  const rentalCompanyActive = (activeUserAccounts ?? []).filter((r: { account_type: string; subscription_status: string }) => r.account_type === 'rental_company' && r.subscription_status === 'active').length
  const tourGuideActive = (activeUserAccounts ?? []).filter((r: { tour_guide_status: string }) => r.tour_guide_status === 'active').length
  const mrr_estimate_idr = (driverActive + rentalCompanyActive + tourGuideActive) * 38_000

  // ── Top affiliates by approved referrals + Rp earned ───────────────
  const { data: agents } = await admin.from('affiliate_agents').select('id, name, agent_code, country, status')
  const { data: refs }   = await admin.from('affiliate_referrals').select('agent_id, status, commission_amount')
  const agentTotals: Record<string, { name: string; agent_code: string; country: string; status: string; total: number; approved: number; paid: number; idr_earned: number }> = {}
  for (const a of (agents ?? []) as Array<{ id: string; name: string; agent_code: string; country: string; status: string }>) {
    agentTotals[a.id] = { name: a.name, agent_code: a.agent_code, country: a.country, status: a.status, total: 0, approved: 0, paid: 0, idr_earned: 0 }
  }
  for (const r of (refs ?? []) as Array<{ agent_id: string; status: string; commission_amount: number }>) {
    const t = agentTotals[r.agent_id]
    if (!t) continue
    t.total++
    if (r.status === 'approved' || r.status === 'paid') t.approved++
    if (r.status === 'paid') {
      t.paid++
      t.idr_earned += r.commission_amount || 0
    } else if (r.status === 'approved') {
      t.idr_earned += r.commission_amount || 0
    }
  }
  const top_affiliates = Object.values(agentTotals)
    .sort((a, b) => b.approved - a.approved)
    .slice(0, 10)

  // ── WA click events (last 30 d) — by app, by context ───────────────
  const { data: waClicks } = await admin
    .from('wa_click_events')
    .select('app_id, context, city, country, occurred_at')
    .gte('occurred_at', day30)
    .limit(10_000)
  const wa_by_app: Record<string, number> = {}
  const wa_by_context: Record<string, number> = {}
  const wa_by_city: Record<string, number> = {}
  for (const w of (waClicks ?? []) as Array<{ app_id: string; context: string; city: string | null; country: string | null }>) {
    wa_by_app[w.app_id] = (wa_by_app[w.app_id] || 0) + 1
    wa_by_context[w.context] = (wa_by_context[w.context] || 0) + 1
    if (w.city) {
      const key = w.country ? `${w.city}, ${w.country}` : w.city
      wa_by_city[key] = (wa_by_city[key] || 0) + 1
    }
  }
  const wa_clicks_30d_total = (waClicks ?? []).length

  return ok({
    generated_at: new Date(now).toISOString(),
    revenue_30d: summarise((paid30.data ?? []) as Array<{ product: string; amount_idr: number; paid_at: string }>),
    revenue_90d: summarise((paid90.data ?? []) as Array<{ product: string; amount_idr: number; paid_at: string }>),
    revenue_by_day: revenueByDay,
    mrr_estimate_idr,
    active_subscriptions: {
      driver: driverActive,
      rental_company: rentalCompanyActive,
      tour_guide: tourGuideActive,
      total: driverActive + rentalCompanyActive + tourGuideActive,
    },
    members_total,
    members_30d,
    members_90d,
    top_affiliates,
    wa_clicks_30d: {
      total: wa_clicks_30d_total,
      by_app: wa_by_app,
      by_context: wa_by_context,
      by_city: wa_by_city,
    },
  })
})

export const OPTIONS = withGateway(async () => ok({}))
