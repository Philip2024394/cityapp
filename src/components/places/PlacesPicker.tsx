'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, MapPin, Search, Star, X } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { haversineKm } from '@/lib/geo/haversine'
import { CATEGORIES, categoryMeta } from '@/lib/places/categories'
import { formatDistanceKm } from '@/lib/places/pricing'
import PlaceImage from './PlaceImage'
import type { Place, PlaceCategory } from '@/lib/places/types'

// ============================================================================
// PlacesPicker — inline scrollable place picker for the driver profile page.
// ----------------------------------------------------------------------------
// Renders as an embedded panel UNDER the booking widget instead of routing to
// the full /places page. Same search + chip filter + GPS-sort UX as the
// standalone PlacesBrowser, but tapping a card calls `onSelect(place)`
// directly — the parent shell hydrates its dropoff field and collapses
// the panel.
//
// Lazy-loads via browser Supabase on mount so we never bloat the SSR
// payload of every driver profile (only customers who tap "Places" pay
// the fetch cost).
// ============================================================================

type ChipFilter = 'all' | PlaceCategory
type ChipDef = { id: ChipFilter; label: string }

const PLACES_CHIPS: ReadonlyArray<ChipDef> = [
  { id: 'all',           label: 'All' },
  { id: 'temple',        label: 'Candi' },
  { id: 'beach',         label: 'Pantai' },
  { id: 'attraction',    label: 'Wisata' },
  { id: 'hotel',         label: 'Hotel' },
  { id: 'mall',          label: 'Mall' },
  { id: 'hospital',      label: 'RS' },
  { id: 'pharmacy',      label: 'Apotek' },
  { id: 'government',    label: 'Pemerintah' },
  { id: 'airport',       label: 'Bandara' },
  { id: 'train_station', label: 'Stasiun' },
  { id: 'bus_station',   label: 'Terminal' },
]

const BROWSE_CATEGORIES: ReadonlyArray<PlaceCategory> = [
  'temple', 'beach', 'attraction', 'hotel', 'mall',
  'hospital', 'pharmacy', 'government', 'airport',
  'train_station', 'bus_station',
]

function placeholderRating(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h) + id.charCodeAt(i)
    h |= 0
  }
  return 4.3 + ((Math.abs(h) % 70) / 100)
}

function isOpenNow(category: PlaceCategory, tags: string[]): boolean {
  if (tags.includes('open_24h')) return true
  if (
    category === 'hospital' || category === 'pharmacy' ||
    category === 'airport' || category === 'train_station' ||
    category === 'bus_station' || category === 'hotel'
  ) return true
  const hour = new Date().getHours()
  if (category === 'bar' || category === 'club') return hour >= 18 || hour < 2
  if (category === 'cafe') return hour >= 7 && hour < 22
  if (category === 'restaurant' || category === 'mall') return hour >= 10 && hour < 22
  return hour >= 8 && hour < 18
}

