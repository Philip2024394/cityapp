'use client'
import { useEffect, useState } from 'react'

// Auto-status indicator — green pulsing satellite dot when the provider
// is OPEN right now (within today's operating_hours + not busy), orange
// static dot when CLOSED. Replaces the manual Online/Busy/Offline toggle
// on service-provider hubs (beautician + handymen / laundry / massage /
// home-clean / tour-guide / places); car + bike rentals keep manual.
//
// Status is derived from three inputs:
//   1. operating_hours[today_dow]  — "HH:MM-HH:MM" or undefined = closed
//   2. busy_dates                   — full-day busy overrides to closed
//   3. busy_time_slots              — partial-day busy overrides to
//                                      closed when current time falls
//                                      inside any slot
//
// The component re-evaluates every 60s so the dot flips automatically
// at hour boundaries without needing a parent re-render.

type Slot = { date: string; start_time: string; end_time: string }

export type StatusPulseProps = {
  operatingHours?: Record<string, string> | null
  busyDates?:      string[] | null
  busyTimeSlots?:  Slot[] | null
  /** Visual size of the dot in pixels. Default 14. */
  size?: number
  /** When true, render an open/closed label beside the dot. */
  showLabel?: boolean
}

const DAYS = ['sun','mon','tue','wed','thu','fri','sat'] as const

function isoDateLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function hhmmLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Derive OPEN / CLOSED + the next state-flip time for the soonest
 *  hour boundary today. Pure function so tests can pin "now". */
export function evaluateStatus(
  now: Date,
  operatingHours?: Record<string, string> | null,
  busyDates?: string[] | null,
  busyTimeSlots?: Slot[] | null,
): { open: boolean; reason: 'within_hours' | 'closed_today' | 'busy_day' | 'busy_window' | 'no_hours_set' } {
  const today = isoDateLocal(now)
  const dow   = DAYS[now.getDay()]
  if (busyDates?.includes(today)) return { open: false, reason: 'busy_day' }
  const window = operatingHours?.[dow]
  if (!window) return { open: false, reason: operatingHours ? 'closed_today' : 'no_hours_set' }
  const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(window.trim())
  if (!m) return { open: false, reason: 'closed_today' }
  const [start, end] = [m[1], m[2]]
  const cur = hhmmLocal(now)
  const withinHours = cur >= start && cur <= end
  if (!withinHours) return { open: false, reason: 'closed_today' }
  if (busyTimeSlots?.length) {
    for (const s of busyTimeSlots) {
      if (s.date !== today) continue
      if (cur >= s.start_time && cur <= s.end_time) {
        return { open: false, reason: 'busy_window' }
      }
    }
  }
  return { open: true, reason: 'within_hours' }
}

export default function StatusPulse({
  operatingHours, busyDates, busyTimeSlots, size = 14, showLabel = false,
}: StatusPulseProps) {
  // Re-evaluate every 60 seconds so the dot flips at hour boundaries.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])
  const now = new Date()
  const { open, reason } = evaluateStatus(now, operatingHours, busyDates, busyTimeSlots)
  const color    = open ? '#10B981' : '#F97316'  // emerald / orange
  const ring     = open ? 'rgba(16,185,129,0.55)' : 'rgba(249,115,22,0.55)'
  const label    = open ? 'Open now'
                 : reason === 'busy_day'    ? 'Busy today'
                 : reason === 'busy_window' ? 'Busy now'
                 : reason === 'no_hours_set' ? 'Hours not set'
                 : 'Closed'

  return (
    <span className="inline-flex items-center gap-2" data-tick={tick}>
      <span
        className="relative inline-block"
        style={{ width: size, height: size }}
        aria-label={label}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 2px #FFF, 0 1px 3px rgba(0,0,0,0.18)` }}
        />
        {open && (
          <>
            <style>{`
              @keyframes cr-status-pulse {
                0%   { transform: scale(1);   opacity: 0.85; }
                100% { transform: scale(2.4); opacity: 0;    }
              }
            `}</style>
            {/* Two staggered rings give the satellite-ping rhythm. */}
            <span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: ring,
                animation: 'cr-status-pulse 1.6s ease-out infinite',
              }}
              aria-hidden
            />
            <span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: ring,
                animation: 'cr-status-pulse 1.6s ease-out infinite',
                animationDelay: '0.8s',
              }}
              aria-hidden
            />
          </>
        )}
      </span>
      {showLabel && (
        <span className={`text-[12px] font-extrabold uppercase tracking-wider ${open ? 'text-emerald-700' : 'text-orange-700'}`}>
          {label}
        </span>
      )}
    </span>
  )
}
