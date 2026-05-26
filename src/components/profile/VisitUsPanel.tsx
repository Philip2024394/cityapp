'use client'
import { useMemo, useState } from 'react'
import { MapPin, Calendar, X, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import VisitUsMap from './VisitUsMap'

// Address card + today's hours + glowing-marker map + customizable
// bottom CTA. Extracted from /beautician/[slug] for reuse across
// every vertical. Bottom CTA is a prop so each vertical wires its
// own action (beautician → /cari/rider, handyman → WhatsApp, etc.).

export type VisitUsPanelProps = {
  displayName:   string
  address:       string | null
  city:          string | null
  lat:           number | null
  lng:           number | null
  hours:         Record<string, string> | null
  instagramUrl?: string | null
  tiktokUrl?:    string | null
  facebookUrl?:  string | null
  busyDates:     string[]
  themeColor:    string
  onClose:       () => void
  /** Optional bottom CTA below the map. */
  bottomCta?: {
    label:    string
    icon?:    LucideIcon
    onClick:  () => void
    /** Small text rendered under the button. */
    note?:    string
  } | null
  /** Copy override for the "no coordinates pinned" placeholder. */
  noLocationCopy?: string
}

export default function VisitUsPanel({
  displayName, address, city, lat, lng, hours,
  instagramUrl, tiktokUrl, facebookUrl,
  busyDates, themeColor, onClose,
  bottomCta = null,
  noLocationCopy = 'Lokasi belum di-pin oleh provider.',
}: VisitUsPanelProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const socials: Array<{ href: string; label: string; svg: React.ReactNode }> = []
  if (instagramUrl?.trim()) socials.push({ href: instagramUrl.trim(), label: 'Instagram', svg: <SocialInstagramIcon /> })
  if (tiktokUrl?.trim())    socials.push({ href: tiktokUrl.trim(),    label: 'TikTok',    svg: <SocialTikTokIcon />    })
  if (facebookUrl?.trim())  socials.push({ href: facebookUrl.trim(),  label: 'Facebook',  svg: <SocialFacebookIcon />  })

  const hasCoords = typeof lat === 'number' && typeof lng === 'number'
  const todaysHours = (() => {
    if (!hours) return null
    const day = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]
    return hours[day] ?? null
  })()

  const BottomIcon = bottomCta?.icon

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
          Visit Us
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-[11px] font-extrabold uppercase tracking-wider active:scale-[0.96] transition"
          style={{ color: themeColor }}
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          Close
        </button>
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: themeColor }} strokeWidth={2.5} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-extrabold text-black">{displayName}</div>
            {address && <div className="text-[12px] text-gray-700 leading-snug">{address}</div>}
            {city && address !== city && (
              <div className="text-[11px] text-gray-500">{city}</div>
            )}
          </div>
        </div>
        {socials.length > 0 && (
          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-200">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${displayName} on ${s.label}`}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-black hover:bg-gray-800 shadow-sm active:scale-[0.94] transition"
              >
                {s.svg}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Today's hours + Check Booking calendar trigger */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-center gap-2">
        {todaysHours ? (
          <>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Today</span>
            <span className="text-[13px] font-extrabold text-black">{todaysHours}</span>
          </>
        ) : (
          <span className="text-[12px] font-bold text-gray-500">Hours not set</span>
        )}
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[11px] font-extrabold uppercase tracking-wider shadow-sm active:scale-[0.97]"
          style={{ background: themeColor }}
        >
          <Calendar className="w-3 h-3" strokeWidth={2.5} />
          Check Booking
        </button>
      </div>

      {calendarOpen && (
        <AvailabilityCalendarPopup
          displayName={displayName}
          busyDates={busyDates}
          themeColor={themeColor}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {hasCoords ? (
        <VisitUsMap lat={lat!} lng={lng!} theme={themeColor} />
      ) : (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center text-[12px] text-gray-500">
          {noLocationCopy}
        </div>
      )}

      {bottomCta && (
        <>
          <button
            type="button"
            onClick={bottomCta.onClick}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-extrabold text-[13px] shadow-md active:scale-[0.98] transition"
            style={{ background: themeColor }}
          >
            {BottomIcon && <BottomIcon className="w-4 h-4" strokeWidth={2.5} />}
            {bottomCta.label}
          </button>
          {bottomCta.note && (
            <p className="text-[10px] text-gray-400 leading-snug text-center">
              {bottomCta.note}
            </p>
          )}
        </>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Availability calendar popup — read-only month grid showing busy_dates
// ─────────────────────────────────────────────────────────────────────

export function AvailabilityCalendarPopup({
  displayName, busyDates, themeColor, onClose,
}: {
  displayName: string
  busyDates:   string[]
  themeColor:  string
  onClose:     () => void
}) {
  const todayIso = useMemo(() => {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])
  const [viewMonth, setViewMonth] = useState(() => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
  })

  const cells = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const start  = new Date(viewMonth + 'T00:00:00')
    const first  = start.getDay()
    const total  = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    const out: Array<{ iso: string; day: number; inMonth: boolean }> = []
    const prevTotal = new Date(start.getFullYear(), start.getMonth(), 0).getDate()
    for (let i = first - 1; i >= 0; i--) {
      const day = prevTotal - i
      const d = new Date(start.getFullYear(), start.getMonth() - 1, day)
      out.push({ iso: iso(d), day, inMonth: false })
    }
    for (let day = 1; day <= total; day++) {
      const d = new Date(start.getFullYear(), start.getMonth(), day)
      out.push({ iso: iso(d), day, inMonth: true })
    }
    while (out.length < 42) {
      const last = out[out.length - 1]
      const ld = new Date(last.iso + 'T00:00:00')
      ld.setDate(ld.getDate() + 1)
      out.push({ iso: iso(ld), day: ld.getDate(), inMonth: ld.getMonth() === start.getMonth() })
    }
    return out
  }, [viewMonth])

  const busySet = useMemo(() => new Set(busyDates), [busyDates])

  function shiftMonth(delta: number) {
    const d = new Date(viewMonth + 'T00:00:00')
    d.setMonth(d.getMonth() + delta)
    const pad = (n: number) => n.toString().padStart(2, '0')
    setViewMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`)
  }

  const monthLabel = new Date(viewMonth + 'T00:00:00')
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ borderTop: `4px solid ${themeColor}` }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center z-10"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
        {/* Header strip — themed Calendar icon + label above the heading
            so the popup reads as a clear booking-calendar surface. */}
        <div
          className="flex items-center gap-3 px-5 pt-6 pb-4 border-b border-gray-100"
        >
          <div
            className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: `${themeColor}18`,
              border: `1.5px solid ${themeColor}40`,
            }}
          >
            <Calendar className="w-6 h-6" strokeWidth={2.25} style={{ color: themeColor }} />
          </div>
          <div className="min-w-0">
            <div
              className="text-[10.5px] font-extrabold uppercase tracking-[0.15em]"
              style={{ color: themeColor }}
            >
              Booking Calendar
            </div>
            <div className="text-[16px] font-black text-black leading-tight mt-0.5 truncate">
              {displayName}&apos;s availability
            </div>
          </div>
        </div>

        <div className="px-5 pt-4 pb-5">
          <p className="text-[12px] text-gray-500">
            Red dates are unavailable. Use the Contact button to book any other day.
          </p>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <div className="text-[15px] font-black text-black">{monthLabel}</div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mt-3 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-[10px] font-bold text-gray-400 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c) => {
              const inMonth = c.inMonth
              const isToday = c.iso === todayIso
              const isBusy  = busySet.has(c.iso)
              const isPast  = c.iso < todayIso
              let bg = 'bg-transparent'
              let text = inMonth ? (isPast ? 'text-gray-300' : 'text-gray-800') : 'text-gray-200'
              let ring = ''
              if (isBusy && inMonth) {
                bg   = ''
                text = 'text-white'
              } else if (isToday) {
                ring = 'ring-2'
              }
              return (
                <div
                  key={c.iso}
                  className={`relative aspect-square rounded-lg ${bg} ${text} ${ring} text-[12px] font-bold flex items-center justify-center`}
                  style={
                    isBusy && inMonth
                      ? { background: '#EF4444' }
                      : isToday
                        ? { '--tw-ring-color': themeColor } as React.CSSProperties
                        : undefined
                  }
                >
                  {c.day}
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500" /> Unavailable
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded ring-2" style={{ '--tw-ring-color': themeColor } as React.CSSProperties} /> Today
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Brand-mark SVGs — inlined so the bundle doesn't pick up a second
// lucide style and the marks visually match the real platforms.
// ─────────────────────────────────────────────────────────────────────

export function SocialInstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  )
}
export function SocialTikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.5 7.5a6 6 0 0 1-4.5-2v8.5a5 5 0 1 1-5-5c.34 0 .68.04 1 .11v2.6a2.5 2.5 0 1 0 1.75 2.39V3h2.5a4 4 0 0 0 4 4v.5z" />
    </svg>
  )
}
export function SocialFacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.5 22v-8h2.7l.4-3.1H13.5V8.9c0-.9.25-1.5 1.55-1.5h1.65V4.6c-.3-.05-1.3-.13-2.45-.13-2.4 0-4.05 1.46-4.05 4.16v2.27H7.5V14h2.7v8h3.3z" />
    </svg>
  )
}
