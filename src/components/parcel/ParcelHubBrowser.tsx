'use client'
// ============================================================================
// ParcelHubBrowser — client island for /cityriders/parcel
// ----------------------------------------------------------------------------
// White-card container styled like /places' PlacesBrowser:
//   1. Title row
//   2. Chip toggle (All / Bike / Car / Truck) — active = brand yellow
//   3. Scrollable landscape driver cards
//      • thumbnail on the LEFT
//      • business name + zone in the middle
//      • LOWEST per-parcel / daily price prominently
//      • yellow "View profile →" button on the RIGHT
//
// Drivers are pre-merged on the server (real + mock) and passed in by
// vehicle type. Filtering happens client-side via the chips. No GPS
// distance sort — parcel B2B is contract-shopping, not GPS-proximity
// matching. Customers pick by rate + capacity, not nearest.
// ============================================================================

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Bike, Car, Truck, Star, MapPin, Receipt, ChevronDown, ChevronUp } from 'lucide-react'
import {
  fmtIdr,
  PARCEL_TIER_DEFINITIONS,
  PARCEL_RATE_TIER_DEFAULTS_BIKE,
  PARCEL_RATE_TIER_DEFAULTS_CAR,
  type ParcelRateTiers,
} from '@/lib/parcel/defaults'

// -----------------------------------------------------------------------------
// Public row types — shared with the server page. Lowest price is
// derived per-card (bike/car: tier_51_100, truck: rental_daily_rate_idr).
// -----------------------------------------------------------------------------
export type ParcelHubBikeCarRow = {
  slug:                  string
  business_name:         string
  brand_logo_url:        string | null
  /** Driver's uploaded vehicle photos. First entry is used as the card
   *  thumbnail. Falls back to brand_logo_url, then the vehicle glyph. */
  vehicle_photos:        string[] | null
  /** Driver presence state — drives the satellite ping dot on the
   *  thumbnail. 'online' → green pulsing, 'busy' / 'offline' / null →
   *  orange static. */
  availability:          'online' | 'busy' | 'offline' | null
  parcel_rate_tiers:     unknown
  parcel_daily_capacity: number | null
  parcel_service_zone:   string | null
  rating:                number | null
}

export type ParcelHubTruckRow = {
  slug:                  string
  business_name:         string
  brand_logo_url:        string | null
  vehicle_photos:        string[] | null
  availability:          'online' | 'busy' | 'offline' | null
  rental_daily_rate_idr: number | null
  rental_min_days:       number | null
  area:                  string | null
  city:                  string | null
  rating:                number | null
}

type ChipId = 'all' | 'bike' | 'car' | 'truck'

const CHIPS: ReadonlyArray<{ id: ChipId; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> | null }> = [
  { id: 'all',   label: 'All',   icon: null },
  { id: 'bike',  label: 'Bike',  icon: Bike },
  { id: 'car',   label: 'Car',   icon: Car },
  { id: 'truck', label: 'Truck', icon: Truck },
]

// Pull the lowest published per-parcel rate out of the jsonb tier card.
// tier_51_100 is the bulk tier = cheapest per parcel. Falls back to
// `defaultLowest` (passed in from the server) when the column is empty.
function lowestBikeCarRate(tiers: unknown, defaultLowest: number): number {
  if (!tiers || typeof tiers !== 'object') return defaultLowest
  const r = tiers as Record<string, unknown>
  const v = r.tier_51_100
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.round(v)
  // Fall back to the next-cheapest tier if heavy biz isn't set.
  const v2 = r.tier_21_50
  if (typeof v2 === 'number' && Number.isFinite(v2) && v2 > 0) return Math.round(v2)
  return defaultLowest
}

type Props = {
  bikes:               ParcelHubBikeCarRow[]
  cars:                ParcelHubBikeCarRow[]
  trucks:              ParcelHubTruckRow[]
  /** Bike per-parcel rate used when a driver hasn't published their own. */
  bikeDefaultLowest:   number
  /** Car per-parcel rate used when a driver hasn't published their own. */
  carDefaultLowest:    number
}

