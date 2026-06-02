import { headers, cookies } from 'next/headers'
import Link from 'next/link'
import {
  BarChart3, Eye, MessageCircle, Bell, Share2, TrendingUp, TrendingDown, Minus, Users, Target,
} from 'lucide-react'
import SortableDriversTable, { type DriverRow } from './SortableDriversTable'

// ============================================================================
// /admin/analytics — Engagement dashboard (H1)
// ----------------------------------------------------------------------------
// Server-rendered. Fetches /api/admin/analytics (same origin), forwarding
// admin cookies. The layout (src/app/admin/layout.tsx) already gates the
// whole /admin tree via requireAdmin(), so by the time this page renders
// we know the caller is admin.
//
// Visuals:
//   - Header card with the brand-yellow gradient (matches Mission Control)
//   - KPI strip: profile views / WA clicks / contact pings / social shares
//     with a small ▲/▼ trend vs the previous 30-day window
//   - Two inline-SVG sparklines (no chart libs)
//   - Sortable top-drivers table, partners table, social leaderboard
//   - Source-breakdown bar list
//
// 13px text floor, 44px tap targets, brand yellow only. No external deps.
// ============================================================================

export const dynamic = 'force-dynamic'

type DayCount = { day: string; count: number }
type PartnerRow = {
  partner_id: string
  partner_name: string
  partner_slug: string
  wa_clicks_30d: number
  bookings_30d: number
  commission_idr_30d: number
}
type SocialRow = {
  user_id: string
  business_name: string
  slug: string
  shares_this_month: number
}
type SourceRow = { source: string; count: number }
type VehicleRevenueRow = {
  vehicle_type: string
  driver_count: number
  active_subs: number
  trial_subs: number
  mrr_idr: number
  commission_30d_idr: number
}

type FunnelStages = {
  pending: number
  approved: number
  paid: number
  cancelled: number
  pending_to_approved_pct: number
  approved_to_paid_pct: number
  overall_pct: number
}

type AnalyticsResponse = {
  generated_at: string
  totals: {
    profile_views_30d: number
    unique_visitors_30d: number
    wa_clicks_30d: number
    contact_pings_30d: number
    social_shares_30d: number
    ctr_30d: number
  }
  previous: {
    profile_views_30d: number
    unique_visitors_30d: number
    wa_clicks_30d: number
    contact_pings_30d: number
    ctr_30d: number
  }
  series: {
    profile_views_by_day: DayCount[]
    wa_clicks_by_day: DayCount[]
  }
  top_drivers_by_engagement: DriverRow[]
  top_partners_by_traffic: PartnerRow[]
  social_share_leaderboard: SocialRow[]
  source_breakdown: SourceRow[]
  affiliate_funnel_30d: FunnelStages
  affiliate_funnel_prev_30d: FunnelStages
  vehicle_revenue: VehicleRevenueRow[]
}

async function fetchAnalytics(): Promise<AnalyticsResponse | null> {
  const h = await headers()
  const c = await cookies()
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3002'
  const proto = h.get('x-forwarded-proto') || 'http'
  const cookieHeader = c.getAll().map((ck) => `${ck.name}=${ck.value}`).join('; ')
  try {
    const res = await fetch(`${proto}://${host}/api/admin/analytics`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader },
    })
    if (!res.ok) return null
    return (await res.json()) as AnalyticsResponse
  } catch {
    return null
  }
}

