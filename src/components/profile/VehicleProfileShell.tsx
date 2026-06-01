'use client'

// =============================================================================
// VehicleProfileShell — shared client shell for /truck, /bus, /jeep profiles.
// -----------------------------------------------------------------------------
// One client-side render layer used by all three vehicle vertical pages so
// they share IDENTICAL design / spacing / typography / colors with the
// beautician profile page (src/app/beautician/[slug]/page.tsx) — same hero
// cover + floating info-card, same About / Services chips / Portfolio
// carousel / promo marquee / "Start from" CTA row, same yellow back-tab,
// same bottom accent bar, same Share modal.
//
// Vehicle pages remain SERVER components (loader + generateMetadata + JsonLd
// + ProfileViewBeacon stays untouched on the server). They just render this
// shell with the loaded driver data adapted into the VehiclePublic shape.
//
// CityDrivers is a SOFTWARE DIRECTORY under PM 12/2019. The CTA does a
// pure wa.me handoff — no platform-set prices, no fare calculation here.
//
// Brand accent is BRAND_YELLOW (#FACC15) for every accent surface (driver
// profiles don't carry a per-profile theme_color column).
// =============================================================================

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Star, Award, MessageCircle, Share2, Link2, X, ChevronLeft, BadgeCheck,
  MapPin, Truck as TruckIcon, Bus as BusIcon, Mountain as JeepIcon,
  Sparkles, Menu as MenuIcon, ChevronDown,
} from 'lucide-react'
import VisitUsPanel, {
  SocialInstagramIcon,
  SocialTikTokIcon,
  SocialFacebookIcon,
} from '@/components/profile/VisitUsPanel'
import RunningMarquee from '@/components/profile/RunningMarquee'
import PortfolioCarousel, {
  PortfolioDetailPopup,
  type PortfolioPhoto,
} from '@/components/profile/PortfolioCarousel'
import PortfolioViewToggle, { type PortfolioView } from '@/components/profile/PortfolioViewToggle'
import WaIntentAnchor from '@/components/profile/WaIntentAnchor'
import AvatarFrame from '@/components/profile/AvatarFrame'
import {
  SERVICE_OFFERINGS,
  TRUCK_SERVICE_OFFERINGS,
  getServiceCatalog,
  type ServiceOfferingId,
  type ServiceCatalogEntry,
  type RateRow,
} from '@/lib/drivers/serviceOfferings'
import { type ConnectIntentVertical, type ConnectIntentSource } from '@/lib/connectIntent'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'

// -----------------------------------------------------------------------------
// Brand constants — mirror the beautician page's DEFAULT_THEME slot but
// driver pages always use the CityDrivers brand yellow.
// -----------------------------------------------------------------------------

const BRAND_YELLOW = '#FACC15'
const BRAND_NAVY   = '#0F172A'

export type VehicleType = 'truck' | 'bus' | 'jeep'

// -----------------------------------------------------------------------------
// Normalised public-vehicle shape consumed by the shell. Each server page
// adapts its driver row (truck / bus / jeep) into this object — keeps the
// shell free of vendor-specific column gymnastics.
// -----------------------------------------------------------------------------

export type VehiclePublic = {
  id:                  string
  slug:                string
  display_name:        string
  bio:                 string | null
  whatsapp_e164:       string | null
  profile_image_url:   string | null
  cover_image_url:     string | null
  city:                string | null
  area:                string | null
  rating:              number | null
  rating_count:        number | null
  availability:        'online' | 'busy' | 'offline' | null
  service_zone_radius_km: number | null
  vehicle_make:        string | null
  vehicle_model:       string | null
  vehicle_year:        number | null
  vehicle_color:       string | null
  vehicle_plate:       string | null
  vehicle_seats:       number | null
  vehicle_photos:      string[]
  /** Driver-selected trip-type tag ids (mig 0110) — surfaced as the
   *  "Services Provided" chip row beneath the bio. */
  service_offerings:   string[]
  /** Lowest published rate (IDR) — drives the "Start from" big number in
   *  the CTA row. Truck → rental_daily_rate_idr. Bus/Jeep → min_fee. */
  start_price_idr:     number | null
  /** Per-vehicle rate rows that mirror the beautician services menu slot:
   *  each row renders as a PriceRow inside the rates card under the
   *  portfolio. e.g. truck → Daily/Weekly/Monthly; bus+jeep → From/Per-km. */
  rate_rows:           Array<{ label: string; value: string; subnote?: string }>
  /** Optional copy under the rate rows. Used to surface the truck min-days
   *  callout. Driver-published rates only; never platform-set. */
  rate_footnote:       string | null
  /** Per-service rate overrides (drivers.service_rates jsonb, mig 0169).
   *  Shape: `{ [service_id]: { rates: RateRow[] } }`. Missing keys / empty
   *  arrays → public profile falls back to the catalog `default_rates`. */
  service_rates?:      Record<string, { rates: RateRow[] }>
}

