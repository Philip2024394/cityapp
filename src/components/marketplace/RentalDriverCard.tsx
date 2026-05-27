'use client'
import Link from 'next/link'
import { User, Users, Calendar, MapPin } from 'lucide-react'

// ============================================================================
// RentalDriverCard — shared card for /rentals/car + /rentals/truck
// ----------------------------------------------------------------------------
// IndoCity rental marketplaces sell a different mental model from /car
// (per-km rides): customers compare DAILY RATES, pick by type (self-drive
// lepas kunci vs. with-driver chauffeur), then WhatsApp the driver to agree
// the rental terms directly. The card surfaces the rate as the visual
// focal point, with type chips, vehicle line, weekly/monthly hints, and
// a "View details" CTA.
//
// Compliance: rates are self-published. Never label them as "our price",
// "total cost", or anything implying IndoCity sets fares.
//
// Visual style: light/white card (matches /car after the white redesign),
// brand-yellow accent border, prominent daily rate.
// ============================================================================

export type RentalType = 'self_drive' | 'with_driver' | 'both'

export type RentalDriverCardProps = {
  /** Full URL to the rental detail page (e.g. /rentals/car/{slug}).
   *  Fallback to /car/{slug} or /truck/{slug} is acceptable until
   *  per-vertical rental profile pages ship. */
  href:                     string
  displayName:              string
  /** First image used as the cover (vehicle photo). */
  coverImageUrl?:           string | null
  /** Profile / brand image used as the avatar. */
  profileImageUrl?:         string | null
  /** Vehicle line, e.g. "Honda Brio Satya 2022 · Putih". */
  vehicleLine?:             string | null
  /** Seat count, when present. Rendered as a small chip. */
  seats?:                   number | null
  /** City + area, e.g. "Yogyakarta · Yogyakarta Kota". */
  cityArea?:                string | null
  /** Rental type chip(s) — driver may offer self_drive, with_driver, or both. */
  rentalType:               RentalType
  /** Optional vertical-specific pill, rendered alongside the rental-type
   *  chips (top-left of the cover). Used by /rentals/truck to surface a
   *  truck-class label like "Pickup" / "Box van" / "Engkel box". Cars
   *  omit this — their `seats` chip already carries the relevant detail. */
  specialtyPill?:           string | null
  /** Daily rate in IDR — the visual focal point of the card. */
  dailyRateIdr:             number
  /** Optional longer-window rates surfaced as a small inline line. */
  weeklyRateIdr?:           number | null
  monthlyRateIdr?:          number | null
  /** Minimum rental window in days. Only rendered when > 1. */
  minDays?:                 number | null
  /** Star rating, when known. */
  rating?:                  number | null
  /** Lifetime completed trips (for real drivers). 0 for mocks. */
  tripsCount?:              number | null
  ctaLabel?:                string
}

const BRAND_YELLOW = '#FACC15'

// Render the rental-type chip(s) at the top of the card. When the driver
// offers BOTH options, we render TWO chips side-by-side so customers see
// the choice up-front.
function RentalTypeChips({ type }: { type: RentalType }) {
  if (type === 'both') {
    return (
      <div className="flex items-center gap-1.5">
        <SelfDriveChip />
        <WithDriverChip />
      </div>
    )
  }
  if (type === 'self_drive') return <SelfDriveChip />
  if (type === 'with_driver') return <WithDriverChip />
  return null
}

function SelfDriveChip() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-green-100 text-green-800 border border-green-300">
      Self-drive
    </span>
  )
}

function WithDriverChip() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
      With driver
    </span>
  )
}

function formatIdr(amount: number): string {
  return amount.toLocaleString('id-ID')
}

