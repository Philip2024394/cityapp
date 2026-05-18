'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Drawer } from 'vaul'
import { MapPin, AlertCircle, Search, X, Building2, Check, Plus } from 'lucide-react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import CategoryChips, { type PlaceFilter } from './CategoryChips'
import PlaceCard from './PlaceCard'
import { quotePlace, type PlaceQuote } from '@/lib/places/pricing'
import { categoryMeta, groupOf } from '@/lib/places/categories'
import { haversineKm } from '@/lib/geo/haversine'
import type { CityZone, Place } from '@/lib/places/types'

// Major Indonesian cities the picker lists. Coordinates are roughly each
// city's centroid — used for nearest-city detection when GPS lands.
const SUPPORTED_CITIES = [
  { slug: 'yogyakarta', label: 'Yogyakarta', lat: -7.7956, lng: 110.3695 },
  { slug: 'jakarta',    label: 'Jakarta',    lat: -6.2088, lng: 106.8456 },
  { slug: 'bandung',    label: 'Bandung',    lat: -6.9175, lng: 107.6191 },
  { slug: 'surabaya',   label: 'Surabaya',   lat: -7.2575, lng: 112.7521 },
  { slug: 'denpasar',   label: 'Denpasar',   lat: -8.6500, lng: 115.2167 },
  { slug: 'medan',      label: 'Medan',      lat:  3.5952, lng:  98.6722 },
  { slug: 'semarang',   label: 'Semarang',   lat: -6.9667, lng: 110.4167 },
  { slug: 'makassar',   label: 'Makassar',   lat: -5.1477, lng: 119.4327 },
  { slug: 'malang',     label: 'Malang',     lat: -7.9666, lng: 112.6326 },
  { slug: 'solo',       label: 'Solo',       lat: -7.5755, lng: 110.8243 },
  { slug: 'bogor',      label: 'Bogor',      lat: -6.5950, lng: 106.7917 },
  { slug: 'depok',      label: 'Depok',      lat: -6.4025, lng: 106.7942 },
  { slug: 'bekasi',     label: 'Bekasi',     lat: -6.2349, lng: 107.0064 },
  { slug: 'tangerang',  label: 'Tangerang',  lat: -6.1700, lng: 106.6300 },
  { slug: 'palembang',  label: 'Palembang',  lat: -2.9909, lng: 104.7565 },
  { slug: 'padang',     label: 'Padang',     lat: -0.9492, lng: 100.3543 },
  { slug: 'manado',     label: 'Manado',     lat:  1.4748, lng: 124.8421 },
  { slug: 'balikpapan', label: 'Balikpapan', lat: -1.2654, lng: 116.8312 },
  { slug: 'pontianak',  label: 'Pontianak',  lat: -0.0263, lng: 109.3425 },
  { slug: 'banjarmasin',label: 'Banjarmasin',lat: -3.3193, lng: 114.5904 },
] as const

function cityLabel(slug: string): string {
  return SUPPORTED_CITIES.find((c) => c.slug === slug)?.label ?? slug
}

function nearestCity(lat: number, lng: number): { slug: string; km: number } {
  let best = { slug: SUPPORTED_CITIES[0].slug, km: Infinity }
  for (const c of SUPPORTED_CITIES) {
    const km = haversineKm({ lat, lng }, { lat: c.lat, lng: c.lng })
    if (km < best.km) best = { slug: c.slug, km }
  }
  return best
}