// -----------------------------------------------------------------------------
// Map our vehicle vertical → (back url, back label, intent vertical, intent
// source, fallback hero icon) so the shell's chrome adapts per page without
// duplicating any layout JSX.
// -----------------------------------------------------------------------------

type VehicleChromeConfig = {
  backHref:        string
  backLabel:       string
  heroIcon:        typeof TruckIcon
  intentVertical:  ConnectIntentVertical
  intentSource:    ConnectIntentSource
  defaultHeroBg:   string
}

const CHROME_BY_VEHICLE: Record<VehicleType, VehicleChromeConfig> = {
  truck: {
    // /truck has no directory page; truck cards live in the parcel hub.
    backHref:       '/cityriders/parcel',
    backLabel:      'Truck',
    heroIcon:       TruckIcon,
    intentVertical: 'rentals',
    intentSource:   'other',
    defaultHeroBg:  `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #EAB308 100%)`,
  },
  bus: {
    backHref:       '/bus',
    backLabel:      'Minibus',
    heroIcon:       BusIcon,
    intentVertical: 'car',
    intentSource:   'bus_profile',
    defaultHeroBg:  `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #EAB308 100%)`,
  },
  jeep: {
    backHref:       '/jeep',
    backLabel:      'Jeep',
    heroIcon:       JeepIcon,
    intentVertical: 'car',
    intentSource:   'other',
    defaultHeroBg:  `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #EAB308 100%)`,
  },
}

// -----------------------------------------------------------------------------
// Service-offering id → label lookup. Drives the chip row under the bio.
// Falls through to the literal id when an unknown offering slips into the
// driver's row (defensive — the catalog can grow without breaking this page).
// -----------------------------------------------------------------------------

const SERVICE_OFFERING_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_OFFERINGS.map((s) => [s.id, s.label]),
)

// -----------------------------------------------------------------------------
// "Start from" — formats the lowest published rate using the same idiom the
// beautician page uses (k / jt suffixes for IDR). Driver pages always
// render IDR so a fixed Rp prefix is fine.
// -----------------------------------------------------------------------------

function formatStartFromPrice(amount: number | null | undefined): string {
  if (typeof amount !== 'number' || amount <= 0) return 'Hubungi'
  if (amount >= 1_000_000) {
    const jt = amount / 1_000_000
    return `Rp ${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`
  }
  if (amount >= 1_000) {
    const k = amount / 1_000
    return `Rp ${Number.isInteger(k) ? k : k.toFixed(0)}k`
  }
  return `Rp ${amount.toLocaleString('id-ID')}`
}

// -----------------------------------------------------------------------------
// Vehicle-photos → PortfolioPhoto. Each card uses the driver's display name
// as the title and the vehicle make/model as the subtitle so the existing
// PortfolioCarousel renders cleanly without per-photo metadata.
// -----------------------------------------------------------------------------

function buildPortfolioPhotos(
  photos: string[],
  vehicleLabel: string,
  startPriceIdr: number | null,
  vehicleType: VehicleType,
): PortfolioPhoto[] {
  // For trucks, the carousel is keyed off the canonical TRUCK service
  // catalog — each card uses the per-service curated image, label and
  // description so the carousel actually depicts what the service is.
  // Driver-uploaded vehicle_photos are intentionally ignored here.
  if (vehicleType === 'truck') {
    return TRUCK_SERVICE_OFFERINGS.map((svc) => ({
      url:         svc.imageUrl ?? '',
      name:        svc.label_en,
      description: svc.description,
      price_idr:   startPriceIdr ?? null,
    }))
  }
  return photos.map((url) => ({
    url,
    name:        vehicleLabel,
    description: 'Foto kendaraan yang di-upload oleh driver.',
    price_idr:   startPriceIdr ?? null,
  }))
}

// -----------------------------------------------------------------------------
// Shell — public API. `vehicle` is the normalised data; `vehicleType` toggles
// the chrome.
// -----------------------------------------------------------------------------

