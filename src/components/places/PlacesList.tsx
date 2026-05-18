'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, AlertCircle } from 'lucide-react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import CategoryChips, { type GroupFilter } from './CategoryChips'
import PlaceCard from './PlaceCard'
import { quotePlace, type PlaceQuote } from '@/lib/places/pricing'
import { groupOf } from '@/lib/places/categories'
import type { CityZone, Place } from '@/lib/places/types'

export default function PlacesList({
  places,
  zone,
}: {
  places: Place[]
  zone: CityZone | null
}) {
  const router = useRouter()
  const haptic = useHaptic()
  // autoRequest=true: prompt on mount so distances start filling in
  // immediately. If denied/blocked, the page still functions — cards
  // just show '—' for distance until the user opts in.
  const geo = useGeolocation(true)

  const [group, setGroup] = useState<GroupFilter>('all')

  // Filter by group. Empty filter = all categories.
  const filtered = useMemo(() => {
    if (group === 'all') return places
    return places.filter((p) => groupOf(p.category) === group)
  }, [places, group])

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

  // Visit Now → /cari/rider with pickup (GPS) + dropoff (place) pre-filled.
  // The rider-list page already accepts these URL params, so the handoff
  // is zero-touch. service=person because Places is passenger discovery.
  function handleVisit(place: Place) {
    haptic.impact()
    if (!geo.coords) {
      // No GPS — fall back to the /cari planner so the user can pick
      // their own pickup manually. Drop-off is still pre-filled.
      const q = new URLSearchParams({
        service: 'person',
        // /cari doesn't yet read dropoff from URL; this falls through
        // to the planner with a clean state. The user enters pickup and
        // taps drop-off, then taps View drivers — same flow as today.
      })
      router.push(`/cari?${q.toString()}`)
      return
    }
    const q = new URLSearchParams({
      pLat:   geo.coords.lat.toString(),
      pLng:   geo.coords.lng.toString(),
      pName:  'My location',
      dLat:   place.lat.toString(),
      dLng:   place.lng.toString(),
      dName:  place.name,
      filter: 'person',
    })
    router.push(`/cari/rider?${q.toString()}`)
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

      <CategoryChips value={group} onChange={setGroup} />

      <div className="space-y-2.5">
        {sorted.length === 0 && (
          <div className="card-dark p-6 text-center">
            <p className="text-[14px] text-muted">
              Tidak ada tempat di kategori ini. Coba kategori lain.
            </p>
          </div>
        )}

        {sorted.map((p) => (
          <PlaceCard
            key={p.id}
            place={p}
            quote={quotes.get(p.id) ?? null}
            onVisit={handleVisit}
          />
        ))}
      </div>
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
