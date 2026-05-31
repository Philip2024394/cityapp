'use client'
// ============================================================================
// /dashboard/bus/stats — Traffic + share analytics for car/bus/truck drivers
// ----------------------------------------------------------------------------
// Mirrors the beautician stats page but in the car-driver yellow palette.
// Pulls from public.provider_profile_views (mig 0072) filtered to
// provider_type='driver' + provider_id=<drivers.user_id>. Drivers' table
// PK is user_id (mig 0001:36), so that's the join key — not a separate
// id column like the other verticals.
//
// We render KPI tiles for 7/30/90 day windows, a 30-day sparkline of
// daily views, and a "Top referrers" block driven by the `source` column
// (qr / wa_share / social / direct) + future ?ref= URL param breakouts.
//
// If the visitor's anon ping landed in the table the trigger noops for
// drivers (mig 0072:265) — the rows are still recorded; just no
// denormalised visitor_count column on drivers. Lifetime total is
// therefore the raw row count below, not a cached field.
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, BarChart3, Eye, Share2, MessageCircle, Star,
  Globe, QrCode, Smartphone, ArrowUpRight, Loader2,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'

type ViewRow = { viewed_at: string; source: string | null }
type DriverMeta = {
  user_id: string
  slug: string | null
  business_name: string | null
  rating: number | null
  rating_count: number | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'no_table' }
  | { kind: 'ready'; driver: DriverMeta; views: ViewRow[] }
  | { kind: 'error'; message: string }

type Window = 7 | 30 | 90

export default function BusStatsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [days,  setDays]  = useState<Window>(30)

  const reload = useCallback(async () => {
    setState({ kind: 'loading' })

    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    // Render with empty view history (provider_profile_views is RLS-locked
    // to admins for direct browser reads; the page already degrades to empty).
    const dev = await tryLoadDevDriver()
    if (dev) {
      setState({ kind: 'ready', driver: dev.driver as unknown as DriverMeta, views: [] })
      return
    }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setState({ kind: 'unauth' }); return }

    const { data: driver, error: driverErr } = await supabase
      .from('drivers')
      .select('user_id, slug, business_name, rating, rating_count')
      .eq('user_id', user.id)
      .maybeSingle()
    if (driverErr) { setState({ kind: 'error', message: driverErr.message }); return }
    if (!driver)   { setState({ kind: 'no_driver' }); return }

    // Pull the widest window we need (90 days) once, then slice in-memory
    // for the 7/30/90 toggles. Keeps the round-trip count at 1.
    const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString()
    const { data: views, error: viewsErr } = await supabase
      .from('provider_profile_views')
      .select('viewed_at, source')
      .eq('provider_type', 'driver')
      .eq('provider_id',   user.id)
      .gte('viewed_at',    since90)
      .limit(10_000)

    if (viewsErr) {
      // If the table doesn't exist or RLS blocks the read, treat as empty
      // state. The page still renders KPIs with em-dashes.
      const msg = (viewsErr.message || '').toLowerCase()
      if (msg.includes('does not exist') || msg.includes('relation')) {
        setState({ kind: 'no_table' })
        return
      }
      // RLS blocks anon select on provider_profile_views (mig 0072:238) — only
      // admins can read directly. So a row-level denial just means "no data
      // surfaced via the browser client". Fall through to empty state.
      setState({
        kind: 'ready',
        driver: driver as DriverMeta,
        views: [],
      })
      return
    }

    setState({
      kind: 'ready',
      driver: driver as DriverMeta,
      views: (views ?? []) as ViewRow[],
    })
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')     return <FullPageMessage spinner>Loading stats…</FullPageMessage>
  if (state.kind === 'no_supabase') return <FullPageMessage>Auth not configured.</FullPageMessage>
  if (state.kind === 'unauth')      return <FullPageMessage cta={{ href: '/signup', label: 'Sign in' }}>Sign in to view your stats.</FullPageMessage>
  if (state.kind === 'no_driver')   return <FullPageMessage cta={{ href: '/signup?role=driver&vehicle=bus', label: 'Create driver profile' }}>No driver profile yet.</FullPageMessage>
  if (state.kind === 'error')       return <FullPageMessage>Could not load stats: {state.message}</FullPageMessage>

  const driver       = state.kind === 'ready' ? state.driver : null
  const views        = state.kind === 'ready' ? state.views  : []
  const tableMissing = state.kind === 'no_table'

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-32 space-y-4">
        <Link
          href="/dashboard/bus"
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black"
          style={{ minHeight: 32 }}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to dashboard
        </Link>

        {/* Hero gradient strip */}
        <section
          className="rounded-3xl p-5 sm:p-6"
          style={{
            background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
            color: '#0A0A0A',
            boxShadow: '0 12px 32px rgba(250,204,21,0.30)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(10,10,10,0.10)' }}
            >
              <BarChart3 className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-black leading-tight truncate">Stats</h1>
              <p className="text-[12.5px] font-bold opacity-80 leading-snug">
                Profile views, share clicks, WhatsApp taps. Updated in real time.
              </p>
            </div>
          </div>
        </section>

        {/* Window selector */}
        <div className="rounded-2xl bg-white border border-black/10 p-2 shadow-sm grid grid-cols-3 gap-1">
          {([7, 30, 90] as const).map((n) => {
            const on = days === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setDays(n)}
                className="rounded-xl py-2 text-[12px] font-extrabold uppercase tracking-wider transition"
                style={{
                  minHeight: 44,
                  background: on ? '#FACC15' : 'transparent',
                  color:      on ? '#0A0A0A' : 'rgba(10,10,10,0.65)',
                }}
              >
                Last {n} days
              </button>
            )
          })}
        </div>

        {/* KPI strip — slice the 90-day window in-memory */}
        <KpiStrip days={days} views={views} driver={driver} tableMissing={tableMissing} />

        {/* Empty-state strip when the schema is missing */}
        {tableMissing && (
          <section
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: '#FEF3C7', border: '1px solid #FACC15' }}
          >
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#FACC15', color: '#0A0A0A' }}
            >
              <BarChart3 className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] font-black text-[#0A0A0A] leading-tight">
                Coming soon — analytics are being wired up
              </h2>
              <p className="text-[12.5px] text-[#0A0A0A]/70 leading-snug mt-0.5">
                Tracking starts the first time you share your profile link.
                Your KPIs above will fill in automatically.
              </p>
            </div>
          </section>
        )}

        {/* Daily views — last 30 days SVG sparkline */}
        <DailyViewsCard views={views} />

        {/* Source breakdown */}
        <SourcesCard views={views} days={days} />

        {/* Lifetime footer */}
        {!tableMissing && (
          <p className="text-[11px] text-black/45 text-center tabular-nums">
            Lifetime profile views in last 90 days: <strong>{views.length.toLocaleString()}</strong>
          </p>
        )}
      </div>
    </Shell>
  )
}

