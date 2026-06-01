'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  MapPin, Star, Bike as BikeIcon,
  Car as CarIcon, Users as UsersIcon,
  PlaneTakeoff, Building2, MapPinned,
  ChevronLeft, Sparkles, ArrowDown,
} from 'lucide-react'
import { getBikeImageUrl } from '@/data/bikeImages'
import { getCarImageUrl } from '@/data/carImages'
import { getJeepImageUrl } from '@/data/jeepImages'
import { SERVICE_OFFERINGS } from '@/lib/drivers/serviceOfferings'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import PlacesPicker from '@/components/places/PlacesPicker'
import { haversineKm } from '@/lib/geo/haversine'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'
import {
  hourlyDefaultsForVehicle,
} from '@/lib/pricing/hourlyHire'
import { parseRateTiers, type ParcelVehicleKind } from '@/lib/parcel/defaults'
import type { TourPackage } from '@/lib/tours/types'

import OnlineBookingWidget from './shell/OnlineBookingWidget'
import AlternativesWidget from './shell/AlternativesWidget'
import ToursTabContent from './shell/ToursTabContent'
import HourlyTabContent from './shell/HourlyTabContent'
import ParcelTierCard from './shell/ParcelTierCard'
import HeroServiceIcon from './shell/HeroServiceIcon'
import ReviewsPanel, { type Review } from './shell/ReviewsPanel'
import { buildShellWhatsAppLink } from './shell/shellWhatsApp'

// =============================================================================
// DriverProfileShell — shared driver-profile renderer for /r/[slug] (bike)
// and /car/[slug] (car) drivers.
// -----------------------------------------------------------------------------
// Layout (top to bottom):
//   1. Hero image — fixed backdrop with a soft white top-scrim. Same pattern
//      as /beautician/[slug] — the image sits behind a floating profile card
//      that overlaps its bottom edge.
//   2. Profile container — avatar, display name, city, rating, availability
//      dot (green/amber/grey for online/busy/offline), short bio, and the
//      service-mode pills (Passenger / Parcel) the driver opted into.
//   3. Vehicle showcase — full-card-width photo (88–120px tall) with the
//      `vehicle_make` as a top-left badge over the image, and the
//      `vehicle_model · vehicle_color · vehicle_year` line below. Cars
//      also surface `vehicle_seats` if set. Bikes show "Motorbike" as
//      the type label.
//   4. Booking container — switches on `driver.availability`:
//        online           → typed pickup + dropoff + multi-stop + estimate +
//                            BOOK NOW WhatsApp deep-link.
//        busy / offline   → "{driverName} is {busy|offline} now — try these
//                            instead" + same input set + alternatives list
//                            of online drivers with the SAME vehicle_type.
//
// Compliance (PM 12/2019): CityDrivers is a SOFTWARE DIRECTORY. We never
// compute or charge fares — we show the driver's published rate and open
// WhatsApp for the rest. Estimate copy is always "Estimate · driver's own
// rate", never "Fare" or "Final price". Submission is a wa.me redirect,
// never an internal POST.
// =============================================================================