export default function RentalDriverCard({
  href,
  displayName,
  coverImageUrl,
  profileImageUrl,
  vehicleLine,
  seats,
  cityArea,
  rentalType,
  specialtyPill,
  dailyRateIdr,
  weeklyRateIdr,
  monthlyRateIdr,
  minDays,
  rating,
  tripsCount,
  ctaLabel = 'View details',
}: RentalDriverCardProps) {
  const theme = BRAND_YELLOW
  const initials = displayName.charAt(0).toUpperCase()
  const hasRating = typeof rating === 'number' && rating > 0

  // Longer-window rates rendered as a single small line under the daily
  // rate. Suppressed entirely when both are NULL.
  const longerWindowBits: string[] = []
  if (weeklyRateIdr != null && weeklyRateIdr > 0) {
    longerWindowBits.push(`Rp ${formatIdr(weeklyRateIdr)}/week`)
  }
  if (monthlyRateIdr != null && monthlyRateIdr > 0) {
    longerWindowBits.push(`Rp ${formatIdr(monthlyRateIdr)}/month`)
  }
  const longerWindowLine = longerWindowBits.join(' · ')

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white transition hover:-translate-y-0.5 hover:shadow-2xl"
      style={{
        borderLeft: `3px solid ${theme}`,
        boxShadow: `0 6px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06), 0 0 0 0.5px ${theme}40`,
      }}
    >
      {/* COVER STRIP — vehicle photo or themed fallback */}
      <div
        className="relative h-[140px]"
        style={{ background: `linear-gradient(135deg, ${theme}25, ${theme}08)` }}
      >
        {coverImageUrl && (
          <img
            src={coverImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0) 45%, rgba(255,255,255,0.95) 100%)',
          }}
        />

        {/* Rental-type chip(s) — TOP LEFT of the card per the brief.
            When the caller passes `specialtyPill` (e.g. truck-class label
            from /rentals/truck), it sits alongside the rental-type chip. */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap max-w-[75%]">
          <RentalTypeChips type={rentalType} />
          {specialtyPill && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/95 text-black border border-black/15 shadow-sm">
              {specialtyPill}
            </span>
          )}
        </div>

        {/* Rating chip — TOP RIGHT, when present. */}
        {hasRating && (
          <div
            className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full border shadow-md"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              borderColor: 'rgba(0,0,0,0.10)',
            }}
          >
            <span aria-hidden style={{ color: '#FACC15' }}>★</span>
            <span
              className="text-[13px] font-extrabold tabular-nums leading-none text-black"
            >
              {rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="px-4 pb-4 -mt-6 relative z-10">
        <div className="flex items-end gap-3 mb-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            {profileImageUrl
              ? <img
                  src={profileImageUrl}
                  alt={displayName}
                  className="w-16 h-16 rounded-2xl object-cover bg-gray-100"
                  style={{
                    border: `3px solid ${theme}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 2px #FFFFFF',
                  }}
                />
              : <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-[22px] font-black bg-gray-100 text-gray-800"
                  style={{
                    border: `3px solid ${theme}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 2px #FFFFFF',
                  }}
                >{initials}</div>}
          </div>

          {/* Name + vehicle line + city */}
          <div className="min-w-0 flex-1 pb-1">
            <Link
              href={href}
              className="block text-[18px] font-black truncate leading-tight text-black hover:underline"
            >
              {displayName}
            </Link>
            {vehicleLine && (
              <div className="text-[13px] text-black/75 truncate mt-0.5 font-semibold">
                {vehicleLine}
              </div>
            )}
            {cityArea && (
              <div className="text-[12px] flex items-center gap-1 mt-0.5 text-black/60">
                <MapPin className="w-3 h-3" strokeWidth={2.5} />
                <span className="truncate">{cityArea}</span>
              </div>
            )}
          </div>
        </div>

        {/* DAILY RATE — visual focal point */}
        <div className="mb-3 pb-3 border-b border-black/10">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div className="leading-none">
              <span className="text-[26px] sm:text-[28px] font-black text-black tracking-tight">
                Rp {formatIdr(dailyRateIdr)}
              </span>
              <span className="text-[14px] font-bold text-black/55 ml-1">
                /day
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-black/45 font-bold">
              Self-published
            </span>
          </div>
          {longerWindowLine && (
            <div className="mt-1.5 text-[12px] text-black/65 font-semibold">
              {longerWindowLine}
            </div>
          )}
        </div>

        {/* Meta row — seats, min days, trips */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {seats != null && seats > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-bold bg-gray-100 text-black/75">
              <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
              {seats} seats
            </span>
          )}
          {minDays != null && minDays > 1 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />
              Min {minDays} days
            </span>
          )}
          {tripsCount != null && tripsCount > 0 && (
            <span className="inline-flex items-center text-[12px] font-bold text-black/65">
              {tripsCount.toLocaleString('id-ID')} trips
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-end">
          <Link
            href={href}
            aria-label={`View rental details for ${displayName}`}
            className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shrink-0 hover:brightness-110 transition shadow-md"
            style={{
              background: theme,
              color: '#0A0A0A',
              boxShadow: `0 4px 14px ${theme}55`,
              minHeight: 44,
            }}
          >
            <User className="w-3.5 h-3.5" strokeWidth={2.5} />
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