export default function ParcelHubBrowser({
  bikes, cars, trucks, bikeDefaultLowest, carDefaultLowest,
}: Props) {
  const [chip, setChip] = useState<ChipId>('all')
  const [showRates, setShowRates] = useState(false)

  // Unified visible list, ordered: bikes → cars → trucks within whichever
  // chip is active. Sorted by rating desc inside each group (rows arrive
  // already pre-sorted from the server query).
  const list = useMemo(() => {
    type Item =
      | { kind: 'bike'  | 'car';  row: ParcelHubBikeCarRow; lowest: number; href: string }
      | { kind: 'truck';          row: ParcelHubTruckRow;   lowest: number; href: string }
    const items: Item[] = []
    if (chip === 'all' || chip === 'bike') {
      for (const r of bikes) items.push({
        kind:   'bike',
        row:    r,
        lowest: lowestBikeCarRate(r.parcel_rate_tiers, bikeDefaultLowest),
        href:   `/r/${r.slug}`,
      })
    }
    if (chip === 'all' || chip === 'car') {
      for (const r of cars) items.push({
        kind:   'car',
        row:    r,
        lowest: lowestBikeCarRate(r.parcel_rate_tiers, carDefaultLowest),
        href:   `/car/${r.slug}`,
      })
    }
    if (chip === 'all' || chip === 'truck') {
      for (const t of trucks) items.push({
        kind:   'truck',
        row:    t,
        lowest: (t.rental_daily_rate_idr ?? 0),
        href:   `/truck/${t.slug}`,
      })
    }
    return items
  }, [chip, bikes, cars, trucks, bikeDefaultLowest, carDefaultLowest])

  return (
    <div
      className="mx-auto bg-white rounded-3xl w-full overflow-hidden"
      style={{
        maxWidth: 640,
        boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.04)',
      }}
    >
      <div className="flex flex-col p-4 sm:p-5">

        {/* ROW 1 — Title row + Parcel Rates toggle on the right */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[18px] sm:text-[20px] font-black tracking-tight text-[#0A0A0A] leading-tight">
              Browse drivers
            </h2>
            <p className="text-[12px] font-bold text-[#71717A] leading-tight mt-0.5 truncate">
              {list.length} {list.length === 1 ? 'option' : 'options'} · sorted by rating
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowRates((v) => !v)}
            aria-expanded={showRates}
            aria-controls="parcel-rates-panel"
            className="shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-[12.5px] font-extrabold tracking-tight active:scale-95 transition"
            style={{
              background: showRates ? '#0A0A0A' : '#FACC15',
              color:      showRates ? '#FACC15' : '#0A0A0A',
              boxShadow:  showRates ? 'none' : '0 4px 12px rgba(250,204,21,0.45)',
              minHeight: 32,
            }}
          >
            <Receipt className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Parcel Rates</span>
            {showRates
              ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={3} />
              : <ChevronDown className="w-3.5 h-3.5" strokeWidth={3} />}
          </button>
        </div>

        {/* ROW 1.5 — Collapsible Parcel Rates panel. Renders inside the
            same white card; chip row + card list slide below it. Closed
            by default so the page stays clean. */}
        {showRates && (
          <div
            id="parcel-rates-panel"
            className="mt-3 rounded-2xl overflow-hidden border border-[#FACC15] bg-[#FFFBEA]/40 shrink-0"
          >
            <div className="px-3.5 pt-3 pb-2">
              <div className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#854D0E]">
                Typical rate card · Yogyakarta
              </div>
              <div className="text-[11px] text-black/55 leading-snug mt-0.5">
                Drivers self-publish &mdash; actual rates may differ. The
                customer-paid price IS what the driver receives.
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-[0.10em] text-[#0A0A0A]/65">
                  <th className="px-3 py-1.5">Tier</th>
                  <th className="px-3 py-1.5 text-right">Bike</th>
                  <th className="px-3 py-1.5 text-right">Car</th>
                </tr>
              </thead>
              <tbody className="text-[12.5px]">
                {PARCEL_TIER_DEFINITIONS.map((t) => (
                  <tr key={t.key} className="border-t border-black/5">
                    <td className="px-3 py-2">
                      <div className="font-extrabold text-[12px] leading-tight">
                        {t.label}
                      </div>
                      <div className="text-[10.5px] text-black/55 leading-tight mt-0.5">
                        {t.range}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-extrabold text-[#0A0A0A] tabular-nums">
                      {fmtIdr(PARCEL_RATE_TIER_DEFAULTS_BIKE[t.key])}
                    </td>
                    <td className="px-3 py-2 text-right font-extrabold text-[#0A0A0A] tabular-nums">
                      {fmtIdr(PARCEL_RATE_TIER_DEFAULTS_CAR[t.key])}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-black/5 bg-[#FFFBEA]">
                  <td className="px-3 py-2">
                    <div className="font-extrabold text-[12px] leading-tight">
                      Enterprise
                    </div>
                    <div className="text-[10.5px] text-black/55 leading-tight mt-0.5">
                      100+ parcels/day
                    </div>
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-right font-extrabold text-[10.5px] uppercase tracking-wider text-[#EAB308]">
                    Negotiate on WhatsApp
                  </td>
                </tr>
                <tr className="border-t border-black/5">
                  <td className="px-3 py-2">
                    <div className="font-extrabold text-[12px] leading-tight">
                      Truck rental
                    </div>
                    <div className="text-[10.5px] text-black/55 leading-tight mt-0.5">
                      Daily rate model
                    </div>
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-right font-extrabold text-[10.5px] text-[#0A0A0A]/70">
                    Per-driver &mdash; see truck cards above
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ROW 2 — Chip toggle (All / Bike / Car / Truck) */}
        <div
          className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto overscroll-contain shrink-0"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          role="tablist"
          aria-label="Filter drivers by vehicle type"
        >
          {CHIPS.map((c) => {
            const Icon = c.icon
            const active = chip === c.id
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setChip(c.id)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-extrabold tracking-tight transition active:scale-95"
                style={{
                  background: active ? '#FACC15' : '#F4F4F5',
                  color:      active ? '#0A0A0A' : '#52525B',
                  border:     active ? '1px solid #FACC15' : '1px solid #E4E4E7',
                  boxShadow:  active ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
                  minHeight: 34,
                  whiteSpace: 'nowrap',
                }}
              >
                {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />}
                <span>{c.label}</span>
              </button>
            )
          })}
        </div>

        {/* ROW 3 — Card list */}
        <div
          className="mt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 -mx-1 px-1"
          style={{ maxHeight: '62vh', scrollbarWidth: 'thin' }}
        >
          {list.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[13px] font-bold text-[#71717A] leading-snug">
                No drivers in this category yet — try a different filter.
              </p>
            </div>
          )}
          {list.map((item) => (
            <DriverCard key={`${item.kind}-${item.row.slug}`} item={item} />
          ))}
        </div>

      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Card — landscape layout: image LEFT, info MIDDLE, "View profile" RIGHT.
// -----------------------------------------------------------------------------
type CardItem =
  | { kind: 'bike'  | 'car';  row: ParcelHubBikeCarRow; lowest: number; href: string }
  | { kind: 'truck';          row: ParcelHubTruckRow;   lowest: number; href: string }

function DriverCard({ item }: { item: CardItem }) {
  const { kind, lowest, href } = item
  const businessName = item.row.business_name
  const rating       = item.row.rating
  const availability = item.row.availability

  // Prefer the first uploaded vehicle photo as the thumbnail — that's
  // the actual bike / car / truck. Falls back to the driver's brand logo,
  // then the vehicle glyph as a last resort.
  const photos    = Array.isArray(item.row.vehicle_photos) ? item.row.vehicle_photos : []
  const thumbnail = photos.find((u) => typeof u === 'string' && u.trim()) ?? item.row.brand_logo_url ?? null

  const zone =
    kind === 'truck'
      ? (item.row.area && item.row.city
          ? `${item.row.area}, ${item.row.city}`
          : item.row.city ?? item.row.area ?? null)
      : item.row.parcel_service_zone

  const minDays = kind === 'truck' ? item.row.rental_min_days : null

  const priceLabel  = kind === 'truck' ? 'per day' : 'per parcel'
  const priceSuffix = kind === 'truck' && minDays && minDays > 1 ? ` · min ${minDays} days` : ''

  return (
    <Link
      href={href}
      className="relative block rounded-2xl bg-white border border-[#E4E4E7] hover:border-[#FACC15] hover:shadow-[0_6px_16px_rgba(250,204,21,0.18)] active:scale-[0.99] transition"
    >
      {/* RATING — minimal Star+number, top-right corner. */}
      {typeof rating === 'number' && rating > 0 && (
        <span className="absolute top-2 right-2.5 inline-flex items-center gap-1 text-[12px] font-extrabold text-[#0A0A0A]">
          <Star className="w-3 h-3" strokeWidth={2.5} fill="#FACC15" style={{ color: '#FACC15' }} />
          {rating.toFixed(1)}
        </span>
      )}

      {/* VIEW — absolute bottom-right corner. Matches the rating badge
          pinning pattern at the top-right so both anchors stay in the
          same column. */}
      <span
        className="absolute bottom-2 right-2.5 inline-flex items-center justify-center rounded-full px-3 text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
        style={{
          background: '#FACC15',
          color: '#0A0A0A',
          minHeight: 26,
          lineHeight: 1,
        }}
      >
        View
      </span>

      <div className="flex items-stretch gap-3 p-2.5 pr-2.5">
        {/* THUMBNAIL — left, vehicle photo with availability dot.
            Transparent backdrop — the catalog images are
            `-removebg-preview.png` silhouettes; letting them sit on the
            card's own white surface gives a clean magazine-style float. */}
        <div className="relative shrink-0 w-[80px] h-[80px] sm:w-[88px] sm:h-[88px]">
          <div
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt=""
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <VehicleGlyph kind={kind} />
            )}
          </div>
          <AvailabilityDot availability={availability} />
        </div>

        {/* INFO column — pr leaves room for absolute View pill at the
            bottom-right and rating badge at the top-right. */}
        <div className="flex-1 min-w-0 flex flex-col justify-between pr-[72px]">
          <div className="min-w-0">
            <h3 className="text-[14px] font-black tracking-tight text-[#0A0A0A] truncate">
              {businessName}
            </h3>
            {zone && (
              <div className="mt-0.5 text-[11.5px] font-bold text-[#71717A] truncate inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                <span className="truncate">{zone}</span>
              </div>
            )}
          </div>

          <div className="mt-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-black text-[#0A0A0A] tabular-nums">
                {fmtIdr(lowest)}
              </span>
              <span className="text-[11px] font-bold text-[#71717A] truncate">
                {priceLabel}{priceSuffix}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// -----------------------------------------------------------------------------
// AvailabilityDot — small satellite-ping indicator at the bottom-right
// of the thumbnail. Green + pulse for 'online'; orange (static) for
// 'busy' / 'offline'. Null availability hides the dot entirely.
// -----------------------------------------------------------------------------
function AvailabilityDot({
  availability,
}: {
  availability: 'online' | 'busy' | 'offline' | null
}) {
  if (!availability) return null
  const isOnline = availability === 'online'
  const ringColor = isOnline ? '#22C55E' : '#F97316'
  const dotColor  = isOnline ? '#16A34A' : '#EA580C'
  const label = isOnline ? 'Online' : availability === 'busy' ? 'Busy' : 'Offline'
  return (
    <span
      className="absolute bottom-0.5 right-0.5 inline-flex items-center justify-center"
      aria-label={label}
      title={label}
      style={{ width: 14, height: 14 }}
    >
      {/* Outer ping ring — animates only when online */}
      {isOnline && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: ringColor, opacity: 0.6 }}
          aria-hidden
        />
      )}
      {/* Solid centre dot — sits above the ping with a white ring so it
          reads cleanly against any thumbnail. */}
      <span
        className="relative inline-block rounded-full"
        style={{
          width: 10,
          height: 10,
          background: dotColor,
          boxShadow: '0 0 0 2px #FFFFFF, 0 1px 2px rgba(0,0,0,0.25)',
        }}
        aria-hidden
      />
    </span>
  )
}

function VehicleGlyph({ kind }: { kind: 'bike' | 'car' | 'truck' }) {
  const Icon = kind === 'bike' ? Bike : kind === 'car' ? Car : Truck
  return <Icon className="w-7 h-7 text-[#A1A1AA]" strokeWidth={2} />
}

// `ParcelRateTiers` re-export so server page can type-cast cleanly when
// constructing the row shapes.
export type { ParcelRateTiers }
