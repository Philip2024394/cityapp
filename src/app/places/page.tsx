import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import PlacesList from '@/components/places/PlacesList'
import { listPlacesForCity } from '@/lib/places/queries'

export const metadata = {
  title: 'Places · IndoCity',
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
export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>
}) {
  const params = await searchParams
  const currentCity = params.city || 'yogyakarta'
  const { places, zone } = await listPlacesForCity(currentCity)

  return (
    <>
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 pt-3 pb-24">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
              Places <span className="gradient-text">di sekitarmu</span>
            </h1>
            <p className="mt-1 text-[13px] text-muted leading-snug">
              Temukan tempat, lihat tarif rider, langsung pesan.
              Trip ke luar kota sudah termasuk ongkos balik rider.
            </p>
          </div>
          {/* Small yellow "List Place" CTA at top-right of the header.
              Routes to /list-place where owners submit their venue. */}
          <Link
            href="/list-place"
            className="shrink-0 mt-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider text-bg bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-95 transition"
            aria-label="List your place"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            <span>List Place</span>
          </Link>
        </header>

        <Suspense fallback={<ListSkeleton />}>
          <PlacesList places={places} zone={zone} currentCity={currentCity} />
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
