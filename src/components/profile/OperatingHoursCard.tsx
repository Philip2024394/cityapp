'use client'
import { Clock } from 'lucide-react'

// Reads a JSONB column shaped like:
//   { "mon": "09:00-18:00", "tue": "09:00-18:00", ..., "sun": "closed" }
// Renders nothing when null/empty — providers who don't set hours show
// "by request" implicitly (no card at all keeps the page clean).

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const LABELS: Record<typeof DAYS[number], string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

type Hours = Partial<Record<typeof DAYS[number], string | null>>

export default function OperatingHoursCard({
  hours,
  title = 'Operating hours',
}: {
  hours: Hours | null | undefined
  title?: string
}) {
  if (!hours || typeof hours !== 'object') return null
  const entries = DAYS.map((d) => [d, hours[d] ?? null] as const)
  const anySet = entries.some(([, v]) => v && v.trim())
  if (!anySet) return null

  // Highlight today.
  const todayIdx = (new Date().getDay() + 6) % 7  // Sun=0 → 6, Mon=1 → 0…

  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-ink/70 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-brand" strokeWidth={2.5} />
        {title}
      </h2>
      <div className="rounded-2xl bg-black/40 border border-white/10 p-3">
        <div className="divide-y divide-white/05">
          {entries.map(([day, val], i) => {
            const isToday = i === todayIdx
            const display = !val || !val.trim()
              ? 'Closed'
              : val.trim().toLowerCase() === 'closed'
                ? 'Closed'
                : val.trim()
            const closed = display === 'Closed'
            return (
              <div
                key={day}
                className="flex items-center justify-between py-2 px-1.5"
                style={isToday ? { background: 'rgba(250,204,21,0.06)', borderRadius: 8 } : undefined}
              >
                <span className={`text-[13px] font-bold uppercase tracking-wider ${isToday ? 'text-brand' : 'text-ink/65'}`}>
                  {LABELS[day]} {isToday && <span className="text-[10px] font-extrabold ml-1">TODAY</span>}
                </span>
                <span className={`text-[13px] font-${closed ? 'bold' : 'extrabold'} ${closed ? 'text-ink/40' : 'text-ink'}`}>
                  {display}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
