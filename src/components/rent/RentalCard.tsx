'use client'
import {
  Star, Hammer, ArrowRight,
} from 'lucide-react'

const HELMET_ICON   = 'https://ik.imagekit.io/nepgaxllc/Untitledasdaaaaaaa-removebg-preview.png?updatedAt=1779053735062'
const RAINCOAT_ICON = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2012_29_10%20AM.png'
const PICKUP_ICON   = 'https://ik.imagekit.io/nepgaxllc/Untitleddasdaaa-removebg-preview.png'
const DRIVER_ICON   = 'https://ik.imagekit.io/nepgaxllc/Untitledasdaaaa-removebg-preview%20(1).png?updatedAt=1779022378771'
import type { BikeRental } from '@/lib/rentals/types'
import { idr } from '@/lib/format/idr'
import { BIKE_CATALOG } from '@/lib/rentals/catalog'

// Resolves a card photo. Priority:
//   1. Owner-uploaded photo from image_urls[0]
//   2. Stock catalog image when brand + model match a known bike
//   3. null → render the brand-name fallback block
function resolveCardPhoto(r: BikeRental): string | null {
  if (r.imageUrls[0]) return r.imageUrls[0]
  const brandL = r.brand.toLowerCase().trim()
  const modelL = r.model.toLowerCase().trim().replace(/\s+/g, '')
  for (const bike of BIKE_CATALOG) {
    if (bike.brand.toLowerCase() !== brandL) continue
    const catModel = bike.model.toLowerCase().trim().replace(/\s+/g, '')
    if (catModel === modelL) return bike.imageUrl
    // Partial match — first 5 chars in either direction handles cases
    // like "CRF150L" vs "CRF 150L" or "PCX 160" near "PCX 150".
    const slice = (s: string, n = 5) => s.slice(0, n)
    if (catModel.startsWith(slice(modelL)) || modelL.startsWith(slice(catModel))) {
      return bike.imageUrl
    }
  }
  return null
}

// RentalCard — landscape feed card for the /rent surface.
//
// Layout (mobile-first):
//   ┌─────────────────────────────────────────────────────────┐
//   │ [bg art] verified · available · ready-to-work · rating  │
//   │          Honda PCX 150 · 2023                           │
//   │                                                          │
//   │ Owner · response time · languages                       │
//   │ Auto · 150cc · helmet 2× · raincoat 1× · 🔌 · 📱        │
//   │ Rp 95.000 / day   Rp 600K / wk   Rp 2.1M / mo           │
//   │                                          [WhatsApp →]    │
//   └─────────────────────────────────────────────────────────┘
//
// Same yellow-card / dark-content visual system as the places cards so
// the rental surface feels native to the City Riders ecosystem.

const RENTAL_BG_IMAGE =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2018,%202026,%2001_32_57%20AM.png?updatedAt=1779042794665'

function transmissionLabel(t: BikeRental['transmission']): string {
  if (t === 'automatic') return 'Auto'
  if (t === 'manual')    return 'Manual'
  return 'Semi'
}

function whatsappLink(e164: string, name: string, brand: string, model: string): string {
  const phone = e164.replace(/[^\d]/g, '')
  const text = encodeURIComponent(
    `Halo ${name}, saya tertarik dengan rental ${brand} ${model} di City Riders. Apakah masih tersedia?`,
  )
  return `https://wa.me/${phone}?text=${text}`
}

// For bike-with-driver bundles, the renter pays for a tour block, not a
// daily. We derive 3h / 6h / 8h totals from (daily + driver_rate_per_day)
// with diminishing-discount scaling: longer blocks are cheaper per hour.
// Placeholder until dedicated price_{3,6,8}h_idr columns ship.
function tourHourPrice(dailyIdr: number, driverDailyIdr: number, hours: 3 | 6 | 8): number {
  const fullDay = dailyIdr + driverDailyIdr
  const factor = hours === 3 ? 0.45 : hours === 6 ? 0.75 : 1.0
  // Round to the nearest 10,000 for clean Rupiah display.
  return Math.round((fullDay * factor) / 10000) * 10000
}

