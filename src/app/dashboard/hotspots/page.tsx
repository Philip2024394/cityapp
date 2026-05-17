'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ChevronLeft, Flame, Compass, TrendingUp } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import BusyHoursChart from '@/components/rider/BusyHoursChart'
import { MOCK_ZONES, categoryFor, COLOR_FOR_CATEGORY, DAY_HOURS, dayName } from '@/data/mockHotspots'

// Maplibre is lazy-loaded so the heatmap chunk only loads on this page
const HotspotMap = dynamic(() => import('@/components/rider/HotspotMap'), {
  ssr: false,
  loading: () => (
    <div className="border border-line rounded-2xl shimmer" style={{ height: 320, width: '100%' }} />
  ),
})

export default function HotspotsPage() {
  // Re-tick once a minute so the "current hour" highlight stays live
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  const d = new Date(now)
  const dayIndex = d.getDay()      // 0 = Sunday
  const currentHour = d.getHours()

  // Best zone now = highest demand:supply ratio (with min demand floor)
  const best = useMemo(() => {
    const scored = MOCK_ZONES.map(z => {
      const ratio = z.supply === 0 ? z.demand * 5 : z.demand / z.supply
      return { z, score: z.demand >= 25 ? ratio : 0 }
    }).sort((a, b) => b.score - a.score)
    return scored[0]?.z
  }, [])

  // Counts of each category for the header summary
  const counts = useMemo(() => {
    const c = { green: 0, yellow: 0, red: 0 }
    MOCK_ZONES.forEach(z => { c[categoryFor(z)]++ })
    return c
  }, [])

  // Today's demand peak hours (top 3) — for the secondary insight card
  const peakHours = useMemo(() => {
    const hrs = DAY_HOURS[dayIndex] ?? []
    return hrs
      .map((v, h) => ({ h, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 3)
      .sort((a, b) => a.h - b.h)
  }, [dayIndex])

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
          <Link href="/dashboard" className="text-[13px] text-muted hover:text-ink font-bold flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-brand/12 border border-brand/25 flex items-center justify-center">
                <Flame className="w-4 h-4 text-brand" />
              </div>
              <h1 className="text-2xl font-extrabold">Hotspots</h1>
            </div>
            <p className="text-muted text-[14px]">
              Where the demand is right now + when to ride. Updated every 15 minutes.
            </p>
          </header>

          {/* BEST AREA NOW — the headline recommendation */}
          {best && (
            <div className="card p-5 relative overflow-hidden">
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-70"
                style={{ background: 'radial-gradient(ellipse at top right, rgba(34,197,94,0.16), transparent 60%)' }}
              />
              <div className="relative">
                <div className="text-[12px] uppercase tracking-wider font-extrabold text-online flex items-center gap-1.5">
                  <Compass className="w-3 h-3" />
                  Best area right now
                </div>
                <div className="font-extrabold text-2xl mt-1.5">{best.name}</div>
                <div className="text-[14px] text-muted mt-1">{best.reason}</div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Stat label="Demand" value={`${best.demand}/100`} accent="green" />
                  <Stat label="Riders online" value={best.supply.toString()} />
                  <Stat label="Ratio" value={`${(best.demand / Math.max(1, best.supply)).toFixed(1)}×`} accent="green" />
                </div>
              </div>
            </div>
          )}

          {/* HOTSPOT MAP */}
          <div className="space-y-2">
            <HotspotMap zones={MOCK_ZONES} highlightZoneId={best?.id} height="360px" />
            <div className="flex items-center justify-center gap-4 text-[12px] font-bold pt-1">
              <LegendDot color={COLOR_FOR_CATEGORY.green}  label={`Go here · ${counts.green}`} />
              <LegendDot color={COLOR_FOR_CATEGORY.yellow} label={`OK · ${counts.yellow}`} />
              <LegendDot color={COLOR_FOR_CATEGORY.red}    label={`Crowded · ${counts.red}`} />
            </div>
          </div>

          {/* DAY OF WEEK CHART */}
          <BusyHoursChart dayIndex={dayIndex} currentHour={currentHour} />

          {/* PEAK HOURS for today */}
          <div className="card p-4 relative overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{ background: 'radial-gradient(ellipse at top right, rgba(250,204,21,0.10), transparent 60%)' }}
            />
            <div className="relative">
              <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-brand" />
                Today&apos;s peak hours
              </div>
              <div className="font-extrabold text-[15px] mt-1">{dayName(dayIndex)}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {peakHours.map(p => (
                  <span key={p.h} className="chip">
                    {String(p.h).padStart(2, '0')}:00 · {p.v}/100
                  </span>
                ))}
              </div>
              <p className="text-[13px] text-muted leading-relaxed mt-3">
                Tip: be online + in a 🟢 green zone during these hours to maximise quotes.
              </p>
            </div>
          </div>

          {/* All zones list — secondary detail */}
          <div className="space-y-2">
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim px-1">
              All zones · {MOCK_ZONES.length} areas
            </div>
            {MOCK_ZONES
              .map(z => ({ z, cat: categoryFor(z) }))
              .sort((a, b) => {
                const order = { green: 0, yellow: 1, red: 2 }
                return order[a.cat] - order[b.cat] || b.z.demand - a.z.demand
              })
              .map(({ z, cat }) => (
                <div key={z.id} className="card p-3 flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: COLOR_FOR_CATEGORY[cat], boxShadow: `0 0 8px ${COLOR_FOR_CATEGORY[cat]}55` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[14px] truncate">{z.name}</div>
                    <div className="text-[12px] text-muted truncate">{z.reason}</div>
                  </div>
                  <div className="text-right shrink-0 text-[12px]">
                    <div className="font-extrabold text-ink">{z.demand}<span className="text-dim">/100</span></div>
                    <div className="text-dim">{z.supply} riders</div>
                  </div>
                </div>
              ))}
          </div>

          {/* Coaching footer */}
          <div className="card p-4 border-brand/20 bg-brand/5">
            <div className="text-[13px] text-ink/85 leading-relaxed">
              💡 <strong className="text-brand">How this works:</strong> green zones mean
              customers are searching there but few riders are online. Moving to a green
              zone improves your odds of getting picked. Red zones are already saturated —
              the algorithm spreads quotes thin.
            </div>
            <div className="text-[12px] text-dim mt-2">
              Demo data for now. Real heatmap accumulates as the platform grows.
            </div>
          </div>
        </div>
      </main>
      <DashboardNav />
    </>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'green' }) {
  return (
    <div className="bg-white/5 rounded-xl p-2.5 text-center">
      <div className={'text-[16px] font-extrabold ' + (accent === 'green' ? 'text-online' : 'text-ink')}>{value}</div>
      <div className="text-[12px] text-muted mt-1">{label}</div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}55` }} />
      {label}
    </span>
  )
}
