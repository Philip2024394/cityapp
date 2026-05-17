'use client'
import { DAY_HOURS, dayName } from '@/data/mockHotspots'

type Props = {
  dayIndex: number    // 0 = Sunday
  currentHour: number // 0-23
}

// Horizontal 24-bar chart of demand by hour for one day of the week.
// Current hour glows; bars colour by intensity (red = peak, yellow = mid,
// dim = quiet). Heights derived from `DAY_HOURS[dayIndex]`.
export default function BusyHoursChart({ dayIndex, currentHour }: Props) {
  const hours = DAY_HOURS[dayIndex] ?? Array(24).fill(0)
  const max = Math.max(...hours, 1)

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[12px] text-dim uppercase tracking-wider font-extrabold">
            Demand by hour
          </div>
          <div className="font-extrabold text-[15px] mt-0.5">{dayName(dayIndex)}</div>
        </div>
        <div className="text-[12px] text-muted">Right now: {String(currentHour).padStart(2, '0')}:00</div>
      </div>

      <div className="flex items-end gap-[3px] h-[88px]" aria-label="Demand intensity by hour, 0 to 23">
        {hours.map((v, h) => {
          const pct = (v / max) * 100
          const isNow = h === currentHour
          const intensity = v / 100
          // Colour: 0 → dim grey, 0.5 → yellow, 1.0 → brand red
          const colour =
            intensity > 0.66 ? '#EF4444' :
            intensity > 0.45 ? '#FACC15' :
            intensity > 0.20 ? 'rgba(250,204,21,0.55)' :
                               'rgba(255,255,255,0.18)'
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-[3px] transition-all"
                style={{
                  height: `${Math.max(4, pct)}%`,
                  background: colour,
                  boxShadow: isNow ? `0 0 0 1.5px #FACC15, 0 0 14px ${colour}` : undefined,
                  opacity: isNow ? 1 : 0.92,
                }}
                title={`${String(h).padStart(2, '0')}:00 — demand ${v}/100`}
              />
            </div>
          )
        })}
      </div>

      {/* Tick marks every 6 hours */}
      <div className="flex justify-between text-[11px] text-dim mt-1.5 font-mono">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
    </div>
  )
}
