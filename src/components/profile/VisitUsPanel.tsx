'use client'
import { useMemo, useState } from 'react'
import { MapPin, Calendar, X, ChevronLeft, ChevronRight, Globe, type LucideIcon } from 'lucide-react'
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
  xUrl?:         string | null
  snapchatUrl?:  string | null
  websiteUrl?:   string | null
  // mig 0132 — chat handles. WhatsApp stays as the primary CTA on the
  // public profile (separate Contact Me button); these four render as
  // additional icon buttons under the map.
  whatsappE164?:   string | null
  telegramHandle?: string | null
  wechatId?:       string | null
  lineId?:         string | null
  kakaotalkId?:    string | null
  busyDates:     string[]
  themeColor:    string
  onClose:       () => void
  /** Optional single bottom CTA below the map. Backwards-compatible
   *  with the original beautician + handyman call sites. Use
   *  `bottomCtas` (plural) for the new 2-button transport pattern. */
  bottomCta?: {
    label:    string
    icon?:    LucideIcon
    onClick:  () => void
    /** Small text rendered under the button. */
    note?:    string
  } | null
  /** Optional array of bottom CTAs. When supplied AND length >= 1, this
   *  takes precedence over `bottomCta` and renders the buttons in a
   *  grid (2 cols when 2 entries, 1 col otherwise). Used by /places
   *  profile to surface the Bike + Car "Take me there" pair under the
   *  map — the destination is right there in the panel context. */
  bottomCtas?: Array<{
    label:    string
    icon?:    LucideIcon
    onClick:  () => void
    /** Small text rendered under the button. */
    note?:    string
    /** Optional visual variant; defaults to 'yellow'. */
    variant?: 'yellow' | 'navy'
  }>
  /** Copy override for the "no coordinates pinned" placeholder. */
  noLocationCopy?: string
}

