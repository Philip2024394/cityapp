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

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import {
  Star, Award, MessageCircle, Share2, Link2, X, ChevronLeft, BadgeCheck,
  MapPin, Truck as TruckIcon, Bus as BusIcon, Mountain as JeepIcon,
  Sparkles, Menu as MenuIcon, ChevronDown, Mail, Phone,
} from 'lucide-react'
import { PlaneTakeoff, MapPinned, Landmark } from 'lucide-react'
import HeroServiceIcon from './shell/HeroServiceIcon'
// VisitUsPanel re-exports the social icons used inline in this shell — keep
// the icon imports static (they're tiny), lazy-load the panel itself.
import {
  SocialInstagramIcon,
  SocialTikTokIcon,
  SocialFacebookIcon,
} from '@/components/profile/VisitUsPanel'
import RunningMarquee from '@/components/profile/RunningMarquee'
import PortfolioViewToggle, { type PortfolioView } from '@/components/profile/PortfolioViewToggle'
import WaIntentAnchor from '@/components/profile/WaIntentAnchor'
import AvatarFrame from '@/components/profile/AvatarFrame'
// Type-only re-exports so the dynamic chunk split is preserved (these do
// NOT generate runtime imports).
import type { Review } from './shell/ReviewsPanel'
import type { PortfolioPhoto } from '@/components/profile/PortfolioCarousel'

// Below-fold + modal-only widgets — code-split out of the shell's initial
// chunk. Each lazily loads on first render (ssr:false) so the profile's
// hero + service-icon row paint without waiting on these payloads.
const ReviewsPanel        = nextDynamic(() => import('./shell/ReviewsPanel'),                  { ssr: false, loading: () => null })
const PortfolioCarousel   = nextDynamic(() => import('@/components/profile/PortfolioCarousel'), { ssr: false, loading: () => null })
const PortfolioDetailPopup = nextDynamic(
  () => import('@/components/profile/PortfolioCarousel').then((m) => ({ default: m.PortfolioDetailPopup })),
  { ssr: false, loading: () => null }
)
const VisitUsPanel        = nextDynamic(() => import('@/components/profile/VisitUsPanel'),     { ssr: false, loading: () => null })
const PlacesPicker        = nextDynamic(() => import('@/components/places/PlacesPicker'),      { ssr: false, loading: () => null })
import {
  SERVICE_OFFERINGS,
  TRUCK_SERVICE_OFFERINGS,
  BUS_SERVICE_OFFERINGS,
  getServiceCatalog,
  type ServiceOfferingId,
  type ServiceCatalogEntry,
  type RateRow,
} from '@/lib/drivers/serviceOfferings'
import { type ConnectIntentVertical, type ConnectIntentSource } from '@/lib/connectIntent'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useCountryFromCoords } from '@/hooks/useCountryFromCoords'
import { haversineKm } from '@/lib/geo/haversine'
import { idr as idrFormat } from '@/lib/format/idr'
import { getLanguage } from '@/lib/languages'
import { getJeepImageUrl } from '@/data/jeepImages'

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
  /** Optional per-km IDR rate — only the bus adapter threads this. Drives
   *  the live km × per-km total inside the bus-only BusBookingWidget. */
  price_per_km?:       number | null
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
  // ---- Bus-only "Contact Us" surface (mig 0170) ---------------------------
  // These three fields are surfaced exclusively when vehicleType === 'bus'.
  // Truck + jeep profiles ignore them and keep their existing Verified
  // Driver badge.
  /** Driver-published contact email. Drives the bus profile Email button.
   *  Falls back to WhatsApp-only when unset. */
  contact_email?:      string | null
  /** Physical office / yard address line shown inside the "Contact Us"
   *  panel on the bus profile. */
  company_address?:    string | null
  /** Bus profile FAQ accordion. Empty array → FAQ block hidden. */
  faqs?:               ReadonlyArray<{ q: string; a: string }>
  /** Bus-only override for the per-service rate-panel "passenger cost"
   *  rule (mig 0171). When null, the public profile falls back to a
   *  hardcoded English default in ServiceRatePanel. */
  passenger_cost_rule?: string | null
  /** Spoken languages (mig 0157, ISO 639-1 codes). Indonesian is the
   *  always-on default; the avatar language-flag badge only renders
   *  when the driver speaks something beyond Indonesian. */
  languages?:           string[] | null
  /** Per-slot availability flags (mig 0156). Render as emoji chips under
   *  the rating row when at least one is true. Truck + bus + jeep all
   *  carry the columns now even though the original spec only fed them
   *  via bike/car. */
  available_sunrise?:   boolean | null
  available_daytime?:   boolean | null
  available_evening?:   boolean | null
  available_nightlife?: boolean | null
  // ---- Jeep-only hourly + rental rates (mig 0156 + bus parity) -----------
  // Threaded through the jeep loader so the public profile can render the
  // existing HourlyTabContent-equivalent + RentalContractCards block. Bus
  // already passes these via min_fee + service_rates; jeep needs the raw
  // columns so the rental block doesn't render empty.
  hourly_enabled?:      boolean | null
  hourly_3h_rate_idr?:  number | null
  hourly_6h_rate_idr?:  number | null
  hourly_8h_rate_idr?:  number | null
  rental_daily_rate_idr?:   number | null
  rental_weekly_rate_idr?:  number | null
  rental_monthly_rate_idr?: number | null
}

// -----------------------------------------------------------------------------
// Map our vehicle vertical → (back url, back label, intent vertical, intent
// source, fallback hero icon) so the shell's chrome adapts per page without
// duplicating any layout JSX.
// -----------------------------------------------------------------------------

type VehicleChromeConfig = {
  backHref:        string
  /** i18n key inside the `vehicleProfile` namespace — resolves to the
   *  back-tab label (e.g. "Truk" / "Truck"). Was a literal string. */
  backLabelKey:    'backLabelTruck' | 'backLabelBus' | 'backLabelJeep'
  heroIcon:        typeof TruckIcon
  intentVertical:  ConnectIntentVertical
  intentSource:    ConnectIntentSource
  defaultHeroBg:   string
}