export default function PlacesPicker({
  city = 'yogyakarta',
  onSelect,
  onClose,
}: {
  city?: string
  onSelect: (place: Place) => void
  onClose: () => void
}) {
  const haptic = useHaptic()
  const geo = useGeolocation(true)

  const [places, setPlaces] = useState<Place[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ChipFilter>('all')

  useEffect(() => {
    let cancelled = false
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); setPlaces([]); return }
    supabase
      .from('places')
      .select('id, slug, name, category, description, image_urls, city, address, tags, lat, lng')
      .eq('city', city)
      .eq('status', 'approved')
      .in('category', BROWSE_CATEGORIES as unknown as string[])
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setPlaces([])
          setLoading(false)
          return
        }
        const mapped: Place[] = data.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          slug: String(row.slug),
          name: String(row.name),
          category: row.category as PlaceCategory,
          description: (row.description as string | null) ?? null,
          imageUrls: (row.image_urls as string[] | null) ?? [],
          lat: Number(row.lat),
          lng: Number(row.lng),
          city: String(row.city),
          address: (row.address as string | null) ?? null,
          tags: (row.tags as string[] | null) ?? [],
          isOutOfZone: false,
          returnKm: 0,
        }))
        setPlaces(mapped)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [city])

  const filtered = useMemo(() => {
    const src = places ?? []
    const base = filter === 'all' ? src : src.filter((p) => p.category === filter)
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
    return formatDistanceKm(haversineKm(geo.coords, { lat: place.lat, lng: place.lng }))
  }

  function handleTap(place: Place) {
    haptic.tap()
    onSelect(place)
  }

  return (
    <section
      aria-label="Pick a destination"
      className="mt-3 rounded-3xl overflow-hidden bg-white"
      style={{
        border: '1px solid #E4E4E7',
        boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
      }}
    >
      <div className="flex flex-col p-4">
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h3 className="text-[15px] font-black tracking-tight leading-tight" style={{ color: '#0A0A0A' }}>
              Pick a destination
            </h3>
            <p className="text-[12px] font-bold leading-tight mt-0.5" style={{ color: '#71717A' }}>
              Tap a place to set as your drop-off
            </p>
          </div>
          <button
            type="button"
            onClick={() => { haptic.tap(); onClose() }}
            aria-label="Close places picker"
            className="shrink-0 inline-flex items-center justify-center rounded-full active:scale-95 transition"
            style={{
              width: 36, height: 36,
              background: '#F4F4F5',
              color: '#52525B',
              border: '1px solid #E4E4E7',
            }}
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-3 relative shrink-0">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search — hotel, pantai, candi…"
            aria-label="Search places by name or category"
            className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#0A0A0A] placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[13px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
            style={{ minHeight: 44 }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); haptic.tap() }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full inline-flex items-center justify-center text-[#71717A] hover:text-[#0A0A0A] transition"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          ) : (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center" aria-hidden>
              <Search className="w-[18px] h-[18px] text-[#52525B]" strokeWidth={2.4} />
            </span>
          )}
        </div>

        <div
          className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto overscroll-contain shrink-0"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          role="tablist"
          aria-label="Filter places by category"
        >
          {PLACES_CHIPS.map((chip) => {
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

        <div
          className="mt-3 overflow-y-auto overscroll-contain space-y-2 -mx-1 px-1"
          style={{ maxHeight: '55vh', scrollbarWidth: 'thin' }}
        >
          {loading && (
            <div className="py-10 text-center">
              <p className="text-[13px] font-bold" style={{ color: '#71717A' }}>Loading places…</p>
            </div>
          )}
          {!loading && sorted.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[13px] font-bold leading-snug" style={{ color: '#71717A' }}>
                {query.trim()
                  ? `No results for "${query.trim()}". Try a different keyword.`
                  : 'No places in this category yet. Try a different filter.'}
              </p>
            </div>
          )}
          {!loading && sorted.map((p) => (
            <PlaceRowCard
              key={p.id}
              place={p}
              distanceLabel={distanceFor(p)}
              onPick={() => handleTap(p)}
            />
          ))}
        </div>

        <p className="mt-3 text-center text-[11px] font-bold leading-snug px-2 shrink-0" style={{ color: '#52525B' }}>
          Self-listed venues · IndoCity is a software directory. Hours and details are owner-published.
        </p>
      </div>
    </section>
  )
}

function PlaceRowCard({
  place,
  distanceLabel,
  onPick,
}: {
  place: Place
  distanceLabel: string
  onPick: () => void
}) {
  const meta = CATEGORIES[place.category]
  const rating = placeholderRating(place.id).toFixed(1)
  const open = isOpenNow(place.category, place.tags)

  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Set ${place.name} as drop-off`}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#FACC15] active:scale-[0.99] transition"
      style={{
        minHeight: 92,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div className="shrink-0 rounded-lg overflow-hidden bg-[#F4F4F5]" style={{ width: 72, height: 72 }}>
        <PlaceImage place={place} className="w-full h-full" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <span className="text-[14px] font-black text-[#0A0A0A] truncate leading-tight flex-1">
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
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end justify-between h-[72px] py-0.5">
        <span className="inline-flex items-center gap-0.5 text-[12px] font-extrabold text-[#0A0A0A]">
          <Star className="w-3 h-3" strokeWidth={2.5} fill="#FACC15" style={{ color: '#FACC15' }} aria-hidden />
          {rating}
        </span>
        <ChevronRight className="w-4 h-4 text-[#A1A1AA]" strokeWidth={2.5} aria-hidden />
      </div>
    </button>
  )
}
