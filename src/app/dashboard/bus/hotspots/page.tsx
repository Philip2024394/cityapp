'use client'
// ============================================================================
// /dashboard/bus/hotspots — Bus driver city busy area live stats
// ----------------------------------------------------------------------------
// Mirror of /dashboard/rider/hotspots. Cars carry passengers AND parcels,
// so the subtitle is generic ("passengers / parcels"). Otherwise identical
// — same MOCK_ZONES, same BusyHoursChartLight, same coaching footer.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Flame, Compass, TrendingUp } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import BusyHoursChartLight from '@/components/rider/BusyHoursChartLight'
import { MOCK_ZONES, categoryFor, COLOR_FOR_CATEGORY, DAY_HOURS, dayName } from '@/data/mockHotspots'

export default function BusHotspotsPage() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  const d = new Date(now)
  const dayIndex = d.getDay()
  const currentHour = d.getHours()

  const best = useMemo(() => {
    const scored = MOCK_ZONES.map((z) => {
      const ratio = z.supply === 0 ? z.demand * 5 : z.demand / z.supply
      return { z, score: z.demand >= 25 ? ratio : 0 }
    }).sort((a, b) => b.score - a.score)
    return scored[0]?.z
  }, [])

  const counts = useMemo(() => {
    const c = { green: 0, yellow: 0, red: 0 }
    MOCK_ZONES.forEach((z) => { c[categoryFor(z)]++ })
    return c
  }, [])

  const peakHours = useMemo(() => {
    const hrs = DAY_HOURS[dayIndex] ?? []
    return hrs
      .map((v, h) => ({ h, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 3)
      .sort((a, b) => a.h - b.h)
  }, [dayIndex])

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
              <Flame className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-black leading-tight truncate">City busy areas</h1>
              <p className="text-[12.5px] font-bold opacity-80 leading-snug">
                Where passengers / parcels want a ride RIGHT NOW. Updated every 15 min.
              </p>
            </div>
          </div>
        </section>

        {/* BEST AREA NOW */}
        {best && (
          <section className="rounded-2xl bg-white border border-[#E4E4E7] p-4 sm:p-5">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-[#16A34A] flex items-center gap-1.5">
              <Compass className="w-3 h-3" strokeWidth={2.5} />
              Best area right now
            </div>
            <div className="font-black text-[22px] text-[#0A0A0A] mt-1.5 leading-tight">
              {best.name}
            </div>
            <div className="text-[13px] font-bold text-black/65 mt-1 leading-snug">{best.reason}</div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Demand" value={`${best.demand}/100`} accent="green" />
              <Stat label="Online" value={best.supply.toString()} />
              <Stat
                label="Ratio"
                value={`${(best.demand / Math.max(1, best.supply)).toFixed(1)}×`}
                accent="green"
              />
            </div>
          </section>
        )}

        {/* Zone category summary */}
        <section className="rounded-2xl bg-white border border-[#E4E4E7] p-3 flex items-center justify-center gap-4 text-[12px] font-extrabold">
          <LegendDot color={COLOR_FOR_CATEGORY.green}  label={`Go here · ${counts.green}`} />
          <LegendDot color={COLOR_FOR_CATEGORY.yellow} label={`OK · ${counts.yellow}`} />
          <LegendDot color={COLOR_FOR_CATEGORY.red}    label={`Crowded · ${counts.red}`} />
        </section>

        {/* DAY OF WEEK CHART */}
        <BusyHoursChartLight dayIndex={dayIndex} currentHour={currentHour} />

        {/* PEAK HOURS for today */}
        <section className="rounded-2xl bg-white border border-[#E4E4E7] p-4">
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-black/55 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-[#EAB308]" strokeWidth={2.5} />
            Today&apos;s peak hours
          </div>
          <div className="font-black text-[15px] mt-1 text-[#0A0A0A]">{dayName(dayIndex)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {peakHours.map((p) => (
              <span
                key={p.h}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-extrabold"
                style={{
                  background: '#FFFBEA',
                  color: '#0A0A0A',
                  border: '1px solid rgba(250,204,21,0.45)',
                  minHeight: 28,
                }}
              >
                {String(p.h).padStart(2, '0')}:00 · {p.v}/100
              </span>
            ))}
          </div>
          <p className="text-[13px] font-bold text-black/65 leading-relaxed mt-3">
            Tip: be online + in a green zone during these hours to maximise quotes.
          </p>
        </section>

        {/* All zones list */}
        <section className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-black/55 px-1">
            All zones · {MOCK_ZONES.length} areas
          </div>
          {MOCK_ZONES
            .map((z) => ({ z, cat: categoryFor(z) }))
            .sort((a, b) => {
              const order = { green: 0, yellow: 1, red: 2 }
              return order[a.cat] - order[b.cat] || b.z.demand - a.z.demand
            })
            .map(({ z, cat }) => (
              <div
                key={z.id}
                className="rounded-2xl bg-white border border-[#E4E4E7] p-3 flex items-center gap-3"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    background: COLOR_FOR_CATEGORY[cat],
                    boxShadow: `0 0 8px ${COLOR_FOR_CATEGORY[cat]}55`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[14px] text-[#0A0A0A] truncate">{z.name}</div>
                  <div className="text-[12px] font-bold text-black/55 truncate">{z.reason}</div>
                </div>
                <div className="text-right shrink-0 text-[12px] tabular-nums">
                  <div className="font-black text-[#0A0A0A]">
                    {z.demand}
                    <span className="text-black/45">/100</span>
                  </div>
                  <div className="font-bold text-black/45">{z.supply} drivers</div>
                </div>
              </div>
            ))}
        </section>

        {/* Coaching footer */}
        <section
          className="rounded-2xl p-4"
          style={{ background: '#FFFBEA', border: '1px solid rgba(250,204,21,0.45)' }}
        >
          <div className="text-[13px] text-[#0A0A0A] leading-relaxed">
            <strong className="font-black">How this works:</strong> green zones mean
            customers are searching there but few drivers are online. Moving to a green
            zone improves your odds of getting picked. Red zones are already saturated —
            the algorithm spreads quotes thin.
          </div>
          <div className="text-[12px] font-bold text-black/55 mt-2">
            Demo data for now. Real heatmap accumulates as the platform grows.
          </div>
        </section>
      </div>
    </Shell>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'green' }) {
  return (
    <div
      className="rounded-xl p-2.5 text-center"
      style={{
        background: '#F4F4F5',
        border: '1px solid #E4E4E7',
      }}
    >
      <div
        className="text-[16px] font-black tabular-nums"
        style={{ color: accent === 'green' ? '#16A34A' : '#0A0A0A' }}
      >
        {value}
      </div>
      <div className="text-[11px] font-bold text-black/55 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-black/65">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
      />
      {label}
    </span>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      {children}
    </main>
  )
}