const CHROME_BY_VEHICLE: Record<VehicleType, VehicleChromeConfig> = {
  truck: {
    // /truck has no directory page; truck cards live in the parcel hub.
    backHref:       '/cityriders/parcel',
    backLabelKey:   'backLabelTruck',
    heroIcon:       TruckIcon,
    intentVertical: 'rentals',
    intentSource:   'other',
    defaultHeroBg:  `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #EAB308 100%)`,
  },
  bus: {
    // /bus/page.tsx is the legacy directory page and is not part of the
    // tourist flow; the back tab must drop customers back at the main
    // booking entry (/cari) instead.
    backHref:       '/cari?service=bus',
    backLabelKey:   'backLabelBus',
    heroIcon:       BusIcon,
    intentVertical: 'car',
    intentSource:   'bus_profile',
    defaultHeroBg:  `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #EAB308 100%)`,
  },
  jeep: {
    backHref:       '/cari?vehicle=jeep',
    backLabelKey:   'backLabelJeep',
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

function formatStartFromPrice(amount: number | null | undefined, contactLabel: string): string {
  if (typeof amount !== 'number' || amount <= 0) return contactLabel
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
  vehicleColor: string | null,
  captions: { uploaded: string; silhouette: string },
): PortfolioPhoto[] {
  // Driver-uploaded photos always win when present. Catalog / silhouette
  // fallbacks only kick in when the driver hasn't uploaded any yet — so
  // the carousel reflects the actual rig the moment a photo lands.
  if (photos.length > 0) {
    return photos.map((url) => ({
      url,
      name:        vehicleLabel,
      description: captions.uploaded,
      price_idr:   startPriceIdr ?? null,
    }))
  }

  // Truck fallback — surface the canonical TRUCK service catalog so the
  // carousel still depicts the headline services even before a real photo
  // is uploaded.
  if (vehicleType === 'truck') {
    return TRUCK_SERVICE_OFFERINGS.map((svc) => ({
      url:         svc.imageUrl ?? '',
      name:        svc.label_en,
      description: svc.description,
      price_idr:   startPriceIdr ?? null,
    }))
  }

  // Jeep fallback — drop in the 8-colour Jimny silhouette keyed off the
  // driver's vehicle_color so the carousel always shows a plausible jeep
  // until a real photo is uploaded.
  if (vehicleType === 'jeep') {
    const silhouette = getJeepImageUrl(vehicleColor)
    if (silhouette) {
      return [{
        url:         silhouette,
        name:        vehicleLabel,
        description: captions.silhouette,
        price_idr:   startPriceIdr ?? null,
      }]
    }
  }

  // Bus / fallback — no driver photos, no fallback catalog → empty
  // carousel (the shell handles the empty state gracefully).
  return []
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
  const t = useTranslations('vehicleProfile')
  const chrome = CHROME_BY_VEHICLE[vehicleType]
  const theme  = BRAND_YELLOW

  const [shareOpen, setShareOpen]     = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showVisitUs, setShowVisitUs] = useState(false)
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('carousel')
  const [detailPhoto, setDetailPhoto] = useState<PortfolioPhoto | null>(null)
  const [servicesOpen, setServicesOpen] = useState(false)
  // Bus-only: Reviews + Places toggles (ported from DriverProfileShell so
  // minibus profile carries the same two buttons bike/car already have).
  const [showReviews, setShowReviews]             = useState(false)
  const [reviews, setReviews]                     = useState<Review[] | null>(null)
  const [reviewsLoading, setReviewsLoading]       = useState(false)
  const [reviewsRefreshCount, setReviewsRefreshCount] = useState(0)
  const [showPlacesPicker, setShowPlacesPicker]   = useState(false)
  // Bus-only "Contact Us" panel — swapped in via the yellow pill that
  // replaces the "Verified Driver" badge on the floating profile card.
  const [showContactUs, setShowContactUs]         = useState(false)
  // Single-open accordion index for the FAQ block inside the panel.
  const [openFaqIdx, setOpenFaqIdx]               = useState<number | null>(null)
  useEffect(() => {
    if (vehicleType !== 'bus') return
    if (!showReviews || !v.id) return
    const isUuid = /^[0-9a-f-]{36}$/i.test(v.id)
    if (!isUuid) { setReviews([]); return }
    setReviewsLoading(true)
    fetch(`/api/reviews?provider_type=driver&provider_id=${encodeURIComponent(v.id)}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { reviews?: Review[] } | null) => setReviews(j?.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [vehicleType, showReviews, v.id, reviewsRefreshCount])

  // -- Per-service rate panel state -------------------------------------------
  // Truck, minibus, AND jeep share the catalog-driven badge / rate-panel UX.
  // Jeep catalog (Jun 2026): Temple / City / Offroad / Beach / 8h / 4h —
  // see JEEP_SERVICE_OFFERINGS in src/lib/drivers/serviceOfferings.ts.
  const serviceCatalog: readonly ServiceCatalogEntry[] =
    vehicleType === 'truck' ? getServiceCatalog('truck')
    : vehicleType === 'bus'  ? getServiceCatalog('minibus')
    : vehicleType === 'jeep' ? getServiceCatalog('jeep')
    : []
  // Jeep — deterministic per-driver default-active service so the 3 mock
  // jeep profiles open on visibly different service banners (each landing
  // page shows a different hero image / package) without manual config
  // per mock. Truck + bus keep their original first-in-catalog default.
  const [activeServiceId, setActiveServiceId] = useState<string | null>(() => {
    if (serviceCatalog.length === 0) return null
    if (vehicleType !== 'jeep') return serviceCatalog[0]!.id
    const key = v.slug || v.id || ''
    let seed = 0
    for (let i = 0; i < key.length; i++) seed = (seed + key.charCodeAt(i)) | 0
    const idx = Math.abs(seed) % serviceCatalog.length
    return serviceCatalog[idx]!.id
  })
  // Bus profile uses a unified Services Provided tab row that combines
  // two special tabs (Booking, Places) with the 3 catalog services
  // (Airport, Tour, Daily). Default = 'booking' so a fresh visitor lands
  // on the quick-book widget.
  type BusTab = 'booking' | 'places' | string  // string for any catalog svc id
  const [activeBusTab, setActiveBusTab] = useState<BusTab>('booking')
  const activeService = serviceCatalog.find((s) => s.id === activeServiceId) ?? serviceCatalog[0] ?? null
  // Resolution order: driver override (non-empty rates[]) → catalog default.
  function resolveRates(svc: ServiceCatalogEntry): readonly RateRow[] {
    const override = v.service_rates?.[svc.id]?.rates
    if (Array.isArray(override) && override.length > 0) return override
    return svc.default_rates
  }

  const vehicleLabel = [v.vehicle_make, v.vehicle_model].filter(Boolean).join(' ')
    || (vehicleType === 'truck' ? t('heroTruck') : vehicleType === 'bus' ? t('heroBus') : t('heroJeep'))
  // Dedupe case-insensitively so "Yogyakarta Kota, Yogyakarta" (area =
  // "Yogyakarta Kota", city = "Yogyakarta") collapses to a single
  // "Yogyakarta Kota" line instead of an awkward duplicate.
  const where = (() => {
    const parts = [v.area, v.city].map((s) => s?.trim()).filter((s): s is string => Boolean(s))
    const seen = new Set<string>()
    const out: string[] = []
    for (const p of parts) {
      const k = p.toLowerCase()
      // Skip if we already have the same value, or if one part contains
      // the other (e.g. area "Yogyakarta Kota" contains city "Yogyakarta").
      if (seen.has(k)) continue
      if (out.some((other) => other.toLowerCase().includes(k) || k.includes(other.toLowerCase()))) continue
      seen.add(k)
      out.push(p)
    }
    return out.join(', ')
  })()

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
    const introKey =
      vehicleType === 'truck' ? 'waIntroTruck'
      : vehicleType === 'bus' ? 'waIntroBus'
      : 'waIntroJeep'
    const msg = [
      t('waSalutation', { name: v.display_name }),
      t(introKey),
      extraLine ?? '',
      t('waAvailable'),
    ].filter(Boolean).join('\n')
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`
  }
  const waLink = buildWaLink()

  const portfolioPhotos = buildPortfolioPhotos(
    v.vehicle_photos, vehicleLabel, v.start_price_idr, vehicleType, v.vehicle_color,
    { uploaded: t('photoUploadedCaption'), silhouette: t('jeepSilhouetteCaption') },
  )

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
            aria-label={t('shareProfileAria')}
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
              <span>{vehicleType === 'jeep' ? t('adventure') : t('professional')}</span>
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
                {vehicleType === 'truck' ? t('heroTruck') : vehicleType === 'bus' ? t('heroBus') : t('heroJeep')}
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
                ? t('heroTaglineTruck')
                : vehicleType === 'bus'
                  ? t('heroTaglineBus')
                  : t('heroTaglineJeep')}
            </div>

            {/* Bus-only — 3 hero service icons (Tour / Airport / Temple).
                Mirrors the bike/car DriverProfileShell hero icon row so
                customers immediately see the headline services without
                tapping a badge. */}
            {vehicleType === 'bus' && (
              <div className="flex items-start gap-2" style={{ marginTop: 15 }}>
                <HeroServiceIcon icon={MapPinned}    label={t('iconTour')} />
                <div className="w-px h-11 bg-black/25 mt-1" aria-hidden />
                <HeroServiceIcon icon={PlaneTakeoff} label={t('iconAirport')} />
                <div className="w-px h-11 bg-black/25 mt-1" aria-hidden />
                <HeroServiceIcon icon={Landmark}     label={t('iconTemple')} />
              </div>
            )}
          </div>
        </div>

        {/* Bus-only: Reviews toggle — yellow pill sitting on top of the
            hero, right side, just ABOVE the floating profile container
            (matches the exact position the bike/car DriverProfileShell
            uses). */}
        {vehicleType === 'bus' && (
          <div
            className="px-4 max-w-2xl mx-auto relative z-30 flex justify-end"
            style={{ marginTop: -40 }}
          >
            <button
              type="button"
              onClick={() => { setShowReviews((s) => !s); setShowPlacesPicker(false); setShowContactUs(false) }}
              aria-pressed={showReviews}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-md active:scale-[0.97] transition"
              style={{ background: BRAND_YELLOW, color: '#0A0A0A' }}
            >
              <Star className="w-3.5 h-3.5" strokeWidth={0} fill="#0A0A0A" />
              {showReviews ? t('reviewsHide') : t('reviewsShow')}
            </button>
          </div>
        )}

        {/* Floating info card — overlaps the bottom edge of the cover.
            Negative marginTop pulls it up over the hero image. */}
        <div className="px-4 max-w-2xl mx-auto relative z-20" style={{ marginTop: vehicleType === 'bus' ? 4 : -20 }}>
          <div
            className="bg-white border border-gray-200 shadow-[0_10px_25px_rgba(0,0,0,0.15)] p-3 flex items-center gap-3"
            style={{ borderRadius: 15 }}
          >
            <div className="relative shrink-0">
              <AvatarFrame
                src={v.profile_image_url ?? null}
                alt={v.display_name}
                size={64}
                style="pulse"
                themeColor={theme}
                fallbackInitial={v.display_name?.[0]?.toUpperCase()}
              />
              {/* Avatar no longer carries the availability dot — it now
                  sits inline next to the vehicle brand line below. */}
              <AvatarLanguageBadge languages={v.languages ?? null} />
            </div>
            <div className="min-w-0 flex-1">
              {/* Driver name — single line. Truncation handled by CSS
                  (overflow-hidden + textOverflow: 'ellipsis') so the
                  string only gets cut when it actually overflows the
                  container. The previous .slice(0, 22) chopped names
                  like "Sutarto Innova Reborn Tour" mid-word on every
                  screen size, including phones where the full text fit. */}
              <h1 className="text-[16px] sm:text-[18px] font-black text-black leading-tight flex items-center gap-2 whitespace-nowrap overflow-hidden">
                <span
                  className="overflow-hidden"
                  style={{ textOverflow: 'ellipsis', maxWidth: 'calc(100% - 60px)' }}
                >
                  {v.display_name || ''}
                </span>
                <BadgeCheck
                  className="w-4 h-4 shrink-0"
                  strokeWidth={2.5}
                  fill={theme}
                  style={{ color: '#FFFFFF' }}
                  aria-label={t('verifiedAria')}
                />
                {/* Satellite-ping green dot — sits inline after the
                    driver name. Only renders when online. */}
                {v.availability === 'online' && (
                  <span
                    aria-label={t('availableNowAria')}
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
              </h1>
              {/* Location sits IMMEDIATELY under the driver name. Vehicle
                  brand drops below it. */}
              {where && (
                <p className="text-[11px] text-gray-500 truncate mt-0.5 inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" strokeWidth={2.5} style={{ color: theme }} />
                  {where}
                </p>
              )}
              {/* Service-zone radius row — render only when the driver has
                  published a positive km figure. 11px muted grey to match
                  the location row above. */}
              {v.service_zone_radius_km != null && v.service_zone_radius_km > 0 && (
                <p className="text-[11px] text-gray-500 truncate mt-0.5 inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" strokeWidth={2.25} />
                  {t('serviceZoneRow', { km: v.service_zone_radius_km })}
                </p>
              )}
              {vehicleLabel && (
                <p className="text-[12px] text-gray-700 font-extrabold truncate mt-0.5">
                  {vehicleLabel}
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
                    {(v.rating_count ?? 0) === 1
                      ? t('tripCount', { count: v.rating_count ?? 0 })
                      : t('tripCountPlural', { count: v.rating_count ?? 0 })}
                  </span>
                </span>
                {/* Bus Places control moved to the unified Services
                    Provided tab row further down — no pill here anymore. */}
              </div>
              {/* Per-slot availability chips — surface only the slots the
                  driver opted into (Sunrise/Daytime/Evening/Nightlife).
                  Hidden entirely when none are set. */}
              <VehicleAvailabilitySlotChips v={v} />
              {/* City already shown under the brand line above and the
                  availability state is the satellite-ping dot on the
                  avatar — no extra pill needed here. */}
            </div>

            {/* Top-right of the info card — Verified Driver badge for
                truck + jeep. Bus profiles swap this slot for a clickable
                "Contact Us" pill (mig 0170) so passengers can reach the
                operator by email or WhatsApp without scrolling. */}
            {vehicleType === 'bus' ? (
              <button
                type="button"
                onClick={() => {
                  setShowContactUs((s) => !s)
                  // Closing the other bus toggles keeps the layout
                  // honest — only one of Places / Reviews / ContactUs is
                  // ever on screen at a time.
                  setShowPlacesPicker(false)
                  setShowReviews(false)
                }}
                aria-pressed={showContactUs}
                aria-label={showContactUs ? t('contactUsCloseAria') : t('contactUsOpenAria')}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full active:scale-[0.97] transition shadow-sm"
                style={{
                  background: showContactUs ? '#0A0A0A' : theme,
                  color:      showContactUs ? theme    : '#0A0A0A',
                  minHeight:  28,
                }}
              >
                <Phone className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span className="text-[11px] font-extrabold whitespace-nowrap">
                  {t('contactUsLabel')}
                </span>
              </button>
            ) : (
              <div
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full"
                style={{ background: '#F3F4F6' }}
              >
                <Award className="w-3.5 h-3.5" strokeWidth={2.25} style={{ color: theme }} />
                <span className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: theme }}>
                  {t('verifiedDriver')}
                </span>
              </div>
            )}
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
            noLocationCopy={t('noLocationCopy')}
            bottomCta={null}
          />
        ) : (
          <>
            {/* About — 5-line clamped bio. Heading drops the driver
                name (the name is already in the description copy). */}
            <section className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  {t('aboutHeading')}
                </h2>
                {vehicleType === 'bus' ? (
                  <button
                    type="button"
                    onClick={() => { setShowPlacesPicker((s) => !s); setShowReviews(false); setShowContactUs(false) }}
                    aria-pressed={showPlacesPicker}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-md active:scale-[0.97] transition"
                    style={{
                      background: showPlacesPicker ? '#0A0A0A' : theme,
                      color:      showPlacesPicker ? theme    : '#0A0A0A',
                      minHeight:  28,
                    }}
                  >
                    <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                    {showPlacesPicker ? t('placesClose') : t('placesOpen')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowVisitUs(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider active:scale-[0.97] transition"
                    style={{ color: theme }}
                  >
                    <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                    {t('serviceAreaButton')}
                  </button>
                )}
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
                    {t('driverBioEmpty')}
                  </p>
                )}
              </div>
            </section>

            {/* Bus-only — Places + Reviews panels render here (just under
                About) when toggled. Buttons themselves live in the
                bike-style positions: Reviews pill is anchored above the
                floating profile card, Places pill sits inside the floating
                card. See the JSX higher up the shell for those triggers. */}
            {vehicleType === 'bus' && showPlacesPicker && (
              <section className="mt-3">
                <PlacesPicker
                  onClose={() => setShowPlacesPicker(false)}
                  onSelect={() => { setShowPlacesPicker(false) }}
                />
              </section>
            )}

            {vehicleType === 'bus' && showReviews && (
              <section className="mt-3">
                <ReviewsPanel
                  providerId={v.id ?? ''}
                  reviews={reviews ?? []}
                  loading={reviewsLoading}
                  onSubmitted={() => setReviewsRefreshCount((n) => n + 1)}
                />
              </section>
            )}

            {/* Bus-only — "Contact Us" panel renders here when the pill
                that replaces the Verified Driver badge is tapped. Shows
                FAQ accordion + company details + map + Email / WhatsApp
                buttons. Hidden again the moment the close link or the
                pill is tapped a second time. */}
            {vehicleType === 'bus' && showContactUs && (
              <section className="mt-3">
                <BusContactUsPanel
                  v={v}
                  theme={theme}
                  openFaqIdx={openFaqIdx}
                  setOpenFaqIdx={setOpenFaqIdx}
                  onClose={() => setShowContactUs(false)}
                />
              </section>
            )}

            {/* Bus — when the Places picker OR Contact Us panel is open,
                hide everything below so only that container shares the
                viewport with the profile card + About. Reverts the moment
                the container is closed (or after a card is selected). */}
            {!(vehicleType === 'bus' && (showPlacesPicker || showContactUs || showReviews)) && (<>
            {/* Services Provided — header + as many badges as fit on a
                single line; if more exist a small round burger button on
                the right toggles the rest into a second row below.
                For truck + bus the badges are CLICKABLE and select a
                catalog service to display in the rate panel underneath.
                Jeep keeps the legacy read-only chip row.
                Bus has an additional 2 special tabs: Booking + Places. */}
            {(() => {
              type Item = { key: string; label: string; active?: boolean; onClick?: () => void }
              let items: Item[] = []

              if (vehicleType === 'bus') {
                // Unified bus tab row: Booking + the 3 catalog services
                // (Airport, Tour, Daily). Booking is the default active
                // tab so a fresh visitor sees the quick-book widget.
                // (Places lives in the About header — not in this row.)
                items = [
                  {
                    key:     'booking',
                    label:   t('tabBooking'),
                    active:  activeBusTab === 'booking',
                    onClick: () => { setActiveBusTab('booking'); setShowPlacesPicker(false); setShowReviews(false); setShowContactUs(false) },
                  },
                  ...serviceCatalog.map((svc) => ({
                    key:     svc.id,
                    label:   svc.label_en,
                    active:  activeBusTab === svc.id,
                    onClick: () => {
                      setActiveBusTab(svc.id)
                      setActiveServiceId(svc.id)
                      setShowPlacesPicker(false)
                      setShowReviews(false)
                      setShowContactUs(false)
                    },
                  })),
                ]
              } else if (vehicleType === 'truck' || vehicleType === 'jeep') {
                // Jeep + truck share the same clickable catalog-badge pattern.
                // Each badge selects a service which renders its rate panel
                // (header + sub-text + rate rows + includes/excludes) below.
                items = serviceCatalog.map((svc) => ({
                  key:     svc.id,
                  label:   svc.label_en,
                  active:  svc.id === activeServiceId,
                  onClick: () => setActiveServiceId(svc.id),
                }))
              } else {
                // Other verticals — read-only chip row from driver offerings.
                items = v.service_offerings.map((sid) => ({
                  key:   sid,
                  label: SERVICE_OFFERING_LABELS[sid as ServiceOfferingId] ?? sid,
                }))
              }

              if (items.length === 0) return null
              // Bus has 4 tabs (Booking + 3 catalog) — fit all on one row.
              // Jeep has 6 catalog tabs — show 4 inline, burger reveals 8h+4h.
              const VISIBLE = vehicleType === 'bus' ? 4 : vehicleType === 'jeep' ? 4 : 3
              const inline  = items.slice(0, VISIBLE)
              const rest    = items.slice(VISIBLE)
              const hasMore = rest.length > 0
              return (
                <section className="space-y-2" style={{ marginTop: 15 }}>
                  {/* Section header on its own line. Places control
                      lives in the About header for bus, not here. */}
                  <h2 className="text-[12px] font-extrabold uppercase tracking-wider" style={{ color: '#0A0A0A' }}>
                    {t('servicesProvidedHeading')}
                  </h2>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {inline.map((it) => (
                      <ServiceFilterBadge
                        key={it.key}
                        label={it.label}
                        theme={theme}
                        active={it.active}
                        onClick={it.onClick}
                      />
                    ))}
                    {hasMore && (
                      <button
                        type="button"
                        aria-expanded={servicesOpen}
                        aria-label={servicesOpen ? t('hideMoreServicesAria') : t('showMoreServicesAria', { count: rest.length })}
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

            {/* Bus — Booking tab renders the BusBookingWidget; the 3
                catalog tabs (airport/tour/daily) render the rate panel
                below. Truck keeps its existing always-on rate panel
                behaviour. */}
            {vehicleType === 'bus' && activeBusTab === 'booking' && (
              <BusBookingWidget
                v={v}
                theme={theme}
                providerId={v.id}
                intentVertical={chrome.intentVertical}
                intentSource={chrome.intentSource}
              />
            )}
            {activeService && (
              vehicleType === 'truck'
                ? true
                : vehicleType === 'jeep'
                  ? true
                  : vehicleType === 'bus' && activeBusTab !== 'booking'
            ) && (
              <ServiceRatePanel
                service={activeService}
                rates={resolveRates(activeService)}
                driverName={v.display_name}
                theme={theme}
                vehicleType={vehicleType}
                passengerCostRule={v.passenger_cost_rule ?? null}
              />
            )}

            {/* Bus-only — Daily / Weekly / Monthly long-term rental
                contract cards. Renders ONLY when the Daily tab is the
                active Services Provided tab, so the booking-default view
                stays uncluttered. */}
            {vehicleType === 'bus' && activeBusTab === 'daily' && (
              <RentalContractCards driverName={v.display_name} waE164={v.whatsapp_e164} theme={theme} />
            )}

            {/* Jeep-only — Hourly block-rate cards + long-term rental
                contract cards. Each card is gated on the driver having
                published at least one rate so we never show empty
                cards. Driver enables hourly via the dashboard
                hourly_enabled toggle; rentals via the daily/weekly/
                monthly rate inputs on the services editor. */}
            {vehicleType === 'jeep' && (
              <JeepHourlyAndRentalSection v={v} theme={theme} />
            )}

            {/* Portfolio carousel — vehicle photos. Shares the exact card
                + carousel + view-toggle UI the beautician page uses. Hidden
                for jeep: the Services Provided block above owns that
                real-estate (founder direction Jun 2026, replacing the photo
                strip with the Temple/City/Offroad/Beach/8h/4h rate panels). */}
            {vehicleType !== 'jeep' && portfolioPhotos.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                    {t('portfolioHeading')}
                  </h2>
                  <PortfolioViewToggle
                    view={portfolioView}
                    onChange={setPortfolioView}
                    themeColor={theme}
                  />
                </div>
                <p className="text-[11px] text-gray-500 italic -mt-1">
                  {t('portfolioExtra')}
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

            {/* Published rates block — bus profile has its own per-tab
                rate panels (Airport / Tour / Daily) so this legacy
                From / Per-km summary is suppressed. Truck + jeep keep
                their existing min-fee + per-km disclosure here. */}
            {vehicleType !== 'bus' && v.rate_rows.length > 0 && (
              <section className="space-y-2" style={{ marginTop: 15 }}>
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
                  {t('publishedRatesHeading')}
                </h2>
                <div
                  className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2"
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                >
                  {v.rate_rows.map((row, i) => (
                    <React.Fragment key={row.label}>
                      {i > 0 && <div className="h-px bg-gray-100" />}
                      <PriceRow label={row.label} value={row.value} subnote={row.subnote ?? t('selfPublishedByDriver')} />
                    </React.Fragment>
                  ))}
                </div>
                {v.rate_footnote && (
                  <p className="text-[12px] text-gray-700 leading-snug px-1">
                    {v.rate_footnote}
                  </p>
                )}
                <p className="text-[12px] text-gray-500 leading-snug px-1">
                  {t('rateDisclaimer')}
                </p>
              </section>
            )}

            {/* Running marquee — weekly promo ribbon under the carousel. */}
            <RunningMarquee
              text={
                vehicleType === 'truck'
                  ? t('marqueeTruck')
                  : vehicleType === 'bus'
                    ? t('marqueeBus')
                    : t('marqueeJeep')
              }
            />

            {/* CTA row under the carousel — large "Start from" price on
                the left, theme-coloured Contact button on the right. */}
            <div className="flex items-end justify-between gap-3 pb-4">
              <div className="leading-none pb-3">
                <div className="text-[24px] sm:text-[28px] font-black text-black">
                  {formatStartFromPrice(v.start_price_idr, t('startFromContact'))}
                </div>
                <div className="text-[11px] sm:text-[12px] font-medium text-gray-500 mt-1">
                  {t('startFrom')}
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
                  {t('ctaContact')}
                </WaIntentAnchor>
              )}
            </div>
            </>)}
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
              <h3 className="text-[16px] font-black text-black">{t('shareModalTitle')}</h3>
              <button
                onClick={() => setShareOpen(false)}
                aria-label={t('shareCloseAria')}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">
              {t('shareModalSubtitle', { name: v.display_name })}
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
                    {shareCopied ? t('shareCopied') : t('shareCopyLink')}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">{profileUrl}</div>
                </div>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(t('shareWaMessage', { name: v.display_name, url: profileUrl }))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white active:scale-[0.99] transition"
                style={{ background: '#25D366' }}
              >
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-extrabold">{t('shareWhatsApp')}</div>
                  <div className="text-[11px] text-white/85">{t('shareWhatsAppSub')}</div>
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
                  <div className="text-[13px] font-extrabold">{t('shareFacebook')}</div>
                  <div className="text-[11px] text-white/85">{t('shareFacebookSub')}</div>
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
                  <div className="text-[13px] font-extrabold">{t('shareInstagram')}</div>
                  <div className="text-[11px] text-white/85">{t('shareInstagramSub')}</div>
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
                  <div className="text-[13px] font-extrabold">{t('shareTikTok')}</div>
                  <div className="text-[11px] text-white/85">{t('shareTikTokSub')}</div>
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
        aria-label={t('backTabAria', { label: t(chrome.backLabelKey) })}
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
          {t('backVertical')}
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
                ? t('waPhotoIntro', { label: detailPhoto.name })
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
// RentalContractCards — bus-only Daily / Weekly / Monthly rental tier cards.
// Same design language as the hourly cards (white background, cream-to-white
// gradient, brand-yellow border, "Popular" ribbon on the middle tier).
// Tap-to-book opens WhatsApp with a prefilled long-term rental message.
// Default rates seeded from Yogya market data (Hiace Commuter mid-tier).
// -----------------------------------------------------------------------------

function RentalContractCards({
  driverName, waE164, theme,
}: {
  driverName: string
  waE164:     string | null
  theme:      string
}) {
  const t = useTranslations('vehicleProfile')
  const DEFAULTS = {
    daily:   1_500_000,
    weekly:  9_000_000,
    monthly: 32_000_000,
  } as const

  const tiers: ReadonlyArray<{
    id:    'daily' | 'weekly' | 'monthly'
    label: string
    sub:   string
    idr:   number
  }> = [
    { id: 'daily',   label: t('tierDaily'),   sub: t('tierDailySub'),   idr: DEFAULTS.daily   },
    { id: 'weekly',  label: t('tierWeekly'),  sub: t('tierWeeklySub'),  idr: DEFAULTS.weekly  },
    { id: 'monthly', label: t('tierMonthly'), sub: t('tierMonthlySub'), idr: DEFAULTS.monthly },
  ]

  function buildWaLink(tier: string, idr: number): string | null {
    const num = (waE164 ?? '').replace(/\D+/g, '')
    if (!num) return null
    const msg = t('waRentalIntro', { name: driverName, tier, price: idr.toLocaleString('id-ID') })
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
  }

  return (
    <section className="space-y-2" style={{ marginTop: 18 }}>
      <div>
        <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
          {t('rentalContractsHeading')}
        </h2>
        <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
          {t('rentalContractsSubtitle')}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiers.map((tier) => {
          const isPopular = tier.id === 'weekly'
          const waLink = buildWaLink(tier.label, tier.idr)
          return (
            <div
              key={tier.id}
              className="relative rounded-2xl overflow-hidden flex flex-col"
              style={{
                background:  'linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)',
                border:      `2px solid ${theme}`,
                boxShadow:   '0 8px 22px rgba(250,204,21,0.30)',
              }}
            >
              {isPopular && (
                <div
                  className="absolute top-0 right-0 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
                  style={{
                    background:           theme,
                    color:                '#0A0A0A',
                    borderBottomLeftRadius: 12,
                    boxShadow:            '0 2px 8px rgba(250,204,21,0.45)',
                  }}
                >
                  <Sparkles className="w-3 h-3" strokeWidth={0} fill="#0A0A0A" />
                  {t('popularRibbon')}
                </div>
              )}
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-amber-800">
                    {tier.label}
                  </div>
                  <div className="text-[28px] font-black leading-none mt-0.5 text-black">
                    Rp {(tier.idr / 1_000_000).toFixed(tier.idr % 1_000_000 === 0 ? 0 : 1)}M
                  </div>
                  <div className="text-[11.5px] text-gray-500 leading-tight mt-1">
                    {tier.sub}
                  </div>
                </div>
                <a
                  href={waLink ?? '#'}
                  target={waLink ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-disabled={!waLink}
                  className="mt-auto w-full inline-flex items-center justify-center gap-1.5 rounded-xl font-extrabold text-[13px] active:scale-[0.98] transition"
                  style={{
                    minHeight:  44,
                    background: theme,
                    color:      '#0A0A0A',
                    border:     `1px solid ${theme}`,
                    boxShadow:  '0 6px 16px rgba(250,204,21,0.45)',
                    opacity:    waLink ? 1 : 0.55,
                    pointerEvents: waLink ? 'auto' : 'none',
                  }}
                >
                  <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {t('enquireBtn')}
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------------
// JeepHourlyAndRentalSection — jeep-only block that surfaces the driver's
// hourly hire ladder + long-term rental tiers, using the actual driver-saved
// rates threaded through the jeep loader. Each card group is rendered only
// when the driver has published at least one rate so empty fields don't show
// "Rp 0" cards.
// -----------------------------------------------------------------------------
function JeepHourlyAndRentalSection({ v, theme }: { v: VehiclePublic; theme: string }) {
  const t = useTranslations('vehicleProfile')
  const hourlyTiers: ReadonlyArray<{ id: '3h' | '6h' | '8h'; label: string; sub: string; idr: number | null }> = [
    { id: '3h', label: t('tier3hLabel'), sub: t('tier3hSub'), idr: v.hourly_3h_rate_idr ?? null },
    { id: '6h', label: t('tier6hLabel'), sub: t('tier6hSub'), idr: v.hourly_6h_rate_idr ?? null },
    { id: '8h', label: t('tier8hLabel'), sub: t('tier8hSub'), idr: v.hourly_8h_rate_idr ?? null },
  ]
  const rentalTiers: ReadonlyArray<{ id: 'daily' | 'weekly' | 'monthly'; label: string; sub: string; idr: number | null }> = [
    { id: 'daily',   label: t('tierDaily'),   sub: t('tierDailySub'),   idr: v.rental_daily_rate_idr   ?? null },
    { id: 'weekly',  label: t('tierWeekly'),  sub: t('tierWeeklySub'),  idr: v.rental_weekly_rate_idr  ?? null },
    { id: 'monthly', label: t('tierMonthly'), sub: t('tierMonthlySub'), idr: v.rental_monthly_rate_idr ?? null },
  ]

  const hourlyEnabled = !!v.hourly_enabled && hourlyTiers.some((tier) => (tier.idr ?? 0) > 0)
  const rentalEnabled = rentalTiers.some((tier) => (tier.idr ?? 0) > 0)
  if (!hourlyEnabled && !rentalEnabled) return null

  function buildWaLink(tierLabel: string, idr: number): string | null {
    const num = (v.whatsapp_e164 ?? '').replace(/\D+/g, '')
    if (!num) return null
    const msg = t('waHourlyIntro', { name: v.display_name, tier: tierLabel, price: idr.toLocaleString('id-ID') })
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
  }

  function formatBigIdr(idr: number): string {
    if (idr >= 1_000_000) {
      const jt = idr / 1_000_000
      return `Rp ${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`
    }
    if (idr >= 1_000) {
      const k = idr / 1_000
      return `Rp ${Number.isInteger(k) ? k : k.toFixed(0)}k`
    }
    return `Rp ${idr.toLocaleString('id-ID')}`
  }

  return (
    <>
      {hourlyEnabled && (
        <section className="space-y-2" style={{ marginTop: 18 }}>
          <div>
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              {t('hourlyHireHeading')}
            </h2>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
              {t('hourlyHireSubtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {hourlyTiers.filter((tier) => (tier.idr ?? 0) > 0).map((tier) => {
              const waLink = buildWaLink(tier.label, tier.idr ?? 0)
              return (
                <div
                  key={tier.id}
                  className="relative rounded-2xl overflow-hidden flex flex-col"
                  style={{
                    background: 'linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)',
                    border: `2px solid ${theme}`,
                    boxShadow: '0 8px 22px rgba(250,204,21,0.30)',
                  }}
                >
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-amber-800">
                        {tier.label}
                      </div>
                      <div className="text-[28px] font-black leading-none mt-0.5 text-black">
                        {tier.idr != null ? formatBigIdr(tier.idr) : '—'}
                      </div>
                      <div className="text-[11.5px] text-gray-500 leading-tight mt-1">
                        {tier.sub}
                      </div>
                    </div>
                    <a
                      href={waLink ?? '#'}
                      target={waLink ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      aria-disabled={!waLink}
                      className="mt-auto w-full inline-flex items-center justify-center gap-1.5 rounded-xl font-extrabold text-[13px] active:scale-[0.98] transition"
                      style={{
                        minHeight: 44,
                        background: theme,
                        color: '#0A0A0A',
                        border: `1px solid ${theme}`,
                        boxShadow: '0 6px 16px rgba(250,204,21,0.45)',
                        opacity: waLink ? 1 : 0.55,
                        pointerEvents: waLink ? 'auto' : 'none',
                      }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                      {t('enquireBtn')}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {rentalEnabled && (
        <section className="space-y-2" style={{ marginTop: 18 }}>
          <div>
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black">
              {t('rentalContractsHeading')}
            </h2>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
              {t('rentalContractsSubtitleJeep')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rentalTiers.filter((tier) => (tier.idr ?? 0) > 0).map((tier) => {
              const isPopular = tier.id === 'weekly'
              const waLink = buildWaLink(tier.label, tier.idr ?? 0)
              return (
                <div
                  key={tier.id}
                  className="relative rounded-2xl overflow-hidden flex flex-col"
                  style={{
                    background: 'linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)',
                    border: `2px solid ${theme}`,
                    boxShadow: '0 8px 22px rgba(250,204,21,0.30)',
                  }}
                >
                  {isPopular && (
                    <div
                      className="absolute top-0 right-0 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
                      style={{
                        background: theme,
                        color: '#0A0A0A',
                        borderBottomLeftRadius: 12,
                        boxShadow: '0 2px 8px rgba(250,204,21,0.45)',
                      }}
                    >
                      <Sparkles className="w-3 h-3" strokeWidth={0} fill="#0A0A0A" />
                      {t('popularRibbon')}
                    </div>
                  )}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-amber-800">
                        {tier.label}
                      </div>
                      <div className="text-[28px] font-black leading-none mt-0.5 text-black">
                        {tier.idr != null ? formatBigIdr(tier.idr) : '—'}
                      </div>
                      <div className="text-[11.5px] text-gray-500 leading-tight mt-1">
                        {tier.sub}
                      </div>
                    </div>
                    <a
                      href={waLink ?? '#'}
                      target={waLink ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      aria-disabled={!waLink}
                      className="mt-auto w-full inline-flex items-center justify-center gap-1.5 rounded-xl font-extrabold text-[13px] active:scale-[0.98] transition"
                      style={{
                        minHeight: 44,
                        background: theme,
                        color: '#0A0A0A',
                        border: `1px solid ${theme}`,
                        boxShadow: '0 6px 16px rgba(250,204,21,0.45)',
                        opacity: waLink ? 1 : 0.55,
                        pointerEvents: waLink ? 'auto' : 'none',
                      }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                      {t('enquireBtn')}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </>
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
  service, rates, driverName, theme, vehicleType, passengerCostRule,
}: {
  service:    ServiceCatalogEntry
  rates:      readonly RateRow[]
  driverName: string
  theme:      string
  vehicleType: VehicleType
  /** Bus-only override for the passenger-cost rule line. Null → use
   *  the hardcoded English default below. */
  passengerCostRule?: string | null
}) {
  const t = useTranslations('vehicleProfile')
  return (
    <section className="space-y-2" style={{ marginTop: 12 }}>
      <div
        className={
          // Jeep banner is edge-to-edge inside the card. Drop the 1px
          // border on jeep so the image runs flush to the rounded corners
          // (no thin gray gutter between image and card edge).
          vehicleType === 'jeep' && service.imageUrl
            ? 'rounded-2xl bg-white overflow-hidden'
            : 'rounded-2xl border border-gray-200 bg-white overflow-hidden'
        }
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        {/* Jeep-only — founder-uploaded hero image for the active service.
            Truck's catalog uses a single shared placeholder which also
            populates the photo carousel below, so we keep that branch
            text-only to avoid the duplicate. Natural aspect (w-full +
            h-auto) — image displays at its full source proportions per
            founder direction ("fit length and height"). Inline width/
            display style hardens against any cascade conflict so the
            image always fills 100% of the card width. */}
        {vehicleType === 'jeep' && service.imageUrl && (
          <div className="relative w-full" style={{ width: '100%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={service.imageUrl}
              alt=""
              className="block w-full h-auto"
              style={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%' }}
              loading="lazy"
            />
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
              }}
            />
            <div className="absolute left-3 right-3 bottom-2.5">
              <h3
                className="text-[16px] sm:text-[17px] font-black leading-tight text-white"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.65)' }}
              >
                {service.header}
              </h3>
            </div>
          </div>
        )}

        <div className="p-4">
        {/* Header — suppressed for jeep since the banner already shows it. */}
        {!(vehicleType === 'jeep' && service.imageUrl) && (
          <div className="mb-1.5">
            <h3 className="text-[14px] font-black text-black leading-tight">
              {service.header}
            </h3>
            <p className="text-[12px] text-gray-600 leading-snug mt-0.5">
              {service.subtext}
            </p>
          </div>
        )}
        {/* Jeep — subtext sits under the banner so the image carries the title. */}
        {vehicleType === 'jeep' && service.imageUrl && (
          <p className="text-[12px] text-gray-600 leading-snug mb-1.5">
            {service.subtext}
          </p>
        )}

        {/* Rate chart — 2-column list (label · idr + optional per-unit). */}
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
          {rates.length === 0 ? (
            <div className="px-3 py-2.5 text-[12px] text-gray-500 italic">
              {t('ratesEmpty')}
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

        {/* Per-vehicle disclosure block — buses get a single passenger-cost
            rule (no "Includes" chips); truck + jeep keep the full
            Includes / Excludes chip layout because their rate models
            vary more sharply per service. */}
        {vehicleType === 'bus' ? (
          <div
            className="mt-3 rounded-lg px-3 py-2 text-[12px] leading-snug"
            style={{
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              color: '#854D0E',
            }}
          >
            <span className="font-extrabold">{t('passengerCostExtras')}</span>{' '}
            {passengerCostRule?.trim()
              ? passengerCostRule.trim()
              : t('passengerCostDefault')}
          </div>
        ) : (
          (service.includes.length > 0 || service.excludes.length > 0) && (
            <div className="mt-3 space-y-1.5">
              {service.includes.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 shrink-0 mt-1">
                    {t('rateChipInc')}
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
                    {t('rateChipExc')}
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
          )
        )}

        {/* Driver-published footer */}
        <p className="text-[11px] text-gray-500 italic mt-3 leading-snug">
          {t('ratesPublishedByPrefix')}{' '}
          <span className="font-bold" style={{ color: theme }}>{driverName}</span>.{' '}
          {t('ratesPublishedBySuffix')}
        </p>
        </div>
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------------
// BusContactUsPanel — bus-only "Contact Us" card.
// Shape:
//   • Optional FAQ accordion at the top (single-open).
//   • 2-column row: company details + social row (left) / map (right).
//   • Bottom row: Email button + WhatsApp button (grid-cols-2 when both,
//     full-width when only one is set, muted notice when neither).
//   • Close link in the top-right.
//
// Drivers don't carry instagram/tiktok/facebook URL columns yet, so the
// social row is gracefully hidden. Map currently always renders the
// styled placeholder block — TODO: wire real lat/lng when bus drivers
// get geocoded.
// -----------------------------------------------------------------------------
function BusContactUsPanel({
  v, theme, openFaqIdx, setOpenFaqIdx, onClose,
}: {
  v:             VehiclePublic
  theme:         string
  openFaqIdx:    number | null
  setOpenFaqIdx: (n: number | null) => void
  onClose:       () => void
}) {
  const t = useTranslations('vehicleProfile')
  const faqs    = v.faqs ?? []
  const where   = [v.area, v.city].filter(Boolean).join(', ')
  const address = v.company_address?.trim() || null

  // Drivers don't have instagram_url / tiktok_url / facebook_url columns yet
  // (mig 0072 only added them to service-provider tables). When they land
  // on drivers later, these reads will start surfacing the social row.
  const socialUrls = v as unknown as {
    instagram_url?: string | null
    tiktok_url?:    string | null
    facebook_url?:  string | null
  }
  const igUrl = typeof socialUrls.instagram_url === 'string' && socialUrls.instagram_url.trim() ? socialUrls.instagram_url : null
  const ttUrl = typeof socialUrls.tiktok_url    === 'string' && socialUrls.tiktok_url.trim()    ? socialUrls.tiktok_url    : null
  const fbUrl = typeof socialUrls.facebook_url  === 'string' && socialUrls.facebook_url.trim()  ? socialUrls.facebook_url  : null
  const anySocial = !!(igUrl || ttUrl || fbUrl)

  // Email handoff — pre-fills a polite Indonesian booking enquiry.
  const emailHref = v.contact_email
    ? (() => {
        const subject = t('busEmailSubject', { name: v.display_name })
        const body    = t('busEmailBody', { name: v.display_name })
        return `mailto:${v.contact_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      })()
    : null

  // WhatsApp handoff — same message body the shell's main CTA uses so the
  // panel stays consistent with the bottom "Contact" button copy.
  const waDigits = (v.whatsapp_e164 ?? '').replace(/\D+/g, '')
  const waLink   = waDigits
    ? (() => {
        const msg = [
          t('waSalutation', { name: v.display_name }),
          t('waIntroBus'),
          t('waAvailable'),
        ].join('\n')
        return `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`
      })()
    : null

  const hasEither = !!(emailHref || waLink)

  // TODO: bus drivers don't carry lat/lng columns yet. When they're
  // geocoded, swap this null for the real coordinates and the OSM static
  // map will render automatically.
  const lat: number | null = null
  const lng: number | null = null
  const mapImgUrl = (lat != null && lng != null)
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=300x180&markers=${lat},${lng},red-pushpin`
    : null

  return (
    <div
      className="relative rounded-2xl bg-white border border-gray-200"
      style={{ boxShadow: '0 8px 22px rgba(0,0,0,0.08)', borderTop: `4px solid ${theme}` }}
    >
      {/* Close affordance — top-right */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('busContactCloseAria')}
        className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 hover:text-black active:scale-[0.97] transition px-2 py-1"
      >
        {t('busContactClose')}
        <X className="w-3 h-3" strokeWidth={2.5} />
      </button>

      <div className="p-4 pt-6 space-y-4">
        {/* ---- FAQ accordion ------------------------------------------- */}
        {faqs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-black">
              {t('busFaqHeading')}
            </h3>
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {faqs.map((row, i) => {
                const open = openFaqIdx === i
                return (
                  <div key={`${row.q}-${i}`}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(open ? null : i)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left active:bg-gray-50 transition"
                    >
                      <span className="text-[12.5px] font-extrabold text-black leading-snug">
                        {row.q}
                      </span>
                      <ChevronDown
                        className="w-3.5 h-3.5 shrink-0 transition-transform"
                        strokeWidth={2.5}
                        style={{
                          color:     theme,
                          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </button>
                    {open && (
                      <div className="px-3 pb-3 -mt-0.5 text-[12px] text-gray-700 leading-snug">
                        {row.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="h-px bg-gray-100" />
          </div>
        )}

        {/* ---- Company details + map row ------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Left — company name / address / socials */}
          <div className="space-y-2">
            <div>
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500">
                {t('busCompanyHeading')}
              </div>
              <div className="text-[14px] font-black text-black leading-tight mt-0.5">
                {v.display_name}
              </div>
              {where && (
                <div className="text-[11.5px] text-gray-500 inline-flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" strokeWidth={2.5} style={{ color: theme }} />
                  {where}
                </div>
              )}
            </div>
            <div>
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500">
                {t('busAddressHeading')}
              </div>
              {address ? (
                <div className="text-[13px] text-black leading-snug mt-0.5">
                  {address}
                </div>
              ) : (
                <div className="text-[12px] text-gray-400 italic mt-0.5">
                  {t('busAddressEmpty')}
                </div>
              )}
            </div>

            {anySocial && (
              <div className="flex items-center gap-2 pt-1">
                {igUrl && (
                  <a
                    href={igUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white active:scale-[0.95] transition shadow-sm"
                    style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)' }}
                  >
                    <SocialInstagramIcon />
                  </a>
                )}
                {ttUrl && (
                  <a
                    href={ttUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-black text-white active:scale-[0.95] transition shadow-sm"
                  >
                    <SocialTikTokIcon />
                  </a>
                )}
                {fbUrl && (
                  <a
                    href={fbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white active:scale-[0.95] transition shadow-sm"
                    style={{ background: '#1877F2' }}
                  >
                    <SocialFacebookIcon />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Right — map (OSM static or placeholder block) */}
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 relative" style={{ minHeight: 120 }}>
            {mapImgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mapImgUrl}
                alt={t('busMapAlt')}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center">
                <MapPin className="w-6 h-6" strokeWidth={2} style={{ color: theme }} />
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">
                  {t('busMapPreview')}
                </div>
                <div className="text-[10.5px] text-gray-400 leading-snug">
                  {t('busMapNoCoords')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Contact buttons ---------------------------------------- */}
        {!hasEither ? (
          <p className="text-[12px] text-gray-500 italic leading-snug">
            {t('busContactNone')}
          </p>
        ) : (
          <div className={emailHref && waLink ? 'grid grid-cols-2 gap-2' : ''}>
            {emailHref && (
              <a
                href={emailHref}
                aria-label={t('busEmailAria')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-[13px] font-extrabold text-white bg-black active:scale-[0.97] transition shadow-sm"
                style={{ minHeight: 44 }}
              >
                <Mail className="w-4 h-4" strokeWidth={2.5} />
                {t('busEmailButton')}
              </a>
            )}
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('busWaAria')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-[13px] font-extrabold active:scale-[0.97] transition shadow-sm"
                style={{ background: theme, color: '#0A0A0A', minHeight: 44 }}
              >
                <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                {t('busWaButton')}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
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

// -----------------------------------------------------------------------------
// BusBookingWidget — bus-only quick-book card that sits ABOVE the Services
// Provided row. Two mutually-exclusive tabs:
//
//   "Type address"     — Pickup + Drop-off PlaceAutocomplete inputs. When both
//                        carry coords the widget shows a single big total
//                        computed as `max(min_fee, round(km × price_per_km))`,
//                        no per-km disclosure (founder direction).
//
//   "Pick destination" — Single <select> listing the canonical Tour bucket's
//                        published destinations. Total = the picked row's idr.
//
// BOOK button is a WaIntentAnchor wrapping a wa.me message. Disabled
// (opacity 0.55, pointer-events: none) until the customer has filled the
// inputs. Card frame: rounded-2xl, white bg, subtle shadow — matches the
// rate-panel card design language used elsewhere on the page.
// -----------------------------------------------------------------------------

type BusBookingTab = 'address' | 'destination'

function BusBookingWidget({
  v, theme, providerId, intentVertical, intentSource,
}: {
  v:              VehiclePublic
  theme:          string
  providerId:     string
  intentVertical: ConnectIntentVertical
  intentSource:   ConnectIntentSource
}) {
  const t = useTranslations('vehicleProfile')
  const [tab, setTab] = useState<BusBookingTab>('address')

  // Tab A — type-address state.
  const [pickup,        setPickup]        = useState('')
  const [dropoff,       setDropoff]       = useState('')
  const [pickupCoords,  setPickupCoords]  = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Tab B — pick-destination state. Default = first Tour row so the BOOK
  // button is never disabled the moment the customer flips the tab.
  // Driver override (drivers.service_rates.tour.rates) takes precedence
  // over the catalog default_rates when present — same option <select>
  // markup, just a different source array so the driver's published
  // destinations + flat package prices drive the dropdown.
  const tourBucket = BUS_SERVICE_OFFERINGS.find((s) => s.id === 'tour') ?? null
  const tourOverride = v.service_rates?.tour?.rates
  const tourRows: ReadonlyArray<RateRow> = (Array.isArray(tourOverride) && tourOverride.length > 0)
    ? tourOverride
    : (tourBucket?.default_rates ?? [])
  const [destIdx, setDestIdx] = useState<number>(0)
  const destRow: RateRow | null = tourRows[destIdx] ?? null

  // Geo bias for the autocomplete — matches the OnlineBookingWidget pattern.
  const geo = useGeolocation(true)
  const userCountry = useCountryFromCoords(geo.coords ?? null)
  const countryCodes = userCountry ? [userCountry] : []

  // Tab A — live total = max(min_fee, round(km × price_per_km)).
  const minFee     = typeof v.start_price_idr === 'number' && v.start_price_idr > 0 ? v.start_price_idr : 0
  const pricePerKm = typeof v.price_per_km    === 'number' && v.price_per_km    > 0 ? v.price_per_km    : 0
  const distanceKm = (pickupCoords && dropoffCoords)
    ? haversineKm(pickupCoords, dropoffCoords)
    : null
  const addressTotal: number | null = (distanceKm != null && pricePerKm > 0)
    ? Math.max(minFee, Math.round(distanceKm * pricePerKm))
    : (distanceKm != null && minFee > 0)
      ? minFee
      : null

  // Tab B — destination total = the row's published idr (flat package).
  const destinationTotal: number | null = destRow ? destRow.idr : null

  // Which big number drives the headline (depends on active tab).
  const totalIdr  = tab === 'address' ? addressTotal     : destinationTotal
  const smallLine = tab === 'address'
    ? (distanceKm != null ? t('busBookKmFormat', { km: distanceKm.toFixed(1) }) : t('busBookKmPrompt'))
    : (destRow    ? t('busBookFlatPackage', { label: destRow.label })           : t('busBookPickPrompt'))

  // BOOK enabled state.
  const addressReady     = pickup.trim().length > 0 && dropoff.trim().length > 0 && totalIdr != null && totalIdr > 0
  const destinationReady = destRow != null && totalIdr != null && totalIdr > 0
  const canBook = tab === 'address' ? addressReady : destinationReady

  // wa.me payload.
  const waDigits = (v.whatsapp_e164 ?? '').replace(/\D+/g, '')
  const waLink   = (() => {
    if (!waDigits || !canBook) return null
    const lines: string[] = [
      t('waSalutation', { name: v.display_name }),
      t('waIntroBus'),
    ]
    if (tab === 'address') {
      lines.push(t('waBookPickup', { pickup }))
      lines.push(t('waBookDropoff', { dropoff }))
      if (totalIdr != null) lines.push(t('waBookTotalEst', { price: idrFormat(totalIdr) }))
    } else if (destRow) {
      lines.push(t('waBookDestination', { label: destRow.label }))
      lines.push(t('waBookPackagePrice', { price: `${idrFormat(destRow.idr)}${destRow.per ?? ''}` }))
    }
    lines.push(t('waAvailable'))
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(lines.join('\n'))}`
  })()

  const BORDER   = '#E4E4E7'
  const INPUT_BG = '#F4F4F5'
  const MUTED    = '#71717A'

  return (
    <section
      className="rounded-2xl bg-white p-3 space-y-3"
      style={{
        border:    `1px solid ${BORDER}`,
        boxShadow: '0 8px 22px rgba(0,0,0,0.06)',
        marginTop: 12,
      }}
    >
      {/* Mutually-exclusive tab row */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTab('address')}
          aria-pressed={tab === 'address'}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-extrabold text-[12.5px] tracking-tight transition active:scale-95"
          style={{
            background: tab === 'address' ? theme    : INPUT_BG,
            color:      tab === 'address' ? '#0A0A0A' : MUTED,
            border:     `1px solid ${tab === 'address' ? theme : BORDER}`,
            boxShadow:  tab === 'address' ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
            minHeight:  44,
          }}
        >
          <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
          {t('busBookTabAddress')}
        </button>
        <button
          type="button"
          onClick={() => setTab('destination')}
          aria-pressed={tab === 'destination'}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-extrabold text-[12.5px] tracking-tight transition active:scale-95"
          style={{
            background: tab === 'destination' ? theme    : INPUT_BG,
            color:      tab === 'destination' ? '#0A0A0A' : MUTED,
            border:     `1px solid ${tab === 'destination' ? theme : BORDER}`,
            boxShadow:  tab === 'destination' ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
            minHeight:  44,
          }}
        >
          <MapPinned className="w-3.5 h-3.5" strokeWidth={2.5} />
          {t('busBookTabDestination')}
        </button>
      </div>

      {/* Tab body */}
      {tab === 'address' ? (
        <div className="space-y-2">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider mb-1" style={{ color: MUTED }}>
              {t('busBookPickup')}
            </label>
            <PlaceAutocomplete
              value={pickup}
              onChange={(val) => { setPickup(val); setPickupCoords(null) }}
              onSelect={(s) => { setPickup(s.label); setPickupCoords({ lat: s.lat, lng: s.lng }) }}
              placeholder={t('busBookPickupPlaceholder')}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#0A0A0A] placeholder:text-[#71717A] rounded-xl pl-3 pr-3 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
              near={geo.coords ?? null}
              countryCodes={countryCodes}
              ariaLabel={t('busBookPickupAria')}
              clearOnFocus
              dropdownDirection="down"
              maxResults={3}
            />
          </div>
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider mb-1" style={{ color: MUTED }}>
              {t('busBookDropoff')}
            </label>
            <PlaceAutocomplete
              value={dropoff}
              onChange={(val) => { setDropoff(val); setDropoffCoords(null) }}
              onSelect={(s) => { setDropoff(s.label); setDropoffCoords({ lat: s.lat, lng: s.lng }) }}
              placeholder={t('busBookDropoffPlaceholder')}
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#0A0A0A] placeholder:text-[#71717A] rounded-xl pl-3 pr-3 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
              near={geo.coords ?? null}
              countryCodes={countryCodes}
              ariaLabel={t('busBookDropoffAria')}
              clearOnFocus
              dropdownDirection="down"
              maxResults={3}
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider mb-1" style={{ color: MUTED }}>
            {t('busBookDestination')}
          </label>
          <select
            value={destIdx}
            onChange={(e) => setDestIdx(Number(e.target.value))}
            aria-label={t('busBookDestinationAria')}
            className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#0A0A0A] rounded-xl pl-3 pr-3 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
            style={{ minHeight: 44 }}
          >
            {tourRows.map((row, i) => (
              <option key={`${row.label}-${i}`} value={i}>
                {row.label} — {idrFormat(row.idr)}{row.per ?? ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Headline total */}
      <div
        className="rounded-xl p-3"
        style={{
          background: 'linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)',
          border:     `1px solid ${theme}`,
        }}
      >
        <div className="text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
          {t('busBookTotal')}
        </div>
        <div className="text-[28px] sm:text-[32px] font-black leading-none mt-1 text-black">
          {totalIdr != null && totalIdr > 0 ? idrFormat(totalIdr) : 'Rp 0'}
        </div>
        <div className="text-[11px] font-semibold mt-1" style={{ color: '#52525B' }}>
          {smallLine}
        </div>
      </div>

      {/* BOOK NOW */}
      {waLink ? (
        <WaIntentAnchor
          href={waLink}
          providerId={providerId}
          vertical={intentVertical}
          source={intentSource}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[14px] uppercase tracking-wider active:scale-[0.99] transition"
          style={{
            minHeight:    48,
            background:   theme,
            color:        '#0A0A0A',
            border:       `1px solid ${theme}`,
            boxShadow:    '0 8px 18px rgba(250,204,21,0.35)',
          }}
        >
          <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
          {t('busBookCta')}
        </WaIntentAnchor>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[14px] uppercase tracking-wider"
          style={{
            minHeight:     48,
            background:    INPUT_BG,
            color:         MUTED,
            border:        `1px solid ${BORDER}`,
            opacity:       0.55,
            pointerEvents: 'none',
            cursor:        'not-allowed',
          }}
        >
          <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
          {t('busBookCta')}
        </button>
      )}
    </section>
  )
}

// -----------------------------------------------------------------------------
// AvatarLanguageBadge — flag pill anchored bottom-right of the avatar.
// Renders EVERY non-Indonesian language the driver speaks as a flag emoji
// inside a single white pill with a brand-yellow ring. Indonesian is implied
// (Indonesian app for Indonesian drivers) so we never surface the ID flag.
// Returns null when:
//   • languages array is empty / null
//   • the only language is Indonesian ('id')
//   • none of the non-'id' ids are in the LANGUAGES catalog
// -----------------------------------------------------------------------------
function AvatarLanguageBadge({ languages }: { languages: string[] | null }) {
  const t = useTranslations('vehicleProfile')
  if (!languages || languages.length === 0) return null
  const picked = languages
    .filter((id) => id !== 'id')
    .map((id) => getLanguage(id))
    .filter((d): d is NonNullable<ReturnType<typeof getLanguage>> => !!d)
  if (picked.length === 0) return null
  return (
    <span
      aria-label={t('speaksAria', { label: picked.map((d) => d.label).join(', ') })}
      className="absolute inline-flex items-center justify-center gap-0.5 rounded-full"
      style={{
        bottom: -2,
        right: -2,
        // Pill widens to fit every flag — 16px per flag + 8px horizontal pad
        // + 2px gaps. Single flag stays roughly the original 22px footprint.
        minWidth: 22,
        height: 22,
        paddingLeft: 5,
        paddingRight: 5,
        background: '#FFFFFF',
        border: `2px solid ${BRAND_YELLOW}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.20)',
        fontSize: 13,
        lineHeight: 1,
      }}
    >
      {picked.map((d) => (
        <span key={d.id} aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>{d.flag}</span>
      ))}
    </span>
  )
}

// -----------------------------------------------------------------------------
// VehicleAvailabilitySlotChips — emoji chip row rendered under the rating row
// in the floating profile card. Mirrors the same chip set the bike/car driver
// shell renders so every vehicle vertical signals the same per-slot
// availability information.
// -----------------------------------------------------------------------------
function VehicleAvailabilitySlotChips({ v }: { v: VehiclePublic }) {
  const t = useTranslations('vehicleProfile')
  const chips: { key: string; emoji: string; label: string }[] = []
  if (v.available_sunrise)   chips.push({ key: 'sunrise',   emoji: '🌅', label: t('slotSunrise')   })
  if (v.available_daytime)   chips.push({ key: 'daytime',   emoji: '☀️', label: t('slotDaytime')   })
  if (v.available_evening)   chips.push({ key: 'evening',   emoji: '🌆', label: t('slotEvening')   })
  if (v.available_nightlife) chips.push({ key: 'nightlife', emoji: '🌙', label: t('slotNightlife') })
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1 text-[10.5px] font-extrabold rounded-full px-1.5 py-0.5"
          style={{ background: '#F4F4F5', color: '#0A0A0A', border: '1px solid #E5E7EB' }}
        >
          <span aria-hidden>{c.emoji}</span>
          <span>{c.label}</span>
        </span>
      ))}
    </div>
  )
}