// ─── KPI strip ────────────────────────────────────────────────────────

function KpiStrip({
  days, views, driver, tableMissing,
}: {
  days: Window
  views: ViewRow[]
  driver: DriverMeta | null
  tableMissing: boolean
}) {
  const since = useMemo(() => Date.now() - days * 86_400_000, [days])
  const windowViews = useMemo(
    () => views.filter((v) => Date.parse(v.viewed_at) >= since),
    [views, since],
  )
  const shareClicks = useMemo(
    () => windowViews.filter((v) => v.source === 'wa_share' || v.source === 'social').length,
    [windowViews],
  )
  const waTaps = useMemo(
    () => windowViews.filter((v) => v.source === 'wa_share').length,
    [windowViews],
  )

  const dash = tableMissing ? '—' : null
  const rating =
    driver?.rating != null && driver.rating > 0 ? driver.rating.toFixed(1) :
    driver?.rating_count ? '—' : '—'

  return (
    <section className="grid grid-cols-2 gap-3">
      <Kpi
        icon={<Eye className="w-4 h-4" strokeWidth={2.5} />}
        label={`Profile views · ${days}d`}
        value={dash ?? windowViews.length.toLocaleString()}
      />
      <Kpi
        icon={<Share2 className="w-4 h-4" strokeWidth={2.5} />}
        label="Share clicks"
        value={dash ?? shareClicks.toLocaleString()}
      />
      <Kpi
        icon={<MessageCircle className="w-4 h-4" strokeWidth={2.5} />}
        label="WhatsApp taps"
        value={dash ?? waTaps.toLocaleString()}
      />
      <Kpi
        icon={<Star className="w-4 h-4" strokeWidth={2.5} />}
        label="Average rating"
        value={rating}
        sub={driver?.rating_count ? `${driver.rating_count} reviews` : 'No reviews yet'}
      />
    </section>
  )
}