export default async function AdminAnalyticsPage() {
  const data = await fetchAnalytics()

  if (!data) {
    return (
      <div className="space-y-6">
        <HeaderCard />
        <div className="card p-6 text-[13px] text-muted">
          Failed to load analytics. Try refreshing — if the issue persists, check the
          <code className="mx-1 px-1.5 py-0.5 rounded bg-white/5 text-[12px]">/api/admin/analytics</code>
          route logs.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <HeaderCard />

      {/* KPI strip ─────────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Profile views"
            value={data.totals.profile_views_30d}
            prev={data.previous.profile_views_30d}
            icon={<Eye className="w-4 h-4" />}
          />
          <KpiCard
            label="Unique visitors"
            value={data.totals.unique_visitors_30d}
            prev={data.previous.unique_visitors_30d}
            icon={<Users className="w-4 h-4" />}
            footnote="Distinct sessions"
          />
          <KpiCard
            label="WhatsApp clicks"
            value={data.totals.wa_clicks_30d}
            prev={data.previous.wa_clicks_30d}
            icon={<MessageCircle className="w-4 h-4" />}
          />
          <KpiCard
            label="CTR"
            value={data.totals.ctr_30d}
            prev={data.previous.ctr_30d}
            display={`${(data.totals.ctr_30d * 100).toFixed(1)}%`}
            icon={<Target className="w-4 h-4" />}
            footnote="WA clicks ÷ uniques"
          />
          <KpiCard
            label="Contact pings"
            value={data.totals.contact_pings_30d}
            prev={data.previous.contact_pings_30d}
            icon={<Bell className="w-4 h-4" />}
          />
          <KpiCard
            label="Social shares"
            value={data.totals.social_shares_30d}
            icon={<Share2 className="w-4 h-4" />}
            footnote="Current month"
          />
        </div>
      </section>

      {/* Sparklines ────────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SparklineCard
            title="Profile views · last 30 days"
            series={data.series.profile_views_by_day}
          />
          <SparklineCard
            title="WhatsApp clicks · last 30 days"
            series={data.series.wa_clicks_by_day}
          />
        </div>
      </section>

      {/* Top drivers ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Top drivers by engagement" subtitle="Last 30 days · sortable" />
        <div className="card p-3 sm:p-4">
          <SortableDriversTable rows={data.top_drivers_by_engagement} />
        </div>
      </section>

      {/* Vehicle-category revenue ─────────────────────────────────────── */}
      <section>
        <SectionHeader title="Revenue by vehicle category" subtitle="MRR + partner commission (30d)" />
        <div className="card p-3 sm:p-4">
          <VehicleRevenueTable rows={data.vehicle_revenue} />
        </div>
      </section>

      {/* Affiliate funnel ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Affiliate funnel"
          subtitle="Last 30 days · pending → approved → paid"
        />
        <div className="card p-3 sm:p-4">
          <AffiliateFunnel
            current={data.affiliate_funnel_30d}
            previous={data.affiliate_funnel_prev_30d}
          />
        </div>
      </section>

      {/* Top partners + Social leaderboard side-by-side on wide ───────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <SectionHeader title="Top partners by traffic" subtitle="Bookings + commission" />
          <div className="card p-3 sm:p-4">
            <PartnersTable rows={data.top_partners_by_traffic} />
          </div>
        </div>
        <div>
          <SectionHeader title="Social share leaderboard" subtitle="Shares this month" />
          <div className="card p-3 sm:p-4">
            <SocialLeaderboard rows={data.social_share_leaderboard} />
          </div>
        </div>
      </section>

      {/* Source breakdown ───────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Profile view sources" subtitle="Where the visit came from" />
        <div className="card p-3 sm:p-4">
          <SourceBreakdown rows={data.source_breakdown} />
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// Header
// ============================================================================

function HeaderCard() {
  return (
    <section
      className="rounded-2xl border border-line p-5 sm:p-6"
      style={{
        background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
        color: '#0A0A0A',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-black/10 border border-black/20 flex items-center justify-center shrink-0">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[20px] sm:text-[22px] font-extrabold tracking-tight leading-tight">
            Analytics
          </div>
          <div className="text-[13px] font-bold opacity-80 mt-0.5">
            Last 30 days · engagement, traffic, partner conversion
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2.5 px-0.5">
      <div className="text-[15px] font-extrabold tracking-tight">{title}</div>
      {subtitle && <div className="text-[13px] text-muted">{subtitle}</div>}
    </div>
  )
}

// ============================================================================
// KPI card with trend arrow
// ============================================================================

function KpiCard({
  label, value, prev, icon, footnote, display,
}: {
  label: string
  value: number
  prev?: number
  icon: React.ReactNode
  footnote?: string
  /** Optional override for the displayed value — e.g. "1.4%" for CTR. */
  display?: string
}) {
  const trend = trendPct(value, prev)
  return (
    <div
      className="rounded-2xl border p-3 sm:p-4 min-h-[44px]"
      style={{
        background: 'rgba(250, 204, 21, 0.05)',
        borderColor: 'rgba(250, 204, 21, 0.25)',
      }}
    >
      <div className="text-[11px] uppercase tracking-wider font-extrabold text-dim flex items-center gap-1.5">
        <span style={{ color: '#FACC15' }}>{icon}</span>
        {label}
      </div>
      <div className="text-[24px] sm:text-[28px] font-extrabold leading-none mt-1.5" style={{ color: '#FACC15' }}>
        {display ?? value.toLocaleString()}
      </div>
      <div className="flex items-center gap-1 mt-1.5 text-[12px]">
        {trend === null ? (
          <span className="text-dim">{footnote ?? 'vs previous 30d'}</span>
        ) : trend.dir === 'up' ? (
          <>
            <TrendingUp className="w-3 h-3 text-success" />
            <span className="text-success font-bold">+{trend.pct}%</span>
            <span className="text-dim">vs prev 30d</span>
          </>
        ) : trend.dir === 'down' ? (
          <>
            <TrendingDown className="w-3 h-3 text-danger" />
            <span className="text-danger font-bold">{trend.pct}%</span>
            <span className="text-dim">vs prev 30d</span>
          </>
        ) : (
          <>
            <Minus className="w-3 h-3 text-dim" />
            <span className="text-dim">flat vs prev 30d</span>
          </>
        )}
      </div>
    </div>
  )
}

function trendPct(curr: number, prev?: number): { dir: 'up' | 'down' | 'flat'; pct: number } | null {
  if (prev === undefined) return null
  if (prev === 0 && curr === 0) return { dir: 'flat', pct: 0 }
  if (prev === 0) return { dir: 'up', pct: 100 }
  const change = ((curr - prev) / prev) * 100
  if (Math.abs(change) < 1) return { dir: 'flat', pct: 0 }
  return { dir: change > 0 ? 'up' : 'down', pct: Math.round(change) }
}

// ============================================================================
// Sparkline (inline SVG, no chart lib)
// ============================================================================

function SparklineCard({ title, series }: { title: string; series: DayCount[] }) {
  const total = series.reduce((s, p) => s + p.count, 0)
  const peak = series.reduce((m, p) => Math.max(m, p.count), 0)
  const lastDay = series[series.length - 1]?.count ?? 0
  return (
    <div className="card p-3.5 sm:p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[13px] font-extrabold uppercase tracking-wider text-dim">{title}</div>
        <div className="text-[12px] text-muted">
          Today <span className="font-extrabold text-ink tabular-nums">{lastDay}</span> · Peak <span className="font-bold tabular-nums">{peak}</span>
        </div>
      </div>
      <Sparkline series={series} />
      <div className="text-[12px] text-dim mt-1.5">Total {total.toLocaleString()} over 30 days</div>
    </div>
  )
}

function Sparkline({ series }: { series: DayCount[] }) {
  const w = 600
  const h = 80
  const pad = 4
  if (series.length === 0) {
    return <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[80px]" />
  }
  const max = Math.max(1, ...series.map((p) => p.count))
  const stepX = (w - pad * 2) / Math.max(1, series.length - 1)
  const points = series.map((p, i) => {
    const x = pad + i * stepX
    const y = h - pad - (p.count / max) * (h - pad * 2)
    return { x, y, c: p.count, day: p.day }
  })
  const pathLine = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')
  const pathFill = `${pathLine} L ${points[points.length - 1].x.toFixed(1)} ${h - pad} L ${points[0].x.toFixed(1)} ${h - pad} Z`
  const lastPt = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[80px] mt-2" preserveAspectRatio="none" role="img" aria-label="30-day trend">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FACC15" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathFill} fill="url(#sparkFill)" />
      <path d={pathLine} fill="none" stroke="#FACC15" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      {lastPt && (
        <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill="#FACC15" stroke="#0A0A0A" strokeWidth="1" />
      )}
    </svg>
  )
}

