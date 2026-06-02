import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import PrintButton from './PrintButton'

// ============================================================================
// /admin/drivers/[id]/performance — printable performance card
// ----------------------------------------------------------------------------
// Single-shot server render of one driver's 30-day performance. Designed
// for "Save as PDF" via window.print() — no charting libs, no client JS
// beyond the print button. Print stylesheet hides admin chrome and
// formats for A4.
//
// Sources:
//   - drivers + subscriptions     → identity + plan
//   - provider_profile_views      → views, unique visitors, source mix
//   - wa_click_events             → WA clicks attributed to this driver
//   - driver_contact_pings        → in-app contact pings
//   - profile_share_events        → share clicks (per platform)
//   - partner_bookings            → commission attribution (30d)
//
// Admin-only — layout.tsx gates the whole /admin tree via requireAdmin().
// ============================================================================

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ from?: string; to?: string }>

type DriverRow = {
  user_id: string
  business_name: string | null
  slug: string | null
  vehicle_type: string | null
  city: string | null
  area: string | null
  whatsapp_e164: string | null
  rating: number | null
  rating_count: number | null
  price_per_km: number | null
  min_fee: number | null
  created_at: string
  status: string
  snoozed_until: string | null
}

type SubRow = { status: string; current_period_end: string | null; amount_idr: number; trial_ends_at: string | null }

type ViewRow = { source: string | null; anon_session_id: string | null; viewed_at: string; utm_source: string | null; utm_campaign: string | null }
type WaClickRow = { occurred_at: string; meta: Record<string, unknown> | null; user_id: string | null }
type PingRow = { pinged_at: string }
type ShareRow = { platform: string; occurred_at: string }
type BookingRow = { commission_idr: number; created_at: string }

function daysAgoIso(days: number, ref = new Date()): string {
  return new Date(ref.getTime() - days * 86_400_000).toISOString()
}

function fmtIdr(n: number | null | undefined): string {
  if (!n) return 'Rp 0'
  return `Rp ${n.toLocaleString('id-ID')}`
}

function countUnique(rows: ReadonlyArray<{ anon_session_id: string | null }>): number {
  const seen = new Set<string>()
  let untracked = 0
  for (const r of rows) {
    if (r.anon_session_id) seen.add(r.anon_session_id)
    else untracked += 1
  }
  return seen.size + untracked
}

