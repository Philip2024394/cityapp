import Link from 'next/link'
import { ChevronRight, Plus, Search, Star, X } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { TOUR_SERVICES, type TourServiceId } from '@/data/tourServices'
import { getLanguageByCode } from '@/data/tourLanguages'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tour Guides · Kita2u',
  description:
    'Local tour guides across Indonesia — temples, beaches, mountains, jungles. WhatsApp the guide directly to book.',
}

// ============================================================================
// /tour — Marketplace ported to the /beautician shell (2026-05-28).
// White wordmark header → centered rounded white card → title + List pill,
// search input, scrollable theme-chip row, landscape row cards. Server-side
// data fetch preserved from the previous incarnation; chip filtering + search
// are URL-param-driven so the page stays a pure server component (works
// without JS, no extra API endpoint required).
// ============================================================================

const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'] as const

function format12h(time: string): string {
  const h = parseInt((time.split(':')[0] || '0'), 10)
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  if (h < 12)   return `${h}am`
  return `${h - 12}pm`
}

function todayHoursLabel(hours: Record<string, string> | null | undefined): string | null {
  if (!hours) return null
  const today = DAY_KEYS[new Date().getDay()]
  const range = hours[today]
  if (!range) return null
  const [start, end] = range.split('-').map((s) => s.trim())
  if (!start || !end) return null
  return `${format12h(start)} – ${format12h(end)}`
}

function isWithinOperatingHours(hours: Record<string, string> | null | undefined): boolean {
  if (!hours) return true
  const today = DAY_KEYS[new Date().getDay()]
  const range = hours[today]
  if (!range) return false
  const [start, end] = range.split('-').map((s) => s.trim())
  if (!start || !end) return true
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if (!Number.isFinite(sh) || !Number.isFinite(eh)) return true
  const now = new Date()
  const nowMin   = now.getHours() * 60 + now.getMinutes()
  const startMin = sh * 60 + (sm || 0)
  const endMin   = eh * 60 + (em || 0)
  return nowMin >= startMin && nowMin < endMin
}

function effectiveAvailability(
  raw: 'online' | 'busy' | 'offline',
  hours: Record<string, string> | null | undefined,
): 'online' | 'busy' | 'offline' {
  if (raw !== 'online') return raw
  return isWithinOperatingHours(hours) ? 'online' : 'busy'
}

// Deterministic placeholder rating per guide (4.3 – 4.9). Used only when the
// row has no real rating yet.
function placeholderRating(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i)
    h |= 0
  }
  return 4.3 + ((Math.abs(h) % 70) / 100)
}

type Row = {
  id: string
  slug: string
  name: string
  whatsapp_e164: string
  city: string
  services: string[]
  languages: string[]
  day_rate_idr: number | null
  notes: string | null
  rating: number | null
  review_count: number
  image_urls: string[] | null
  fuel_included: boolean | null
  availability: 'online' | 'busy' | 'offline'
  bike_brand: string | null
  is_mock?: boolean
  cover_image_url?: string | null
  theme_color?: string | null
  gallery_image_urls?: string[] | null
  operating_hours?: Record<string, string> | null
}

// Chip definitions — primary themes shown first, then everything else.
// `category` URL param drives selection; null = "All".
type ChipDef = { id: 'all' | TourServiceId; label: string }
const PRIMARY_CHIPS: ChipDef[] = [
  { id: 'all',         label: 'All'         },
  { id: 'temples',     label: 'Temples'     },
  { id: 'beaches',     label: 'Beaches'     },
  { id: 'city_center', label: 'City Tour'   },
  { id: 'volcano',     label: 'Volcano'     },
]
const PRIMARY_IDS = new Set(PRIMARY_CHIPS.map((c) => c.id))
const SECONDARY_CHIPS: ChipDef[] = TOUR_SERVICES
  .filter((s) => !PRIMARY_IDS.has(s.id))
  .map((s) => ({ id: s.id, label: s.label }))

