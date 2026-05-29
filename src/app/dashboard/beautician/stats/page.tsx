'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Eye, Mail, Calendar, ArrowUpRight, Globe, Smartphone, QrCode, ExternalLink } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'

// /dashboard/beautician/stats — traffic + conversion analytics.
// Pulls from provider_profile_views (mig 0072) + promo_pages (mig 0138)
// + contact_messages (mig 0137) + beautician_bookings.
//
// Visual style mirrors the rest of the beautician dashboard — white
// cards, pink accents, 12px text floor.

type Stats = {
  range: { days: number; since: string }
  provider: { slug: string; display_name: string; visitor_count: number }
  totals: {
    views: number
    messages: number
    bookings: number
    confirmed: number
    conversion_rate: number
  }
  dailyViews: Array<{ date: string; count: number }>
  sources: Array<{ source: string; count: number }>
  promos: Array<{
    id: string
    slug: string
    headline: string
    photo_url: string
    view_count: number
    click_count: number
    ctr: number
    created_at: string
  }>
}

export default function BeauticianStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,  setErr]  = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/beautician/me/stats?days=${days}`, { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      if (!r.ok) { setErr('fetch_failed'); return }
      setStats(await r.json() as Stats)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [days])
  useEffect(() => { void reload() }, [reload])

  if (loading) return <Shell><Loading /></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/beautician/stats" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!stats) return <Shell><div className="px-4 pt-20 text-center text-black/70">No stats yet.</div></Shell>

  const peakDay = Math.max(1, ...stats.dailyViews.map((d) => d.count))

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-32 space-y-4">
        {/* Brand header */}
        <div className="rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <BarChart3 size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-black leading-tight text-black truncate">Stats</h1>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Where your traffic comes from, what people do once they land, which promos work.
              </p>
            </div>
          </div>
        </div>

        {/* Range selector */}
        <div className="rounded-2xl bg-white border border-gray-200 p-2 shadow-sm grid grid-cols-3 gap-1">
          {[7, 30, 90].map((n) => {
            const on = days === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setDays(n)}
                className={`rounded-xl py-2 text-[12px] font-extrabold uppercase tracking-wider transition min-h-[40px] ${
                  on ? 'bg-pink-500 text-white' : 'text-black/70 hover:bg-gray-50'
                }`}
              >
                {n} days
              </button>
            )
          })}
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <KPI label="Profile views" value={stats.totals.views} icon={<Eye size={16} strokeWidth={2.5} />} />
          <KPI label="Contact messages" value={stats.totals.messages} icon={<Mail size={16} strokeWidth={2.5} />} />
          <KPI label="Bookings" value={stats.totals.bookings} icon={<Calendar size={16} strokeWidth={2.5} />} />
          <KPI
            label="View → message"
            value={`${(stats.totals.conversion_rate * 100).toFixed(1)}%`}
            icon={<ArrowUpRight size={16} strokeWidth={2.5} />}
          />
        </div>

        {/* Daily views chart — minimalist SVG bar chart */}
        <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">Daily views</div>
          {stats.dailyViews.length === 0 ? (
            <div className="text-[13px] text-black/55 leading-snug">No views yet.</div>
          ) : (
            <div className="space-y-1">
              <svg viewBox={`0 0 ${stats.dailyViews.length * 8} 80`} className="w-full h-20" preserveAspectRatio="none">
                {stats.dailyViews.map((d, i) => {
                  const h = peakDay > 0 ? (d.count / peakDay) * 78 : 0
                  return (
                    <rect
                      key={d.date}
                      x={i * 8 + 1}
                      y={80 - h}
                      width={6}
                      height={Math.max(h, 1)}
                      rx={1.5}
                      fill={d.count > 0 ? '#EC4899' : '#F3F4F6'}
                    />
                  )
                })}
              </svg>
              <div className="flex items-center justify-between text-[11px] text-black/45 tabular-nums">
                <span>{stats.dailyViews[0]?.date}</span>
                <span>Peak {peakDay}</span>
                <span>{stats.dailyViews[stats.dailyViews.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </section>

        {/* Source breakdown — where they came from */}
        <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">Where they came from</div>
          {stats.sources.length === 0 ? (
            <div className="text-[13px] text-black/55 leading-snug">No referrer data yet.</div>
          ) : (
            <div className="space-y-1.5">
              {stats.sources.map((s) => (
                <SourceRow
                  key={s.source}
                  source={s.source}
                  count={s.count}
                  total={Math.max(1, stats.totals.views)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Top promos */}
        <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">Top promos</div>
            <Link href="/dashboard/beautician/promos" className="text-[12px] font-extrabold text-pink-600 hover:underline">Manage →</Link>
          </div>
          {stats.promos.length === 0 ? (
            <div className="text-[13px] text-black/55 leading-snug">
              No promo pages yet. Create one on{' '}
              <Link href="/dashboard/beautician/promos" className="text-pink-600 underline font-bold">Promos</Link>{' '}
              to start sharing trackable links.
            </div>
          ) : (
            <div className="space-y-2">
              {stats.promos.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-200 p-2">
                  <img src={p.photo_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-black text-black truncate">{p.headline}</div>
                    <div className="text-[12px] text-black/55 tabular-nums">
                      {p.view_count} views · {p.click_count} clicks · {(p.ctr * 100).toFixed(1)}% CTR
                    </div>
                  </div>
                  <a
                    href={`/promo/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-pink-50 hover:border-pink-200 text-pink-600 flex items-center justify-center shrink-0"
                  >
                    <ExternalLink size={14} strokeWidth={2.5} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-[11px] text-black/45 text-center">
          Lifetime profile views: <strong>{stats.provider.visitor_count.toLocaleString()}</strong>
        </p>
      </div>
    </Shell>
  )
}

function KPI({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-black/55">
        <span className="w-7 h-7 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">{icon}</span>
        <span className="text-[12px] font-extrabold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[26px] font-black text-black mt-1.5 tabular-nums leading-none">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  )
}

function SourceRow({ source, count, total }: { source: string; count: number; total: number }) {
  const pct = (count / total) * 100
  const icon =
    source === 'qr'        ? <QrCode size={14} strokeWidth={2.5} /> :
    source === 'wa_share'  ? <Smartphone size={14} strokeWidth={2.5} /> :
    source === 'social'    ? <Globe size={14} strokeWidth={2.5} /> :
    <ArrowUpRight size={14} strokeWidth={2.5} />
  const label =
    source === 'qr'        ? 'QR code' :
    source === 'wa_share'  ? 'WhatsApp share' :
    source === 'social'    ? 'Social link' :
    source === 'direct'    ? 'Direct visit' :
    source
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-black/70">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-md bg-pink-50 text-pink-600 flex items-center justify-center">{icon}</span>
          {label}
        </span>
        <span className="tabular-nums">{count} · {pct.toFixed(0)}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-pink-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}
function Loading() {
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>
}