// -----------------------------------------------------------------------------
// Shared props contract — both /r and /car adapt their existing data to this
// shape. Field names mirror the underlying drivers / mock_drivers columns.
// -----------------------------------------------------------------------------
export type DriverPublic = {
  id:                  string
  slug:                string
  business_name:       string
  bio:                 string | null
  whatsapp_e164:       string | null
  photo_url:           string | null
  city:                string | null
  area:                string | null
  rating:              number | null
  trips_count:         number | null
  availability:        'online' | 'busy' | 'offline' | null
  /** 'bike' | 'car' | 'truck' | 'minibus' — controls the vehicle-type
   *  label + which icon falls back when no photo exists. */
  vehicle_type:        'bike' | 'car' | 'truck' | 'minibus' | string | null
  vehicle_make:        string | null
  vehicle_model:       string | null
  vehicle_year:        number | null
  vehicle_color:       string | null
  vehicle_seats:       number | null
  /** First entry of this array is the showcase photo. Bikes pass their
   *  bike photo URL; cars pass the first `vehicle_photos` entry. */
  vehicle_photos:      string[]
  /** Optional driver-picked hero backdrop (mig 0108). When null, the
   *  shell falls back to DEFAULT_BIKE_HERO / DEFAULT_CAR_HERO. */
  cover_image_url?:    string | null
  /** Self-published rate. Used in the estimate line below the booking
   *  inputs. Never multiplied by an internal km figure — see file header. */
  price_per_km:        number | null
  min_fee:             number | null
  pitstop_fee:         number | null
  /** Optional driver lat/lng — used by the alternatives list to sort
   *  online drivers by distance from pickup. NULL → fall back to
   *  alphabetical. */
  lat:                 number | null
  lng:                 number | null
  /** Service-mode pills surfaced on the profile card. The bike Rider
   *  shape stores `services: ServiceType[]` ('person' | 'parcel' | …);
   *  passing those through verbatim covers both verticals. Unknown
   *  values are filtered to keep the chip set tight. */
  services:            string[]
  /** Driver-selected trip-type tags from `service_offerings` (mig 0110).
   *  Allowed ids match SERVICE_OFFERINGS in @/lib/drivers/serviceOfferings
   *  (City Service, Daily Hire, Hourly Hire, Airport Pickup, etc.).
   *  Rendered as a row of yellow-tint badges under the bio. */
  service_offerings?:  string[]
  /** Hourly hire opt-in (mig 0156). When true the public profile renders
   *  the Hourly Booking tab + 3/6/8-hour block cards. Car mocks render
   *  the tab unconditionally via fallback defaults — see hourlyHire.ts. */
  hourly_enabled?:     boolean | null
  hourly_3h_rate_idr?: number | null
  hourly_6h_rate_idr?: number | null
  hourly_8h_rate_idr?: number | null
  /** Working hours window (HH:MM strings, mig 0156). Surfaced on the
   *  "All" summary tab so customers see when the driver is reachable. */
  working_hours_start?: string | null
  working_hours_end?:   string | null
  /** Per-slot availability flags (mig 0156). Surface as emoji chips on
   *  the "All" tab when at least one is set. */
  available_sunrise?:   boolean | null
  available_daytime?:   boolean | null
  available_evening?:   boolean | null
  available_nightlife?: boolean | null
  /** Parcel B2B rate tiers (mig 0149). When set, lets the "All" summary
   *  tab show "from Rp X / parcel" using the cheapest tier. */
  parcel_rate_tiers?:   unknown | null
  /** Spoken languages (mig 0157, ISO 639-1 codes). Indonesian is the
   *  always-on default; the flag row only renders when the driver speaks
   *  something beyond Indonesian. */
  languages?:           string[] | null
  /** Published tour packages (mig 0157). Surfaces a Tours tab on the
   *  profile when at least one row has published=true. */
  tours?:               TourPackage[]
}

export type DriverProfileShellProps = {
  driver:        DriverPublic
  alternatives:  DriverPublic[]
}

// Service-mode pill copy — mirrors the SERVICE_LABELS dictionary in
// types/rider.ts but trimmed to the two verticals the founder spec
// explicitly mentioned (Passenger / Parcel). 'person' is the storage
// key for passenger rides in the existing data layer.
const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'
const TEXT_MUTED   = '#71717A'
const BORDER       = '#E4E4E7'

// Default hero backdrops — bike vs car get visually distinct banners so
// the customer immediately reads "this is a car driver" vs "bike rider"
// from the hero alone. Override per-driver via `cover_image_url` (added
// in a follow-up migration + dashboard banner picker).
const DEFAULT_BIKE_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2006_53_11%20AM.png'
const DEFAULT_CAR_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2003_38_55%20AM.png'
const DEFAULT_JEEP_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_44_53%20AM.png'

// Hero route-preview overlay templates — six SVG path shapes picked
// deterministically per driver slug. ZERO backend — CityDrivers remains a
// software directory; we do not geocode, route, dispatch, or coordinate.
const ROUTE_TEMPLATES: string[] = [
  'M60 230 L340 70',
  'M60 230 L60 70 L340 70',
  'M60 230 L340 230 L340 70',
  'M60 230 C140 230 100 70 340 70',
  'M60 230 L150 230 L150 150 L260 150 L260 70 L340 70',
  'M60 230 C60 130 340 170 340 70',
]