export default async function TourGuideFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; category?: string; q?: string }>
}) {
  const admin = getAdminSupabase()
  if (!admin) return <p className="p-6 text-muted">Server not configured.</p>

  const { city: cityParam, category: categoryParam, q: queryParam } = await searchParams
  const cityLabel = (cityParam?.trim() || 'Yogyakarta')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  const validCategory: TourServiceId | null = (() => {
    if (!categoryParam) return null
    const found = TOUR_SERVICES.find((s) => s.id === categoryParam)
    return found ? found.id : null
  })()
  const query = (queryParam ?? '').trim()

  // Real guides
  const { data: realRows } = await admin
    .from('tour_guide_listings')
    .select('id, slug, name, whatsapp_e164, city, services, languages, day_rate_idr, notes, rating, review_count, image_urls, fuel_included, availability, bike_brand, cover_image_url, theme_color, gallery_image_urls, operating_hours')
    .eq('status', 'approved')
    .order('rating', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  // Mock guides (migration 0052). Auto-hidden one-per-real-signup by the DB
  // trigger; reals always render before mocks.
  const { data: mockRows } = await admin
    .from('mock_tour_guide_listings')
    .select('id, slug, name, whatsapp_e164, city, services, languages, day_rate_idr, notes, rating, image_urls, fuel_included, availability, bike_brand')
    .is('mock_hidden_at', null)
    .order('rating', { ascending: false, nullsFirst: false })

  const reals: Row[] = (realRows as Row[] | null) ?? []
  const mocks: Row[] = ((mockRows as Omit<Row,'review_count'|'is_mock'>[] | null) ?? []).map((r) => ({
    ...r, review_count: 0, is_mock: true,
  }))
  // Reals first, then mocks; within each bucket: online > busy > offline.
  const availabilityRank: Record<string, number> = { online: 0, busy: 1, offline: 2 }
  const all: Row[] = [...reals, ...mocks].sort((a, b) => {
    const am = a.is_mock ? 1 : 0
    const bm = b.is_mock ? 1 : 0
    if (am !== bm) return am - bm
    return (availabilityRank[a.availability] ?? 9) - (availabilityRank[b.availability] ?? 9)
  })

  // Category + search are applied in JS so the data fetch can be cached
  // independently of the filters (same pattern as the /beautician client).
  const list: Row[] = all.filter((r) => {
    if (validCategory && !(r.services ?? []).includes(validCategory)) return false
    if (query) {
      const q = query.toLowerCase()
      const name = r.name?.toLowerCase() ?? ''
      const city = r.city?.toLowerCase() ?? ''
      const notes = r.notes?.toLowerCase() ?? ''
      if (!name.includes(q) && !city.includes(q) && !notes.includes(q)) return false
    }
    return true
  })

  // Build chip hrefs that preserve other filters (so toggling category
  // doesn't clear the city or search query).
  const chipHref = (id: 'all' | TourServiceId): string => {
    const sp = new URLSearchParams()
    if (cityParam?.trim()) sp.set('city', cityParam.trim())
    if (id !== 'all')      sp.set('category', id)
    if (query)             sp.set('q', query)
    const s = sp.toString()
    return s ? `/tour?${s}` : '/tour'
  }
  const clearSearchHref = (() => {
    const sp = new URLSearchParams()
    if (cityParam?.trim()) sp.set('city', cityParam.trim())
    if (validCategory)     sp.set('category', validCategory)
    const s = sp.toString()
    return s ? `/tour?${s}` : '/tour'
  })()

  return (
    <Shell>
      <div className="px-[15px] pb-10">
        <div
          className="mx-auto bg-white rounded-3xl shadow-2xl w-full overflow-hidden"
          style={{
            maxWidth: 640,
            boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.04)',
          }}
        >
          <div className="flex flex-col p-4 sm:p-5">
            {/* ROW 1 — Header: title + small "List" yellow pill */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <h1 className="text-[18px] sm:text-[20px] font-black tracking-tight text-bg leading-tight">
                  Tour guides in {cityLabel}
                </h1>
                <p className="text-[12px] font-bold text-[#71717A] leading-tight mt-0.5 truncate">
                  Local guides in {cityLabel} · Day trips · Half-day · Custom
                </p>
              </div>
              <Link
                href="/tour/list/auth"
                aria-label="List as tour guide"
                className="shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-bg font-extrabold text-[13px] active:scale-95 transition"
                style={{
                  background: '#FACC15',
                  boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
                  minHeight: 32,
                }}
              >
                <span
                  className="w-5 h-5 rounded-full inline-flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.10)' }}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                <span>List</span>
              </Link>
            </div>

            {/* ROW 2 — Search input (GET form so server can filter) */}
            <form method="GET" action="/tour" className="mt-3 relative shrink-0">
              {cityParam?.trim() && (
                <input type="hidden" name="city" value={cityParam.trim()} />
              )}
              {validCategory && (
                <input type="hidden" name="category" value={validCategory} />
              )}
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search guides — name, area, specialty…"
                aria-label="Search tour guides"
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-bg placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                style={{ minHeight: 44 }}
              />
              {query ? (
                <Link
                  href={clearSearchHref}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full inline-flex items-center justify-center text-[#71717A] hover:text-bg transition"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </Link>
              ) : (
                <button
                  type="submit"
                  aria-label="Submit search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full inline-flex items-center justify-center text-[#52525B] hover:text-bg transition"
                >
                  <Search className="w-[18px] h-[18px]" strokeWidth={2.4} />
                </button>
              )}
            </form>

            {/* ROW 3 — Horizontal scrollable theme chip row */}
            <div
              className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto overscroll-contain shrink-0"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              role="tablist"
              aria-label="Filter tour guides by theme"
            >
              {PRIMARY_CHIPS.map((chip) => {
                const active = chip.id === 'all'
                  ? validCategory === null
                  : validCategory === chip.id
                return <ChipLink key={chip.id} href={chipHref(chip.id)} label={chip.label} active={active} />
              })}
              {SECONDARY_CHIPS.map((chip) => {
                const active = validCategory === chip.id
                return (
                  <ChipLink
                    key={chip.id}
                    href={chipHref(active ? 'all' : chip.id)}
                    label={chip.label}
                    active={active}
                  />
                )
              })}
            </div>

            {/* ROW 4 — Card list */}
            <div
              className="mt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 -mx-1 px-1"
              style={{ maxHeight: '62vh', scrollbarWidth: 'thin' }}
            >
              {list.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[13px] font-bold text-[#71717A] leading-snug">
                    {query
                      ? `No results for "${query}". Try a different keyword.`
                      : 'No tour guides in this category yet. Try a different filter.'}
                  </p>
                </div>
              ) : (
                list.map((r) => <TourRowCard key={r.id} row={r} />)
              )}
            </div>

            {/* ROW 5 — Positive footer copy */}
            <p className="mt-3 text-center text-[12px] text-[#52525B] font-bold leading-snug px-2 shrink-0">
              Book direct via WhatsApp · No commissions, no platform fees
              — you pay your guide directly.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChipLink — server-rendered counterpart to /beautician's ChipButton. Same
// visual treatment (yellow when active, neutral when idle) but navigates via
// URL params instead of mutating local state.
// ─────────────────────────────────────────────────────────────────────────────
function ChipLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-extrabold tracking-tight transition active:scale-95 inline-flex items-center justify-center"
      style={{
        background: active ? '#FACC15' : '#F4F4F5',
        color: active ? '#0A0A0A' : '#52525B',
        border: active ? '1px solid #FACC15' : '1px solid #E4E4E7',
        boxShadow: active ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
        minHeight: 34,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TourRowCard — landscape card mirroring /beautician's row card. 88×88 photo
// left, name + primary tour theme + today's hours middle, online dot + theme
// pills + language flags below, rating top-right, yellow chevron bottom-right.
// ─────────────────────────────────────────────────────────────────────────────
function TourRowCard({ row: r }: { row: Row }) {
  const eff = effectiveAvailability(r.availability, r.operating_hours)
  const rating = ((r.is_mock || r.review_count > 0)
    ? (r.rating ?? placeholderRating(r.slug))
    : placeholderRating(r.slug)).toFixed(1)
  const hours = todayHoursLabel(r.operating_hours) ?? 'By appointment'

  // Primary theme — first service in services[] (set on signup, max 3).
  // Falls back to bike brand for legacy mock rows that omit services.
  const primaryService = (r.services && r.services.length > 0) ? r.services[0] : null
  const primaryThemeLabel = primaryService
    ? (TOUR_SERVICES.find((s) => s.id === primaryService)?.label
       ?? primaryService.charAt(0).toUpperCase() + primaryService.slice(1))
    : (r.bike_brand ? `${r.bike_brand}` : null)

  // Cover image priority — explicit cover, then first portfolio photo, then
  // gallery. No image → branded initial gradient.
  const profileImg = r.cover_image_url
    ?? (r.image_urls && r.image_urls.length > 0 ? r.image_urls[0] : null)
    ?? (r.gallery_image_urls && r.gallery_image_urls.length > 0 ? r.gallery_image_urls[0] : null)

  // Theme pills — up to two additional services beyond the primary. Text-only,
  // no icons, matching /beautician's service-location pill styling.
  const themePills: string[] = (r.services ?? [])
    .slice(0, 3)
    .map((id) => TOUR_SERVICES.find((s) => s.id === id)?.label
                 ?? id.charAt(0).toUpperCase() + id.slice(1))

  // Top language flag (excluding the always-present Bahasa Indonesia) gives
  // tourists a quick "this guide speaks my language" cue.
  const topNonIdLang = (r.languages ?? [])
    .filter((c) => c !== 'id')
    .map((code) => getLanguageByCode(code))
    .find((l): l is NonNullable<typeof l> => l !== null)

  const priceLabel = r.day_rate_idr != null
    ? `Rp ${r.day_rate_idr.toLocaleString('id-ID')}/day`
    : null

  const dotColor   = eff === 'online' ? '#22C55E' : eff === 'busy' ? '#F59E0B' : '#A1A1AA'
  const dotText    = eff === 'online' ? '#15803D' : eff === 'busy' ? '#A16207' : '#71717A'
  const dotLabel   = eff === 'online' ? 'Online'  : eff === 'busy' ? 'Busy'    : 'Offline'

  return (
    <Link
      href={`/tour/${r.slug}`}
      aria-label={`Open ${r.name}`}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#FACC15] active:scale-[0.99] transition"
      style={{
        minHeight: 112,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {/* Image — 88px square */}
      <div className="shrink-0 rounded-lg overflow-hidden bg-[#F4F4F5]" style={{ width: 88, height: 88 }}>
        {profileImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profileImg}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)' }}
            aria-hidden
          >
            <span className="text-bg font-black text-[24px]">
              {r.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        )}
      </div>

      {/* Middle column */}
      <div className="min-w-0 flex-1">
        <span className="block text-[14px] font-black text-bg truncate leading-tight">
          {r.name}
        </span>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-[#52525B] leading-tight">
          {primaryThemeLabel && <span className="truncate">{primaryThemeLabel}</span>}
          {primaryThemeLabel && <span className="text-[#A1A1AA]">·</span>}
          <span className="truncate">{hours}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 text-[12px] font-extrabold"
            style={{ color: dotText }}
          >
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: dotColor,
                boxShadow: eff === 'online' ? '0 0 4px rgba(34,197,94,0.65)' : 'none',
              }}
            />
            {dotLabel}
          </span>
          {priceLabel && (
            <span className="text-[12px] font-extrabold text-bg truncate">
              {priceLabel}
            </span>
          )}
          {topNonIdLang && (
            <span
              className="inline-flex items-center gap-0.5 text-[12px] font-extrabold text-[#52525B] shrink-0"
              aria-label={`Speaks ${topNonIdLang.label}`}
            >
              <span aria-hidden>{topNonIdLang.flag}</span>
            </span>
          )}
        </div>
        {themePills.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
            {themePills.map((label) => (
              <span
                key={label}
                className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 bg-[#FEF9C3] border border-[#FDE68A] text-[#854D0E] text-[12px] font-extrabold leading-none whitespace-nowrap"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right column — rating top, chevron bottom */}
      <div className="shrink-0 flex flex-col items-end justify-between h-[88px] py-0.5">
        <span className="inline-flex items-center gap-0.5 text-[12px] font-extrabold text-bg">
          <Star className="w-3 h-3" strokeWidth={2.5} fill="#FACC15" style={{ color: '#FACC15' }} aria-hidden />
          {rating}
        </span>
        <ChevronRight className="w-5 h-5" strokeWidth={2.75} aria-hidden style={{ color: '#FACC15' }} />
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell — wordmark header matching /beautician + /places. Fixed backdrop +
// soft white top scrim so the dark wordmark stays readable.
// ─────────────────────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="relative min-h-[100dvh]"
      style={{ color: '#0A0A0A' }}
    >
      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Kita2u home" className="inline-block hover:opacity-85 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351"
              alt="Kita2u"
              className="h-8 sm:h-10 w-auto"
            />
          </Link>
        </div>
      </header>

      {children}
    </main>
  )
}
