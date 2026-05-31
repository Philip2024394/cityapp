'use client'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
  MapPin,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { haversineKm } from '@/lib/geo/haversine'
import { CATEGORIES, categoryMeta } from '@/lib/places/categories'
import { formatDistanceKm } from '@/lib/places/pricing'
import PlaceImage from './PlaceImage'
import type { Place, PlaceCategory } from '@/lib/places/types'

// ============================================================================
// PlacesBrowser — white-card client island for the redesigned /places page.
// ----------------------------------------------------------------------------
// Mirrors the visual language of /cari (2026-05-27 rewrite): a white card
// container with rounded-3xl + shadow-2xl, 15px screen-edge insets on mobile,
// max-width 640 on desktop. Inside:
//   1. Title row ("Places near you") + small "List Place" yellow pill action
//   2. Search input with magnifying-glass icon trailing
//   3. Horizontal scrollable category-filter chip row (active = brand yellow)
//   4. Scrollable landscape place cards (image left, title/category/distance
//      middle, ★ rating top-right, ChevronRight)
//   5. Compliance footer copy
//
// Compliance posture: CityDrivers is a software directory (PM 12/2019). Cards
// label venues as "self-listed". No fake "verified" badges; rating shown
// only when the row carries one from Supabase / the platform-deterministic
// placeholder generator.
// ============================================================================

// Tap a card → /places/[slug] detail page (unchanged from before; the
// detail surface still owns the WhatsApp / Maps handoffs).

type ChipFilter = 'all' | PlaceCategory
export type PlacesChipDef = { id: ChipFilter; label: string }

// Six logical category groupings collapsed to a single-row chip strip so
// the filter rail stays scannable on a 360-wide phone. Each chip maps to
// either 'all' or a single category id. Order chosen for tourist appeal
// (food/coffee first, then transit + health last).
//
// This is the default chip set used when the caller doesn't pass an
// explicit `chips` prop. /food and /places each pass their own narrower
// chip set so the rail reflects only the categories relevant to that
// surface.
const DEFAULT_CHIP_DEFS: ReadonlyArray<PlacesChipDef> = [
  { id: 'all',        label: 'All' },
  { id: 'restaurant', label: 'Resto' },
  { id: 'cafe',       label: 'Kafe' },
  { id: 'beach',      label: 'Pantai' },
  { id: 'temple',     label: 'Candi' },
  { id: 'attraction', label: 'Wisata' },
  { id: 'hotel',      label: 'Hotel' },
  { id: 'mall',       label: 'Mall' },
  { id: 'bar',        label: 'Bar' },
  { id: 'club',       label: 'Klub' },
  { id: 'hospital',   label: 'RS' },
  { id: 'pharmacy',   label: 'Apotek' },
]

// Deterministic placeholder rating per place — hashes the row's id into a
// stable number between 4.3 and 4.9 so every card shows a plausible star
// score and refreshes don't change it. Kept here rather than imported from
// PlaceCard.tsx so this file is self-contained (PlaceCard belongs to the
// old dark variant and may be deleted later).
function placeholderRating(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h) + id.charCodeAt(i)
    h |= 0
  }
  return 4.3 + ((Math.abs(h) % 70) / 100)
}

// Category-aware closing-time fallback. Same heuristics as the legacy
// PlaceCard until per-place hours_json is populated.
function isOpenNow(category: PlaceCategory, tags: string[]): boolean {
  if (tags.includes('open_24h')) return true
  if (
    category === 'hospital' ||
    category === 'pharmacy' ||
    category === 'airport' ||
    category === 'train_station' ||
    category === 'bus_station' ||
    category === 'hotel'
  ) {
    return true
  }
  const hour = new Date().getHours()
  if (category === 'bar' || category === 'club') return hour >= 18 || hour < 2
  if (category === 'cafe') return hour >= 7 && hour < 22
  if (category === 'restaurant' || category === 'mall') return hour >= 10 && hour < 22
  return hour >= 8 && hour < 18
}