export default function VisitUsPanel({
  displayName, address, city, lat, lng, hours,
  instagramUrl, tiktokUrl, facebookUrl,
  xUrl, snapchatUrl, websiteUrl,
  whatsappE164, telegramHandle, wechatId, lineId, kakaotalkId,
  busyDates, themeColor, onClose,
  bottomCta = null,
  bottomCtas,
  noLocationCopy = 'Lokasi belum di-pin oleh provider.',
}: VisitUsPanelProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  // Contact + social icon row. Chat apps first (more direct intent),
  // then social URLs. Each entry shows only if the underlying handle /
  // URL is non-empty, identical pattern to the original socials row.
  const contacts: Array<{ href: string; label: string; svg: React.ReactNode }> = []
  if (whatsappE164?.trim()) {
    const digits = whatsappE164.trim().replace(/^\+/, '').replace(/\D/g, '')
    if (digits) contacts.push({ href: `https://wa.me/${digits}`, label: 'WhatsApp', svg: <ChatWhatsAppIcon /> })
  }
  if (telegramHandle?.trim()) {
    const v = telegramHandle.trim()
    const href = v.startsWith('http') ? v
      : v.startsWith('@') ? `https://t.me/${v.slice(1)}`
      : v.startsWith('+') ? `https://t.me/${v.replace(/\D/g, '')}`
      : `https://t.me/${v}`
    contacts.push({ href, label: 'Telegram', svg: <ChatTelegramIcon /> })
  }
  if (wechatId?.trim())    contacts.push({ href: `weixin://dl/chat?${wechatId.trim()}`, label: 'WeChat',   svg: <ChatWeChatIcon /> })
  if (lineId?.trim())      contacts.push({ href: `https://line.me/ti/p/${lineId.trim()}`, label: 'Line', svg: <ChatLineIcon /> })
  if (kakaotalkId?.trim()) contacts.push({ href: `https://open.kakao.com/o/${kakaotalkId.trim()}`, label: 'KakaoTalk', svg: <ChatKakaoIcon /> })
  if (instagramUrl?.trim()) contacts.push({ href: instagramUrl.trim(), label: 'Instagram', svg: <SocialInstagramIcon /> })
  if (tiktokUrl?.trim())    contacts.push({ href: tiktokUrl.trim(),    label: 'TikTok',    svg: <SocialTikTokIcon />    })
  if (facebookUrl?.trim())  contacts.push({ href: facebookUrl.trim(),  label: 'Facebook',  svg: <SocialFacebookIcon />  })
  if (xUrl?.trim())         contacts.push({ href: xUrl.trim(),         label: 'X',         svg: <SocialXIcon />         })
  if (snapchatUrl?.trim())  contacts.push({ href: snapchatUrl.trim(),  label: 'Snapchat',  svg: <SocialSnapchatIcon />  })
  if (websiteUrl?.trim())   contacts.push({ href: websiteUrl.trim(),   label: 'Website',   svg: <SocialWebsiteIcon />   })

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

      {/* Address card — address text on the left, map + chat icon row
          on the right (sm:+ side-by-side, mobile stacks). Chat / social
          icons sit at lower-right under the map. */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3 items-start">
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: themeColor }} strokeWidth={2.5} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-extrabold text-black">{displayName}</div>
              {address && <div className="text-[12px] text-gray-700 leading-snug mt-0.5">{address}</div>}
              {city && address !== city && (
                <div className="text-[12px] text-gray-500 mt-0.5">{city}</div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {hasCoords ? (
              <VisitUsMap lat={lat!} lng={lng!} theme={themeColor} />
            ) : (
              <div className="rounded-xl bg-white border border-gray-200 p-3 text-center text-[12px] text-gray-500">
                {noLocationCopy}
              </div>
            )}
            {contacts.length > 0 && (
              <div className="flex items-center justify-end flex-wrap gap-1.5">
                {contacts.map((s) => (
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
        </div>
      </div>

      {/* Today's hours + Check Booking calendar trigger */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-center gap-2">
        {todaysHours ? (
          <>
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-gray-500">Today</span>
            <span className="text-[13px] font-extrabold text-black">{todaysHours}</span>
          </>
        ) : (
          <span className="text-[12px] font-bold text-gray-500">Hours not set</span>
        )}
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[12px] font-extrabold uppercase tracking-wider shadow-sm active:scale-[0.97]"
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

      {/* Multi-CTA path (places use this for Bike + Car). Takes precedence
          over the single-bottomCta path when supplied + non-empty. */}
      {bottomCtas && bottomCtas.length > 0 ? (
        <>
          <div className={bottomCtas.length === 2 ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
            {bottomCtas.map((cta, i) => {
              const Icon = cta.icon
              const isNavy = cta.variant === 'navy'
              return (
                <button
                  key={i}
                  type="button"
                  onClick={cta.onClick}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-extrabold text-[13px] shadow-md active:scale-[0.98] transition"
                  style={
                    isNavy
                      ? { background: '#0F172A', color: '#FFFFFF' }
                      : { background: '#FACC15', color: '#0A0A0A' }
                  }
                >
                  {Icon && <Icon className="w-4 h-4" strokeWidth={2.5} />}
                  {cta.label}
                </button>
              )
            })}
          </div>
          {bottomCtas.some(c => c.note) && (
            <p className="text-[10px] text-gray-400 leading-snug text-center">
              {bottomCtas.find(c => c.note)?.note}
            </p>
          )}
        </>
      ) : bottomCta && (
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
export function SocialXIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 3H21l-6.51 7.43L22 21h-6.797l-4.77-6.243L4.77 21H2.014l6.96-7.948L2 3h6.969l4.31 5.696L18.244 3zm-2.392 16.2h1.882L8.246 4.71H6.227L15.852 19.2z" />
    </svg>
  )
}
export function SocialSnapchatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.166 2.005c2.83 0 4.992 1.677 5.747 4.213.2.673.243 1.36.214 2.054-.01.247-.038.583-.05.762.18.097.46.196.717.196.371-.006.7-.158.964-.298.083-.045.207-.07.296-.07.121 0 .244.022.351.06.32.115.484.367.486.65a.62.62 0 0 1-.18.444c-.225.244-.59.378-.83.481-.1.044-.198.078-.288.115-.354.146-.696.31-.69.546.003.117.039.226.083.343.245.65 1.06 1.694 2.43 1.926.137.024.235.149.236.288.001.045-.007.09-.024.135-.155.428-1.04.788-2.337.998-.121.02-.224.197-.272.378-.087.337-.226.86-.226.86s-.084.394-.5.394c-.026 0-.054-.002-.084-.005-.207-.022-.488-.073-.857-.073-.227 0-.466.018-.713.067-.452.094-.86.404-1.33.766-.694.535-1.478 1.14-2.732 1.14-.073 0-.146-.005-.219-.013-.013 0-.06.013-.073.013-1.255 0-2.04-.605-2.733-1.14-.467-.36-.876-.671-1.328-.766-.247-.05-.486-.067-.713-.067-.387 0-.696.06-.857.072a.598.598 0 0 1-.084.006c-.467 0-.512-.462-.502-.394 0 0-.137-.518-.225-.86-.047-.18-.15-.357-.272-.378-1.297-.21-2.182-.57-2.337-.998a.354.354 0 0 1-.024-.135.288.288 0 0 1 .236-.288c1.37-.232 2.185-1.275 2.43-1.926.045-.117.08-.226.083-.343.006-.235-.336-.4-.69-.546-.09-.037-.187-.07-.288-.115-.296-.127-.66-.265-.842-.527a.628.628 0 0 1-.063-.626c.084-.215.275-.348.51-.348a.713.713 0 0 1 .224.034c.32.144.604.224.92.224.348 0 .57-.13.612-.154-.012-.18-.04-.51-.05-.756a5.715 5.715 0 0 1 .213-2.062c.755-2.535 2.917-4.213 5.748-4.213z" />
    </svg>
  )
}
export function SocialWebsiteIcon() {
  return (
    <Globe width="16" height="16" strokeWidth={2} aria-hidden />
  )
}

// ─────────────────────────────────────────────────────────────────────
// Chat-app brand-mark SVGs — mig 0132 multi-chat. Same currentColor
// style as the social SVGs so they invert cleanly on the dark button
// background. Each is a recognisable silhouette without the full
// platform colour — keeps the row visually coherent.
// ─────────────────────────────────────────────────────────────────────

export function ChatWhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.165-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
export function ChatTelegramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
}
export function ChatWeChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .55-.012.822-.034a6.014 6.014 0 01-.241-1.676c0-3.532 3.39-6.397 7.595-6.397.082 0 .163.005.245.007-.502-3.687-4.064-6.582-8.421-6.582zm5.81 12.658c0-2.916-2.815-5.28-6.293-5.28-3.477 0-6.292 2.364-6.292 5.28 0 2.917 2.815 5.281 6.292 5.281a7.45 7.45 0 002.087-.299c.182-.052.378-.025.547.06l1.366.789a.241.241 0 00.124.04c.119 0 .216-.097.216-.217 0-.054-.021-.105-.034-.156l-.279-1.04a.434.434 0 01.157-.488c1.396-1.005 2.109-2.396 2.109-3.97zM5.785 7.412a.99.99 0 11.001-1.98.99.99 0 010 1.98zm5.781 0a.99.99 0 11.001-1.981.99.99 0 010 1.98zM12.547 14.5c-.527 0-.954-.4-.954-.892 0-.493.427-.892.954-.892.527 0 .954.4.954.892 0 .493-.427.892-.954.892zm4.768 0c-.527 0-.954-.4-.954-.892 0-.493.427-.892.954-.892.526 0 .954.4.954.892 0 .493-.428.892-.954.892z"/>
    </svg>
  )
}
export function ChatLineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
    </svg>
  )
}
export function ChatKakaoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3C6.486 3 2 6.589 2 11.005c0 2.804 1.798 5.262 4.5 6.687l-.937 3.404a.382.382 0 00.593.41l4.135-2.694C10.84 18.93 11.418 19 12 19c5.514 0 10-3.589 10-7.995S17.514 3 12 3z"/>
    </svg>
  )
}