export default function VehicleProfileShell({
  vehicle: v,
  vehicleType,
}: {
  vehicle:      VehiclePublic
  vehicleType:  VehicleType
}) {
  const chrome = CHROME_BY_VEHICLE[vehicleType]
  const theme  = BRAND_YELLOW

  const [shareOpen, setShareOpen]     = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showVisitUs, setShowVisitUs] = useState(false)
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('carousel')
  const [detailPhoto, setDetailPhoto] = useState<PortfolioPhoto | null>(null)
  const [servicesOpen, setServicesOpen] = useState(false)

  // -- Per-service rate panel state -------------------------------------------
  // Trucks + minibus share the catalog-driven badge / rate-panel UX. Jeep
  // keeps the legacy single rate-rows card (no catalog yet) for now.
  const serviceCatalog: readonly ServiceCatalogEntry[] =
    vehicleType === 'truck' ? getServiceCatalog('truck')
    : vehicleType === 'bus' ? getServiceCatalog('minibus')
    : []
  const [activeServiceId, setActiveServiceId] = useState<string | null>(
    serviceCatalog[0]?.id ?? null,
  )
  const activeService = serviceCatalog.find((s) => s.id === activeServiceId) ?? serviceCatalog[0] ?? null
  // Resolution order: driver override (non-empty rates[]) → catalog default.
  function resolveRates(svc: ServiceCatalogEntry): readonly RateRow[] {
    const override = v.service_rates?.[svc.id]?.rates
    if (Array.isArray(override) && override.length > 0) return override
    return svc.default_rates
  }

  const vehicleLabel = [v.vehicle_make, v.vehicle_model].filter(Boolean).join(' ')
    || (vehicleType === 'truck' ? 'Truck' : vehicleType === 'bus' ? 'Minibus' : 'Jeep')
  const where = [v.area, v.city].filter(Boolean).join(', ')

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://citydrivers.id'
  const profileUrl = `${siteOrigin}/${vehicleType}/${v.slug}`

  // Pre-filled WhatsApp message — used by the bottom Contact CTA and the
  // per-photo "View Details → Contact" handoff. Vehicle pages don't carry
  // a server-side booking flow (drivers + customers agree the terms in
  // chat per PM 12/2019 directory positioning), so the CTA is a direct
  // wa.me anchor — same pattern as the existing truck/bus pages.
  const waDigits = (v.whatsapp_e164 ?? '').replace(/\D+/g, '')
  function buildWaLink(extraLine?: string): string | null {
    if (!waDigits) return null
    const msg = [
      `Halo ${v.display_name}, saya menemukan profil Anda di CityDrivers.`,
      vehicleType === 'truck'
        ? 'Saya tertarik menyewa truk Anda.'
        : vehicleType === 'bus'
          ? 'Saya tertarik mencharter minibus Anda.'
          : 'Saya tertarik booking jeep Anda.',
      extraLine ?? '',
      'Apakah Anda available?',
    ].filter(Boolean).join('\n')
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`
  }
  const waLink = buildWaLink()

  const portfolioPhotos = buildPortfolioPhotos(v.vehicle_photos, vehicleLabel, v.start_price_idr, vehicleType)

  return (
    <main className="relative min-h-[100dvh] bg-white text-ink">
      <style>{`
        [aria-label="Open dev toolbar"]{display:none!important}
        @keyframes cd-availability-ping {
          0%   { transform: scale(0.6); opacity: 0.85; }
          80%  { transform: scale(2.4); opacity: 0;    }
          100% { transform: scale(2.4); opacity: 0;    }
        }
        .cd-availability-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: rgba(22,163,74,0.55);
          animation: cd-availability-ping 1.6s cubic-bezier(0,0,0.2,1) infinite;
        }
        .cd-availability-ring--delayed { animation-delay: 0.8s; }
      `}</style>

      {/* -------- Hero block — cover image + floating info-card (beautician parity) -------- */}
      <div className="relative pb-2">
        {/* Top-right action stack — Share button. */}
        <div className="absolute top-3 right-12 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Share profile"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md active:scale-[0.96] transition"
            style={{ background: theme }}
          >
            <Share2 className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div
          className="relative w-full overflow-hidden bg-black"
          style={{ aspectRatio: '16 / 9' }}
        >
          {v.cover_image_url || v.vehicle_photos[0] ? (
            <img
              src={v.cover_image_url || v.vehicle_photos[0]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: chrome.defaultHeroBg }}
            >
              <chrome.heroIcon className="w-20 h-20 text-white/85" strokeWidth={1.5} />
            </div>
          )}

          {/* Readability scrim — dark radial wash anchored to the top-left
              where the hero overlay text sits. Keeps text legible over
              light banners (e.g. the curated truck hero) without making
              dark banners feel heavier. */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 65% 80% at 0% 0%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0) 70%)',
            }}
          />

          {/* Hero overlay text — driver display name + vehicle. Matches the
              beautician page's hero overlay slot (top-left, with the
              sparkle accent in the brand theme). */}
          <div className="absolute left-4 z-10 select-none leading-none" style={{ top: 31 }}>
            <div
              className="flex items-center gap-0.5 text-[28px] sm:text-[34px] font-normal"
              style={{
                color: '#FFFFFF',
                textShadow: '0 2px 6px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.85)',
              }}
            >
              <span>Professional</span>
              <Sparkles
                className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 -mt-3"
                strokeWidth={0}
                fill={theme}
                style={{ color: theme, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))' }}
              />
            </div>
            <div
              className="text-[28px] sm:text-[34px] font-black mt-1 overflow-hidden"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.85)' }}
            >
              <span className="inline-block" style={{ color: theme }}>
                {vehicleType === 'truck' ? 'Truck Rental' : vehicleType === 'bus' ? 'Minibus' : 'Jeep'}
              </span>
            </div>
            <div
              className="text-[13px] sm:text-[14px] font-semibold mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                color: '#FFFFFF',
                maxWidth: 'min(360px, calc(100vw - 32px))',
                textShadow: '0 1px 3px rgba(0,0,0,0.75), 0 1px 2px rgba(0,0,0,0.85)',
              }}
            >
              {vehicleType === 'truck'
                ? 'Sewa harian, mingguan, bulanan — agree langsung dengan driver.'
                : vehicleType === 'bus'
                  ? 'Charter rombongan, airport transfer, tour — sepakati di chat.'
                  : 'Offroad, sunrise tour, charter — sepakati di chat.'}
            </div>
          </div>
        </div>

        {/* Floating info card — overlaps the bottom edge of the cover.
            Negative marginTop pulls it up over the hero image. */}
        <div className="px-4 max-w-2xl mx-auto relative z-20" style={{ marginTop: -20 }}>
          <div
            className="bg-white border border-gray-200 shadow-[0_10px_25px_rgba(0,0,0,0.15)] p-3 flex items-center gap-3"
            style={{ borderRadius: 15 }}
          >
            <div className="relative shrink-0">
              <AvatarFrame
                src={v.profile_image_url ?? null}
                alt={v.display_name}
                size={64}
                style="none"
                themeColor={theme}
                fallbackInitial={v.display_name?.[0]?.toUpperCase()}
              />
              {/* Avatar no longer carries the availability dot — it now
                  sits inline next to the vehicle brand line below. */}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[16px] sm:text-[18px] font-black text-black truncate leading-tight flex items-center gap-1">
                <span className="truncate">{v.display_name}</span>
                <BadgeCheck
                  className="w-4 h-4 shrink-0"
                  strokeWidth={2.5}
                  fill={theme}
                  style={{ color: '#FFFFFF' }}
                  aria-label="Verified"
                />
              </h1>
              {/* Vehicle brand on its own line with the satellite-ping
                  green dot inline after the name. Location goes
                  underneath. */}
              {vehicleLabel && (
                <p className="text-[12px] text-gray-700 font-extrabold truncate mt-0.5 inline-flex items-center gap-2">
                  <span className="truncate">{vehicleLabel}</span>
                  {v.availability === 'online' && (
                    <span
                      aria-label="Available now"
                      className="relative inline-flex items-center justify-center shrink-0"
                      style={{ width: 14, height: 14 }}
                    >
                      <span aria-hidden className="cd-availability-ring" />
                      <span aria-hidden className="cd-availability-ring cd-availability-ring--delayed" />
                      <span
                        aria-hidden
                        className="relative inline-block rounded-full border-2 border-white"
                        style={{ width: 10, height: 10, background: '#16A34A', boxShadow: '0 0 6px rgba(22,163,74,0.6)' }}
                      />
                    </span>
                  )}
                </p>
              )}
              {where && (
                <p className="text-[11px] text-gray-500 truncate mt-0.5 inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" strokeWidth={2.5} style={{ color: theme }} />
                  {where}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Star
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: '#FACC15' }}
                    fill="#FACC15"
                    strokeWidth={0}
                  />
                  <span className="text-[12px] font-extrabold text-black">
                    {v.rating != null && v.rating > 0 ? v.rating.toFixed(1) : '—'}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    ({v.rating_count ?? 0} trip{(v.rating_count ?? 0) === 1 ? '' : 's'})
                  </span>
                </span>
              </div>
              {/* City already shown under the brand line above and the
                  availability state is the satellite-ping dot on the
                  avatar — no extra pill needed here. */}
            </div>

            {/* Top-right of the info card — Top Rated Seller badge slot
                (matches beautician page; drivers don't have a contact-form
                opt-in so it's always the static badge). */}
            <div
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: '#F3F4F6' }}
            >
              <Award className="w-3.5 h-3.5" strokeWidth={2.25} style={{ color: theme }} />
              <span className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: theme }}>
                Verified Driver
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 max-w-2xl mx-auto space-y-3 pt-3">
        {showVisitUs ? (
          <VisitUsPanel
            displayName={v.display_name}
            address={where || v.city || null}
            city={v.city ?? null}
            lat={null}
            lng={null}
            hours={null}
            instagramUrl={null}
            tiktokUrl={null}
            facebookUrl={null}
            xUrl={null}
            snapchatUrl={null}
            websiteUrl={null}
            whatsappE164={v.whatsapp_e164 ?? null}
            telegramHandle={null}
            wechatId={null}
            lineId={null}
            kakaotalkId={null}
            busyDates={[]}
            themeColor={theme}
            onClose={() => setShowVisitUs(false)}
            noLocationCopy="Service area sesuai radius — sepakati pickup point di chat."
            bottomCta={null}
          />
        ) : (
          <>
            {/* About — 5-line clamped bio. Heading drops the driver
                name (the name is already in the description copy). */}
            <section className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  About
                </h2>
                <button
                  type="button"
                  onClick={() => setShowVisitUs(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider active:scale-[0.97] transition"
                  style={{ color: theme }}
                >
                  <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Service area
                </button>
              </div>
              <div className="flex items-start gap-3">
                {v.bio?.trim() ? (
                  <p
                    className="text-[13px] text-gray-600 leading-snug flex-1 min-w-0"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {v.bio.replace(/\s*\n\s*/g, ' ')}
                  </p>
                ) : (
                  <p className="text-[13px] text-gray-400 italic flex-1 min-w-0">
                    Driver belum menulis bio.
                  </p>
                )}
              </div>
            </section>

            {/* Services Provided — header + as many badges as fit on a
                single line; if more exist a small round burger button on
                the right toggles the rest into a second row below.
                For truck + bus the badges are CLICKABLE and select a
                catalog service to display in the rate panel underneath.
                Jeep keeps the legacy read-only chip row. */}
            {(() => {
              type Item = { key: string; label: string; active?: boolean; onClick?: () => void }
              let items: Item[] = []

              if (vehicleType === 'truck' || vehicleType === 'bus') {
                items = serviceCatalog.map((svc) => ({
                  key:     svc.id,
                  label:   svc.label_en,
                  active:  svc.id === activeServiceId,
                  onClick: () => setActiveServiceId(svc.id),
                }))
              } else {
                // Jeep — legacy read-only chip row from driver's opted-in offerings.
                items = v.service_offerings.map((sid) => ({
                  key:   sid,
                  label: SERVICE_OFFERING_LABELS[sid as ServiceOfferingId] ?? sid,
                }))
              }

              if (items.length === 0) return null
              const VISIBLE = 3
              const inline  = items.slice(0, VISIBLE)
              const rest    = items.slice(VISIBLE)
              const hasMore = rest.length > 0
              return (
                <section className="space-y-1.5" style={{ marginTop: 15 }}>
                  <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                    <h2 className="text-[12px] font-extrabold uppercase tracking-wider shrink-0" style={{ color: '#0A0A0A' }}>
                      Services Offered
                    </h2>
                    <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden min-w-0 flex-1">
                      {inline.map((it) => (
                        <ServiceFilterBadge
                          key={it.key}
                          label={it.label}
                          theme={theme}
                          active={it.active}
                          onClick={it.onClick}
                        />
                      ))}
                    </div>
                    {hasMore && (
                      <button
                        type="button"
                        aria-expanded={servicesOpen}
                        aria-label={servicesOpen ? 'Hide additional services' : `Show ${rest.length} more services`}
                        onClick={() => setServicesOpen((s) => !s)}
                        className="shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center active:scale-[0.95] transition"
                        style={{
                          background: theme,
                          color: '#0A0A0A',
                          boxShadow: '0 4px 10px rgba(250,204,21,0.45)',
                        }}
                      >
                        <MenuIcon className="w-3.5 h-3.5" strokeWidth={2.75} />
                      </button>
                    )}
                  </div>
                  {hasMore && servicesOpen && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {rest.map((it) => (
                        <ServiceFilterBadge
                          key={it.key}
                          label={it.label}
                          theme={theme}
                          active={it.active}
                          onClick={it.onClick}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })()}

            {/* Service rate panel — swaps content when a different badge
                is tapped. Truck + minibus only. */}
            {activeService && (vehicleType === 'truck' || vehicleType === 'bus') && (
              <ServiceRatePanel
                service={activeService}
                rates={resolveRates(activeService)}
                driverName={v.display_name}
                theme={theme}
              />
            )}

            {/* Portfolio carousel — vehicle photos. Shares the exact card
                + carousel + view-toggle UI the beautician page uses. */}
            {portfolioPhotos.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                    Portfolio
                  </h2>
                  <PortfolioViewToggle
                    view={portfolioView}
                    onChange={setPortfolioView}
                    themeColor={theme}
                  />
                </div>
                <p className="text-[11px] text-gray-500 italic -mt-1">
                  Please contact for additional service options not listed
                </p>
                <PortfolioCarousel
                  photos={portfolioPhotos}
                  onViewDetails={(ph) => setDetailPhoto(ph)}
                  themeColor={theme}
                  view={portfolioView}
                  currencySymbol="Rp"
                />
              </section>
            )}

            {/* Published rates — beautician services-menu analogue. Each
                row mirrors the PriceRow used on the previous truck/bus
                pages but lives inside the beautician-style card frame. */}
            {v.rate_rows.length > 0 && (
              <section className="space-y-2" style={{ marginTop: 15 }}>
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  Published rates
                </h2>
                <div
                  className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2"
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                >
                  {v.rate_rows.map((row, i) => (
                    <React.Fragment key={row.label}>
                      {i > 0 && <div className="h-px bg-gray-100" />}
                      <PriceRow label={row.label} value={row.value} subnote={row.subnote ?? 'Self-published by driver'} />
                    </React.Fragment>
                  ))}
                </div>
                {v.rate_footnote && (
                  <p className="text-[12px] text-gray-700 leading-snug px-1">
                    {v.rate_footnote}
                  </p>
                )}
                <p className="text-[12px] text-gray-500 leading-snug px-1">
                  Self-published rates · agree the final terms directly with the driver.
                  CityDrivers is a software directory — we never set, calculate, or modify prices.
                </p>
              </section>
            )}

            {/* Running marquee — weekly promo ribbon under the carousel. */}
            <RunningMarquee
              text={
                vehicleType === 'truck'
                  ? 'Hubungi driver minggu ini — diskusikan rencana sewa harian, mingguan, atau project bulanan.'
                  : vehicleType === 'bus'
                    ? 'Charter rombongan minggu ini — sepakati rute & tarif langsung dengan driver.'
                    : 'Charter jeep minggu ini — offroad, sunrise tour, atau private trip.'
              }
            />

            {/* CTA row under the carousel — large "Start from" price on
                the left, theme-coloured Contact button on the right. */}
            <div className="flex items-end justify-between gap-3 pb-4">
              <div className="leading-none pb-3">
                <div className="text-[24px] sm:text-[28px] font-black text-black">
                  {formatStartFromPrice(v.start_price_idr)}
                </div>
                <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 mt-1">
                  Start from
                </div>
              </div>
              {waLink && (
                <WaIntentAnchor
                  href={waLink}
                  providerId={v.id}
                  vertical={chrome.intentVertical}
                  source={chrome.intentSource}
                  className="inline-flex items-center gap-1.5 justify-center px-5 py-3 rounded-xl font-extrabold text-[13px] shadow-md active:scale-[0.97] transition shrink-0"
                  style={{ background: theme, color: BRAND_NAVY }}
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                  Contact
                </WaIntentAnchor>
              )}
            </div>
          </>
        )}
      </div>

      {/* -------- Share modal -------- */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShareOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl relative"
            style={{ borderTop: `4px solid ${theme}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[16px] font-black text-black">Share Profile</h3>
              <button
                onClick={() => setShareOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">
              Bagikan profil {v.display_name} ke teman atau kolega.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(profileUrl) } catch { /* ignore */ }
                  setShareCopied(true)
                  setTimeout(() => setShareCopied(false), 1800)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition border border-gray-200 active:scale-[0.99]"
              >
                <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[13px] font-extrabold text-black">
                    {shareCopied ? 'Copied!' : 'Copy link'}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">{profileUrl}</div>
                </div>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Lihat profil ${v.display_name} di CityDrivers: ${profileUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition"
                style={{ background: '#25D366' }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">WhatsApp</div>
                  <div className="text-[11px] text-white/85">Send link to a contact</div>
                </div>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition"
                style={{ background: '#1877F2' }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <SocialFacebookIcon />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">Facebook</div>
                  <div className="text-[11px] text-white/85">Share to your timeline</div>
                </div>
              </a>

              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(profileUrl) } catch { /* ignore */ }
                  setShareCopied(true)
                  setTimeout(() => setShareCopied(false), 1800)
                  window.open('https://www.instagram.com/', '_blank')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition"
                style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)' }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <SocialInstagramIcon />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">Instagram</div>
                  <div className="text-[11px] text-white/85">Link copied — paste to DM / Story</div>
                </div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(profileUrl) } catch { /* ignore */ }
                  setShareCopied(true)
                  setTimeout(() => setShareCopied(false), 1800)
                  window.open('https://www.tiktok.com/', '_blank')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition bg-black"
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <SocialTikTokIcon />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">TikTok</div>
                  <div className="text-[11px] text-white/85">Link copied — paste to bio / DM</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------- Right-edge yellow BACK tab — anchored to the top of the
          viewport (hero zone) so it does NOT overlap booking / share /
          contact buttons in the middle of the screen on mobile. -------- */}
      <Link
        href={chrome.backHref}
        aria-label={`Back to ${chrome.backLabel.toLowerCase()} directory`}
        className="fixed z-50 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition"
        style={{
          right:                  0,
          top:                    'calc(env(safe-area-inset-top, 0px) + 12px)',
          width:                  30,
          height:                 88,
          background:             BRAND_YELLOW,
          color:                  '#0A0A0A',
          borderTopLeftRadius:    12,
          borderBottomLeftRadius: 12,
          boxShadow:              '-4px 4px 14px rgba(0,0,0,0.22)',
        }}
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        <span
          className="font-extrabold uppercase"
          style={{
            writingMode:   'vertical-rl',
            transform:     'rotate(180deg)',
            fontSize:      10,
            letterSpacing: '0.18em',
          }}
        >
          Back
        </span>
      </Link>

      {/* -------- Bottom accent bar -------- */}
      <div
        className="fixed left-0 right-0 z-10"
        style={{ bottom: 0, height: 6, background: theme }}
        aria-hidden
      />

      {/* -------- Portfolio "View Details" popup --------
          onContact bounces straight to WhatsApp via window.open with the
          per-photo title woven into the message — same pattern as the
          beautician page minus the booking form. */}
      {detailPhoto && (
        <PortfolioDetailPopup
          photo={detailPhoto}
          themeColor={theme}
          canContact={Boolean(waLink)}
          currencySymbol="Rp"
          onClose={() => setDetailPhoto(null)}
          onContact={() => {
            const link = buildWaLink(
              detailPhoto.name
                ? `Saya ingin menanyakan tentang: ${detailPhoto.name}.`
                : undefined,
            )
            setDetailPhoto(null)
            if (link) window.open(link, '_blank', 'noopener,noreferrer')
          }}
        />
      )}

      <PoweredByKita2u defaultVertical={vehicleType === 'truck' ? 'truck-driver' : vehicleType === 'bus' ? 'bus-driver' : 'jeep-driver'} />
    </main>
  )
}