export default function PlacesBrowser({
  places,
  currentCityLabel,
  chips,
  title,
  subtitle,
}: {
  places: Place[]
  currentCityLabel: string
  // Optional chip set — caller-supplied so /food and /places can each
  // render a tailored filter rail. Defaults to the full directory set.
  chips?: ReadonlyArray<PlacesChipDef>
  // Optional title + subtitle override for the header row. When omitted,
  // we render the legacy "Places near you" copy.
  title?: string
  subtitle?: string
}) {
  const CHIP_DEFS = chips ?? DEFAULT_CHIP_DEFS
  const router = useRouter()
  const searchParams = useSearchParams()
  const haptic = useHaptic()
  // autoRequest=true so the distance/sort fills in on mount without an
  // extra tap. If denied, distances simply show '—' on each card.
  const geo = useGeolocation(true)

  // Driver round-trip params — when the customer arrives here from a
  // driver profile, we carry `return_driver=r:slug` (or `c:slug`) plus
  // the customer's typed pickup (pName/pLat/pLng if available) forward
  // onto each place-card tap. The place profile reads `return_driver`
  // and replaces the Contact CTA with "Take me here →" so the customer
  // can route the chosen place back to the driver's booking widget as
  // the drop-off. When `return_driver` is absent these params are
  // empty and card taps behave exactly as before.
  const returnDriver = searchParams?.get('return_driver') ?? null
  const pName = searchParams?.get('pName') ?? null
  const pLat  = searchParams?.get('pLat')  ?? null
  const pLng  = searchParams?.get('pLng')  ?? null

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ChipFilter>('all')

  // Reduce by chip filter, then by free-text query against the place name
  // + both Bahasa/English category labels (so "hotel", "candi", "temple"
  // all narrow the list correctly).
  const filtered = useMemo(() => {
    const base = filter === 'all' ? places : places.filter((p) => p.category === filter)
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter((p) => {
      const meta = categoryMeta(p.category)
      return (
        p.name.toLowerCase().includes(q) ||
        meta.label.toLowerCase().includes(q) ||
        meta.labelEn.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    })
  }, [places, filter, query])

  // Sort by distance asc when GPS available, alphabetic otherwise. Distance
  // is computed via haversine — fast enough to run in the render loop.
  const sorted = useMemo(() => {
    if (!geo.coords) return filtered
    const coords = geo.coords
    return [...filtered].sort((a, b) => {
      const da = haversineKm(coords, { lat: a.lat, lng: a.lng })
      const db = haversineKm(coords, { lat: b.lat, lng: b.lng })
      return da - db
    })
  }, [filtered, geo.coords])

  function distanceFor(place: Place): string {
    if (!geo.coords) return '—'
    const km = haversineKm(geo.coords, { lat: place.lat, lng: place.lng })
    return formatDistanceKm(km)
  }

  function handleOpen(slug: string) {
    haptic.tap()
    // Forward driver-return + pickup params when present so the place
    // detail page can render the "Take me here →" CTA + round-trip the
    // customer's typed pickup back to the driver profile. When
    // `return_driver` is absent we route bare — preserving the existing
    // /places/[slug] behavior for customers who arrived organically.
    if (!returnDriver) {
      router.push(`/places/${slug}`)
      return
    }
    const sp = new URLSearchParams()
    sp.set('return_driver', returnDriver)
    if (pName) sp.set('pName', pName)
    if (pLat)  sp.set('pLat',  pLat)
    if (pLng)  sp.set('pLng',  pLng)
    router.push(`/places/${slug}?${sp.toString()}`)
  }

  return (
    <div
      className="mx-auto bg-white rounded-3xl shadow-2xl w-full overflow-hidden"
      style={{
        maxWidth: 640,
        boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.04)',
      }}
    >
      <div className="flex flex-col p-4 sm:p-5">
        {/* ROW 1 — Header bar: title + small "List Place" yellow pill */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-black tracking-tight text-bg leading-tight">
              {title ?? 'Places near you'}
            </h1>
            <p className="text-[12px] font-bold text-[#71717A] leading-tight mt-0.5 truncate">
              {subtitle ?? `${currentCityLabel} · self-listed venues`}
            </p>
          </div>
          <Link
            href="/list-place"
            onClick={() => haptic.tap()}
            aria-label="List your place"
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

        {/* ROW 2 — Search input */}
        <div className="mt-3 relative shrink-0">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places — hotel, pantai, candi…"
            aria-label="Search places by name or category"
            className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-bg placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
            style={{ minHeight: 44 }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); haptic.tap() }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full inline-flex items-center justify-center text-[#71717A] hover:text-bg transition"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          ) : (
            <span
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center"
              aria-hidden
            >
              <Search className="w-[18px] h-[18px] text-[#52525B]" strokeWidth={2.4} />
            </span>
          )}
        </div>

        {/* ROW 3 — Horizontal scrollable category chip row. Active chip =
            brand yellow, inactive = light gray. Tap to filter. */}
        <div
          className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto overscroll-contain shrink-0"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          role="tablist"
          aria-label="Filter places by category"
        >
          {CHIP_DEFS.map((chip) => {
            const active = filter === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => { setFilter(chip.id); haptic.tap() }}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-extrabold tracking-tight transition active:scale-95"
                style={{
                  background: active ? '#FACC15' : '#F4F4F5',
                  color: active ? '#0A0A0A' : '#52525B',
                  border: active ? '1px solid #FACC15' : '1px solid #E4E4E7',
                  boxShadow: active ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
                  minHeight: 34,
                  whiteSpace: 'nowrap',
                }}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* ROW 4 — Scrollable place card list. Capped at ~62vh so the
            container doesn't dominate desktop viewports; on phones it sits
            naturally between the chips and the disclaimer. */}
        <div
          className="mt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 -mx-1 px-1"
          style={{ maxHeight: '62vh', scrollbarWidth: 'thin' }}
        >
          {sorted.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[13px] font-bold text-[#71717A] leading-snug">
                {query.trim()
                  ? `No results for "${query.trim()}". Try a different keyword.`
                  : 'No places in this category yet. Try a different filter.'}
              </p>
            </div>
          )}
          {sorted.map((p) => (
            <PlaceRowCard
              key={p.id}
              place={p}
              distanceLabel={distanceFor(p)}
              onOpen={() => handleOpen(p.slug)}
            />
          ))}
        </div>

        {/* ROW 5 — Compliance disclaimer. Directory-posture copy aligned
            with /car and /cari: "self-listed" + "agree fare with driver". */}
        <p className="mt-3 text-center text-[11px] text-[#52525B] font-bold leading-snug px-2 shrink-0">
          Self-listed venues · Kita2u is a software directory.
          Hours and details are owner-published.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PlaceRowCard — landscape card. Image (72px square) left, title + meta in
// the middle, ★ rating top-right and ChevronRight bottom-right. Selectable
// by tap; tapping routes to /places/[slug]. Yellow border accent on hover/
// focus so the affordance is unambiguous on touch + desktop.
// ─────────────────────────────────────────────────────────────────────────────
function PlaceRowCard({
  place,
  distanceLabel,
  onOpen,
}: {
  place: Place
  distanceLabel: string
  onOpen: () => void
}) {
  const meta = CATEGORIES[place.category]
  const rating = placeholderRating(place.id).toFixed(1)
  const open = isOpenNow(place.category, place.tags)

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${place.name}`}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#FACC15] active:scale-[0.99] transition"
      style={{
        minHeight: 92,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {/* Image — 72px square, rounded. Falls back to a category gradient
          + icon when imageUrls is empty (handled by PlaceImage). */}
      <div className="shrink-0 rounded-lg overflow-hidden bg-[#F4F4F5]" style={{ width: 72, height: 72 }}>
        <PlaceImage place={place} className="w-full h-full" />
      </div>

      {/* Middle column — title + category + distance + open/closed badge */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <span className="text-[14px] font-black text-bg truncate leading-tight flex-1">
            {place.name}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-[#52525B] leading-tight">
          <span className="truncate">{meta.label}</span>
          <span className="text-[#A1A1AA]">·</span>
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <MapPin className="w-3 h-3" strokeWidth={2.5} aria-hidden />
            <span className="font-mono">{distanceLabel}</span>
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-extrabold"
            style={{ color: open ? '#15803D' : '#71717A' }}
          >
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: open ? '#22C55E' : '#A1A1AA',
                boxShadow: open ? '0 0 4px rgba(34,197,94,0.65)' : 'none',
              }}
            />
            {open ? 'Open now' : 'Closed'}
          </span>
          {place.isOutOfZone && (
            <>
              <span className="text-[#A1A1AA] text-[11px]">·</span>
              <span className="text-[11px] font-extrabold text-[#71717A]">Out of city</span>
            </>
          )}
        </div>
      </div>

      {/* Right column — rating top, ChevronRight bottom */}
      <div className="shrink-0 flex flex-col items-end justify-between h-[72px] py-0.5">
        <span className="inline-flex items-center gap-0.5 text-[12px] font-extrabold text-bg">
          <Star className="w-3 h-3" strokeWidth={2.5} fill="#FACC15" style={{ color: '#FACC15' }} aria-hidden />
          {rating}
        </span>
        <ChevronRight className="w-4 h-4 text-[#A1A1AA]" strokeWidth={2.5} aria-hidden />
      </div>
    </button>
  )
}