export default function RentalCard({ rental: r }: { rental: BikeRental }) {
  const photo = resolveCardPhoto(r)
  const withDriver = r.rentalMode === 'with_driver' || r.rentalMode === 'both'

  return (
    <article className="relative w-full overflow-hidden rounded-2xl">
      {/* Full-bleed brand art background — same visual as the places cards
          so rentals feel native to the City Riders system. */}
      <img
        src={RENTAL_BG_IMAGE}
        alt=""
        aria-hidden
        loading="lazy"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover"
      />

      <div className="relative flex flex-col gap-2.5 p-3">
        {/* Driver figure overlay — appears only on listings that include
            a rider. Floats over the right edge so it overlaps the
            raincoat row and the Month price tile, signalling at a glance
            that this bundle ships with a driver. pointer-events-none so
            it never blocks the Book Rental tap. */}
        {withDriver && (
          <img
            src={DRIVER_ICON}
            alt="Includes driver"
            aria-hidden
            loading="lazy"
            className="pointer-events-none absolute right-2 top-[52px] sm:top-[60px] h-[94px] sm:h-[110px] w-auto z-0"
          />
        )}

        {/* Top row: hero photo on the left, trust + title block on the right. */}
        <div className="flex items-start gap-3">
          {/* Hero bike — no container frame, no header label above. */}
          <div className="shrink-0 w-[110px] sm:w-[140px] h-[88px] sm:h-[110px] relative">
            {photo
              ? <img
                  src={photo}
                  alt={`${r.brand} ${r.model}`}
                  className="w-full h-full object-contain"
                />
              : <div className="w-full h-full flex items-center justify-center text-[12px] font-extrabold uppercase tracking-wider text-black/70">
                  {r.brand}
                </div>}
            {r.rating != null && (
              <span className="absolute bottom-0 left-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black text-[11px] font-extrabold text-brand">
                <Star className="w-2.5 h-2.5 fill-brand stroke-brand" aria-hidden />
                {r.rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Trust + title */}
          <div className="flex-1 min-w-0">
            {/* Trust chip row — only "Ready to work" remains; verified,
                available-now, and featured chips have been removed. */}
            <div className="flex items-center gap-1 flex-wrap">
              {r.readyToWork && (
                <Chip Icon={Hammer} tone="black">Ready to work</Chip>
              )}
            </div>

            {/* Bike name */}
            <h3 className="mt-1 text-[15px] sm:text-[16px] font-extrabold text-black leading-tight truncate">
              {r.brand} {r.model}
            </h3>
            {/* Spec strip — bike-only specs. Mode (self ride / with
                driver) is communicated by the driver figure overlay +
                price-tile period (3/6/8 hr vs Day/Week/Month). */}
            <div className="mt-0.5 text-[12px] font-bold text-gray-700 truncate">
              {r.year} · {r.cc}cc · {transmissionLabel(r.transmission)}
            </div>

            {/* Helmet + raincoat — sit directly under the title; gear
                included is the next signal a renter scans for. */}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {r.helmetCount > 0 && (
                <Inclusion imageSrc={HELMET_ICON} imageSize="sm" label={`×${r.helmetCount}`} />
              )}
              {r.raincoatCount > 0 && (
                <Inclusion imageSrc={RAINCOAT_ICON} imageSize="lg" label={`×${r.raincoatCount}`} />
              )}
            </div>
          </div>
        </div>

        {/* Company / owner attribution — sits as a small label directly
            above the price-tile row. No icon, just the name. */}
        <div className="text-[12px] font-extrabold text-black truncate">
          {r.ownerCompany ?? r.ownerName}
        </div>

        {/* Pricing tiles — three small dark containers.
            - Self-ride: Day / Week / Month (long-stay pricing).
            - With driver: 3 hr / 6 hr / 8 hr (tour-block pricing).
            Day / 3 hr is the highlight on each variant. */}
        <div className="relative z-10 grid grid-cols-3 gap-1.5">
          {withDriver ? (
            <>
              <PriceTile label="3 hr" value={tourHourPrice(r.dailyPriceIdr, r.driverRatePerDayIdr ?? 0, 3)} highlight />
              <PriceTile label="6 hr" value={tourHourPrice(r.dailyPriceIdr, r.driverRatePerDayIdr ?? 0, 6)} />
              <PriceTile label="8 hr" value={tourHourPrice(r.dailyPriceIdr, r.driverRatePerDayIdr ?? 0, 8)} />
            </>
          ) : (
            <>
              <PriceTile label="Day"   value={r.dailyPriceIdr}   highlight />
              <PriceTile label="Week"  value={r.weeklyPriceIdr} />
              <PriceTile label="Month" value={r.monthlyPriceIdr} />
            </>
          )}
        </div>

        {/* Pickup/drop-off + driver rate (left) and Book Rental CTA
            (right). Pickup is now grouped next to the CTA so it reads
            as a service-modifier badge for the booking action. */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Delivery chip only shown on self-ride listings; bike +
                driver bundles don't carry a separate delivery service.
                Driver rate is already baked into the 3/6/8 hr tour totals
                above, so no "+ driver / day" line needed here. */}
            {r.pickupDropoff && !withDriver && (
              <Inclusion imageSrc={PICKUP_ICON} imageSize="lg" label="Delivery Available" />
            )}
            {withDriver && (
              <span className="text-[12px] font-extrabold uppercase tracking-wider text-black">
                Driver Included
              </span>
            )}
          </div>
          <a
            href={whatsappLink(r.ownerWhatsapp, r.ownerName, r.brand, r.model)}
            target="_blank"
            rel="noopener noreferrer"
            className="
              shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap
              rounded-lg
              px-3 py-2
              text-[12px] font-extrabold uppercase tracking-wider text-bg
              bg-gradient-to-r from-brand to-brand2
              border border-black/85
              active:scale-[0.99]
              transition-all
            "
            style={{ transform: 'translateY(-4px)' }}
          >
            Book Rental
            <ArrowRight className="w-3 h-3" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────

function Chip({
  Icon, tone, children,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  tone: 'brand' | 'green' | 'black' | 'featured'
  children: React.ReactNode
}) {
  const styles =
    tone === 'featured'
      ? { border: 'border-black/85 border-2', fg: 'text-black' }
      : { border: 'border-black/60', fg: 'text-black' }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider border ${styles.border} ${styles.fg}`}
    >
      <Icon className="w-3 h-3" strokeWidth={2.75} aria-hidden />
      {children}
    </span>
  )
}

function Inclusion({
  Icon, imageSrc, imageSize = 'md', label,
}: {
  Icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  imageSrc?: string
  imageSize?: 'md' | 'sm' | 'lg'
  label: string
}) {
  // Transparent inclusion chip — accepts either a lucide icon component
  // or a custom imageSrc URL (used for helmet + raincoat brand icons).
  // sm = w-5 (~20px, helmet), md = w-4 (default), lg = w-8 (raincoat).
  const sizeClass = imageSize === 'lg' ? 'w-8 h-8' : imageSize === 'sm' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-black">
      {imageSrc
        ? <img src={imageSrc} alt="" aria-hidden className={`${sizeClass} object-contain shrink-0`} />
        : Icon
          ? <Icon className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
          : null}
      {label}
    </span>
  )
}

function PriceTile({
  label, value, highlight = false,
}: {
  label: string
  value: number | null
  highlight?: boolean
}) {
  // Solid black price tile — brand-yellow text. Day is the highlight
  // (slightly larger price) so it draws the eye first.
  const has = value != null && value > 0
  return (
    <div
      className={`flex flex-col items-center justify-center px-1.5 py-1 rounded-lg bg-black border ${
        highlight ? 'border-brand' : 'border-black'
      }`}
    >
      <span className="text-[11px] font-extrabold uppercase tracking-wider leading-none text-brand/70">
        {label}
      </span>
      <span className={`mt-0.5 ${highlight ? 'text-[14px] sm:text-[15px]' : 'text-[13px] sm:text-[14px]'} font-extrabold tabular-nums leading-tight text-brand ${has ? '' : 'opacity-50'}`}>
        {has ? idr(value!) : '—'}
      </span>
    </div>
  )
}
