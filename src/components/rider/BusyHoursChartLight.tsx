'use client'
// ============================================================================
// BusyHoursChartLight — light-theme variant of BusyHoursChart
// ----------------------------------------------------------------------------
// Same horizontal 24-bar shape, but tuned for the white-surface rider/car
// dashboards (no `card-dark`, no white/5 fills, no `text-dim`). Uses the
// dashboard yellow (#FACC15 / #EAB308) and red (#EF4444) palette so it
// stays visually consistent with /dashboard/rider/stats and friends.
//
// We deliberately fork rather than parameterise — the original chart's
// dark-theme version is still used at /dashboard/hotspots (legacy driver
// surface). Cheap duplication beats a brittle theme prop.
// ============================================================================
import { DAY_HOURS, dayName } from '@/data/mockHotspots'

type Props = {
  dayIndex: number    // 0 = Sunday
  currentHour: number // 0-23
}

export default function BusyHoursChartLight({ dayIndex, currentHour }: Props) {
  const hours = DAY_HOURS[dayIndex] ?? Array(24).fill(0)
  const max = Math.max(...hours, 1)

  return (
    <div className="rounded-2xl bg-white border border-[#E4E4E7] p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-extrabold text-black/55">
            Demand by hour
          </div>
          <div className="font-black text-[15px] mt-0.5 text-[#0A0A0A]">{dayName(dayIndex)}</div>
        </div>
        <div className="text-[12px] font-bold text-black/55">
          Right now: {String(currentHour).padStart(2, '0')}:00
        </div>
      </div>

      <div className="flex items-end gap-[3px] h-[88px]" aria-label="Demand intensity by hour, 0 to 23">
        {hours.map((v, h) => {
          const pct = (v / max) * 100
          const isNow = h === currentHour
          const intensity = v / 100
          // Light-theme palette: red peaks, brand yellow mids, light-yellow
          // soft, neutral gray quiet hours. No transparency over dark bg.
          const colour =
            intensity > 0.66 ? '#EF4444' :
            intensity > 0.45 ? '#EAB308' :
            intensity > 0.20 ? '#FACC15' :
                               '#E4E4E7'
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-[3px] transition-all"
                style={{
                  height: `${Math.max(4, pct)}%`,
                  background: colour,
                  boxShadow: isNow ? `0 0 0 1.5px #0A0A0A, 0 0 10px ${colour}aa` : undefined,
                  opacity: isNow ? 1 : 0.95,
                }}
                title={`${String(h).padStart(2, '0')}:00 — demand ${v}/100`}
              />
            </div>
          )
        })}
      </div>

      {/* Tick marks every 6 hours */}
      <div className="flex justify-between text-[11px] text-black/45 mt-1.5 font-mono">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
    </div>
  )
}
