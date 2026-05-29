'use client'
import { useState } from 'react'
import { Clock } from 'lucide-react'

// Weekly operating-hours editor — 7 day rows, each with a start +
// finish time picker or a "closed" toggle. Auto-saves on blur through
// the onChange callback. Replaces the manual Online/Busy/Offline grid
// on service-provider hubs (mig 0072 operating_hours jsonb column).
//
// Shape persisted:
//   { mon: "09:00-18:00", tue: "09:00-18:00", ... }  // open days only
// Missing keys = closed for that day.

const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

type Hours = Record<string, string> | null

function parseWindow(v: string | undefined): { start: string; end: string } | null {
  if (!v) return null
  const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(v.trim())
  if (!m) return null
  return { start: m[1], end: m[2] }
}

export default function WeeklyHoursEditor({
  value, onChange, accentColor = '#EC4899',
}: {
  value: Hours
  onChange: (next: Hours) => void
  /** Brand colour for the per-vertical accent (focus rings + Open chip). */
  accentColor?: string
}) {
  const hours = value || {}

  function setWindow(d: DayKey, start: string, end: string) {
    const valid = !!start && !!end && end > start
    const next: Hours = { ...hours }
    if (valid) {
      next[d] = `${start}-${end}`
    } else {
      delete next[d]
    }
    onChange(Object.keys(next).length ? next : null)
  }

  function setClosed(d: DayKey) {
    const next: Hours = { ...hours }
    delete next[d]
    onChange(Object.keys(next).length ? next : null)
  }

  function copyMondayToWeekdays() {
    const win = parseWindow(hours.mon)
    if (!win) return
    const next: Hours = { ...hours }
    for (const d of ['tue','wed','thu','fri'] as DayKey[]) {
      next[d] = `${win.start}-${win.end}`
    }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {DAYS.map(({ key, label }) => {
          const win = parseWindow(hours[key])
          const isOpen = !!win
          return (
            <DayRow
              key={key}
              label={label}
              start={win?.start ?? ''}
              end={win?.end ?? ''}
              isOpen={isOpen}
              accentColor={accentColor}
              onChange={(s, e) => setWindow(key, s, e)}
              onClose={() => setClosed(key)}
            />
          )
        })}
      </div>

      {parseWindow(hours.mon) && (
        <button
          type="button"
          onClick={copyMondayToWeekdays}
          className="text-[12px] font-extrabold uppercase tracking-wider text-black/55 hover:text-black underline"
        >
          Copy Monday → Tue–Fri
        </button>
      )}
    </div>
  )
}

function DayRow({
  label, start, end, isOpen, accentColor, onChange, onClose,
}: {
  label:    string
  start:    string
  end:      string
  isOpen:   boolean
  accentColor: string
  onChange: (start: string, end: string) => void
  onClose:  () => void
}) {
  // Local drafts so the time pickers don't fight the parent re-render.
  const [s, setS] = useState(start)
  const [e, setE] = useState(end)
  const matches = s === start && e === end
  if (!matches) { /* keep external value as source of truth on remount */ }

  function commit(newS: string, newE: string) {
    if (!newS || !newE) return
    if (newE <= newS) return
    onChange(newS, newE)
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
      <span className="w-10 text-[13px] font-extrabold uppercase tracking-wider text-black/70 shrink-0">{label}</span>
      <input
        type="time"
        value={s || start}
        onChange={(ev) => { setS(ev.target.value); commit(ev.target.value, e || end) }}
        className="flex-1 min-w-0 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5 text-[13px] font-bold text-black focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
        style={{ accentColor }}
      />
      <span className="text-[12px] text-black/45 font-extrabold">–</span>
      <input
        type="time"
        value={e || end}
        onChange={(ev) => { setE(ev.target.value); commit(s || start, ev.target.value) }}
        className="flex-1 min-w-0 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5 text-[13px] font-bold text-black focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
        style={{ accentColor }}
      />
      {isOpen ? (
        <button
          type="button"
          onClick={() => { setS(''); setE(''); onClose() }}
          aria-label={`Close ${label}`}
          className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center transition shrink-0"
          title="Closed"
        >
          <Clock size={14} className="text-black/45" strokeWidth={2.5} />
        </button>
      ) : (
        <span className="w-9 h-9 inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider text-black/35 shrink-0">
          —
        </span>
      )}
    </div>
  )
}
