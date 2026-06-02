import { NextResponse } from 'next/server'
import { assertAdminFromCookies } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/analytics
// ----------------------------------------------------------------------------
// Aggregates engagement telemetry for the Admin > Analytics dashboard. Reads
// 30-day windows of:
//   - provider_profile_views  (driver/partner profile impressions)
//   - wa_click_events         (WhatsApp open clicks across the platform)
//   - driver_contact_pings    (in-app contact pings to drivers)
//   - social_share_quota      (driver-side referral shares; monthly counter)
//   - partner_bookings        (live partner program bookings + commission)
//
// All sub-queries fire in parallel via Promise.all. Each is wrapped in a
// safeRows() helper so a single failure renders an empty section rather than
// blowing up the whole page.
//
// Admin-only — guards via assertAdminFromCookies(). 403 for non-admins.
// ============================================================================

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

type DayCount = { day: string; count: number }
type Json = Record<string, unknown> | null

type ProfileViewRow = { provider_id: string; provider_type: string; source: string | null; viewed_at: string; anon_session_id: string | null }
type WaClickRow      = { user_id: string | null; context: string; meta: Json; occurred_at: string }
type ContactPingRow  = { driver_user_id: string; pinged_at: string }
type SocialShareRow  = { driver_user_id: string; count: number; month_yyyy_mm: string }
type DriverRow       = { user_id: string; business_name: string; slug: string; vehicle_type: string; city: string | null }
type PartnerRow      = { id: string; name: string; slug: string }
type PartnerBookingRow = { partner_id: string; commission_idr: number; created_at: string }
type AffiliateReferralRow = { agent_id: string; status: string; created_at: string; paid_at: string | null }
type SubscriptionRow = { driver_id: string; status: string; amount_idr: number }

async function safeRows<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await query
    if (error) return []
    return (data as T[]) ?? []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyDayBuckets(days: number, now: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS).toISOString().slice(0, 10)
    out[d] = 0
  }
  return out
}

function bucketize(rows: Array<{ ts: string }>, days: number, now: number): DayCount[] {
  const buckets = emptyDayBuckets(days, now)
  for (const r of rows) {
    const key = (r.ts || '').slice(0, 10)
    if (key in buckets) buckets[key] += 1
  }
  return Object.entries(buckets).map(([day, count]) => ({ day, count }))
}