// -----------------------------------------------------------------------------
// Small presentational helpers — kept in this file (not extracted) so the
// shell is a single drop-in copy of the beautician layout's helpers.
// -----------------------------------------------------------------------------

function ServiceFilterBadge({
  label, theme, active, onClick,
}: { label: string; theme: string; active?: boolean; onClick?: () => void }) {
  // Read-only chip by default; becomes a single-select toggle when an
  // `onClick` handler is passed. Truck + minibus profiles use the
  // clickable variant so tapping a badge swaps the rate panel below.
  const isClickable = typeof onClick === 'function'
  const styleProps = active
    ? { background: theme, color: '#0A0A0A', boxShadow: '0 2px 8px rgba(250,204,21,0.35)' }
    : { background: 'rgba(229, 231, 235, 0.95)', color: '#0A0A0A' }
  const sharedCls =
    'inline-flex items-center gap-1.5 text-[12px] font-extrabold px-3 py-1.5 rounded-full transition'
  const inner = (
    <>
      <Sparkles
        className="w-3.5 h-3.5"
        strokeWidth={2.5}
        style={{ color: active ? '#0A0A0A' : theme }}
      />
      {label}
    </>
  )
  if (!isClickable) {
    return <span className={sharedCls} style={styleProps}>{inner}</span>
  }
  return (
    <button
      type="button"
      aria-pressed={!!active}
      onClick={onClick}
      className={sharedCls + ' active:scale-[0.97]'}
      style={styleProps}
    >
      {inner}
    </button>
  )
}

