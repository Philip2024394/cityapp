import { Suspense } from 'react'
import AppNav from '@/components/layout/AppNav'
import PlacesList from '@/components/places/PlacesList'
import { listPlacesForCity } from '@/lib/places/queries'

export const metadata = {
  title: 'Places · City Rider',
  description:
    'Temukan tempat penting di sekitarmu — kuil, pantai, mal, hotel, rumah sakit — dan langsung pesan rider untuk berangkat.',
}

// Server-rendered shell: fetches the city zone + all approved places in
// one round-trip, then hands off to the client component for GPS + sort
// + filter + booking handoff. The card list is interactive (uses GPS),
// hence the client boundary inside PlacesList.
//
// Phase 1 hardcodes Yogyakarta. Multi-city support is a query param +
// city_zones lookup away — no UI changes needed.
export default async function PlacesPage() {
  const { places, zone } = await listPlacesForCity('yogyakarta')

  return (
    <>
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 pt-3 pb-24">
        <header className="mb-3">
          <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
            Places <span className="gradient-text">di sekitarmu</span>
          </h1>
          <p className="mt-1 text-[13px] text-muted leading-snug">
            Temukan tempat, lihat tarif rider, langsung pesan.
            Trip ke luar kota sudah termasuk ongkos balik rider.
          </p>
        </header>

        <Suspense fallback={<ListSkeleton />}>
          <PlacesList places={places} zone={zone} />
        </Suspense>
      </main>
    </>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="
            flex items-stretch gap-3 p-2.5
            rounded-2xl bg-black/55 border border-white/5
            animate-pulse
          "
        >
          <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-xl bg-white/5" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-2/3 rounded bg-white/10" />
            <div className="h-3 w-1/3 rounded bg-white/5" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
            <div className="h-9 w-full rounded-xl bg-white/5 mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}