function currentYearMonth(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET() {
  const me = await assertAdminFromCookies()
  if (!me) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const now = Date.now()
  const since30 = new Date(now - 30 * DAY_MS).toISOString()
  const since60 = new Date(now - 60 * DAY_MS).toISOString()
  const ym = currentYearMonth(new Date(now))

  // ── Parallel pulls ────────────────────────────────────────────────────
  const [
    views60,
    waClicks60,
    pings60,
    socialShares,
    drivers,
    partners,
    partnerBookings30,
    affiliateReferrals60,
    subscriptions,
  ] = await Promise.all([
    safeRows<ProfileViewRow>(
      admin.from('provider_profile_views')
        .select('provider_id, provider_type, source, viewed_at, anon_session_id')
        .gte('viewed_at', since60)
        .limit(50_000),
    ),
    safeRows<WaClickRow>(
      admin.from('wa_click_events')
        .select('user_id, context, meta, occurred_at')
        .gte('occurred_at', since60)
        .limit(50_000),
    ),
    safeRows<ContactPingRow>(
      admin.from('driver_contact_pings')
        .select('driver_user_id, pinged_at')
        .gte('pinged_at', since60)
        .limit(50_000),
    ),
    safeRows<SocialShareRow>(
      admin.from('social_share_quota')
        .select('driver_user_id, count, month_yyyy_mm')
        .eq('month_yyyy_mm', ym),
    ),
    safeRows<DriverRow>(
      admin.from('drivers').select('user_id, business_name, slug, vehicle_type, city'),
    ),
    safeRows<PartnerRow>(
      admin.from('partners').select('id, name, slug'),
    ),
    safeRows<PartnerBookingRow>(
      admin.from('partner_bookings')
        .select('partner_id, commission_idr, created_at')
        .gte('created_at', since30)
        .limit(50_000),
    ),
    safeRows<AffiliateReferralRow>(
      admin.from('affiliate_referrals')
        .select('agent_id, status, created_at, paid_at')
        .gte('created_at', since60)
        .limit(50_000),
    ),
    safeRows<SubscriptionRow>(
      admin.from('subscriptions').select('driver_id, status, amount_idr'),
    ),
  ])

  // ── Partition into 30d (current) vs 30-60d (previous) windows ─────────
  const cutoff30 = now - 30 * DAY_MS
  const isIn30 = (iso: string) => new Date(iso).getTime() >= cutoff30

  const views30   = views60.filter((v) => isIn30(v.viewed_at))
  const viewsPrev = views60.filter((v) => !isIn30(v.viewed_at))
  const waClicks30   = waClicks60.filter((w) => isIn30(w.occurred_at))
  const waClicksPrev = waClicks60.filter((w) => !isIn30(w.occurred_at))
  const pings30   = pings60.filter((p) => isIn30(p.pinged_at))
  const pingsPrev = pings60.filter((p) => !isIn30(p.pinged_at))

  // ── KPI totals ─────────────────────────────────────────────────────────
  const social30 = socialShares.reduce((sum, r) => sum + (r.count || 0), 0)

  // Unique visitors = COUNT(DISTINCT anon_session_id) ∪ raw views with no
  // session id (each counted once). Rows without anon_session_id can't be
  // deduped but also can't be double-counted within a session — they're
  // each a single unique impression by definition.
  function countUniqueVisitors(rows: ReadonlyArray<ProfileViewRow>): number {
    const seen = new Set<string>()
    let untracked = 0
    for (const r of rows) {
      if (r.anon_session_id) seen.add(r.anon_session_id)
      else untracked += 1
    }
    return seen.size + untracked
  }
  const unique_visitors_30d = countUniqueVisitors(views30)
  const unique_visitors_prev_30d = countUniqueVisitors(viewsPrev)

  // ── Daily series for sparklines ────────────────────────────────────────
  const profile_views_by_day = bucketize(
    views30.map((v) => ({ ts: v.viewed_at })), 30, now,
  )
  const wa_clicks_by_day = bucketize(
    waClicks30.map((w) => ({ ts: w.occurred_at })), 30, now,
  )

  // ── Top drivers by engagement ──────────────────────────────────────────
  const driverMap = new Map<string, DriverRow>()
  for (const d of drivers) driverMap.set(d.user_id, d)

  type DriverAgg = {
    user_id: string
    profile_views_30d: number
    wa_clicks_30d: number
    contact_pings_30d: number
  }
  const driverAgg = new Map<string, DriverAgg>()
  // Per-driver unique-visitor sets — keyed by driver_id, value is the set
  // of anon_session_ids seen for that driver in the 30d window. We count
  // sessions; rows missing anon_session_id are treated as one unique
  // each (can't double-count without a key).
  const driverUniques = new Map<string, { sessions: Set<string>; untracked: number }>()
  const bump = (id: string, field: keyof Omit<DriverAgg, 'user_id'>) => {
    if (!driverMap.has(id)) return // ignore non-driver providers
    const cur = driverAgg.get(id) ?? { user_id: id, profile_views_30d: 0, wa_clicks_30d: 0, contact_pings_30d: 0 }
    cur[field] += 1
    driverAgg.set(id, cur)
  }
  for (const v of views30) {
    if (v.provider_type === 'driver') {
      bump(v.provider_id, 'profile_views_30d')
      if (driverMap.has(v.provider_id)) {
        let uniq = driverUniques.get(v.provider_id)
        if (!uniq) {
          uniq = { sessions: new Set(), untracked: 0 }
          driverUniques.set(v.provider_id, uniq)
        }
        if (v.anon_session_id) uniq.sessions.add(v.anon_session_id)
        else uniq.untracked += 1
      }
    }
  }
  for (const w of waClicks30) {
    // WA click target driver is stashed in meta.driver_id (see RentalCard /
    // TourGuideCard / etc.) — fall back to user_id when it matches a driver.
    const metaDid = w.meta && typeof w.meta === 'object' ? (w.meta as Record<string, unknown>)['driver_id'] : null
    const targetId = typeof metaDid === 'string' ? metaDid : (w.user_id && driverMap.has(w.user_id) ? w.user_id : null)
    if (targetId) bump(targetId, 'wa_clicks_30d')
  }
  for (const p of pings30) bump(p.driver_user_id, 'contact_pings_30d')

  const top_drivers_by_engagement = Array.from(driverAgg.values())
    .map((a) => {
      const d = driverMap.get(a.user_id)!
      const uniq = driverUniques.get(a.user_id)
      const unique_visitors_30d = uniq ? uniq.sessions.size + uniq.untracked : 0
      // CTR = WA clicks ÷ unique visitors (better than raw views — raw is
      // inflated by repeat traffic). Returned as a 0..1 fraction so the UI
      // can format it (%) without re-deriving. NaN-safe: 0 visitors → 0.
      const ctr_30d = unique_visitors_30d > 0
        ? a.wa_clicks_30d / unique_visitors_30d
        : 0
      return {
        user_id: a.user_id,
        business_name: d.business_name,
        slug: d.slug,
        vehicle_type: d.vehicle_type,
        city: d.city,
        profile_views_30d: a.profile_views_30d,
        unique_visitors_30d,
        wa_clicks_30d: a.wa_clicks_30d,
        contact_pings_30d: a.contact_pings_30d,
        ctr_30d,
      }
    })
    .sort((a, b) => {
      const aTotal = a.profile_views_30d + a.wa_clicks_30d * 3 + a.contact_pings_30d * 5
      const bTotal = b.profile_views_30d + b.wa_clicks_30d * 3 + b.contact_pings_30d * 5
      return bTotal - aTotal
    })
    .slice(0, 15)

  // ── Top partners by traffic ────────────────────────────────────────────
  const partnerMap = new Map<string, PartnerRow>()
  for (const p of partners) partnerMap.set(p.id, p)

  // Group bookings by partner
  type PartnerAgg = { partner_id: string; bookings_30d: number; commission_idr_30d: number; wa_clicks_30d: number }
  const partnerAgg = new Map<string, PartnerAgg>()
  for (const b of partnerBookings30) {
    const cur = partnerAgg.get(b.partner_id) ?? { partner_id: b.partner_id, bookings_30d: 0, commission_idr_30d: 0, wa_clicks_30d: 0 }
    cur.bookings_30d += 1
    cur.commission_idr_30d += b.commission_idr || 0
    partnerAgg.set(b.partner_id, cur)
  }
  // Best-effort partner-tagged WA clicks (meta.partner_id when present)
  for (const w of waClicks30) {
    const metaPid = w.meta && typeof w.meta === 'object' ? (w.meta as Record<string, unknown>)['partner_id'] : null
    const pid = typeof metaPid === 'string' ? metaPid : null
    if (!pid || !partnerMap.has(pid)) continue
    const cur = partnerAgg.get(pid) ?? { partner_id: pid, bookings_30d: 0, commission_idr_30d: 0, wa_clicks_30d: 0 }
    cur.wa_clicks_30d += 1
    partnerAgg.set(pid, cur)
  }

  const top_partners_by_traffic = Array.from(partnerAgg.values())
    .filter((a) => partnerMap.has(a.partner_id))
    .map((a) => {
      const p = partnerMap.get(a.partner_id)!
      return {
        partner_id: a.partner_id,
        partner_name: p.name,
        partner_slug: p.slug,
        wa_clicks_30d: a.wa_clicks_30d,
        bookings_30d: a.bookings_30d,
        commission_idr_30d: a.commission_idr_30d,
      }
    })
    .sort((a, b) => (b.bookings_30d - a.bookings_30d) || (b.wa_clicks_30d - a.wa_clicks_30d))
    .slice(0, 15)

  // ── Social share leaderboard (current month) ───────────────────────────
  const social_share_leaderboard = socialShares
    .filter((s) => driverMap.has(s.driver_user_id))
    .map((s) => {
      const d = driverMap.get(s.driver_user_id)!
      return {
        user_id: s.driver_user_id,
        business_name: d.business_name,
        slug: d.slug,
        shares_this_month: s.count || 0,
      }
    })
    .sort((a, b) => b.shares_this_month - a.shares_this_month)
    .slice(0, 15)

  // ── Vehicle-category revenue (M-L3) ────────────────────────────────────
  // Per drivers.vehicle_type:
  //   active_subs   = drivers whose subscription is 'active' or 'past_due'
  //                   (past_due still owes us money — counted as MRR until
  //                   churn finalises)
  //   trial_subs    = drivers in trial window
  //   mrr_idr       = sum(subscriptions.amount_idr) for active|past_due
  //   commission_30d = sum(partner_bookings.commission_idr) for drivers of
  //                   this vehicle type in the 30d window
  //
  // 'vehicle_type' nulls (drivers without a declared vehicle) bucket as
  // 'unknown' so the totals reconcile with the global drivers count.
  const subByDriver = new Map<string, SubscriptionRow>()
  for (const s of subscriptions) subByDriver.set(s.driver_id, s)

  type VehicleAgg = {
    vehicle_type: string
    driver_count: number
    active_subs: number
    trial_subs: number
    mrr_idr: number
    commission_30d_idr: number
  }
  const vehicleAgg = new Map<string, VehicleAgg>()
  const ensureVehicle = (vt: string): VehicleAgg => {
    let cur = vehicleAgg.get(vt)
    if (!cur) {
      cur = { vehicle_type: vt, driver_count: 0, active_subs: 0, trial_subs: 0, mrr_idr: 0, commission_30d_idr: 0 }
      vehicleAgg.set(vt, cur)
    }
    return cur
  }
  for (const d of drivers) {
    const vt = d.vehicle_type || 'unknown'
    const cur = ensureVehicle(vt)
    cur.driver_count += 1
    const sub = subByDriver.get(d.user_id)
    if (sub) {
      if (sub.status === 'active' || sub.status === 'past_due') {
        cur.active_subs += 1
        cur.mrr_idr += sub.amount_idr || 0
      } else if (sub.status === 'trial') {
        cur.trial_subs += 1
      }
    }
  }
  // Partner commissions attributed to a driver — join via driverMap to get
  // their vehicle_type. Bookings whose driver isn't in driverMap (deleted
  // / migrated) bucket as 'unknown'.
  // partner_bookings has driver_user_id from mig 0044 but we only selected
  // partner_id + commission_idr above. Re-pull lightly for the join.
  const { data: bookingDrivers } = await admin
    .from('partner_bookings')
    .select('driver_user_id, commission_idr, created_at')
    .gte('created_at', since30)
    .limit(50_000)
  for (const b of (bookingDrivers ?? []) as Array<{ driver_user_id: string; commission_idr: number; created_at: string }>) {
    const d = driverMap.get(b.driver_user_id)
    const vt = d?.vehicle_type || 'unknown'
    ensureVehicle(vt).commission_30d_idr += b.commission_idr || 0
  }
  const vehicle_revenue = Array.from(vehicleAgg.values())
    .sort((a, b) => b.mrr_idr - a.mrr_idr)

  // ── Affiliate funnel (30d) ─────────────────────────────────────────────
  // Stages reflect affiliate_referrals.status lifecycle:
  //   pending  → approved (driver activated paid subscription, trigger 0017)
  //   approved → paid     (settlement to agent occurred)
  //   cancelled → drop-off at any stage
  //
  // "Entered" counts are cumulative — a row in 'paid' is also counted in
  // 'approved' and 'pending', so the funnel stages read top-down with the
  // expected monotonic decay. Conversion % is each stage ÷ pending.
  const referrals30 = affiliateReferrals60.filter((r) => isIn30(r.created_at))
  const referrals30Prev = affiliateReferrals60.filter((r) => !isIn30(r.created_at))

  function funnelStages(rows: ReadonlyArray<AffiliateReferralRow>) {
    const pending = rows.length
    const approved = rows.filter((r) => r.status === 'approved' || r.status === 'paid').length
    const paid = rows.filter((r) => r.status === 'paid').length
    const cancelled = rows.filter((r) => r.status === 'cancelled').length
    return {
      pending,
      approved,
      paid,
      cancelled,
      // Stage-to-stage conversion fractions (0..1). NaN-safe.
      pending_to_approved_pct: pending > 0 ? approved / pending : 0,
      approved_to_paid_pct: approved > 0 ? paid / approved : 0,
      overall_pct: pending > 0 ? paid / pending : 0,
    }
  }
  const affiliate_funnel_30d = funnelStages(referrals30)
  const affiliate_funnel_prev_30d = funnelStages(referrals30Prev)

  // ── Source breakdown (provider_profile_views.source) ───────────────────
  const sourceCounts: Record<string, number> = {}
  for (const v of views30) {
    const key = v.source || 'direct'
    sourceCounts[key] = (sourceCounts[key] || 0) + 1
  }
  const source_breakdown = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    generated_at: new Date(now).toISOString(),
    totals: {
      profile_views_30d: views30.length,
      unique_visitors_30d,
      wa_clicks_30d: waClicks30.length,
      contact_pings_30d: pings30.length,
      social_shares_30d: social30,
      ctr_30d: unique_visitors_30d > 0 ? waClicks30.length / unique_visitors_30d : 0,
    },
    previous: {
      profile_views_30d: viewsPrev.length,
      unique_visitors_30d: unique_visitors_prev_30d,
      wa_clicks_30d: waClicksPrev.length,
      contact_pings_30d: pingsPrev.length,
      ctr_30d: unique_visitors_prev_30d > 0 ? waClicksPrev.length / unique_visitors_prev_30d : 0,
    },
    series: {
      profile_views_by_day,
      wa_clicks_by_day,
    },
    top_drivers_by_engagement,
    top_partners_by_traffic,
    social_share_leaderboard,
    source_breakdown,
    affiliate_funnel_30d,
    affiliate_funnel_prev_30d,
    vehicle_revenue,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