// -----------------------------------------------------------------------------
// Main shell. Owns booking-widget state (inputs + stops) since both
// /r and /car embed the same widget.
// -----------------------------------------------------------------------------
export default function DriverProfileShell({ driver, alternatives }: DriverProfileShellProps) {
  const searchParams = useSearchParams()
  // Profile-view tracking — one ping per session per (provider_type,
  // provider_id) pair. sessionStorage-deduped so refreshes don't double-count.
  useProfileViewTracker({ providerType: 'driver', providerId: driver.id })
  const [pickup, setPickup]   = useState('')
  const [dropoff, setDropoff] = useState('')
  // Coordinates captured when the customer picks pickup/drop-off from the
  // PlaceAutocomplete suggestion list. Used to compute a live km-based
  // total in the estimate card. Manual text edits clear the matching
  // coord slot so a stale lat/lng never reflects a hand-typed address.
  const [pickupCoords,  setPickupCoords]  = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null)
  // Extra typed stops. Customer can add any number — no cap per spec.
  const [stops, setStops]     = useState<string[]>([])

  // Inline Places picker — tapping a place card hydrates the dropoff
  // field directly and collapses the panel. No /places navigation.
  const [showPlacesPicker, setShowPlacesPicker] = useState(false)

  // URL-param hydration — kept for the legacy round-trip flow from
  // /places/[slug]'s "Take me here →" CTA.
  useEffect(() => {
    if (!searchParams) return
    const dName = searchParams.get('dName')
    const pName = searchParams.get('pName')
    if (dName) setDropoff(dName)
    if (pName) setPickup(pName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // `bookingSent` flips true the instant BOOK NOW is tapped (before the
  // WA deep-link opens), driving a 6s CSS stroke-colour transition from
  // black → brand yellow on the polyline. Intentionally NOT reset.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [bookingSent, setBookingSent] = useState(false)
  // Reviews view — when true, replaces the vehicle + booking sections
  // below the floating profile card with the ReviewsPanel.
  const [showReviews, setShowReviews]             = useState(false)
  const [reviews, setReviews]                     = useState<Review[] | null>(null)
  const [reviewsLoading, setReviewsLoading]       = useState(false)
  const [reviewsRefreshCount, setReviewsRefreshCount] = useState(0)

  // Fetch reviews only when the panel is first opened, then again after
  // a new submission. Skipped when driver.id isn't a real UUID (mock
  // drivers carry slug-shaped ids) — the API would reject those anyway.
  useEffect(() => {
    if (!showReviews || !driver.id) return
    const isUuid = /^[0-9a-f-]{36}$/i.test(driver.id)
    if (!isUuid) { setReviews([]); return }
    setReviewsLoading(true)
    fetch(`/api/reviews?provider_type=driver&provider_id=${encodeURIComponent(driver.id)}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { reviews?: Review[] } | null) => setReviews(j?.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [showReviews, driver.id, reviewsRefreshCount])

  // Deterministic per-driver route shape — hash the slug so server +
  // client agree (Math.random would cause an SSR hydration mismatch on
  // the client component's first render).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const routePath = useMemo(() => {
    let h = 0
    const s = driver.slug || ''
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    return ROUTE_TEMPLATES[Math.abs(h) % ROUTE_TEMPLATES.length]
  }, [driver.slug])

  const availability: 'online' | 'busy' | 'offline' =
    driver.availability === 'busy'    ? 'busy'    :
    driver.availability === 'offline' ? 'offline' :
    driver.availability === 'online'  ? 'online'  : 'offline'

  const vehicleTypeLabel = useMemo(() => {
    if (driver.vehicle_type === 'bike') return 'Motorbike'
    if (driver.vehicle_type === 'car')  return 'Car'
    if (driver.vehicle_type === 'truck') return 'Truck'
    if (driver.vehicle_type === 'minibus') return 'Minibus'
    return 'Vehicle'
  }, [driver.vehicle_type])

  // System-controlled stock photo. We intentionally do NOT use
  // vehicle_photos[0] — driver-uploaded photos still live on the model
  // for other consumers but the public showcase needs ONE clean curated
  // image per make+model.
  const showcasePhoto =
    driver.vehicle_type === 'jeep' ? getJeepImageUrl(driver.vehicle_color)
    : driver.vehicle_type === 'bike' ? getBikeImageUrl(driver.vehicle_make, driver.vehicle_model)
    : getCarImageUrl(driver.vehicle_make, driver.vehicle_model)

  // Live distance — only when BOTH pickup and dropoff have geocoded
  // coordinates from the autocomplete. Free-typed addresses don't carry
  // lat/lng so we leave distance null and the widget falls back to the
  // "min_fee + driver's rate per km" rate disclosure.
  const distanceKm = useMemo(() => {
    if (!pickupCoords || !dropoffCoords) return null
    const km = haversineKm(pickupCoords, dropoffCoords)
    return Number.isFinite(km) && km > 0 ? km : null
  }, [pickupCoords, dropoffCoords])

  // Estimate line — see file header for the compliance reasoning. When
  // distanceKm is set we precompute a live total: min_fee + (km × per-km
  // rate) + (pitstop_fee × stop count). The widget renders the bigger of
  // (computed total, min_fee) so short hops never undercut the floor.
  const estimateInputs = useMemo(() => {
    if (driver.min_fee == null || driver.price_per_km == null) return null
    const minFee     = driver.min_fee
    const pricePerKm = driver.price_per_km
    const pitstopFee = driver.pitstop_fee ?? 0
    const numStops   = stops.filter((s) => s.trim().length > 0).length
    const totalIdr   = distanceKm != null
      ? Math.max(minFee, Math.round(distanceKm * pricePerKm) + numStops * pitstopFee)
      : null
    return {
      minFee,
      pricePerKm,
      pitstopFee,
      numStops,
      distanceKm,
      totalIdr,
    }
  }, [driver.min_fee, driver.price_per_km, driver.pitstop_fee, stops, distanceKm])

  // Ride / Parcel mode toggle. Bike drivers explicitly opt out of rides
  // by leaving 'person' off their services array; cars/trucks default
  // to offering rides since that's the primary use case.
  const offersParcel = useMemo(() => {
    // Cars default to offering parcel jobs alongside passenger rides —
    // mirrors the bike-rider default UX, so every car driver page shows
    // both Book Car / Book Parcel buttons even when the driver hasn't
    // explicitly added 'parcel' to their services array.
    if (driver.vehicle_type === 'car') return true
    if (driver.services.includes('parcel')) return true
    if (driver.service_offerings?.includes('cargo_parcel')) return true
    return false
  }, [driver.services, driver.service_offerings, driver.vehicle_type])
  const offersRide = useMemo(() => {
    if (driver.vehicle_type === 'bike') return driver.services.includes('person')
    return true
  }, [driver.services, driver.vehicle_type])
  const [mode, setMode] = useState<'ride' | 'parcel'>(() => {
    if (offersRide) return 'ride'
    if (offersParcel) return 'parcel'
    return 'ride'
  })

  const waLink = useMemo(() => buildShellWhatsAppLink({
    driver, pickup, dropoff, stops, estimate: estimateInputs, mode,
  }), [driver, pickup, dropoff, stops, estimateInputs, mode])

  // Mocks (no real drivers row) don't carry the mig-0156 hourly columns,
  // so the page loader passes `hourly_enabled === null` for them. For
  // BOTH car AND bike mocks we still render the Hourly tab using
  // hourlyDefaultsForVehicle so demo profiles always carry hourly cards.
  const isMockWithDefaults =
    (driver.vehicle_type === 'car' || driver.vehicle_type === 'bike') &&
    driver.hourly_enabled == null
  const hourlyAvailable = !!driver.hourly_enabled || isMockWithDefaults
  const hourlyDefaults  = useMemo(
    () => hourlyDefaultsForVehicle(driver.vehicle_make, driver.vehicle_model),
    [driver.vehicle_make, driver.vehicle_model],
  )

  // Published tours — surface a Tours tab when the driver has at least
  // one published row. Drafts live only on the dashboard.
  const publishedTours = useMemo(
    () => (driver.tours ?? []).filter((t) => t.published),
    [driver.tours],
  )
  const toursAvailable = publishedTours.length > 0

  // Place-image cascade for tour cards. Fetch image_url for every slug
  // referenced by any published tour so the card can auto-fill the
  // thumbnail when the driver hasn't uploaded their own photo.
  const tourPlaceSlugs = useMemo(() => {
    const set = new Set<string>()
    for (const t of publishedTours) for (const s of t.place_slugs) set.add(s)
    return Array.from(set)
  }, [publishedTours])

  const [tourPlaceImages, setTourPlaceImages] = useState<Record<string, string | null>>({})
  useEffect(() => {
    if (tourPlaceSlugs.length === 0) {
      setTourPlaceImages({})
      return
    }
    void fetch(`/api/places/images?slugs=${tourPlaceSlugs.join(',')}`, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : { images: {} }))
      .then((j: { images: Record<string, string | null> }) => setTourPlaceImages(j.images || {}))
      .catch(() => { /* swallow — cards just won't show thumbnails */ })
  }, [tourPlaceSlugs])

  type TabId = 'all' | 'passenger' | 'parcel' | 'hourly' | 'tours'
  const tabs: { id: TabId; label: string; emoji?: string }[] = []
  if (offersRide)   tabs.push({ id: 'passenger', label: 'Booking' })
  if (offersParcel) tabs.push({ id: 'parcel',    label: 'Parcel B2B' })
  if (hourlyAvailable) tabs.push({ id: 'hourly', label: 'Hourly Booking' })
  if (toursAvailable)  tabs.push({ id: 'tours',  label: 'Tours' })
  const defaultTab: TabId = tabs[0]?.id ?? 'passenger'
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  // Cheapest parcel-tier price (kept around even though the All-tab
  // summary card is no longer rendered — preserves shape for follow-ups).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cheapestParcel = useMemo(() => {
    if (!offersParcel) return null
    const vehicleKind: ParcelVehicleKind = driver.vehicle_type === 'bike' ? 'bike' : 'car'
    const tiers = parseRateTiers(driver.parcel_rate_tiers ?? null, vehicleKind)
    return Math.min(tiers.tier_1_5, tiers.tier_6_20, tiers.tier_21_50, tiers.tier_51_100)
  }, [offersParcel, driver.parcel_rate_tiers, driver.vehicle_type])

  // Switch the booking-widget mode automatically when the customer taps
  // Passenger or Parcel so the WA template body matches.
  useEffect(() => {
    if (activeTab === 'passenger' && mode !== 'ride')   setMode('ride')
    if (activeTab === 'parcel'    && mode !== 'parcel') setMode('parcel')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])


  return (
    <main className="relative min-h-[100dvh] bg-white" style={{ color: TEXT_INK }}>
      {/* Right-edge yellow BACK tab — pinned to the viewport edge near the
          top (hero zone) so it does NOT overlap the booking / contact
          buttons that sit in the middle-to-bottom region on mobile. */}
      <a
        href="/cari"
        aria-label="Back to booking page"
        className="fixed z-50 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition"
        style={{
          right:                  0,
          top:                    'calc(env(safe-area-inset-top, 0px) + 12px)',
          width:                  30,
          height:                 88,
          background:             '#FACC15',
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
            writingMode:    'vertical-rl',
            transform:      'rotate(180deg)',
            fontSize:       10,
            letterSpacing:  '0.18em',
          }}
        >
          Back
        </span>
      </a>

      {/* 1) HERO — fixed backdrop with a soft white top scrim. Image
          fills a 16/9 hero slot, with a white-to-transparent gradient
          softening the handoff into the floating profile card below. */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9', background: '#F4F4F5' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            driver.cover_image_url ||
            (driver.vehicle_type === 'bike' ? DEFAULT_BIKE_HERO
              : driver.vehicle_type === 'jeep' ? DEFAULT_JEEP_HERO
              : DEFAULT_CAR_HERO)
          }
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Top white seam — keeps the brand header edge cleanly meeting
            the hero on white-background pages. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1/4"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0))' }}
        />
        {/* Bottom white seam — softens the handoff into the floating
            profile card that overlaps the hero edge. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3"
          style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0))' }}
        />
        {/* Readability scrim — dark radial wash anchored top-left where
            the hero overlay text sits. Guarantees the white text reads
            against ANY uploaded banner (bright sky, white car, neon
            poster) without dimming dark images too much because it
            falls off quickly past the text bounding box. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 80% at 0% 0%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0) 70%)',
          }}
        />

        {/* HERO OVERLAY — "Professional" + Star, driver name in gold,
            bio tagline, then 3 service icons (Airport / City / Tours).
            All text rendered WHITE with a strong dark textShadow so it
            stays legible over any underlying photo. */}
        <div className="absolute left-4 z-10 select-none leading-none" style={{ top: 31 }}>
          <div
            className="flex items-center gap-0.5 text-[28px] sm:text-[34px] font-normal"
            style={{
              color: '#FFFFFF',
              textShadow: '0 2px 6px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.85)',
            }}
          >
            <span>
              {driver.vehicle_type === 'bike' ? 'City Rider' : 'Professional'}
            </span>
            <Star
              className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 -mt-3"
              strokeWidth={0}
              fill={BRAND_YELLOW}
              style={{ color: BRAND_YELLOW, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))' }}
            />
          </div>
          <div
            className="text-[28px] sm:text-[34px] font-black mt-1 overflow-hidden"
            style={{
              color: BRAND_YELLOW,
              maxWidth: 'min(340px, calc(100vw - 32px))',
              textShadow: '0 2px 6px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.85)',
            }}
          >
            <span className="truncate inline-block max-w-full align-bottom">
              {driver.business_name || 'Driver'}
            </span>
          </div>
          {/* Hero slogan — strictly 1 line, kept well clear of the right
              edge of the hero image. Defensively sliced to ~55 chars so
              long bios don't push toward the edge; anything longer is
              cleanly cut (no ellipsis). White text + dark text-shadow
              keeps it readable on any banner. */}
          {driver.bio?.trim() && (() => {
            const slogan = driver.bio.replace(/\s*\n\s*/g, ' ').trim().slice(0, 55)
            return (
              <div
                className="text-[13px] sm:text-[14px] font-semibold mt-1.5 whitespace-nowrap overflow-hidden"
                style={{
                  color: '#FFFFFF',
                  maxWidth: 'min(260px, calc(100vw - 96px))',
                  textOverflow: 'clip',
                  textShadow: '0 1px 3px rgba(0,0,0,0.75), 0 1px 2px rgba(0,0,0,0.85)',
                }}
              >
                {slogan}
              </div>
            )
          })()}

          <div className="flex items-start gap-2" style={{ marginTop: 15 }}>
            <HeroServiceIcon icon={PlaneTakeoff} label="Airport" />
            <div className="w-px h-11 bg-black/25 mt-1" aria-hidden />
            <HeroServiceIcon icon={Building2} label="City" />
            <div className="w-px h-11 bg-black/25 mt-1" aria-hidden />
            <HeroServiceIcon icon={MapPinned} label="Tours" />
          </div>
        </div>
      </div>

      {/* Reviews toggle — brand-yellow pill sitting on top of the hero,
          right side, just ABOVE the floating profile container. */}
      <div
        className="px-4 max-w-2xl mx-auto relative z-20 flex justify-end"
        style={{ marginTop: -56 }}
      >
        <button
          type="button"
          onClick={() => setShowReviews((v) => !v)}
          aria-pressed={showReviews}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-md active:scale-[0.97] transition"
          style={{ background: BRAND_YELLOW, color: TEXT_INK }}
        >
          <Star className="w-3.5 h-3.5" strokeWidth={0} fill={TEXT_INK} />
          {showReviews ? 'Hide reviews' : 'Reviews'}
        </button>
      </div>

      {/* 2) PROFILE CONTAINER — floating card that overlaps the bottom
          edge of the hero. */}
      <div className="px-4 max-w-2xl mx-auto relative z-10" style={{ marginTop: 8 }}>
        <div
          className="bg-white p-3 flex items-start gap-3"
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: 15,
            boxShadow: '0 10px 25px rgba(0,0,0,0.10)',
          }}
        >
          <div className="shrink-0 relative">
            {driver.photo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={driver.photo_url}
                alt={driver.business_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow"
                style={{ background: BRAND_YELLOW, fontSize: 22, color: TEXT_INK }}
              >
                {driver.business_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-black leading-tight truncate flex items-center gap-2" style={{ color: TEXT_INK }}>
              <span className="truncate">{driver.business_name}</span>
              {/* Heart-beat / satellite-ping availability dot — sits inline
                  after the driver name. Only renders when the driver is
                  online; busy/offline drivers get no dot. */}
              {availability === 'online' && (
                <span
                  aria-label="Driver is online"
                  className="relative inline-flex items-center justify-center shrink-0"
                  style={{ width: 14, height: 14 }}
                >
                  <span aria-hidden className="cd-driver-ping-ring" />
                  <span aria-hidden className="cd-driver-ping-ring cd-driver-ping-ring--delayed" />
                  <span
                    aria-hidden
                    className="relative inline-block rounded-full border-2 border-white"
                    style={{
                      width: 10,
                      height: 10,
                      background: '#22C55E',
                      boxShadow: '0 0 6px rgba(34,197,94,0.6)',
                    }}
                  />
                </span>
              )}
            </h1>
            <p className="text-[13px] truncate mt-0.5" style={{ color: TEXT_MUTED }}>
              {driver.city?.trim() || 'Indonesia'}
            </p>
            {(driver.rating != null && driver.rating > 0) && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3.5 h-3.5" strokeWidth={0} fill={BRAND_YELLOW} style={{ color: BRAND_YELLOW }} />
                <span className="text-[13px] font-extrabold" style={{ color: TEXT_INK }}>
                  {driver.rating.toFixed(1)}
                </span>
                {driver.trips_count != null && driver.trips_count > 0 && (
                  <span className="text-[12px]" style={{ color: TEXT_MUTED }}>
                    · {driver.trips_count} trip{driver.trips_count === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Vehicle image on the right edge of the profile container.
              Transparent PNG (system stock per make/model). */}
          <div className="shrink-0 flex items-center justify-center" style={{ width: 96, height: 72 }}>
            {showcasePhoto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={showcasePhoto}
                alt=""
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center" style={{ color: TEXT_MUTED }}>
                {driver.vehicle_type === 'bike'
                  ? <BikeIcon className="w-8 h-8" strokeWidth={1.5} />
                  : <CarIcon  className="w-8 h-8" strokeWidth={1.5} />}
              </div>
            )}
          </div>
        </div>

        {/* When the Reviews pill is toggled on, swap the entire body
            below the floating profile container for the ReviewsPanel. */}
        {showReviews ? (
          <ReviewsPanel
            providerId={driver.id ?? ''}
            reviews={reviews ?? []}
            loading={reviewsLoading}
            onSubmitted={() => setReviewsRefreshCount((n) => n + 1)}
          />
        ) : (
        <>
        {/* 3) VEHICLE + SERVICES — left-aligned info block under the
            profile container. */}
        <section className="mt-3">
          <div className="text-left">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold leading-tight" style={{ color: TEXT_INK }}>
                  {[driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(' ') || vehicleTypeLabel}
                </div>
                {driver.vehicle_type === 'car' && driver.vehicle_seats && driver.vehicle_seats > 0 ? (
                  <div className="text-[12px] mt-0.5 inline-flex items-center gap-1" style={{ color: TEXT_MUTED }}>
                    <UsersIcon className="w-3 h-3" strokeWidth={2.25} />
                    {driver.vehicle_seats} seats
                  </div>
                ) : (
                  <div className="text-[12px] mt-0.5" style={{ color: TEXT_MUTED }}>
                    {vehicleTypeLabel}
                  </div>
                )}
              </div>
              {/* Places pill — toggles the inline PlacesPicker panel. */}
              <button
                type="button"
                onClick={() => setShowPlacesPicker((v) => !v)}
                aria-expanded={showPlacesPicker}
                aria-controls="driver-places-picker"
                aria-label={showPlacesPicker ? 'Close places picker' : 'Browse places to set as drop-off'}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-md active:scale-[0.97] transition"
                style={{
                  background: showPlacesPicker ? TEXT_INK : BRAND_YELLOW,
                  color: showPlacesPicker ? BRAND_YELLOW : TEXT_INK,
                  minHeight: 32,
                }}
              >
                <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                {showPlacesPicker ? 'Close' : 'Places'}
              </button>
            </div>
            {driver.bio?.trim() && (
              <p
                className="text-[13px] leading-snug mt-2"
                style={{
                  color: '#52525B',
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {driver.bio.replace(/\s*\n\s*/g, ' ')}
              </p>
            )}
            {/* Services row — driver-selected trip-type tags (mig 0110).
                Filter out unknown ids so a stale catalog entry doesn't
                render a blank chip. */}
            {driver.service_offerings && driver.service_offerings.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] mb-2" style={{ color: TEXT_MUTED }}>
                  Services
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {driver.service_offerings.map((id) => {
                    const def = SERVICE_OFFERINGS.find((s) => s.id === id)
                    if (!def) return null
                    return (
                      <span
                        key={id}
                        className="text-[12px] font-extrabold rounded-full px-2.5 py-1"
                        style={{ background: '#FEF9C3', border: '1px solid #FDE68A', color: '#854D0E' }}
                      >
                        {def.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* OFFLINE NOTICE — soft warm card that appears between the
            profile container and the booking section ONLY when the driver
            is busy/offline. Sets expectations cleanly: "this specific
            driver isn't live, but you can still proceed below and we'll
            show available drivers nearby." Hidden entirely when online. */}
        {availability !== 'online' && (
          <section
            className="mt-3 rounded-2xl p-3.5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 60%, #FDE68A 100%)',
              border: `1px solid ${BRAND_YELLOW}`,
              boxShadow: '0 6px 18px rgba(250,204,21,0.20)',
            }}
          >
            {/* Decorative soft glow in the corner — warm energy without
                feeling alarming. */}
            <div
              aria-hidden
              className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(250,204,21,0.55) 0%, rgba(250,204,21,0) 70%)',
              }}
            />
            <div className="relative flex items-start gap-3">
              <span
                aria-hidden
                className="shrink-0 w-10 h-10 rounded-full inline-flex items-center justify-center"
                style={{
                  background: BRAND_YELLOW,
                  color: TEXT_INK,
                  boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
                }}
              >
                <Sparkles className="w-5 h-5" strokeWidth={2.25} fill={TEXT_INK} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-black leading-tight" style={{ color: TEXT_INK }}>
                  {(driver.business_name || 'Driver').split(' ')[0]}
                  {availability === 'busy' ? ' is busy right now' : ' is offline right now'}
                </h3>
                <p className="text-[12.5px] leading-snug mt-1" style={{ color: '#854D0E' }}>
                  Continue below to enter your pickup &amp; drop-off — we&apos;ll
                  show you available drivers near you from{' '}
                  <span className="font-extrabold">citydrivers.id</span>.
                </p>
                <a
                  href="#booking-widget"
                  onClick={(e) => {
                    e.preventDefault()
                    if (typeof window !== 'undefined') {
                      const el = document.querySelector('[data-booking-widget]')
                      if (el instanceof HTMLElement) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1 mt-2 text-[11.5px] font-extrabold uppercase tracking-wider active:scale-[0.97] transition"
                  style={{ color: TEXT_INK }}
                >
                  Continue below
                  <ArrowDown className="w-3.5 h-3.5" strokeWidth={2.75} />
                </a>
              </div>
            </div>
          </section>
        )}

        {/* 3.1) PLACES PICKER (inline) — sits UNDER the profile container,
            stays on top of the tabs/booking. Tapping a card hydrates the
            dropoff field and smooth-scrolls to the booking widget. */}
        {showPlacesPicker && (
          <section
            id="driver-places-picker"
            className="mt-3 rounded-2xl p-3"
            style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
          >
            <header className="text-center mb-2">
              <h2 className="text-[15px] font-black uppercase tracking-wider" style={{ color: TEXT_INK }}>
                Places To Visit
              </h2>
              <p className="text-[11px] mt-1" style={{ color: TEXT_MUTED }}>
                Select view place for details and auto update your drop-off point by selecting the card.
              </p>
            </header>
            <PlacesPicker
              onClose={() => setShowPlacesPicker(false)}
              onSelect={(place) => {
                setDropoff(place.name)
                setShowPlacesPicker(false)
                // Snap back to the first available bookable tab so the
                // freshly filled drop-off + pickup fields are visible.
                if (tabs.length > 0) setActiveTab(tabs[0]!.id)
                if (typeof window !== 'undefined') {
                  requestAnimationFrame(() => {
                    const el = document.querySelector('[data-booking-widget]')
                    if (el instanceof HTMLElement) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  })
                }
              }}
            />
          </section>
        )}

        {/* 3.2) Tabs + booking content. Hidden while the Places panel
            is open — customer is in "browse places" mode then, the
            booking widget would just compete for the small viewport. */}
        {!showPlacesPicker && (<>
        {/* 3.5) SERVICES OFFERED — heading + tab row. */}
        <section className="mt-4">
          <div className="text-[13px] font-extrabold uppercase tracking-wider mb-2" style={{ color: TEXT_INK }}>
            Services Offered
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => {
              const selected = activeTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  aria-pressed={selected}
                  className="inline-flex items-center gap-1.5 text-[12px] font-extrabold px-3 py-1.5 rounded-full transition active:scale-[0.97]"
                  style={
                    selected
                      ? { background: BRAND_YELLOW, color: TEXT_INK }
                      : { background: 'rgba(229, 231, 235, 0.95)', color: TEXT_INK }
                  }
                >
                  {t.emoji ? <span aria-hidden>{t.emoji}</span> : null}
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 4) BOOKING CONTAINER — content swaps based on activeTab.
            data-booking-widget anchors the smooth-scroll after the
            inline PlacesPicker hydrates the dropoff field. */}
        <div data-booking-widget>
        {/* All tab defaults to the booking container — same as the
            Passenger tab but with the mode toggle visible when both ride
            and parcel are offered. AllSummaryCard is retained in the
            shell/ folder for future reuse but is NOT invoked here. */}
        {activeTab === 'tours' ? (
          <ToursTabContent driver={driver} tours={publishedTours} placeImages={tourPlaceImages} />
        ) : activeTab === 'hourly' ? (
          <HourlyTabContent
            driver={driver}
            hourlyDefaults={hourlyDefaults}
          />
        ) : activeTab === 'parcel' ? (
          /* Parcel B2B tab — only the rate ladder, no booking widget.
             The card itself enforces the "show only when driver has
             submitted their own rates" rule below. */
          null
        ) : availability === 'online' ? (
          <OnlineBookingWidget
            driver={driver}
            pickup={pickup} setPickup={setPickup}
            dropoff={dropoff} setDropoff={setDropoff}
            setPickupCoords={setPickupCoords}
            setDropoffCoords={setDropoffCoords}
            stops={stops} setStops={setStops}
            estimate={estimateInputs}
            waLink={waLink}
            mode={mode}
            setMode={setMode}
            offersRide={offersRide && activeTab !== 'parcel'}
            offersParcel={offersParcel && activeTab !== 'passenger'}
            onBookingSent={() => setBookingSent(true)}
          />
        ) : (
          <AlternativesWidget
            driver={driver}
            availability={availability}
            alternatives={alternatives}
            pickup={pickup} setPickup={setPickup}
            dropoff={dropoff} setDropoff={setDropoff}
            stops={stops} setStops={setStops}
          />
        )}

        </div>

        {/* Parcel B2B rate card — only on the Parcel tab. */}
        {activeTab === 'parcel' && offersParcel && (
          <ParcelTierCard driver={driver} />
        )}
        </>)}
        </>
        )}
      </div>

      <PoweredByKita2u
        defaultVertical={driver.vehicle_type === 'bike' ? 'bike-driver' : 'car-driver'}
      />
    </main>
  )
}