// -----------------------------------------------------------------------------
// IDR formatter for the rate-row chart. Mirrors the beautician page idiom
// — plain "Rp 325.000" — so the rate panel reads the same as the existing
// PriceRow style elsewhere in the shell.
// -----------------------------------------------------------------------------
function idr(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  return `Rp ${amount.toLocaleString('id-ID')}`
}

// -----------------------------------------------------------------------------
// ServiceRatePanel — swaps content when a different "Services Offered" badge
// is tapped. Renders the catalog header / subtext, a 2-column rate chart
// (label · idr), and two chip lists (Includes / Excludes). Driver-published
// footer reinforces the PM 12/2019 directory positioning.
// -----------------------------------------------------------------------------
function ServiceRatePanel({
  service, rates, driverName, theme,
}: {
  service:    ServiceCatalogEntry
  rates:      readonly RateRow[]
  driverName: string
  theme:      string
}) {
  return (
    <section className="space-y-2" style={{ marginTop: 12 }}>
      <div
        className="rounded-2xl border border-gray-200 bg-white p-4"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        {/* Header */}
        <div className="mb-1.5">
          <h3 className="text-[14px] font-black text-black leading-tight">
            {service.header}
          </h3>
          <p className="text-[12px] text-gray-600 leading-snug mt-0.5">
            {service.subtext}
          </p>
        </div>

        {/* Rate chart — 2-column list (label · idr + optional per-unit). */}
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
          {rates.length === 0 ? (
            <div className="px-3 py-2.5 text-[12px] text-gray-500 italic">
              Belum ada tarif dipublikasikan untuk layanan ini.
            </div>
          ) : (
            rates.map((row, i) => (
              <div key={`${row.label}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="text-[12px] font-extrabold text-gray-700 truncate">
                  {row.label}
                </div>
                <div className="text-[13px] font-black text-black shrink-0 tabular-nums">
                  {idr(row.idr)}
                  {row.per && (
                    <span className="text-[11px] font-bold text-gray-500 ml-0.5">{row.per}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Includes / Excludes chips */}
        {(service.includes.length > 0 || service.excludes.length > 0) && (
          <div className="mt-3 space-y-1.5">
            {service.includes.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 shrink-0 mt-1">
                  Inc
                </span>
                <div className="flex flex-wrap gap-1">
                  {service.includes.map((chip) => (
                    <span
                      key={`inc-${chip}`}
                      className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(16,185,129,0.10)', color: '#065F46' }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {service.excludes.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 shrink-0 mt-1">
                  Exc
                </span>
                <div className="flex flex-wrap gap-1">
                  {service.excludes.map((chip) => (
                    <span
                      key={`exc-${chip}`}
                      className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(245,158,11,0.10)', color: '#92400E' }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Driver-published footer */}
        <p className="text-[11px] text-gray-500 italic mt-3 leading-snug">
          Rates published by <span className="font-bold" style={{ color: theme }}>{driverName}</span>.
          Discuss final terms on WhatsApp.
        </p>
      </div>
    </section>
  )
}

function PriceRow({
  label, value, subnote,
}: { label: string; value: string; subnote: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-gray-500">
          {label}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5">{subnote}</div>
      </div>
      <div className="text-[15px] font-black text-black shrink-0">{value}</div>
    </div>
  )
}
