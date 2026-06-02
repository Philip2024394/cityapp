'use client'

// ============================================================================
// DateRangePicker — admin-only reusable date-range filter
// ----------------------------------------------------------------------------
// Drives ?from=YYYY-MM-DD&to=YYYY-MM-DD URL params via router.push.
//
// Why URL-driven (not local state):
//   - Server components read searchParams; the same render path handles both
//     initial load and a date change.
//   - Admins can share a link to a specific window.
//
// Why no calendar lib:
//   - Native <input type="date"> is fine on desktop (admin is desktop-first).
//   - Zero bundle cost.
//
// Style: dark admin chrome, brand yellow #FACC15 for the active preset.
// Tap target: 44px tall inputs + preset chips. Text floor: 13px.
// ============================================================================

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useMemo, useTransition } from 'react'

type Preset = { label: string; days: number }

const DEFAULT_PRESETS: Preset[] = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
]

function toIsoDate(d: Date): string {
  // YYYY-MM-DD in UTC. Native <input type=date> emits this format.
  return d.toISOString().slice(0, 10)
}

function daysAgo(days: number): string {
  return toIsoDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
}

export type DateRangePickerProps = {
  presets?: Preset[]
  /** Default span when no ?from is set. Defaults to 30. */
  defaultDays?: number
  /** Extra label to render above the picker. */
  label?: string
}

export default function DateRangePicker({
  presets = DEFAULT_PRESETS,
  defaultDays = 30,
  label,
}: DateRangePickerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()

  const today = useMemo(() => toIsoDate(new Date()), [])
  const fromValue = sp.get('from') ?? daysAgo(defaultDays)
  const toValue = sp.get('to') ?? today

  const activePresetDays = useMemo(() => {
    if (sp.get('to') && sp.get('to') !== today) return null
    if (!sp.get('from')) return defaultDays
    const fromDate = new Date(fromValue)
    const diffMs = Date.now() - fromDate.getTime()
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
    return presets.find((p) => Math.abs(p.days - diffDays) <= 1)?.days ?? null
  }, [sp, fromValue, today, defaultDays, presets])

  function push(from: string, to: string) {
    const next = new URLSearchParams(sp.toString())
    next.set('from', from)
    next.set('to', to)
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`)
    })
  }

  function pickPreset(days: number) {
    push(daysAgo(days), today)
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-60">
          {label}
        </span>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => {
          const active = activePresetDays === p.days
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => pickPreset(p.days)}
              className="inline-flex items-center px-3 py-2 rounded-full text-[13px] font-bold border transition"
              style={{
                minHeight: 44,
                background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
                color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
                borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.10)',
              }}
            >
              {p.label}
            </button>
          )
        })}
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border"
             style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }}>
          <input
            type="date"
            value={fromValue}
            max={toValue}
            onChange={(e) => push(e.target.value, toValue)}
            className="bg-transparent text-[13px] font-medium outline-none px-2 py-2"
            style={{ minHeight: 44, color: 'rgba(255,255,255,0.92)', colorScheme: 'dark' }}
            aria-label="From date"
          />
          <span className="text-[12px] opacity-50">→</span>
          <input
            type="date"
            value={toValue}
            min={fromValue}
            max={today}
            onChange={(e) => push(fromValue, e.target.value)}
            className="bg-transparent text-[13px] font-medium outline-none px-2 py-2"
            style={{ minHeight: 44, color: 'rgba(255,255,255,0.92)', colorScheme: 'dark' }}
            aria-label="To date"
          />
        </div>
      </div>
    </div>
  )
}