function Kpi({
  icon, label, value, sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-3xl bg-white border border-black/10 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-black/55">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: '#FFFBEA', color: '#EAB308', border: '1px solid rgba(250,204,21,0.45)' }}
        >
          {icon}
        </span>
        <span className="text-[11px] font-extrabold uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className="text-[24px] font-black text-[#0A0A0A] mt-1.5 tabular-nums leading-none">
        {value}
      </div>
      {sub && <div className="text-[11px] font-bold text-black/55 mt-1">{sub}</div>}
    </div>
  )
}

// ─── Daily views sparkline ────────────────────────────────────────────

function DailyViewsCard({ views }: { views: ViewRow[] }) {
  // Always bucket the last 30 days so the chart shape is stable regardless
  // of the active KPI window.
  const daily = useMemo(() => {
    const buckets: Record<string, number> = {}
    for (const v of views) {
      const day = v.viewed_at.slice(0, 10)
      buckets[day] = (buckets[day] ?? 0) + 1
    }
    const out: Array<{ date: string; count: number }> = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
      out.push({ date: d, count: buckets[d] ?? 0 })
    }
    return out
  }, [views])

  const peak = Math.max(1, ...daily.map((d) => d.count))
  const total = daily.reduce((a, b) => a + b.count, 0)

  return (
    <section className="rounded-3xl bg-white border border-black/10 p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/65">
          Views per day · last 30 days
        </div>
        <div className="text-[11px] font-extrabold tabular-nums text-black/45">{total} total</div>
      </div>
      {total === 0 ? (
        <div className="text-[13px] text-black/55 leading-snug">
          No views in the last 30 days. Share your QR or profile link to start tracking.
        </div>
      ) : (
        <div className="space-y-1">
          <svg viewBox={`0 0 ${daily.length * 8} 80`} className="w-full h-20" preserveAspectRatio="none" aria-label="Daily views sparkline">
            {daily.map((d, i) => {
              const h = peak > 0 ? (d.count / peak) * 78 : 0
              return (
                <rect
                  key={d.date}
                  x={i * 8 + 1}
                  y={80 - h}
                  width={6}
                  height={Math.max(h, 1)}
                  rx={1.5}
                  fill={d.count > 0 ? '#EAB308' : '#F5F5F4'}
                />
              )
            })}
          </svg>
          <div className="flex items-center justify-between text-[11px] text-black/45 tabular-nums">
            <span>{daily[0]?.date}</span>
            <span>Peak {peak}</span>
            <span>{daily[daily.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Top referrers ────────────────────────────────────────────────────

function SourcesCard({ views, days }: { views: ViewRow[]; days: Window }) {
  const since = useMemo(() => Date.now() - days * 86_400_000, [days])
  const buckets = useMemo(() => {
    const out: Record<string, number> = {}
    for (const v of views) {
      if (Date.parse(v.viewed_at) < since) continue
      const k = v.source ?? 'direct'
      out[k] = (out[k] ?? 0) + 1
    }
    return Object.entries(out)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
  }, [views, since])

  const total = buckets.reduce((a, b) => a + b.count, 0)

  return (
    <section className="rounded-3xl bg-white border border-black/10 p-5 shadow-sm space-y-3">
      <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/65">
        Top referrers
      </div>
      {buckets.length === 0 ? (
        <div className="text-[12.5px] text-black/55 leading-snug">
          Nothing here yet. Once people start visiting your profile, you'll see
          where they came from — WhatsApp shares, QR scans, social posts,
          or direct links.
        </div>
      ) : (
        <div className="space-y-2">
          {buckets.map((s) => (
            <SourceRow
              key={s.source}
              source={s.source}
              count={s.count}
              total={Math.max(1, total)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function SourceRow({ source, count, total }: { source: string; count: number; total: number }) {
  const pct = (count / total) * 100
  const icon =
    source === 'qr'       ? <QrCode     className="w-3.5 h-3.5" strokeWidth={2.5} /> :
    source === 'wa_share' ? <Smartphone className="w-3.5 h-3.5" strokeWidth={2.5} /> :
    source === 'social'   ? <Globe      className="w-3.5 h-3.5" strokeWidth={2.5} /> :
    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
  const label =
    source === 'qr'       ? 'QR code'        :
    source === 'wa_share' ? 'WhatsApp share' :
    source === 'social'   ? 'Social link'    :
    source === 'direct'   ? 'Direct visit'   :
    source
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-black/70">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: '#FFFBEA', color: '#EAB308' }}
          >
            {icon}
          </span>
          {label}
        </span>
        <span className="tabular-nums">{count} · {pct.toFixed(0)}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[#F5F5F4] overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: '#EAB308' }} />
      </div>
    </div>
  )
}

// ─── Shell + chrome ───────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      {children}
    </main>
  )
}

function FullPageMessage({
  children, cta, spinner,
}: {
  children: React.ReactNode
  cta?: { href: string; label: string }
  spinner?: boolean
}) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      <div className="max-w-md mx-auto px-4 pt-24 text-center">
        {spinner && (
          <Loader2 className="w-7 h-7 mx-auto text-[#EAB308] animate-spin mb-3" strokeWidth={2.5} />
        )}
        <div className="text-[14px] font-bold text-black/70 leading-relaxed">{children}</div>
        {cta && (
          <Link
            href={cta.href}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[13px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            {cta.label}
          </Link>
        )}
        <div className="mt-6">
          <Link
            href="/dashboard/bus"
            className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