// ============================================================================
// Affiliate funnel — pending → approved → paid horizontal stages
// ----------------------------------------------------------------------------
// Visualised as three stacked bars where each stage's width is its count
// relative to the pending (top-of-funnel) total. Drop-off labels between
// stages show the conversion fraction. The cancelled count is rendered
// as a separate "lost" badge — referrals that explicitly fell out
// (driver never paid OR partner refunded).
// ============================================================================

function AffiliateFunnel({ current, previous }: { current: FunnelStages; previous: FunnelStages }) {
  if (current.pending === 0) {
    return (
      <div className="text-[13px] text-muted py-3">
        No affiliate referrals in the last 30 days.
      </div>
    )
  }

  const stages: Array<{ label: string; count: number; color: string }> = [
    { label: 'Pending',  count: current.pending,  color: '#94A3B8' },
    { label: 'Approved', count: current.approved, color: '#FACC15' },
    { label: 'Paid',     count: current.paid,     color: '#22C55E' },
  ]
  const max = current.pending

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-extrabold leading-none" style={{ color: '#FACC15' }}>
            {(current.overall_pct * 100).toFixed(1)}%
          </span>
          <span className="text-muted">overall conversion</span>
        </div>
        <FunnelTrend current={current.overall_pct} previous={previous.overall_pct} />
      </div>

      <div className="space-y-2">
        {stages.map((s, i) => {
          const widthPct = max > 0 ? (s.count / max) * 100 : 0
          const dropoff = i === 0
            ? null
            : i === 1 ? current.pending_to_approved_pct
            : current.approved_to_paid_pct
          return (
            <div key={s.label}>
              {i > 0 && dropoff !== null ? (
                <div className="flex items-center justify-end text-[11px] text-dim pb-0.5">
                  ↓ <span className="ml-1 font-extrabold tabular-nums">{(dropoff * 100).toFixed(1)}%</span>
                  <span className="ml-1">{i === 1 ? 'pending → approved' : 'approved → paid'}</span>
                </div>
              ) : null}
              <div
                className="relative rounded-lg overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                <div
                  className="h-9 flex items-center px-3"
                  style={{
                    width: `${Math.max(widthPct, 14)}%`,
                    background: `linear-gradient(90deg, ${s.color}33, ${s.color}1a)`,
                    borderRight: `2px solid ${s.color}`,
                  }}
                >
                  <span className="text-[12px] uppercase tracking-wider font-extrabold" style={{ color: s.color }}>
                    {s.label}
                  </span>
                </div>
                <div className="absolute inset-y-0 right-3 flex items-center text-[13px] font-extrabold tabular-nums">
                  {s.count.toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {current.cancelled > 0 ? (
        <div className="flex items-center gap-2 text-[12px] pt-1">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold"
            style={{ background: 'rgba(239,68,68,0.16)', color: '#F87171', border: '1px solid rgba(239,68,68,0.30)' }}
          >
            {current.cancelled.toLocaleString()} cancelled
          </span>
          <span className="text-dim">explicit drop-out (driver never paid or partner refunded)</span>
        </div>
      ) : null}
    </div>
  )
}

function FunnelTrend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-dim">vs prev 30d</span>
  const diff = (current - previous) * 100
  if (Math.abs(diff) < 0.1) return <span className="text-dim flex items-center gap-1"><Minus className="w-3 h-3" />flat</span>
  if (diff > 0) return <span className="text-success flex items-center gap-1"><TrendingUp className="w-3 h-3" />+{diff.toFixed(1)}pp</span>
  return <span className="text-danger flex items-center gap-1"><TrendingDown className="w-3 h-3" />{diff.toFixed(1)}pp</span>
}

// ============================================================================
// Vehicle revenue table — per-category MRR + partner commission
// ----------------------------------------------------------------------------
// Subscription MRR is sum(amount_idr) over drivers whose subscription is
// 'active' or 'past_due'. Trial drivers are shown for context but not in
// MRR (no money yet). Commission column is the last 30 days of partner
// commissions attributed to drivers of that vehicle type.
// ============================================================================

function VehicleRevenueTable({ rows }: { rows: VehicleRevenueRow[] }) {
  if (!rows.length) return <div className="text-[13px] text-muted py-3">No driver / subscription data yet.</div>

  const totals = rows.reduce(
    (acc, r) => {
      acc.driver_count += r.driver_count
      acc.active_subs += r.active_subs
      acc.trial_subs += r.trial_subs
      acc.mrr_idr += r.mrr_idr
      acc.commission_30d_idr += r.commission_30d_idr
      return acc
    },
    { driver_count: 0, active_subs: 0, trial_subs: 0, mrr_idr: 0, commission_30d_idr: 0 },
  )

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <table className="w-full text-[13px] min-w-[640px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-dim font-extrabold border-b border-line">
            <th className="text-left py-2 pr-3">Vehicle</th>
            <th className="text-right py-2 pr-3">Drivers</th>
            <th className="text-right py-2 pr-3">Active</th>
            <th className="text-right py-2 pr-3">Trial</th>
            <th className="text-right py-2 pr-3">MRR (Rp)</th>
            <th className="text-right py-2 pr-3">Commission 30d (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.vehicle_type} className="border-b border-line/40">
              <td className="py-2.5 pr-3 capitalize font-extrabold">{r.vehicle_type.replace('_', ' ')}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{r.driver_count.toLocaleString()}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums text-success">{r.active_subs.toLocaleString()}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums text-dim">{r.trial_subs.toLocaleString()}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums font-extrabold" style={{ color: '#FACC15' }}>
                {fmtIdr(r.mrr_idr)}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{fmtIdr(r.commission_30d_idr)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-line">
            <td className="py-2.5 pr-3 font-extrabold uppercase text-[11px] tracking-wider text-dim">Total</td>
            <td className="py-2.5 pr-3 text-right tabular-nums font-extrabold">{totals.driver_count.toLocaleString()}</td>
            <td className="py-2.5 pr-3 text-right tabular-nums font-extrabold text-success">{totals.active_subs.toLocaleString()}</td>
            <td className="py-2.5 pr-3 text-right tabular-nums font-extrabold text-dim">{totals.trial_subs.toLocaleString()}</td>
            <td className="py-2.5 pr-3 text-right tabular-nums font-extrabold" style={{ color: '#FACC15' }}>{fmtIdr(totals.mrr_idr)}</td>
            <td className="py-2.5 pr-3 text-right tabular-nums font-extrabold">{fmtIdr(totals.commission_30d_idr)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function fmtIdr(n: number): string {
  return n.toLocaleString('id-ID')
}

// ============================================================================
// Partners table
// ============================================================================

function PartnersTable({ rows }: { rows: PartnerRow[] }) {
  if (!rows.length) return <div className="text-[13px] text-muted py-3">No partner activity in the last 30 days.</div>
  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <table className="w-full text-[13px] min-w-[480px]">
        <thead>
          <tr className="text-[12px] uppercase tracking-wider text-dim font-extrabold">
            <th className="text-left py-2 pr-3 min-h-[44px]">Partner</th>
            <th className="text-right py-2 pr-3">WA</th>
            <th className="text-right py-2 pr-3">Bookings</th>
            <th className="text-right py-2 pr-3">Commission Rp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.partner_id} className="border-t border-line/40">
              <td className="py-2.5 pr-3 align-middle">
                <Link
                  href={`/admin/providers#partner-${r.partner_id}`}
                  className="font-bold hover:text-brand transition truncate block max-w-[240px]"
                  title={r.partner_name}
                >
                  {r.partner_name}
                </Link>
                <div className="text-[11px] text-dim font-mono truncate max-w-[240px]">{r.partner_slug}</div>
              </td>
              <td className="py-2.5 pr-3 align-middle text-right font-extrabold tabular-nums">{r.wa_clicks_30d}</td>
              <td className="py-2.5 pr-3 align-middle text-right font-extrabold tabular-nums">{r.bookings_30d}</td>
              <td className="py-2.5 pr-3 align-middle text-right font-extrabold tabular-nums" style={{ color: '#FACC15' }}>
                {r.commission_idr_30d.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// Social share leaderboard
// ============================================================================

function SocialLeaderboard({ rows }: { rows: SocialRow[] }) {
  if (!rows.length) return <div className="text-[13px] text-muted py-3">No social shares logged this month.</div>
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={r.user_id} className="flex items-center gap-3 py-1.5 min-h-[44px] border-t border-line/40 first:border-t-0">
          <span
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-extrabold"
            style={{
              background: i < 3 ? '#FACC15' : 'rgba(250,204,21,0.10)',
              color: i < 3 ? '#0A0A0A' : '#FACC15',
            }}
          >
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <a
              href={`/cari/${r.slug}`}
              target="_blank"
              rel="noopener"
              className="font-bold text-[13px] hover:text-brand transition truncate block"
              title={r.business_name}
            >
              {r.business_name || '(no name)'}
            </a>
            <div className="text-[11px] text-dim font-mono truncate">{r.slug}</div>
          </div>
          <div className="text-right">
            <div className="text-[15px] font-extrabold tabular-nums" style={{ color: '#FACC15' }}>{r.shares_this_month}</div>
            <div className="text-[10px] text-dim uppercase tracking-wider">shares</div>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ============================================================================
// Source breakdown — bars
// ============================================================================

function SourceBreakdown({ rows }: { rows: SourceRow[] }) {
  if (!rows.length) return <div className="text-[13px] text-muted py-3">No profile views yet.</div>
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const pct = (r.count / max) * 100
        return (
          <li key={r.source} className="text-[13px]">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="font-bold capitalize">{labelForSource(r.source)}</span>
              <span className="tabular-nums font-extrabold" style={{ color: '#FACC15' }}>{r.count.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #FACC15 0%, #EAB308 100%)' }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function labelForSource(s: string): string {
  switch (s) {
    case 'ig':
    case 'instagram': return 'Instagram'
    case 'fb':
    case 'facebook':  return 'Facebook'
    case 'wa':
    case 'whatsapp':  return 'WhatsApp share'
    case 'qr':        return 'QR code'
    case 'direct':    return 'Direct'
    case 'tt':
    case 'tiktok':    return 'TikTok'
    default:          return s.replace(/_/g, ' ')
  }
}