export default async function DriverPerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: SearchParams
}) {
  const admin = getAdminSupabase()
  if (!admin) return <p className="text-muted text-[14px]">Server not configured.</p>

  const { id } = await params
  const sp = await searchParams

  const fromIso = sp.from ? new Date(sp.from).toISOString() : daysAgoIso(30)
  const toIso = sp.to ? new Date(`${sp.to}T23:59:59.999Z`).toISOString() : new Date().toISOString()

  // 1. Identity + plan
  const [{ data: driver }, { data: sub }] = await Promise.all([
    admin.from('drivers').select(
      'user_id, business_name, slug, vehicle_type, city, area, whatsapp_e164, rating, rating_count, price_per_km, min_fee, created_at, status, snoozed_until',
    ).eq('user_id', id).maybeSingle(),
    admin.from('subscriptions').select('status, current_period_end, amount_idr, trial_ends_at').eq('driver_id', id).maybeSingle(),
  ])
  if (!driver) notFound()
  const d = driver as DriverRow
  const s = (sub as SubRow | null) ?? null

  // 2. Engagement (window-bounded)
  const [viewsRes, waClicksRes, pingsRes, sharesRes, bookingsRes] = await Promise.all([
    admin.from('provider_profile_views')
      .select('source, anon_session_id, viewed_at, utm_source, utm_campaign')
      .eq('provider_type', 'driver').eq('provider_id', id)
      .gte('viewed_at', fromIso).lte('viewed_at', toIso),
    admin.from('wa_click_events')
      .select('occurred_at, meta, user_id')
      .gte('occurred_at', fromIso).lte('occurred_at', toIso)
      .limit(50_000),
    admin.from('driver_contact_pings')
      .select('pinged_at')
      .eq('driver_user_id', id)
      .gte('pinged_at', fromIso).lte('pinged_at', toIso),
    admin.from('profile_share_events')
      .select('platform, occurred_at')
      .eq('provider_type', 'driver').eq('provider_id', id)
      .gte('occurred_at', fromIso).lte('occurred_at', toIso),
    admin.from('partner_bookings')
      .select('commission_idr, created_at')
      .eq('driver_user_id', id)
      .gte('created_at', fromIso).lte('created_at', toIso),
  ])

  const views = (viewsRes.data ?? []) as ViewRow[]
  const waClicks = ((waClicksRes.data ?? []) as WaClickRow[])
    .filter((w) => {
      const metaDid = w.meta && typeof w.meta === 'object'
        ? (w.meta as Record<string, unknown>)['driver_id']
        : null
      return metaDid === id || w.user_id === id
    })
  const pings = (pingsRes.data ?? []) as PingRow[]
  const shares = (sharesRes.data ?? []) as ShareRow[]
  const bookings = (bookingsRes.data ?? []) as BookingRow[]

  const uniqueVisitors = countUnique(views)
  const ctr = uniqueVisitors > 0 ? waClicks.length / uniqueVisitors : 0
  const commissionTotal = bookings.reduce((acc, b) => acc + (b.commission_idr || 0), 0)

  // Source mix
  const sourceCounts: Record<string, number> = {}
  for (const v of views) {
    const k = v.source || 'direct'
    sourceCounts[k] = (sourceCounts[k] ?? 0) + 1
  }

  // Share platform mix
  const shareCounts: Record<string, number> = {}
  for (const sh of shares) shareCounts[sh.platform] = (shareCounts[sh.platform] ?? 0) + 1

  // Top UTM campaigns
  const utmCampaigns: Record<string, number> = {}
  for (const v of views) {
    if (v.utm_campaign) utmCampaigns[v.utm_campaign] = (utmCampaigns[v.utm_campaign] ?? 0) + 1
  }

  const windowLabel = `${fromIso.slice(0, 10)} → ${toIso.slice(0, 10)}`
  const generatedAt = new Date().toLocaleString('en-GB', {
    dateStyle: 'medium', timeStyle: 'short',
  })

  return (
    <div className="performance-root">
      {/* Screen-only header — hidden when printing */}
      <div className="screen-only flex items-center justify-between gap-3 mb-4 print:hidden">
        <Link
          href="/admin/drivers"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to riders
        </Link>
        <PrintButton />
      </div>

      {/* The printable card itself */}
      <article className="card-print">
        {/* Hero */}
        <header className="hero">
          <div>
            <div className="eyebrow">CityDrivers · Driver performance</div>
            <h1 className="driver-name">{d.business_name || '(unnamed driver)'}</h1>
            <div className="meta">
              <span>{d.vehicle_type ?? '—'}</span>
              <Dot />
              <span>{[d.area, d.city].filter(Boolean).join(', ') || 'No city'}</span>
              {d.slug ? <><Dot /><span>/{d.slug}</span></> : null}
            </div>
          </div>
          <div className="hero-right">
            <div className="kv">
              <span className="kv-label">Status</span>
              <span className="kv-value capitalize">{d.status}</span>
            </div>
            <div className="kv">
              <span className="kv-label">Rating</span>
              <span className="kv-value tabular-nums">
                {d.rating ? `${d.rating.toFixed(1)} (${d.rating_count ?? 0})` : '—'}
              </span>
            </div>
            <div className="kv">
              <span className="kv-label">Window</span>
              <span className="kv-value tabular-nums">{windowLabel}</span>
            </div>
          </div>
        </header>

        {/* KPI strip */}
        <section className="kpi-strip">
          <Kpi label="Profile views" value={views.length} />
          <Kpi label="Unique visitors" value={uniqueVisitors} sub="Distinct sessions" />
          <Kpi label="WhatsApp clicks" value={waClicks.length} />
          <Kpi label="CTR" value={`${(ctr * 100).toFixed(1)}%`} sub="Clicks ÷ uniques" />
          <Kpi label="Contact pings" value={pings.length} />
          <Kpi label="Share clicks" value={shares.length} />
        </section>

        {/* Subscription + commission */}
        <section className="grid">
          <div className="panel">
            <h2 className="panel-h">Subscription</h2>
            <table className="panel-table">
              <tbody>
                <tr><th>Plan status</th><td className="capitalize">{s?.status ?? 'no record'}</td></tr>
                <tr><th>Monthly amount</th><td>{fmtIdr(s?.amount_idr)}</td></tr>
                <tr>
                  <th>Period ends</th>
                  <td>{s?.current_period_end ? new Date(s.current_period_end).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'}</td>
                </tr>
                <tr>
                  <th>Trial ends</th>
                  <td>{s?.trial_ends_at ? new Date(s.trial_ends_at).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'}</td>
                </tr>
                <tr>
                  <th>Account created</th>
                  <td>{new Date(d.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</td>
                </tr>
                <tr>
                  <th>Snoozed until</th>
                  <td>{d.snoozed_until && new Date(d.snoozed_until) > new Date()
                    ? new Date(d.snoozed_until).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                    : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h2 className="panel-h">Partner commission (in window)</h2>
            <div className="big-number">{fmtIdr(commissionTotal)}</div>
            <div className="muted-small">{bookings.length.toLocaleString()} bookings</div>
            <table className="panel-table mt-3">
              <tbody>
                <tr><th>Listed price/km</th><td>{fmtIdr(d.price_per_km)}</td></tr>
                <tr><th>Min fee</th><td>{fmtIdr(d.min_fee)}</td></tr>
                <tr><th>WhatsApp</th><td className="tabular-nums">{d.whatsapp_e164 ?? '—'}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Source + share breakdown */}
        <section className="grid">
          <div className="panel">
            <h2 className="panel-h">Traffic source mix</h2>
            <Breakdown counts={sourceCounts} />
          </div>
          <div className="panel">
            <h2 className="panel-h">Share-click platforms</h2>
            <Breakdown counts={shareCounts} emptyLabel="No share clicks in this window." />
          </div>
        </section>

        {/* UTM campaigns if any */}
        {Object.keys(utmCampaigns).length > 0 ? (
          <section className="panel">
            <h2 className="panel-h">Top campaigns (utm_campaign)</h2>
            <Breakdown counts={utmCampaigns} />
          </section>
        ) : null}

        <footer className="footer">
          <div>Generated {generatedAt} · /admin/drivers/{d.user_id.slice(0, 8)}…/performance</div>
          <div>CityDrivers internal — directory model under Permenhub PM 12/2019.</div>
        </footer>
      </article>

      <style>{`
        .performance-root { color: rgba(255,255,255,0.95); }

        /* The card itself adapts: dark on screen, white on print */
        .card-print {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 20px;
          padding: 28px;
          line-height: 1.45;
        }

        .hero {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 16px; flex-wrap: wrap;
          border-bottom: 1px solid rgba(255,255,255,0.10);
          padding-bottom: 16px;
        }
        .eyebrow {
          font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
          font-weight: 800; color: #FACC15;
        }
        .driver-name {
          font-size: 26px; font-weight: 900; line-height: 1.1; margin-top: 6px;
        }
        .meta {
          font-size: 12px; color: rgba(255,255,255,0.65); margin-top: 6px;
          display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;
        }
        .hero-right { display: flex; flex-direction: column; gap: 6px; min-width: 200px; }
        .kv { display: flex; justify-content: space-between; gap: 16px; font-size: 12px; }
        .kv-label { color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; font-size: 11px; }
        .kv-value { font-weight: 800; }

        .kpi-strip {
          display: grid; grid-template-columns: repeat(6, 1fr);
          gap: 10px; margin-top: 20px;
        }
        @media (max-width: 720px) { .kpi-strip { grid-template-columns: repeat(2, 1fr); } }
        .kpi {
          border: 1px solid rgba(250,204,21,0.25);
          background: rgba(250,204,21,0.05);
          border-radius: 14px; padding: 12px;
        }
        .kpi-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
          font-weight: 800; color: rgba(255,255,255,0.65);
        }
        .kpi-value {
          font-size: 26px; font-weight: 900; line-height: 1; margin-top: 4px;
          color: #FACC15;
        }
        .kpi-sub { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 4px; }

        .grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
          margin-top: 16px;
        }
        @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }

        .panel {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.02);
        }
        .panel-h {
          font-size: 12px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.08em; color: rgba(255,255,255,0.55);
          margin: 0 0 8px;
        }
        .panel-table { width: 100%; font-size: 13px; }
        .panel-table th { text-align: left; color: rgba(255,255,255,0.55); font-weight: 600; padding: 4px 0; }
        .panel-table td { text-align: right; font-weight: 800; padding: 4px 0; }
        .big-number { font-size: 28px; font-weight: 900; color: #FACC15; }
        .muted-small { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 2px; }
        .mt-3 { margin-top: 12px; }

        .footer {
          margin-top: 20px; padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.10);
          display: flex; justify-content: space-between; gap: 12px;
          font-size: 11px; color: rgba(255,255,255,0.45);
          flex-wrap: wrap;
        }

        /* ── PRINT STYLES ── */
        @media print {
          @page { size: A4; margin: 16mm; }
          .screen-only, .print:hidden { display: none !important; }
          body, .performance-root { background: white !important; color: black !important; }
          .card-print {
            background: white !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
          .driver-name, .kpi-value, .big-number { color: #0A0A0A !important; }
          .eyebrow { color: #1F2937 !important; }
          .hero { border-bottom: 1px solid #0A0A0A !important; }
          .meta, .kpi-label, .panel-h, .panel-table th, .muted-small, .footer { color: #4B5563 !important; }
          .kpi { background: #FEF9C3 !important; border: 1px solid #FACC15 !important; }
          .panel { background: white !important; border: 1px solid #D1D5DB !important; }
          .kv-label { color: #4B5563 !important; }
          .kv-value, .panel-table td { color: #0A0A0A !important; }
          .footer { border-top: 1px solid #0A0A0A !important; }
          /* Avoid breaking inside panels */
          .panel, .kpi-strip { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}

function Dot() {
  return <span style={{ opacity: 0.5 }}>·</span>
}

function Kpi({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  )
}

function Breakdown({ counts, emptyLabel = 'No data in this window.' }: { counts: Record<string, number>; emptyLabel?: string }) {
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a)
  if (entries.length === 0) {
    return <div className="muted-small">{emptyLabel}</div>
  }
  const max = entries[0]![1]
  const total = entries.reduce((acc, [, n]) => acc + n, 0)
  return (
    <div>
      {entries.map(([label, n]) => {
        const widthPct = max > 0 ? (n / max) * 100 : 0
        const pct = total > 0 ? (n / total) * 100 : 0
        return (
          <div key={label} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>{label.replace('_', ' ')}</span>
              <span className="tabular-nums" style={{ fontWeight: 800 }}>
                {n.toLocaleString()} <span style={{ opacity: 0.55, fontWeight: 600 }}>({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${widthPct}%`, background: '#FACC15' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
