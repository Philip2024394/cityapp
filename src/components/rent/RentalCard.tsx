'use client'
import { Star, ArrowRight } from 'lucide-react'

const HELMET_ICON   = 'https://ik.imagekit.io/nepgaxllc/Untitledasdaaaaaaa-removebg-preview.png?updatedAt=1779053735062'
const RAINCOAT_ICON = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2012_29_10%20AM.png'
const PICKUP_ICON   = 'https://ik.imagekit.io/nepgaxllc/Untitleddasdaaa-removebg-preview.png'
const DRIVER_ICON   = 'https://ik.imagekit.io/nepgaxllc/Untitledasdaaaa-removebg-preview%20(1).png?updatedAt=1779022378771'
const BRAND_LOGO    = 'https://ik.imagekit.io/nepgaxllc/Untitleddaaaaad-removebg-preview.png?updatedAt=1779107454479'
import type { BikeRental } from '@/lib/rentals/types'
import { idr } from '@/lib/format/idr'
import { BIKE_CATALOG } from '@/lib/rentals/catalog'
import { trackWaClick } from '@/lib/tracking/waClick'

// Looks up the catalog stock image for a brand + model pair, with a tiny
// partial-match fallback so "PCX 150" still matches "PCX 160" etc.
function findCatalogImage(brand: string, model: string): string | null {
  const brandL = brand.toLowerCase().trim()
  const modelL = model.toLowerCase().trim().replace(/\s+/g, '')
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

// Resolves the hero card photo. The catalog stock image always wins so
// every card on /rent reads the same brand-consistent way. Owner upload
// is the fallback only when we can't find a catalog match.
function resolveCardPhoto(r: BikeRental): string | null {
  return findCatalogImage(r.brand, r.model) ?? r.imageUrls[0] ?? null
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

// Picks the area/street portion of an address (the part before the
// first comma) so the card shows a useful pickup hint without leaking
// the full city / district / postcode.
function shortAddress(address: string | null): string | null {
  if (!address) return null
  return address.split(',')[0].trim() || null
}

// Strips a trailing standalone cc number from the model name (e.g.
// "PCX 150" → "PCX", "Vario 125" → "Vario") so the card title doesn't
// duplicate the CC corner badge. Models that bake the CC into the part
// number itself (CB150R, CRF150L, GSX-R150) stay intact because the CC
// is not a separate trailing word.
function cleanModelName(model: string, cc: number): string {
  if (cc <= 0) return model
  const stripped = model.replace(new RegExp(`\\s+${cc}$`), '').trim()
  return stripped || model
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
        {/* Driver figure overlay — with-driver listings only. */}
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
          {/* Hero bike — no container frame, no header label above.
              Sized +10% from original 110×88 / 140×110 baseline. */}
          <div className="shrink-0 w-[121px] sm:w-[154px] h-[97px] sm:h-[121px] relative">
            {photo
              ? <img
                  src={photo}
                  alt={`${r.brand} ${r.model}`}
                  className="w-full h-full object-contain"
                  style={{ transform: 'translate(10px, 10px)' }}
                />
              : <div
                  className="w-full h-full flex items-center justify-center text-[12px] font-extrabold uppercase tracking-wider text-black/70"
                  style={{ transform: 'translate(10px, 10px)' }}
                >
                  {r.brand}
                </div>}
            {r.rating != null && (
              <span
                className="absolute bottom-0 left-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black text-[11px] font-extrabold text-brand"
                style={{ transform: 'translateY(30px)' }}
              >
                <Star className="w-2.5 h-2.5 fill-brand stroke-brand" aria-hidden />
                {r.rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Trust + title — on bike-only cards (no driver overlay)
              the content is shifted right of centre to balance the card
              now that there's no driver figure occupying the right edge. */}
          <div className={`flex-1 min-w-0 ${!withDriver ? 'pl-[31px] sm:pl-[47px]' : ''}`}>
            {/* Bike name — nudged 3 px down via translate so it doesn't
                affect the company name or price tiles below. */}
            <h3
              className="text-[16px] sm:text-[17px] font-extrabold text-black leading-tight"
              style={{ transform: 'translateY(3px)' }}
            >
              {r.brand} {cleanModelName(r.model, r.cc)}
            </h3>
            {/* Spec strip — year + transmission. CC moved below as a
                dedicated centered display under the gear icons. */}
            <div className="mt-0.5 text-[12px] font-bold text-gray-700 truncate">
              {r.year} · {transmissionLabel(r.transmission)}
            </div>

            {/* Rental-includes block — vertical stack: helmets, raincoats,
                delivery. Each icon sits in a fixed 32px column so the count
                labels line up under each other. Delivery row is icon-only
                (no service text) and shown only on self-ride listings. */}
            <div className="mt-1.5" style={{ transform: 'translateY(10px)' }}>
              <div className="flex flex-col gap-1">
                {r.helmetCount > 0 && (
                  <div className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-extrabold text-black">
                    <span className="shrink-0 w-8 flex justify-center">
                      <img src={HELMET_ICON} alt="" aria-hidden className="w-5 h-5 object-contain" />
                    </span>
                    <span className="leading-none">×{r.helmetCount} Helmets</span>
                  </div>
                )}
                {r.raincoatCount > 0 && (
                  <div className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-extrabold text-black">
                    <span className="shrink-0 w-8 flex justify-center">
                      <img
                        src={RAINCOAT_ICON}
                        alt=""
                        aria-hidden
                        className="w-8 h-8 object-contain"
                        style={{ transform: 'translateX(-2px)' }}
                      />
                    </span>
                    <span className="leading-none">×{r.raincoatCount} Raincoats</span>
                  </div>
                )}
                {r.pickupDropoff && !withDriver && (
                  <div className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-extrabold text-black">
                    <span className="shrink-0 w-8 flex justify-center">
                      <img
                        src={PICKUP_ICON}
                        alt=""
                        aria-hidden
                        className="w-8 h-8 object-contain"
                      />
                    </span>
                    <span className="leading-none">+ Vill/Hotel</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Company / owner attribution + short pickup address. Both
            lines truncate so they never spill past the right edge of
            the price-tile row directly below. */}
        <div className="space-y-0.5 -mt-1">
          <div className="text-[12px] font-extrabold text-black truncate">
            {r.ownerCompany ?? r.ownerName}
          </div>
          {shortAddress(r.address) && (
            <div className="text-[11px] font-bold text-gray-700 truncate">
              {shortAddress(r.address)}
            </div>
          )}
        </div>

        {/* Pricing tiles — three small dark containers.
            - Self-ride: Day / Week / Month (long-stay pricing).
            - With driver: 3 hr / 6 hr / 8 hr (tour-block pricing).
            Day / 3 hr is the highlight on each variant. */}
        <div className="relative z-10 grid grid-cols-3 gap-1.5">
          {withDriver ? (
            // Prefer the rental's own tour_Nh_idr columns (set by the
            // editor + the dashboard quick-toggle's defaults). If a
            // legacy rental hasn't been re-saved since the tour-rate
            // migration, fall back to the calculated tourHourPrice().
            <>
              <PriceTile label="3 hr" value={r.tour3hIdr ?? tourHourPrice(r.dailyPriceIdr, r.driverRatePerDayIdr ?? 0, 3)} highlight />
              <PriceTile label="6 hr" value={r.tour6hIdr ?? tourHourPrice(r.dailyPriceIdr, r.driverRatePerDayIdr ?? 0, 6)} />
              <PriceTile label="8 hr" value={r.tour8hIdr ?? tourHourPrice(r.dailyPriceIdr, r.driverRatePerDayIdr ?? 0, 8)} />
            </>
          ) : (
            <>
              <PriceTile label="Day"   value={r.dailyPriceIdr}   highlight />
              <PriceTile label="Week"  value={r.weeklyPriceIdr} />
              <PriceTile label="Month" value={r.monthlyPriceIdr} />
            </>
          )}
        </div>

        {/* Bottom row — Engine spec (left) + Book Rental CTA (right).
            Service text removed; delivery now lives in the gear stack
            above. */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-extrabold uppercase tracking-wider text-black truncate">
            Engine - {r.cc > 0 ? `${r.cc}cc` : 'Electric'}
          </span>
          <a
            href={whatsappLink(r.ownerWhatsapp, r.ownerName, r.brand, r.model)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWaClick({ context: 'rental_card', targetPhone: r.ownerWhatsapp, meta: { rental_id: r.id, brand: r.brand, model: r.model } })}
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
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-extrabold text-black">
      {imageSrc
        ? <img src={imageSrc} alt="" aria-hidden className={`${sizeClass} object-contain shrink-0`} />
        : Icon
          ? <Icon className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
          : null}
      <span className="leading-none">{label}</span>
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