export default function PlacesList({
  places,
  zone,
  currentCity,
}: {
  places: Place[]
  zone: CityZone | null
  currentCity: string
}) {
  const router = useRouter()
  const haptic = useHaptic()
  // autoRequest=true: prompt on mount so distances start filling in
  // immediately. If denied/blocked, the page still functions — cards
  // just show '—' for distance until the user opts in.
  const geo = useGeolocation(true)

  const [filter, setFilter] = useState<PlaceFilter>('all')
  const [query, setQuery] = useState('')
  const [cityPickerOpen, setCityPickerOpen] = useState(false)

  // Auto-detect: when GPS lands and the current page wasn't reached via an
  // explicit ?city= choice (i.e. we're sitting on the default 'yogyakarta'),
  // find the nearest supported city and redirect once. We track the redirect
  // with a session flag so refreshes don't keep bouncing the user around.
  const autoDetectedRef = useRef(false)
  useEffect(() => {
    if (autoDetectedRef.current) return
    if (!geo.coords) return
    if (typeof window === 'undefined') return
    const sessionFlag = sessionStorage.getItem('cityrider:places:auto-city')
    if (sessionFlag === '1') return
    const { slug, km } = nearestCity(geo.coords.lat, geo.coords.lng)
    sessionStorage.setItem('cityrider:places:auto-city', '1')
    autoDetectedRef.current = true
    // Only redirect if user is closer to a different supported city by a
    // meaningful margin AND no explicit choice is already in the URL.
    const params = new URLSearchParams(window.location.search)
    if (params.has('city')) return
    if (slug !== currentCity && km < 200) {
      router.replace(`/places?city=${slug}`)
    }
  }, [geo.coords, currentCity, router])

  function selectCity(slug: string) {
    haptic.tap()
    setCityPickerOpen(false)
    // Mark that a city has been explicitly chosen — disables auto-detect.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cityrider:places:auto-city', '1')
    }
    if (slug === currentCity) return
    router.push(`/places?city=${slug}`)
  }

  // Reduce by the structural filter (all / group / single category),
  // then by free-text query against the place name AND both
  // Indonesian/English category labels so "hotel", "candi", "temple"
  // all narrow the list correctly.
  const filtered = useMemo(() => {
    let base: typeof places
    if (filter === 'all') {
      base = places
    } else if (filter.kind === 'group') {
      base = places.filter((p) => groupOf(p.category) === filter.group)
    } else {
      base = places.filter((p) => p.category === filter.category)
    }
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

  // Compute quotes only when GPS has resolved. Stable Map keyed by
  // place.id so the cards' quote object identity is preserved while
  // GPS hasn't changed — no spurious re-renders.
  const quotes = useMemo<Map<string, PlaceQuote>>(() => {
    const m = new Map<string, PlaceQuote>()
    if (!geo.coords) return m
    for (const p of filtered) m.set(p.id, quotePlace(geo.coords, p))
    return m
  }, [filtered, geo.coords])

  // Sort: distance ascending when GPS available, alphabetical otherwise.
  // Re-runs whenever filtered, quotes, or geo.coords change.
  const sorted = useMemo(() => {
    if (!geo.coords) return filtered
    return [...filtered].sort((a, b) => {
      const da = quotes.get(a.id)?.distanceKm ?? Infinity
      const db = quotes.get(b.id)?.distanceKm ?? Infinity
      return da - db
    })
  }, [filtered, quotes, geo.coords])

  // Visit Now → /cari (booking page) with the destination pre-filled.
  // We deliberately do NOT pre-fill the pickup — the booking page will
  // auto-fill it from GPS, but the user keeps the affordance to swap to
  // a different pickup before they tap View drivers themselves. This
  // matches the user-edit-then-confirm flow we want for Places handoff.
  function handleVisit(place: Place) {
    haptic.impact()
    const q = new URLSearchParams({
      service: 'person',
      dLat:    place.lat.toString(),
      dLng:    place.lng.toString(),
      dName:   place.name,
    })
    router.push(`/cari?${q.toString()}`)
  }

  const gpsPending = geo.status === 'requesting' || geo.status === 'idle'
  const gpsDenied  = geo.status === 'denied'

  return (
    <div className="space-y-3">
      {/* GPS hint — only visible BEFORE GPS lands. Once we have coords
          the banner unmounts entirely so it doesn't take up screen real
          estate on the working state. */}
      {(gpsPending || gpsDenied) && (
        <GpsBanner
          gpsPending={gpsPending}
          gpsDenied={gpsDenied}
          onRequest={() => geo.request()}
          fallbackCity={zone?.city ?? 'Yogyakarta'}
        />
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari tempat — hotel, pantai, candi…"
            aria-label="Search places by name or category"
            className="w-full bg-black/55 border border-white/10 focus:border-brand/45 text-ink placeholder:text-muted rounded-2xl pl-10 pr-10 py-3 text-[14px] font-bold focus:outline-none transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-white/5 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Yellow city-picker button — opens the city drawer. Drawer is
            rendered below so we keep state in this component. */}
        <button
          type="button"
          onClick={() => { haptic.tap(); setCityPickerOpen(true) }}
          aria-label={`Change city (currently ${cityLabel(currentCity)})`}
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-bg bg-gradient-to-br from-brand to-brand2 shadow-[0_4px_14px_rgba(250,204,21,0.30)] active:scale-95 transition"
        >
          <Building2 className="w-5 h-5" strokeWidth={2.75} />
        </button>
      </div>

      <CategoryChips value={filter} onChange={setFilter} />

      {/* City header — sits above the first card so the user always sees
          which area's places they're browsing. */}
      <div className="flex items-center gap-2 pt-1">
        <MapPin className="w-4 h-4 text-brand" strokeWidth={2.5} aria-hidden />
        <span className="text-[14px] font-extrabold uppercase tracking-wider text-ink">
          {cityLabel(currentCity)} City
        </span>
      </div>

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="card-dark p-6 text-center">
            <p className="text-[14px] text-muted">
              {query.trim()
                ? `Tidak ada hasil untuk "${query.trim()}". Coba kata kunci lain.`
                : 'Tidak ada tempat di kategori ini. Coba kategori lain.'}
            </p>
          </div>
        )}

        {sorted.map((p) => (
          <PlaceCard
            key={p.id}
            place={p}
            quote={quotes.get(p.id) ?? null}
            onVisit={handleVisit}
            currentCity={currentCity}
          />
        ))}
      </div>

      {/* City-picker drawer — slides in from the right with the supported
          city list. Selecting a row routes to /places?city=<slug> and the
          server re-fetches places + zone for that city. */}
      <Drawer.Root direction="right" open={cityPickerOpen} onOpenChange={setCityPickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm" />
          <Drawer.Content
            className="fixed right-0 top-0 bottom-0 z-[61] w-[300px] max-w-[85vw] outline-none"
            aria-describedby={undefined}
          >
            <div className="relative h-full bg-bg border-l border-brand/40 flex flex-col pt-safe pb-safe">
              {/* Yellow "running light" — matches the category drawer. */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px]"
                style={{
                  background:
                    'linear-gradient(180deg, transparent 0%, #FACC15 40%, #FFFFFF 50%, #FACC15 60%, transparent 100%)',
                  backgroundSize: '100% 200%',
                  animation: 'runningLight 2.6s linear infinite',
                  boxShadow: '0 0 12px rgba(250,204,21,0.65)',
                }}
              />
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                <Drawer.Title className="text-[16px] font-extrabold text-ink">
                  Pilih kota
                </Drawer.Title>
                <button
                  type="button"
                  onClick={() => setCityPickerOpen(false)}
                  aria-label="Close city picker"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-white/5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {/* First row — pinned CTA so owners can self-list before
                    they pick a city. Routes to /list-place. */}
                <button
                  type="button"
                  onClick={() => {
                    haptic.tap()
                    setCityPickerOpen(false)
                    router.push('/list-place')
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99]"
                  style={{ minHeight: 44 }}
                >
                  <span
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-black/85"
                    aria-hidden
                  >
                    <Plus className="w-4 h-4 text-white" strokeWidth={3} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-extrabold leading-tight text-bg">
                      List your place
                    </span>
                    <span className="block text-[12px] font-bold leading-tight text-bg/75">
                      Rp 100.000 / tahun
                    </span>
                  </span>
                </button>

                {/* Section divider for city list. */}
                <div className="pt-2 pb-1 px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
                    Pilih kota
                  </span>
                </div>

                {SUPPORTED_CITIES.map((c) => {
                  const active = c.slug === currentCity
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => selectCity(c.slug)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99] ${
                        active ? 'ring-2 ring-white/50' : ''
                      }`}
                      style={{ minHeight: 44 }}
                    >
                      <span
                        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-black/85"
                        aria-hidden
                      >
                        <Building2 className="w-4 h-4 text-white" strokeWidth={2.75} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-extrabold leading-tight text-bg">
                          {c.label}
                        </span>
                      </span>
                      {active && <Check className="w-4 h-4 text-bg shrink-0" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}

function GpsBanner({
  gpsPending,
  gpsDenied,
  onRequest,
  fallbackCity,
}: {
  gpsPending: boolean
  gpsDenied: boolean
  onRequest: () => void
  fallbackCity: string
}) {
  return (
    <div
      className="
        flex items-center gap-3
        rounded-2xl p-3
        bg-black/65 backdrop-blur-md
        border border-brand/25
      "
      role="status"
    >
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: 'rgba(250,204,21,0.12)',
          border: '1px solid rgba(250,204,21,0.30)',
        }}
        aria-hidden
      >
        {gpsDenied
          ? <AlertCircle className="w-5 h-5 text-brand" />
          : <MapPin className="w-5 h-5 text-brand" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-extrabold text-ink leading-tight">
          {gpsPending
            ? `Mencari lokasi kamu di ${capitalise(fallbackCity)}…`
            : 'Aktifkan lokasi untuk lihat jarak & tarif'}
        </div>
        <div className="text-[13px] text-muted leading-snug mt-0.5">
          {gpsPending
            ? 'Tempat-tempat akan terurut otomatis dari yang paling dekat.'
            : 'Tanpa GPS, kamu masih bisa lihat tempat dan kategori.'}
        </div>
      </div>
      {gpsDenied && (
        <button
          type="button"
          onClick={onRequest}
          className="
            shrink-0 px-3 py-2 rounded-xl
            text-[13px] font-extrabold text-bg
            bg-gradient-to-r from-brand to-brand2
            shadow-[0_4px_14px_rgba(250,204,21,0.30)]
          "
          style={{ minHeight: 44 }}
        >
          Aktifkan
        </button>
      )}
    </div>
  )
}

function capitalise(s: string): string {
  if (!s) return s
  return s[0]!.toUpperCase() + s.slice(1)
}
