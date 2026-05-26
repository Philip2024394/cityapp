'use client'
import { useState, useMemo } from 'react'
import RentalDriverCard, {
  type RentalType,
} from '@/components/marketplace/RentalDriverCard'

// ============================================================================
// RentalsCarFilter — client island for /rentals/car
// ----------------------------------------------------------------------------
// The /rentals/car page fetches drivers server-side and hands them off
// to this island. The island owns:
//   • The "All / Self-drive / With driver" filter chip state
//   • Filtering the card list in place (no re-fetch / no URL change)
//
// Picking a chip-vs-URL approach: chips here, because the URL is reserved
// for city / area filters once those land. Re-fetching for a client-side
// filter on ~4–20 rows is wasteful when the data is already paid for.
//
// `rental_type='both'` drivers match BOTH self_drive and with_driver
// filter pills — they offer either model.
// ============================================================================

export type RentalCardData = {
  slug:                  string
  displayName:           string
  coverImageUrl:         string | null
  profileImageUrl:       string | null
  vehicleLine:           string | null
  seats:                 number | null
  cityArea:              string | null
  rentalType:            RentalType
  dailyRateIdr:          number
  weeklyRateIdr:         number | null
  monthlyRateIdr:        number | null
  minDays:               number | null
  rating:                number | null
  tripsCount:            number | null
  href:                  string
}

type FilterValue = 'all' | 'self_drive' | 'with_driver'

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'self_drive',  label: 'Self-drive' },
  { value: 'with_driver', label: 'With driver' },
]

function matchesFilter(rentalType: RentalType, filter: FilterValue): boolean {
  if (filter === 'all') return true
  if (rentalType === 'both') return true
  return rentalType === filter
}

export default function RentalsCarFilter({
  cards,
}: {
  cards: RentalCardData[]
}) {
  const [active, setActive] = useState<FilterValue>('all')

  const filtered = useMemo(
    () => cards.filter((c) => matchesFilter(c.rentalType, active)),
    [cards, active],
  )

  return (
    <>
      {/* Filter chips */}
      <div
        className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1"
        role="tablist"
        aria-label="Filter by rental type"
      >
        {FILTERS.map((f) => {
          const isActive = active === f.value
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(f.value)}
              className={`rounded-full px-4 text-[13px] font-extrabold uppercase tracking-wider transition shrink-0 border ${
                isActive
                  ? 'bg-[#0F172A] text-[#FACC15] border-[#0F172A]'
                  : 'bg-white text-black/75 border-black/15 hover:border-black/30'
              }`}
              style={{ minHeight: 44 }}
            >
              {f.label}
            </button>
          )
        })}
        <span className="text-[12px] text-black/55 font-bold ml-2 shrink-0 whitespace-nowrap">
          {filtered.length} listed
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center border border-black/10 bg-white shadow-sm space-y-2">
          <div className="text-[14px] font-extrabold text-black">
            No rentals match this filter
          </div>
          <p className="text-[13px] text-black/60">
            Switch the filter above to see all available rentals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <RentalDriverCard
              key={c.slug}
              href={c.href}
              displayName={c.displayName}
              coverImageUrl={c.coverImageUrl}
              profileImageUrl={c.profileImageUrl}
              vehicleLine={c.vehicleLine}
              seats={c.seats}
              cityArea={c.cityArea}
              rentalType={c.rentalType}
              dailyRateIdr={c.dailyRateIdr}
              weeklyRateIdr={c.weeklyRateIdr}
              monthlyRateIdr={c.monthlyRateIdr}
              minDays={c.minDays}
              rating={c.rating}
              tripsCount={c.tripsCount}
            />
          ))}
        </div>
      )}
    </>
  )
}
