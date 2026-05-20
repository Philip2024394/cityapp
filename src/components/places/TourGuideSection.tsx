'use client'
import { useEffect, useState } from 'react'
import { MapPinned, Loader2 } from 'lucide-react'
import TourGuideCard from './TourGuideCard'
import { fetchTourGuideDriversBrowser } from '@/lib/drivers/queries'
import type { Rider } from '@/types/rider'

// ============================================================================
// TourGuideSection — renders inside PlacesList when the segmented control
// is set to "Tour Guide". Fetches drivers who have opted in to day-tour
// service in the current city, ordered by rating.
//
// Empty city = "no drivers yet here, expand to any city". Honest empty
// state — never fabricates supply.
// ============================================================================

export default function TourGuideSection({ city, cityLabel }: { city: string; cityLabel: string }) {
  const [drivers, setDrivers] = useState<Rider[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDrivers(null)
    setError(null)
    fetchTourGuideDriversBrowser(city)
      .then((list) => {
        if (cancelled) return
        setDrivers(list)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Could not load tour guides')
      })
    return () => { cancelled = true }
  }, [city])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pt-1">
        <MapPinned className="w-4 h-4 text-brand" strokeWidth={2.5} aria-hidden />
        <span className="text-[14px] font-extrabold uppercase tracking-wider text-ink">
          Tour Guides{cityLabel ? ` · ${cityLabel}` : ''}
        </span>
        {drivers && (
          <span className="text-[12px] text-muted">({drivers.length})</span>
        )}
      </div>

      {drivers === null && !error && (
        <div className="card-dark p-6 flex items-center justify-center gap-2 text-[14px] text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading tour guides…
        </div>
      )}

      {error && (
        <div className="card-dark p-6 text-center text-[14px] text-muted">
          {error}
        </div>
      )}

      {drivers && drivers.length === 0 && (
        <div className="card-dark p-6 text-center space-y-1">
          <div className="text-[14px] font-extrabold text-ink">
            No tour guides in {cityLabel} yet
          </div>
          <div className="text-[13px] text-muted leading-relaxed">
            Drivers haven&apos;t opted in here yet. Are you a driver?{' '}
            Enable Tour Guide on your dashboard to be the first one listed.
          </div>
        </div>
      )}

      {drivers && drivers.length > 0 && (
        <div className="space-y-3">
          {drivers.map((d) => (
            <TourGuideCard key={d.id} driver={d} />
          ))}
        </div>
      )}
    </div>
  )
}
