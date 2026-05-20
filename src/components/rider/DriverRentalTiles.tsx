'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bike, Clock, ArrowRight, Fuel } from 'lucide-react'
import { fetchRentalForOwnerBrowser } from '@/lib/rentals/queries.browser'
import type { BikeRental } from '@/lib/rentals/types'
import { idr } from '@/lib/format/idr'

// ============================================================================
// DriverRentalTiles — surfaces a driver's bike_rentals listing on their
// public profile (/r/[slug]). Two possible tiles:
//   1. "Rent this bike" — if rental_mode includes self_ride
//   2. "Bike + driver tour" — if rental_mode includes with_driver
//
// Each tile links to /rent/{slug} (the marketplace detail page) so the
// customer enters the standard rental booking flow.
//
// Self-hides when no approved/available rental exists for this driver.
// Single fetch on mount; cheap (one RLS-gated row).
// ============================================================================

export default function DriverRentalTiles({ driverUserId }: { driverUserId: string }) {
  const [rental, setRental] = useState<BikeRental | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchRentalForOwnerBrowser(driverUserId)
      .then((r) => { if (!cancelled) { setRental(r); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [driverUserId])

  if (loading) return null
  if (!rental) return null

  const hasSelfRide = rental.rentalMode === 'self_ride' || rental.rentalMode === 'both'
  const hasTour     = rental.rentalMode === 'with_driver' || rental.rentalMode === 'both'

  return (
    <div className="space-y-2">
      <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim px-1">
        Also available from this rider
      </div>

      {hasSelfRide && (
        <Link
          href={`/rent/${rental.slug}`}
          className="card card-interactive p-4 flex items-center gap-3"
          style={{ background: 'rgba(250,204,21,0.06)', borderColor: 'rgba(250,204,21,0.25)' }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.30)' }}
          >
            <Bike className="w-5 h-5 text-brand" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[14px]">
              Rent this bike — {rental.brand} {rental.model}
            </div>
            <div className="text-[12px] text-muted mt-0.5">
              From <span className="text-ink font-bold">{idr(rental.dailyPriceIdr)}/day</span>
              {rental.weeklyPriceIdr  && <> · <span className="text-ink font-bold">{idr(rental.weeklyPriceIdr)}/week</span></>}
              {rental.monthlyPriceIdr && <> · <span className="text-ink font-bold">{idr(rental.monthlyPriceIdr)}/month</span></>}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-brand shrink-0" />
        </Link>
      )}

      {hasTour && (rental.tour3hIdr || rental.tour6hIdr || rental.tour8hIdr) && (
        <Link
          href={`/rent/${rental.slug}`}
          className="card card-interactive p-4 flex items-center gap-3"
          style={{ background: 'rgba(96,165,250,0.06)', borderColor: 'rgba(96,165,250,0.25)' }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.30)' }}
          >
            <Clock className="w-5 h-5" style={{ color: '#60A5FA' }} strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[14px]">
              Book a bike + driver tour
            </div>
            <div className="text-[12px] text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
              {rental.tour3hIdr && <span><span className="text-ink font-bold">3h</span> {idr(rental.tour3hIdr)}</span>}
              {rental.tour6hIdr && <span aria-hidden className="text-dim">·</span>}
              {rental.tour6hIdr && <span><span className="text-ink font-bold">6h</span> {idr(rental.tour6hIdr)}</span>}
              {rental.tour8hIdr && <span aria-hidden className="text-dim">·</span>}
              {rental.tour8hIdr && <span><span className="text-ink font-bold">8h</span> {idr(rental.tour8hIdr)}</span>}
              {rental.fuelIncluded && (
                <span className="inline-flex items-center gap-0.5 ml-1" style={{ color: '#22C55E' }}>
                  <Fuel className="w-3 h-3" />
                  petrol inc.
                </span>
              )}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0" style={{ color: '#60A5FA' }} />
        </Link>
      )}
    </div>
  )
}
