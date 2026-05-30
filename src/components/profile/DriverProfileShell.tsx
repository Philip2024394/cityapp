'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  MapPin, Star, Plus, X as XIcon, MessageCircle, Bike as BikeIcon,
  Car as CarIcon, Users as UsersIcon,
  PlaneTakeoff, Building2, MapPinned, Bookmark,
  ArrowUp, ArrowDown, ChevronLeft, CalendarDays, Clock,
  UserRound, Package as PackageIcon,
} from 'lucide-react'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useCountryFromCoords } from '@/hooks/useCountryFromCoords'
import { haversineKm } from '@/lib/geo/haversine'
import { normaliseE164ForWaMe } from '@/lib/whatsapp/buildLink'
import { idr } from '@/lib/format/idr'
import { getBikeImageUrl } from '@/data/bikeImages'
import { getCarImageUrl } from '@/data/carImages'
import { SERVICE_OFFERINGS } from '@/lib/drivers/serviceOfferings'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'
import PlacesPicker from '@/components/places/PlacesPicker'
import HourlyBookingPopup from '@/components/profile/HourlyBookingPopup'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'
import { fireConnectIntent } from '@/lib/connectIntent'
import {
  hourlyDefaultsForVehicle,
  formatIDR,
  AVAILABILITY_SLOTS,
  HOURLY_PETROL_POLICY_ID,
  HOURLY_PETROL_POLICY_EN,
  HOURLY_TIERS,
  isHourlyTimeAvailable,
  type HourlyTier,
} from '@/lib/pricing/hourlyHire'
import { parseRateTiers, PARCEL_TIER_DEFINITIONS, type ParcelVehicleKind } from '@/lib/parcel/defaults'
import { languagesByIds } from '@/lib/languages'
import type { TourPackage } from '@/lib/tours/types'

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
// Compliance (PM 12/2019): IndoCity is a SOFTWARE DIRECTORY. We never
// compute or charge fares — we show the driver's published rate and open
// WhatsApp for the rest. Estimate copy is always "Estimate · driver's own
// rate", never "Fare" or "Final price". Submission is a wa.me redirect,
// never an internal POST.
// =============================================================================

// -----------------------------------------------------------------------------
// Review row as returned by GET /api/reviews. created_at is ISO,
// formatted to "Xd ago" / absolute date in the UI. Mirrors the
// beautician page's ReviewRow type exactly.
// -----------------------------------------------------------------------------
type Review = {
  id:           string
  reviewer_name:string
  rating:       number
  comment:      string | null
  created_at:   string
}

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
const SERVICE_PILL_LABELS: Record<string, string> = {
  parcel: 'Parcel',
  food:   'Food',
  bus:    'Group',
}

const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'
const TEXT_MUTED   = '#71717A'
const TEXT_SECOND  = '#52525B'
const BORDER       = '#E4E4E7'
const INPUT_BG     = '#F4F4F5'

// Default hero backdrops — bike vs car get visually distinct banners so
// the customer immediately reads "this is a car driver" vs "bike rider"
// from the hero alone. Override per-driver via `cover_image_url` (added
// in a follow-up migration + dashboard banner picker).
const DEFAULT_BIKE_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2006_53_11%20AM.png'
const DEFAULT_CAR_HERO =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2003_38_55%20AM.png'

// -----------------------------------------------------------------------------
// Hero route-preview overlay — purely decorative visual layer. Pickup pin
// (black) + dropoff pin (yellow) + a polyline between them when both inputs
// are non-empty. The polyline shape is picked at random on mount from this
// set of six SVG path templates and locked for the page-load session via
// useMemo. ZERO backend — IndoCity remains a software directory; we do not
// geocode, route, dispatch, or coordinate drivers. Anchor coords below are
// the pickup and dropoff pin-tip positions inside the 400×300 viewBox.
// -----------------------------------------------------------------------------
const ROUTE_TEMPLATES: string[] = [
  'M60 230 L340 70',                                            // straight
  'M60 230 L60 70 L340 70',                                     // up-then-right (right elbow)
  'M60 230 L340 230 L340 70',                                   // right-then-up (left elbow)
  'M60 230 C140 230 100 70 340 70',                             // S-curve
  'M60 230 L150 230 L150 150 L260 150 L260 70 L340 70',         // stair-step
  'M60 230 C60 130 340 170 340 70',                             // reverse-S
]

// -----------------------------------------------------------------------------
// Compose the WhatsApp deep-link body. Caller passes the driver they're
// contacting + the trip inputs; this returns either a wa.me URL ready
// to open or '' when the phone number is unusable. Kept here (not in
// lib/whatsapp/buildLink.ts) because the message shape is specific to
// the new shell — multi-stop, typed-only addresses, no geocoded coords.
// -----------------------------------------------------------------------------
function buildShellWhatsAppLink(opts: {
  driver:    DriverPublic
  pickup:    string
  dropoff:   string
  stops:     string[]
  /** 'ride' → passenger transport copy; 'parcel' → parcel courier copy.
   *  Defaults to 'ride' for back-compat. */
  mode?:     'ride' | 'parcel'
  estimate?: { minFee: number; pricePerKm: number; pitstopFee: number; numStops: number } | null
}): string {
  const wa = normaliseE164ForWaMe(opts.driver.whatsapp_e164 ?? '')
  if (!wa) return ''
  const opener = opts.mode === 'parcel'
    ? `Halo ${opts.driver.business_name}, saya mau kirim paket via CityRiders.`
    : `Halo ${opts.driver.business_name}, saya mau booking via CityRiders.`
  const lines: string[] = [opener, '']
  if (opts.pickup.trim())  lines.push(`📍 Pickup: ${opts.pickup.trim()}`)
  if (opts.dropoff.trim()) lines.push(`🏁 Drop off: ${opts.dropoff.trim()}`)
  const extras = opts.stops.map((s) => s.trim()).filter(Boolean)
  if (extras.length > 0) {
    lines.push('')
    extras.forEach((s, i) => lines.push(`🛑 Stop ${i + 1}: ${s}`))
  }
  if (opts.estimate) {
    lines.push(
      '',
      `Estimate (driver's own rate):`,
      `From ${idr(opts.estimate.minFee)} · ${idr(opts.estimate.pricePerKm)}/km`,
    )
    if (opts.estimate.numStops > 0 && opts.estimate.pitstopFee > 0) {
      lines.push(`Pit-stop fee: ${idr(opts.estimate.pitstopFee)} × ${opts.estimate.numStops} stop${opts.estimate.numStops === 1 ? '' : 's'}`)
    }
  }
  lines.push('', 'Apakah tersedia?')
  return `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`
}

// -----------------------------------------------------------------------------
// Main shell. Owns booking-widget state (inputs + stops) since both
// /r and /car embed the same widget.
// -----------------------------------------------------------------------------
export default function DriverProfileShell({ driver, alternatives }: DriverProfileShellProps) {
  const searchParams = useSearchParams()
  // Profile-view tracking — one ping per session per (provider_type,
  // provider_id) pair. Feeds the driver's /dashboard/car/stats page
  // (views, share clicks, WhatsApp taps) via provider_profile_views.
  // Hook is sessionStorage-deduped so refreshes don't double-count.
  useProfileViewTracker({ providerType: 'driver', providerId: driver.id })
  const [pickup, setPickup]   = useState('')
  const [dropoff, setDropoff] = useState('')
  // Extra typed stops. Customer can add any number — no cap per spec.
  const [stops, setStops]     = useState<string[]>([])

  // Inline Places picker — when true, the embedded PlacesPicker panel
  // renders below the vehicle/services section. Tapping a place card
  // hydrates the dropoff field directly and collapses the panel —
  // no /places navigation, no round-trip URL params.
  const [showPlacesPicker, setShowPlacesPicker] = useState(false)

  // URL-param hydration — kept for the legacy round-trip flow (incoming
  // links from /places/[slug]'s "Take me here →" CTA still land here
  // with ?dName / ?dLat / ?dLng populated). New in-profile picks use
  // the inline panel above and never touch the URL.
  useEffect(() => {
    if (!searchParams) return
    const dName = searchParams.get('dName')
    const pName = searchParams.get('pName')
    if (dName) setDropoff(dName)
    if (pName) setPickup(pName)
    // Intentionally run only on mount — subsequent param changes (none
    // expected mid-session) shouldn't clobber the customer's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hero route-preview state. `bookingSent` flips true the instant the
  // BOOK NOW CTA is tapped (before the WA deep-link opens), driving a 6s
  // CSS stroke-colour transition from black → brand yellow on the polyline.
  // Intentionally NOT reset when the user returns from WhatsApp.
  const [bookingSent, setBookingSent] = useState(false)
  // Reviews view — when true, replaces the vehicle + booking sections
  // below the floating profile card with the ReviewsPanel. Mirrors the
  // beautician page's showReviews toggle exactly.
  const [showReviews, setShowReviews]             = useState(false)
  const [reviews, setReviews]                     = useState<Review[] | null>(null)
  const [reviewsLoading, setReviewsLoading]       = useState(false)
  const [reviewsRefreshCount, setReviewsRefreshCount] = useState(0)

  // Fetch reviews only when the panel is first opened, then again after
  // a new submission (bump reviewsRefreshCount). Skipped when driver.id
  // isn't a real UUID (mock drivers carry slug-shaped ids like
  // "rider-1") — the API would reject those with `invalid_provider_id`
  // anyway, so we short-circuit to an empty list to avoid spurious 400s.
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
  // Pick one of the six route templates at random ONCE per mount. The
  // empty deps array locks the choice for the page-load session so the
  // line doesn't reshuffle on every keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Deterministic per-driver pick — hash the slug so server + client agree
  // (Math.random would cause an SSR hydration mismatch on the client
  // component's first render). Same driver always shows the same route
  // shape across reloads; different drivers cycle the 6 templates.
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

  // System-controlled stock photo for the vehicle showcase. Bikes route
  // through getBikeImageUrl, cars / trucks / minibuses / premium cars
  // through getCarImageUrl — both helpers handle missing make/model
  // gracefully and always return a URL (generic fallback worst case).
  // We intentionally do NOT use vehicle_photos[0] here — driver-uploaded
  // photos still live on the model for other consumers but the public
  // showcase needs ONE clean curated image per make+model.
  const showcasePhoto = driver.vehicle_type === 'bike'
    ? getBikeImageUrl(driver.vehicle_make, driver.vehicle_model)
    : getCarImageUrl(driver.vehicle_make, driver.vehicle_model)

  // Estimate line — see file header for the compliance reasoning. We
  // never fabricate a km count when pickup/dropoff aren't geocoded, so
  // the line below the inputs shows only the published rate components.
  const estimateInputs = useMemo(() => {
    if (driver.min_fee == null || driver.price_per_km == null) return null
    return {
      minFee:     driver.min_fee,
      pricePerKm: driver.price_per_km,
      pitstopFee: driver.pitstop_fee ?? 0,
      numStops:   stops.filter((s) => s.trim().length > 0).length,
    }
  }, [driver.min_fee, driver.price_per_km, driver.pitstop_fee, stops])

  // Ride / Parcel mode toggle in the booking widget. Driver's available
  // modes are derived from `services` (bike: 'person'/'parcel') and
  // `service_offerings` (cars opt into 'cargo_parcel'). When only one
  // mode is offered, the toggle hides and the message body uses that
  // mode automatically.
  const offersParcel = useMemo(() => {
    if (driver.services.includes('parcel')) return true
    if (driver.service_offerings?.includes('cargo_parcel')) return true
    return false
  }, [driver.services, driver.service_offerings])
  const offersRide = useMemo(() => {
    // Every driver offers rides unless they ONLY listed cargo. Bike
    // drivers explicitly opt out by leaving 'person' off their services
    // array; cars/trucks default to offering rides since that's the
    // primary use case.
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

  // ── Services Offered tab row ───────────────────────────────────────────
  // Mocks (no real drivers row) don't carry the mig-0156 hourly columns,
  // so the page loader passes `hourly_enabled === null` for them. Real
  // drivers always have a boolean (column default `false`). For CAR
  // mocks we still render the Hourly tab using hourlyDefaultsForVehicle
  // (see HOURLY_DEFAULTS_AVANZA / HOURLY_DEFAULTS_INNOVA). Bike mocks
  // are person/parcel only in the demo seed → Hourly tab stays off.
  const isMockCar = driver.vehicle_type === 'car' && driver.hourly_enabled == null
  const hourlyAvailable = !!driver.hourly_enabled || isMockCar
  const hourlyDefaults  = useMemo(
    () => hourlyDefaultsForVehicle(driver.vehicle_make, driver.vehicle_model),
    [driver.vehicle_make, driver.vehicle_model],
  )

  // Published tours — surface a Tours tab when the driver has at least
  // one published row. Drafts (published=false) live only on the
  // dashboard and never reach the public profile.
  const publishedTours = useMemo(
    () => (driver.tours ?? []).filter((t) => t.published),
    [driver.tours],
  )
  const toursAvailable = publishedTours.length > 0

  type TabId = 'all' | 'passenger' | 'parcel' | 'hourly' | 'tours'
  const tabs: { id: TabId; label: string; emoji?: string }[] = []
  tabs.push({ id: 'all', label: 'All' })
  if (offersRide)   tabs.push({ id: 'passenger', label: 'Passenger' })
  if (offersParcel) tabs.push({ id: 'parcel',    label: 'Parcel B2B', emoji: '📋' })
  if (hourlyAvailable) tabs.push({ id: 'hourly', label: 'Hourly Booking' })
  if (toursAvailable)  tabs.push({ id: 'tours',  label: 'Tours' })
  const [activeTab, setActiveTab] = useState<TabId>('all')

  // Cheapest parcel-tier price for the All-tab summary card. Only
  // computed when the driver opted into parcel + we have a tiers row.
  const cheapestParcel = useMemo(() => {
    if (!offersParcel) return null
    const vehicleKind: ParcelVehicleKind = driver.vehicle_type === 'bike' ? 'bike' : 'car'
    const tiers = parseRateTiers(driver.parcel_rate_tiers ?? null, vehicleKind)
    return Math.min(tiers.tier_1_5, tiers.tier_6_20, tiers.tier_21_50, tiers.tier_51_100)
  }, [offersParcel, driver.parcel_rate_tiers, driver.vehicle_type])

  // Switch the booking-widget mode automatically when the customer taps
  // the Passenger or Parcel tabs so the WA template body matches.
  useEffect(() => {
    if (activeTab === 'passenger' && mode !== 'ride')   setMode('ride')
    if (activeTab === 'parcel'    && mode !== 'parcel') setMode('parcel')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Service-mode pills — keep the chip set tight by filtering to the
  // dictionary above; unknown values stored in `services` (from legacy
  // rows) are hidden rather than rendered raw.
  const pills = useMemo(() => {
    const seen = new Set<string>()
    return driver.services
      .filter((s) => SERVICE_PILL_LABELS[s] && !seen.has(SERVICE_PILL_LABELS[s]) && seen.add(SERVICE_PILL_LABELS[s]))
      .map((s) => SERVICE_PILL_LABELS[s])
  }, [driver.services])

  return (
    <main className="relative min-h-[100dvh] bg-white" style={{ color: TEXT_INK }}>
      {/* Right-edge yellow BACK tab — pinned to the viewport edge so
          customers can drop back into the /cari driver list at any
          point. Same shape as the beautician shell. */}
      <a
        href="/cari"
        aria-label="Back to booking page"
        className="fixed z-50 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition"
        style={{
          right:                  0,
          top:                    '35%',
          transform:              'translateY(-50%)',
          width:                  34,
          height:                 110,
          background:             '#FACC15',
          color:                  '#0A0A0A',
          borderTopLeftRadius:    14,
          borderBottomLeftRadius: 14,
          boxShadow:              '-4px 4px 14px rgba(0,0,0,0.22)',
        }}
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        <span
          className="font-extrabold uppercase"
          style={{
            writingMode:    'vertical-rl',
            transform:      'rotate(180deg)',
            fontSize:       11,
            letterSpacing:  '0.18em',
          }}
        >
          Back
        </span>
      </a>

      {/* 1) HERO — fixed backdrop with a soft white top scrim. Same
          pattern the beautician shell uses: image fills a 16/9 hero
          slot, with a white-to-transparent gradient softening the
          handoff into the floating profile card below. */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9', background: '#F4F4F5' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={driver.cover_image_url || (driver.vehicle_type === 'bike' ? DEFAULT_BIKE_HERO : DEFAULT_CAR_HERO)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Soft white top-scrim — fades the upper third so the hero
            reads as a brand backdrop rather than a photo of nowhere. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1/3"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.85), rgba(255,255,255,0))' }}
        />
        {/* Bottom-edge soft fade into the white page — gives the
            floating profile card a graceful overlap. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3"
          style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0))' }}
        />

        {/* HERO OVERLAY — mirrors /beautician/[slug] layout exactly:
            "Professional" + Star, then driver name in gold, then bio
            tagline, then 3 service icons (Airport / City / Tours)
            with vertical dividers. Top-left anchored at top:31, left:4. */}
        <div className="absolute left-4 z-10 select-none leading-none" style={{ top: 31 }}>
          <div
            className="flex items-center gap-0.5 text-[28px] sm:text-[34px] font-normal drop-shadow-[0_2px_6px_rgba(255,255,255,0.55)]"
            style={{ color: '#000000' }}
          >
            <span>Professional</span>
            <Star
              className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 -mt-3"
              strokeWidth={0}
              fill={BRAND_YELLOW}
              style={{ color: BRAND_YELLOW, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
            />
          </div>
          <div
            className="text-[28px] sm:text-[34px] font-black mt-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] overflow-hidden"
            style={{ color: BRAND_YELLOW, maxWidth: 'min(340px, calc(100vw - 32px))' }}
          >
            <span className="truncate inline-block max-w-full align-bottom">
              {driver.business_name || 'Driver'}
            </span>
          </div>
          {driver.bio && (
            <div
              className="text-[13px] sm:text-[14px] font-semibold mt-1.5 drop-shadow-[0_1px_3px_rgba(255,255,255,0.55)] whitespace-nowrap overflow-hidden text-ellipsis"
              style={{ color: '#000000', maxWidth: 'min(340px, calc(100vw - 32px))' }}
            >
              {driver.bio}
            </div>
          )}

          {/* Service icon row — Airport / City / Tours with vertical
              dividers between, exactly like the beautician Home/Hotel/Villa row. */}
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
          right side, just ABOVE the floating profile container. Mirrors
          the beautician page's Reviews pill (lines 288-301 there). Uses
          BRAND_YELLOW + dark text so it works without a per-provider
          theme prop. Lifted via negative margin so it overlaps the hero
          image rather than pushing the profile container down. z-20 so
          it sits above the hero overlay (z-10) and route-preview SVG. */}
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
          edge of the hero. Avatar, name, city, rating, availability
          dot, short bio, service-mode pills. Layout mirrors the
          beautician shell. */}
      <div className="px-4 max-w-2xl mx-auto relative z-10" style={{ marginTop: 8 }}>
        <div
          className="bg-white p-3 flex items-start gap-3"
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: 15,
            boxShadow: '0 10px 25px rgba(0,0,0,0.10)',
          }}
        >
          {/* Avatar — square-ish rounded; falls back to initial when
              the driver hasn't uploaded a profile photo. */}
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
            {/* Availability dot — green online, amber busy, grey
                offline. 12px circle pinned to the avatar's bottom-right
                corner with a 2px white ring so it reads on any photo. */}
            <span
              aria-label={`Driver is ${availability}`}
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
              style={{
                background:
                  availability === 'online' ? '#22C55E' :
                  availability === 'busy'   ? '#F59E0B' : '#9CA3AF',
                border: '2px solid #FFFFFF',
                boxShadow: availability === 'online'
                  ? '0 0 8px rgba(34,197,94,0.65)'
                  : 'none',
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-black leading-tight truncate" style={{ color: TEXT_INK }}>
              {driver.business_name}
            </h1>
            <p className="text-[13px] truncate mt-0.5" style={{ color: TEXT_MUTED }}>
              {(() => {
                const parts = [driver.area, driver.city]
                  .map((s) => s?.trim())
                  .filter((s): s is string => Boolean(s))
                // Dedupe case-insensitively so area+city of the same name
                // (common for mock drivers) doesn't render "Yogyakarta, Yogyakarta".
                const seen = new Set<string>()
                const unique = parts.filter((s) => {
                  const k = s.toLowerCase()
                  if (seen.has(k)) return false
                  seen.add(k)
                  return true
                })
                return unique.join(', ') || 'Indonesia'
              })()}
            </p>
            {/* Rating + trips line — hidden when the driver has no
                ratings yet so we never show a default star count. */}
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
            {/* Languages flag-row — only renders when the driver speaks
                something beyond the default Indonesian. Surfaces up to 3
                flags so tourists can scan eligibility in a glance. */}
            <LanguageFlagsRow languages={driver.languages ?? null} />

            {/* Service-mode pills — only shown when the driver has
                opted into at least one mode that maps to our dictionary.
                Brand-safe yellow tints per CONSTRAINTS in the spec. */}
            {pills.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {pills.map((label) => (
                  <span
                    key={label}
                    className="text-[12px] font-extrabold rounded-full px-2 py-0.5"
                    style={{ background: '#FEF9C3', border: '1px solid #FDE68A', color: '#854D0E' }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle image on the right edge of the profile container.
              Transparent PNG (system stock per make/model), object-contain
              so the silhouette isn't cropped, sized to match the avatar
              height row. */}
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
            below the floating profile container for the ReviewsPanel —
            mirrors the beautician page (which replaces its About /
            services / portfolio sections with the panel). The existing
            vehicle + booking sections render inside the else branch
            so the layout is otherwise untouched. */}
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
            profile container. Top row pairs the make/model line with a
            small yellow "Places" pill on the right that lets the
            customer browse venues and round-trip a chosen drop-off back
            into the booking widget (see placesHref above for the
            return_driver token + pickup-preserve params).
            Middle: seats (cars only). Bottom: up to 5 lines describing
            what trips the driver offers (currently sourced from
            driver.bio — separate "service_description" column is a
            follow-up if the founder wants the hero tagline and this
            block decoupled). */}
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
              {/* Places pill — toggles the inline PlacesPicker panel
                  below this section. Customer picks a place card → the
                  dropoff field hydrates in-place and the panel collapses.
                  No /places navigation, no round-trip URL params. */}
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
                  color: TEXT_SECOND,
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {driver.bio.replace(/\s*\n\s*/g, ' ')}
              </p>
            )}
            {/* Services row — driver-selected trip-type tags from
                `service_offerings` (mig 0110). Same yellow-tint badge
                styling as the service-mode pills above the bio so the
                two read as a related pair. Filters out unknown ids so a
                stale catalog entry doesn't render a blank chip. */}
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

        {/* 3.1) PLACES PICKER (inline) — when open, REPLACES the tabs +
            booking container below. Customer is in destination-picking
            mode; the booking widget reappears once they select a place
            (which hydrates dropoff and smooth-scrolls to the widget). */}
        {showPlacesPicker ? (
          <div id="driver-places-picker">
            <PlacesPicker
              onClose={() => setShowPlacesPicker(false)}
              onSelect={(place) => {
                setDropoff(place.name)
                setShowPlacesPicker(false)
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
          </div>
        ) : (
        <>
        {/* 3.5) SERVICES OFFERED — heading + tab row. Sits between the
            vehicle/services block and the booking container so the
            customer picks how they want to engage (All summary / Book a
            ride / Send a parcel / Hourly hire) before the input fields
            appear. Tabs surface only modes the driver opted into. */}
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
        {/* All tab now defaults to the booking container — same as the
            Passenger tab but with the mode toggle visible when both ride
            and parcel are offered. Falls through to the booking widget
            below; no AllSummaryCard render here (kept in the file for
            reuse but not invoked from this surface). */}
        {activeTab === 'tours' ? (
          <ToursTabContent driver={driver} tours={publishedTours} />
        ) : activeTab === 'hourly' ? (
          <HourlyTabContent
            driver={driver}
            hourlyDefaults={hourlyDefaults}
          />
        ) : availability === 'online' ? (
          <OnlineBookingWidget
            driver={driver}
            pickup={pickup} setPickup={setPickup}
            dropoff={dropoff} setDropoff={setDropoff}
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

        {/* Parcel B2B rate card — only on the Parcel tab. Shows the
            5-tier card from the driver's parcel_rate_tiers row (or the
            vehicle-default ladder for mocks). Sits BELOW the booking
            widget so the customer first sees the booking input then the
            rate ladder reference. */}
        {activeTab === 'parcel' && offersParcel && (
          <ParcelTierCard driver={driver} />
        )}
        </>
        )}
        </>
        )}
      </div>

      <PoweredByKita2u
        defaultVertical={driver.vehicle_type === 'bike' ? 'bike-driver' : 'car-driver'}
      />
    </main>
  )
}

// -----------------------------------------------------------------------------
// Subcomponent — booking widget shown when the driver is online.
// -----------------------------------------------------------------------------
function OnlineBookingWidget({
  driver, pickup, setPickup, dropoff, setDropoff, stops, setStops,
  estimate, waLink, mode, setMode, offersRide, offersParcel, onBookingSent,
}: {
  driver:        DriverPublic
  pickup:        string;  setPickup:  (v: string) => void
  dropoff:       string;  setDropoff: (v: string) => void
  stops:         string[]; setStops:  (v: string[]) => void
  estimate:      { minFee: number; pricePerKm: number; pitstopFee: number; numStops: number } | null
  waLink:        string
  mode:          'ride' | 'parcel'
  setMode:       (m: 'ride' | 'parcel') => void
  offersRide:    boolean
  offersParcel:  boolean
  /** Fires the instant BOOK NOW is tapped (before the WA deep-link
   *  opens), so the hero route-preview polyline starts its 6s colour
   *  transition from black → brand yellow. */
  onBookingSent: () => void
}) {
  const canBook = pickup.trim().length > 0 && dropoff.trim().length > 0 && waLink.length > 0

  // Geolocation bias for the autosuggest dropdown — matches /cari's
  // pattern. Suggestions rank closer to the customer first, and the
  // country filter narrows results to the user's actual market.
  const geo = useGeolocation(true)
  const userCountry = useCountryFromCoords(geo.coords ?? null)
  const countryCodes = useMemo(() => (userCountry ? [userCountry] : []), [userCountry])

  // Swap pickup ↔ dropoff strings. Mirrors /cari's swap behaviour but
  // without coords (the widget owns labels only — see file header for
  // the compliance reasoning).
  const handleSwap = () => {
    const prevPickup  = pickup
    const prevDropoff = dropoff
    setPickup(prevDropoff)
    setDropoff(prevPickup)
  }

  return (
    <section
      className="mt-4 rounded-2xl p-3 space-y-2.5"
      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
    >
      {/* Mode toggle — Ride / Parcel. Only renders when the driver
          actually offers both. Otherwise the widget runs in the single
          mode the driver supports and the toggle is hidden. */}
      {offersRide && offersParcel && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('ride')}
            aria-pressed={mode === 'ride'}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-extrabold text-[13px] tracking-tight transition active:scale-95"
            style={{
              background: mode === 'ride' ? BRAND_YELLOW : INPUT_BG,
              color:      mode === 'ride' ? TEXT_INK     : TEXT_SECOND,
              border:     `1px solid ${mode === 'ride' ? BRAND_YELLOW : BORDER}`,
              boxShadow:  mode === 'ride' ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
              minHeight: 44,
            }}
          >
            <UserRound className="w-4 h-4" strokeWidth={2.5} />
            <span>Book a ride</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('parcel')}
            aria-pressed={mode === 'parcel'}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-extrabold text-[13px] tracking-tight transition active:scale-95"
            style={{
              background: mode === 'parcel' ? BRAND_YELLOW : INPUT_BG,
              color:      mode === 'parcel' ? TEXT_INK     : TEXT_SECOND,
              border:     `1px solid ${mode === 'parcel' ? BRAND_YELLOW : BORDER}`,
              boxShadow:  mode === 'parcel' ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
              minHeight: 44,
            }}
          >
            <PackageIcon className="w-4 h-4" strokeWidth={2.5} />
            <span>Send a parcel</span>
          </button>
        </div>
      )}

      {/* Header row — title on left, yellow Add stop pill on right.
          Mirrors /cari page.tsx lines 462-486 ("Where to?" + Add Stop). */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_INK }}>
          {mode === 'parcel' ? `Send via ${driver.business_name.split(' ')[0]}` : `Book ${driver.business_name.split(' ')[0]}`}
        </h2>
        <button
          type="button"
          onClick={() => setStops([...stops, ''])}
          aria-label="Add stop"
          className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full font-extrabold text-[12px] active:scale-95 transition"
          style={{
            background: BRAND_YELLOW,
            color: TEXT_INK,
            boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
            minHeight: 32,
          }}
        >
          <span
            className="w-4 h-4 rounded-full inline-flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.10)' }}
          >
            <Plus className="w-3 h-3" strokeWidth={3} />
          </span>
          <span>Add stop</span>
        </button>
      </div>

      {/* Pickup + Dropoff row — 3 columns: left connector (ring + dotted
          line + filled circle), inputs, right swap-arrows button. Ported
          from /cari page.tsx lines 488-586. */}
      <div className="flex items-stretch gap-2">
        {/* Connector column — black ring at top (Pickup), dotted line,
            yellow filled circle at bottom (Drop off). Renders for all
            states (pickup-only, dropoff-only, both-filled, both-empty)
            because it sits alongside the input fields rather than
            depending on their values. */}
        <div
          className="flex flex-col items-center justify-between py-2.5 shrink-0"
          style={{ width: 16 }}
          aria-hidden
        >
          <div
            className="w-3 h-3 rounded-full border-2"
            style={{ borderColor: TEXT_INK, background: 'transparent' }}
          />
          <div
            className="flex-1 my-1"
            style={{
              width: 2,
              backgroundImage: 'repeating-linear-gradient(to bottom, #0A0A0A 0 3px, transparent 3px 6px)',
            }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: BRAND_YELLOW, boxShadow: `0 0 0 2px ${TEXT_INK} inset` }}
          />
        </div>

        {/* Inputs column — pickup + dropoff with autosuggest dropdown.
            Mirrors /cari's PlaceAutocomplete pattern (gray dropdown, red
            pin, max 3 results). Pickup carries a Bookmark right-slot icon
            ("saved address"); dropoff carries a yellow Star ("favorites"). */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>
              Pickup
            </label>
            <div className="relative">
              <PlaceAutocomplete
                value={pickup}
                onChange={setPickup}
                onSelect={(s) => setPickup(s.label)}
                placeholder="Where do you want to be picked up?"
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#0A0A0A] placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                near={geo.coords ?? null}
                countryCodes={countryCodes}
                ariaLabel="Pick up location"
                clearOnFocus
                dropdownDirection="down"
                maxResults={3}
                rightSlot={
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center"
                    aria-hidden
                  >
                    <Bookmark className="w-[18px] h-[18px] text-[#FACC15]" strokeWidth={2.4} fill="#FACC15" />
                  </span>
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>
              Drop off
            </label>
            <div className="relative">
              <PlaceAutocomplete
                value={dropoff}
                onChange={setDropoff}
                onSelect={(s) => setDropoff(s.label)}
                placeholder="Where do you want to go?"
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#0A0A0A] placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                near={geo.coords ?? null}
                countryCodes={countryCodes}
                ariaLabel="Drop off location"
                clearOnFocus
                dropdownDirection="down"
                maxResults={3}
                rightSlot={
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center"
                    aria-hidden
                  >
                    <Star className="w-[18px] h-[18px] text-[#FACC15]" strokeWidth={2.4} fill="#FACC15" />
                  </span>
                }
              />
            </div>
          </div>
        </div>

        {/* Swap-arrows column — single tappable button with stacked
            up/down arrows. Tapping swaps the pickup and dropoff text
            values. 44px min tap target per WCAG. */}
        <button
          type="button"
          onClick={handleSwap}
          aria-label="Swap pickup and dropoff"
          className="shrink-0 self-center flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 active:scale-95 transition"
          style={{
            background: INPUT_BG,
            border: `1px solid ${BORDER}`,
            minWidth: 44,
            minHeight: 44,
            color: TEXT_INK,
          }}
        >
          <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} />
          <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      </div>

      {/* Multi-stop list — each stop has its own input + remove button.
          No cap per spec. */}
      {stops.map((s, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <BookingTextField
              label={`Stop ${i + 1}`}
              value={s}
              onChange={(v) => {
                const next = stops.slice()
                next[i] = v
                setStops(next)
              }}
              placeholder="Stop address or note"
            />
          </div>
          <button
            type="button"
            onClick={() => setStops(stops.filter((_, j) => j !== i))}
            aria-label={`Remove stop ${i + 1}`}
            className="shrink-0 rounded-lg flex items-center justify-center active:scale-95 transition"
            style={{
              minWidth: 44, minHeight: 44,
              background: '#FEE2E2', border: '1px solid #FCA5A5',
              color: '#B91C1C',
            }}
          >
            <XIcon className="w-4 h-4" strokeWidth={2.75} />
          </button>
        </div>
      ))}

      {/* Estimate line — driver's own rate. We DO NOT fabricate a km
          count here because pickup/dropoff are typed addresses (not
          geocoded). Compliance copy: "Estimate · driver's own rate". */}
      {estimate ? (
        <div
          className="rounded-xl p-2.5 flex items-baseline justify-between gap-2"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
              Estimate · {driver.business_name.split(' ')[0]}&apos;s own rate
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: TEXT_SECOND }}>
              From {idr(estimate.minFee)} · driver&apos;s rate {idr(estimate.pricePerKm)}/km
              {estimate.numStops > 0 && estimate.pitstopFee > 0 && (
                <> · + {idr(estimate.pitstopFee)} per stop</>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[11px] italic" style={{ color: TEXT_MUTED }}>
          Driver hasn&apos;t published a rate yet — confirm price in chat.
        </div>
      )}

      {/* BOOK NOW — opens WhatsApp with the pre-filled message. Also
          flips the hero route-preview polyline into its 6s black →
          yellow colour transition. The WA deep-link is NOT delayed —
          the state flip fires synchronously before the browser handles
          the anchor navigation. */}
      <a
        href={canBook ? waLink : undefined}
        target={canBook ? '_blank' : undefined}
        rel="noopener noreferrer"
        aria-disabled={!canBook}
        onClick={(e) => {
          if (!canBook) { e.preventDefault(); return }
          const isBike   = driver.vehicle_type === 'bike'
          const source   = isBike ? 'rider_profile' : 'car_profile'
          const vertical = isBike ? 'rider' : 'car'
          fireConnectIntent(driver.id, source, vertical)
          onBookingSent()
        }}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[14px] uppercase tracking-wider active:scale-[0.99] transition"
        style={{
          minHeight: 48,
          background: canBook ? BRAND_YELLOW : INPUT_BG,
          color: canBook ? TEXT_INK : TEXT_MUTED,
          border: `1px solid ${canBook ? BRAND_YELLOW : BORDER}`,
          boxShadow: canBook ? '0 8px 18px rgba(250,204,21,0.35)' : 'none',
          opacity: canBook ? 1 : 0.85,
          cursor: canBook ? 'pointer' : 'not-allowed',
        }}
      >
        <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
        Book now
      </a>
      <p className="text-[11px] text-center leading-snug" style={{ color: TEXT_MUTED }}>
        Opens WhatsApp with your trip details. You can edit before sending.
      </p>
    </section>
  )
}

// -----------------------------------------------------------------------------
// Subcomponent — shown when the page driver is BUSY or OFFLINE. Surfaces
// 3–5 online drivers with the SAME vehicle_type, sorted nearest-first
// when the parent driver has lat/lng + customer typed a pickup (we don't
// have the customer's coords; we use the parent driver as the proximity
// anchor so the list is at least geographically coherent — falls back
// to alphabetical when neither anchor is available).
// -----------------------------------------------------------------------------
function AlternativesWidget({
  driver, availability, alternatives,
  pickup, setPickup, dropoff, setDropoff, stops, setStops,
}: {
  driver:        DriverPublic
  availability:  'busy' | 'offline'
  alternatives:  DriverPublic[]
  pickup:        string;  setPickup:  (v: string) => void
  dropoff:       string;  setDropoff: (v: string) => void
  stops:         string[]; setStops:  (v: string[]) => void
}) {
  // Sort alternatives by distance from the page driver's lat/lng (best
  // proximity signal we have without the customer's coords). Falls
  // back to alphabetical when no anchor is available.
  const ranked = useMemo(() => {
    const anchorLat = driver.lat
    const anchorLng = driver.lng
    const hasAnchor = typeof anchorLat === 'number' && typeof anchorLng === 'number'
                       && (anchorLat !== 0 || anchorLng !== 0)
    const list = alternatives.slice()
    if (hasAnchor) {
      list.sort((a, b) => {
        const aHas = typeof a.lat === 'number' && typeof a.lng === 'number' && (a.lat !== 0 || a.lng !== 0)
        const bHas = typeof b.lat === 'number' && typeof b.lng === 'number' && (b.lat !== 0 || b.lng !== 0)
        if (aHas && bHas) {
          const da = haversineKm({ lat: anchorLat!, lng: anchorLng! }, { lat: a.lat!, lng: a.lng! })
          const db = haversineKm({ lat: anchorLat!, lng: anchorLng! }, { lat: b.lat!, lng: b.lng! })
          return da - db
        }
        if (aHas) return -1
        if (bHas) return 1
        return a.business_name.localeCompare(b.business_name)
      })
    } else {
      list.sort((a, b) => a.business_name.localeCompare(b.business_name))
    }
    return list.slice(0, 5)
  }, [alternatives, driver.lat, driver.lng])

  return (
    <section
      className="mt-4 rounded-2xl p-3 space-y-3"
      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
    >
      <div
        className="rounded-xl p-2.5"
        style={{
          background: availability === 'busy' ? '#FEF3C7' : '#F3F4F6',
          border: `1px solid ${availability === 'busy' ? '#FDE68A' : BORDER}`,
        }}
      >
        <p className="text-[13px] font-extrabold leading-snug" style={{ color: TEXT_INK }}>
          {driver.business_name} is {availability} now — try these instead
        </p>
      </div>

      {/* Same input set as the online widget — customer can still type
          where they want to go, then tap a Book → on an alternative. */}
      <BookingTextField label="Pickup"   value={pickup}  onChange={setPickup}  placeholder="Where do you want to be picked up?" />
      <BookingTextField label="Drop off" value={dropoff} onChange={setDropoff} placeholder="Where do you want to go?" />
      {stops.map((s, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <BookingTextField
              label={`Stop ${i + 1}`}
              value={s}
              onChange={(v) => {
                const next = stops.slice()
                next[i] = v
                setStops(next)
              }}
              placeholder="Stop address or note"
            />
          </div>
          <button
            type="button"
            onClick={() => setStops(stops.filter((_, j) => j !== i))}
            aria-label={`Remove stop ${i + 1}`}
            className="shrink-0 rounded-lg flex items-center justify-center active:scale-95 transition"
            style={{
              minWidth: 44, minHeight: 44,
              background: '#FEE2E2', border: '1px solid #FCA5A5',
              color: '#B91C1C',
            }}
          >
            <XIcon className="w-4 h-4" strokeWidth={2.75} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setStops([...stops, ''])}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-extrabold uppercase tracking-wider"
        style={{
          minHeight: 44,
          background: INPUT_BG, border: `1px dashed ${BORDER}`, color: TEXT_SECOND,
        }}
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Add stop
      </button>

      {/* Alternatives list — 3–5 cards, each routes to THAT driver's
          profile page (/r/{slug} for bike, /car/{slug} for car).
          Customer sees trust signals (photo, vehicle, rating, reviews)
          before committing to WhatsApp via the profile's own BOOK NOW
          CTA. Mirrors Airbnb / Booking.com card behaviour. */}
      {ranked.length > 0 ? (
        <ul className="space-y-2 pt-1">
          {ranked.map((alt) => (
            <AlternativeRow
              key={alt.id}
              alt={alt}
              anchorLat={driver.lat}
              anchorLng={driver.lng}
            />
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-center py-3" style={{ color: TEXT_MUTED }}>
          No other drivers online right now.{' '}
          <Link href="/cari" className="font-extrabold underline" style={{ color: TEXT_INK }}>
            Browse the directory
          </Link>
        </p>
      )}
    </section>
  )
}

// -----------------------------------------------------------------------------
// Booking text input. Plain typed field — no autosuggest, no geocoding
// (phase-1 scope). 44px tap target.
// -----------------------------------------------------------------------------
// Small flag-and-code row under the rating — surfaces up to 3 languages
// the driver speaks beyond Indonesian. Hidden entirely when the driver
// is Indonesian-only (every Indonesian driver speaks Bahasa already, so
// the default-only state carries no extra signal for tourists).
function LanguageFlagsRow({ languages }: { languages: string[] | null }) {
  if (!languages || languages.length === 0) return null
  const beyondIndonesian = languages.filter((l) => l !== 'id')
  if (beyondIndonesian.length === 0) return null
  // First three only — viewport stays clean on a 360px phone frame.
  // We keep 'id' in front so the row reads as "Bahasa + extras".
  const ordered = ['id', ...beyondIndonesian]
  const defs = languagesByIds(ordered).slice(0, 3)
  if (defs.length === 0) return null
  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      {defs.map((l, i) => (
        <span key={l.id} className="inline-flex items-center gap-1 leading-none">
          {i > 0 && <span className="text-[10px]" style={{ color: TEXT_MUTED }}>·</span>}
          <span aria-hidden style={{ fontSize: 18 }}>{l.flag}</span>
          <span
            className="text-[11px] font-extrabold uppercase tracking-wider"
            style={{ color: TEXT_SECOND }}
          >
            {l.id}
          </span>
        </span>
      ))}
    </div>
  )
}

// Hero overlay service icon — circular white chip with a dark lucide
// icon inside + a small label underneath. Mirrors the beautician hero's
// HeroIcon component (Home/Hotel/Villa/Spa row).
function HeroServiceIcon({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; color?: string }>
  label: string
}) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.92)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.20)',
        }}
      >
        <Icon className="w-5 h-5" strokeWidth={2.25} color="#0A0A0A" />
      </div>
      <span
        className="text-[12px] font-extrabold mt-1 leading-none drop-shadow-[0_1px_2px_rgba(255,255,255,0.55)]"
        style={{ color: '#0A0A0A' }}
      >
        {label}
      </span>
    </div>
  )
}

// -----------------------------------------------------------------------------
// "All" tab — polished default summary card. Mode chips, availability
// chips, working-hours, plus a yellow "Contact for additional services
// or custom quote" CTA that opens WhatsApp with a generic line.
// -----------------------------------------------------------------------------
function AllSummaryCard({
  driver, offersRide, offersParcel, hourlyAvailable, hourlyDefaults, cheapestParcel,
}: {
  driver:          DriverPublic
  offersRide:      boolean
  offersParcel:    boolean
  hourlyAvailable: boolean
  hourlyDefaults:  { tier_3h: number; tier_6h: number; tier_8h: number }
  cheapestParcel:  number | null
}) {
  // Per-slot availability chips — render only when at least one slot
  // is enabled. Driver decides; we never imply 24/7 service.
  const slotChips = AVAILABILITY_SLOTS
    .filter((s) => Boolean((driver as unknown as Record<string, boolean | null | undefined>)[s.column]))
    .map((s) => ({ id: s.id, label: s.label, emoji: s.emoji }))

  const wh = (driver.working_hours_start && driver.working_hours_end)
    ? `${driver.working_hours_start} – ${driver.working_hours_end}`
    : null

  const hourly3h = driver.hourly_3h_rate_idr || hourlyDefaults.tier_3h

  const waNumber = normaliseE164ForWaMe(driver.whatsapp_e164 ?? '')
  const customCtaHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
        `Halo ${driver.business_name}, saya ingin tanya tentang layanan tambahan / harga khusus. Terima kasih.`,
      )}`
    : null

  return (
    <section
      className="mt-4 rounded-2xl p-3 space-y-3"
      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
    >
      <div>
        <div className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_INK }}>
          Available {[offersRide, offersParcel, hourlyAvailable].filter(Boolean).length} way{[offersRide, offersParcel, hourlyAvailable].filter(Boolean).length === 1 ? '' : 's'}
        </div>
        <ul className="mt-2 space-y-1.5">
          {offersRide && (
            <li className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-extrabold" style={{ color: TEXT_INK }}>🧍 Passenger</span>
              <span style={{ color: TEXT_SECOND }}>
                {driver.price_per_km != null && driver.price_per_km > 0
                  ? <>from {idr(driver.price_per_km)}/km</>
                  : <>rate on request</>}
              </span>
            </li>
          )}
          {offersParcel && (
            <li className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-extrabold" style={{ color: TEXT_INK }}>📋 Parcel B2B</span>
              <span style={{ color: TEXT_SECOND }}>
                {cheapestParcel != null
                  ? <>from {idr(cheapestParcel)}/parcel</>
                  : <>rate on request</>}
              </span>
            </li>
          )}
          {hourlyAvailable && (
            <li className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-extrabold" style={{ color: TEXT_INK }}>⏰ Hourly hire</span>
              <span style={{ color: TEXT_SECOND }}>
                from {formatIDR(hourly3h)}/3-hour block
              </span>
            </li>
          )}
        </ul>
      </div>

      {slotChips.length > 0 && (
        <div className="text-[13px]" style={{ color: TEXT_SECOND }}>
          <span className="font-extrabold" style={{ color: TEXT_INK }}>Available:</span>{' '}
          {slotChips.map((c, i) => (
            <span key={c.id}>
              {i > 0 ? ' · ' : ''}
              {c.emoji} {c.label}
            </span>
          ))}
        </div>
      )}

      {wh && (
        <div className="text-[13px]" style={{ color: TEXT_SECOND }}>
          <span className="font-extrabold" style={{ color: TEXT_INK }}>Working hours:</span> {wh}
        </div>
      )}

      {customCtaHref && (
        <a
          href={customCtaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[14px] active:scale-[0.99] transition"
          style={{
            minHeight: 48,
            background: BRAND_YELLOW,
            color: TEXT_INK,
            border: `1px solid ${BRAND_YELLOW}`,
            boxShadow: '0 8px 18px rgba(250,204,21,0.35)',
          }}
        >
          <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
          Contact for additional services or custom quote
        </a>
      )}
    </section>
  )
}

// -----------------------------------------------------------------------------
// Tours tab — vertical stack of published tour packages. Each card opens
// the shared HourlyBookingPopup (in tour mode — no tier, just label +
// amount). Reuses the same date/time → WhatsApp handoff pattern as the
// hourly tab to keep the booking UX consistent across blocks vs tours.
// -----------------------------------------------------------------------------
function ToursTabContent({
  driver, tours,
}: {
  driver: DriverPublic
  tours:  TourPackage[]
}) {
  const [popupTour, setPopupTour] = useState<TourPackage | null>(null)

  return (
    <>
      <section
        className="mt-4 rounded-2xl p-3 space-y-3"
        style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
      >
        {tours.map((t) => (
          <article
            key={t.id}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
          >
            {t.photo_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={t.photo_url}
                alt=""
                className="w-full object-cover"
                style={{ aspectRatio: '16 / 9' }}
              />
            )}
            <div className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-black leading-tight" style={{ color: TEXT_INK }}>
                    {t.title}
                  </h3>
                  <div className="text-[12px] mt-0.5" style={{ color: TEXT_SECOND }}>
                    {formatDurationHours(t.duration_hours)}
                    {t.max_pax != null && t.max_pax > 0 && <> · up to {t.max_pax} pax</>}
                  </div>
                </div>
                <div className="text-[18px] font-black shrink-0 leading-none" style={{ color: TEXT_INK }}>
                  {idr(t.price_idr)}
                </div>
              </div>

              {t.description && (
                <p
                  className="text-[13px] leading-snug"
                  style={{
                    color: TEXT_SECOND,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {t.description}
                </p>
              )}

              {/* Fee policy — short, clear, and consistent across all
                  tour packages. Replaces the previous include/exclude
                  chip badges so the card reads as a single price story. */}
              <div
                className="rounded-lg px-2.5 py-2 text-[12px] leading-snug"
                style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#854D0E' }}
              >
                <span className="font-extrabold">Fuel + driver included.</span>{' '}
                Entrance tickets, parking, toll roads, bridge fees, meals and any
                personal expenses are the passenger&apos;s responsibility.
              </div>

              <button
                type="button"
                onClick={() => setPopupTour(t)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg font-extrabold text-[13px] active:scale-[0.98] transition"
                style={{
                  minHeight: 44,
                  background: BRAND_YELLOW,
                  color: TEXT_INK,
                  border: `1px solid ${BRAND_YELLOW}`,
                  boxShadow: '0 4px 12px rgba(250,204,21,0.30)',
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                Book this tour
              </button>
            </div>
          </article>
        ))}
      </section>

      {popupTour && (
        <HourlyBookingPopup
          driver={driver}
          amount={popupTour.price_idr}
          label={popupTour.title}
          onClose={() => setPopupTour(null)}
        />
      )}
    </>
  )
}

function formatDurationHours(hours: number): string {
  // "1.5 hours", "12 hours" — trim trailing .0 so integer durations
  // don't render as "12.0 hours".
  const rounded = Math.round(hours * 10) / 10
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${str} ${rounded === 1 ? 'hour' : 'hours'}`
}

// -----------------------------------------------------------------------------
// Hourly Booking tab — three stacked rate cards (3h / 6h / 8h). Each card
// opens an inline date+time popup; when submitted the customer is
// bounced to WhatsApp with the booking template body pre-filled. We
// don't POST to a /book endpoint here — drivers don't have one yet and
// the existing widget on this page also opens WhatsApp directly.
// -----------------------------------------------------------------------------
function HourlyTabContent({
  driver, hourlyDefaults,
}: {
  driver:         DriverPublic
  hourlyDefaults: { tier_3h: number; tier_6h: number; tier_8h: number }
}) {
  const [popupTier, setPopupTier] = useState<HourlyTier | null>(null)

  const rates: Record<HourlyTier, number> = {
    '3h': driver.hourly_3h_rate_idr || hourlyDefaults.tier_3h,
    '6h': driver.hourly_6h_rate_idr || hourlyDefaults.tier_6h,
    '8h': driver.hourly_8h_rate_idr || hourlyDefaults.tier_8h,
  }
  const labels: Record<HourlyTier, string> = {
    '3h': '3-hour block',
    '6h': '6-hour block',
    '8h': '8-hour block',
  }

  // Service-window badge — derived from the driver's declared working
  // hours. Bucketed to 24h / 16h / 8h so the customer sees the broad
  // availability story without needing to mental-math start/end times.
  const serviceWindow = useMemo(() => {
    const s = driver.working_hours_start
    const e = driver.working_hours_end
    if (!s || !e) return null
    const sm = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(s)
    const em = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(e)
    if (!sm || !em) return null
    let diff = (parseInt(em[1]!, 10) * 60 + parseInt(em[2]!, 10))
             - (parseInt(sm[1]!, 10) * 60 + parseInt(sm[2]!, 10))
    if (diff <= 0) diff += 24 * 60
    const hours = diff / 60
    if (hours >= 20) return '24-hour service'
    if (hours >= 12) return '16-hour service'
    return '8-hour service'
  }, [driver.working_hours_start, driver.working_hours_end])

  return (
    <>
      <section
        className="mt-4 rounded-2xl p-3 space-y-3"
        style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
      >
        {/* Header row — "Hourly hire" title left, service-window badge
            right. Badge hides when the driver hasn't set working hours. */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_INK }}>
            Hourly hire
          </h3>
          {serviceWindow && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-extrabold rounded-full px-2.5 py-1"
              style={{
                background: TEXT_INK,
                color: BRAND_YELLOW,
                boxShadow: '0 2px 8px rgba(10,10,10,0.18)',
              }}
            >
              <Clock className="w-3 h-3" strokeWidth={2.75} />
              {serviceWindow}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {(['3h', '6h', '8h'] as HourlyTier[]).map((tier) => (
            <div
              key={tier}
              className="rounded-xl p-3 flex flex-col gap-2"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <div className="text-[12px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
                {labels[tier]}
              </div>
              <div className="text-[18px] font-black" style={{ color: TEXT_INK }}>
                {formatIDR(rates[tier])}
              </div>
              <button
                type="button"
                onClick={() => setPopupTier(tier)}
                className="mt-auto w-full inline-flex items-center justify-center gap-1.5 rounded-lg font-extrabold text-[13px] active:scale-[0.98] transition"
                style={{
                  minHeight: 44,
                  background: BRAND_YELLOW,
                  color: TEXT_INK,
                  border: `1px solid ${BRAND_YELLOW}`,
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                Book this block
              </button>
            </div>
          ))}
        </div>

        {/* Fee policy — hourly hire is fuel-NOT-included (driver pumps
            petrol; customer reimburses at the pump). Mirrors the tour-card
            fee notice in style + amber colors, just with a different
            payload. */}
        <div
          className="rounded-lg px-2.5 py-2 text-[12px] leading-snug"
          style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#854D0E' }}
        >
          <span className="font-extrabold">Fuel not included.</span>{' '}
          Customer pays for petrol at the pump. Entrance tickets, parking,
          toll roads, bridge fees, meals and any personal expenses are also the
          passenger&apos;s responsibility.
        </div>
      </section>

      {popupTier && (
        <HourlyBookingPopup
          driver={driver}
          tier={popupTier}
          amount={rates[popupTier]}
          label={labels[popupTier]}
          onClose={() => setPopupTier(null)}
        />
      )}
    </>
  )
}

// HourlyBookingPopup lives at '@/components/profile/HourlyBookingPopup'.
// Re-exported from the shared file so DriverProfileShell, TruckServicesTabs,
// and any future profile surface render the same calendar booking flow.

// -----------------------------------------------------------------------------
// ParcelTierCard — read-only 5-tier ladder shown under the booking
// widget on the Parcel B2B tab. Falls back to vehicle defaults when the
// driver hasn't saved their own tiers yet.
// -----------------------------------------------------------------------------
function ParcelTierCard({ driver }: { driver: DriverPublic }) {
  const vehicleKind: ParcelVehicleKind = driver.vehicle_type === 'bike' ? 'bike' : 'car'
  const tiers = parseRateTiers(driver.parcel_rate_tiers ?? null, vehicleKind)
  return (
    <section
      className="mt-3 rounded-2xl p-3"
      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
    >
      <div className="text-[13px] font-extrabold uppercase tracking-wider mb-2" style={{ color: TEXT_INK }}>
        Per-parcel rates
      </div>
      <ul className="space-y-1.5">
        {PARCEL_TIER_DEFINITIONS.map((def) => (
          <li key={def.key} className="flex items-center justify-between gap-2 text-[13px]">
            <span style={{ color: TEXT_SECOND }}>
              <span className="font-extrabold" style={{ color: TEXT_INK }}>{def.label}</span>
              {' · '}{def.range}
            </span>
            <span className="font-extrabold" style={{ color: TEXT_INK }}>
              {idr(tiers[def.key])}
            </span>
          </li>
        ))}
        {tiers.tier_100_plus_negotiate && (
          <li className="flex items-center justify-between gap-2 text-[13px]">
            <span style={{ color: TEXT_SECOND }}>
              <span className="font-extrabold" style={{ color: TEXT_INK }}>Bulk</span>
              {' · '}100+ parcels/day
            </span>
            <span className="font-extrabold" style={{ color: TEXT_INK }}>
              Negotiated on WhatsApp
            </span>
          </li>
        )}
      </ul>
    </section>
  )
}

function BookingTextField({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span
        className="block text-[11px] font-extrabold uppercase tracking-wider mb-1"
        style={{ color: TEXT_SECOND }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 text-[14px] focus:outline-none"
        style={{
          minHeight: 44,
          background: INPUT_BG,
          border: `1px solid ${BORDER}`,
          color: TEXT_INK,
        }}
      />
    </label>
  )
}

// -----------------------------------------------------------------------------
// Single alternative-driver card. Photo + name + distance (when both
// the anchor + alt have lat/lng) + their own rate + online dot. Tap
// routes to THAT driver's profile page — /r/{slug} for bike, or
// /car/{slug} for car / truck / minibus. The BOOK NOW WhatsApp deep-link
// lives on the profile itself, so customers see trust signals (photo,
// vehicle, rating, reviews) BEFORE committing to chat. Mirrors
// Airbnb / Booking.com / Gojek-restaurant card behaviour.
// -----------------------------------------------------------------------------
function AlternativeRow({
  alt, anchorLat, anchorLng,
}: {
  alt:        DriverPublic
  anchorLat:  number | null
  anchorLng:  number | null
}) {
  const hasDistance =
    typeof anchorLat === 'number' && typeof anchorLng === 'number' &&
    typeof alt.lat   === 'number' && typeof alt.lng   === 'number' &&
    (anchorLat !== 0 || anchorLng !== 0) && (alt.lat !== 0 || alt.lng !== 0)
  const distanceKm = hasDistance
    ? haversineKm({ lat: anchorLat!, lng: anchorLng! }, { lat: alt.lat!, lng: alt.lng! })
    : null

  // Per-row published rate readout (no estimate math — IndoCity is a
  // directory, never a fare calculator).
  const showRate = alt.min_fee != null && alt.price_per_km != null

  // Profile route — car / truck / minibus → /car/{slug}, everything else
  // (bike / null / unknown) → /r/{slug}. Matches the DriverPublic
  // vehicle_type contract above.
  const isCarLike = alt.vehicle_type === 'car'
                 || alt.vehicle_type === 'truck'
                 || alt.vehicle_type === 'minibus'
                 || alt.vehicle_type === 'premium_car'
  const profileHref = isCarLike ? `/car/${alt.slug}` : `/r/${alt.slug}`

  // System-controlled stock vehicle photo for the alt row. Same routing
  // as the main showcase — bikes → getBikeImageUrl, cars (and car-likes)
  // → getCarImageUrl. We render the curated vehicle image rather than
  // the driver's headshot so alt cards match the showcase quality.
  const altShowcasePhoto = alt.vehicle_type === 'bike'
    ? getBikeImageUrl(alt.vehicle_make, alt.vehicle_model)
    : getCarImageUrl(alt.vehicle_make, alt.vehicle_model)

  return (
    <li>
      <Link
        href={profileHref}
        prefetch
        aria-label={`View ${alt.business_name}'s profile`}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl active:scale-[0.99] transition"
        style={{
          background: '#FFFFFF',
          border: `1px solid ${BORDER}`,
          minHeight: 64,
        }}
      >
        {/* Vehicle photo + online dot. Renders the system-controlled
            stock image for the alt's make+model so the cards match the
            main showcase quality — never the driver's uploaded
            headshot. `alt=""` because the business name text below
            already announces the driver. */}
        <div className="shrink-0 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={altShowcasePhoto}
            alt=""
            className="w-12 h-12 rounded-full object-cover"
            style={{ border: `1px solid ${BORDER}`, background: INPUT_BG }}
          />
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
            style={{
              background: '#22C55E',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 6px rgba(34,197,94,0.65)',
            }}
          />
        </div>

        {/* Middle — name + distance/area + their own rate */}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold truncate" style={{ color: TEXT_INK }}>
            {alt.business_name}
          </div>
          <div className="text-[12px] truncate mt-0.5" style={{ color: TEXT_MUTED }}>
            {distanceKm != null
              ? <>{distanceKm.toFixed(1)} km from pickup</>
              : (alt.area || alt.city || 'Online')}
          </div>
          {showRate && (
            <div className="text-[12px] font-extrabold mt-0.5" style={{ color: '#854D0E' }}>
              From {idr(alt.min_fee!)} · {idr(alt.price_per_km!)}/km
            </div>
          )}
        </div>

        {/* Right — chevron hint. Replaces the old Book pill; the whole
            row IS the link now (BOOK NOW lives on the profile). */}
        <span
          className="shrink-0 inline-flex items-center justify-center"
          style={{ color: TEXT_MUTED }}
          aria-hidden
        >
          <MapPin className="w-4 h-4" strokeWidth={2.5} />
        </span>
      </Link>
    </li>
  )
}

// -----------------------------------------------------------------------------
// ReviewsPanel — direct port of the beautician page's ReviewsPanel,
// adapted for the driver vertical. Renders the existing reviews list +
// an inline Leave-Review form. Submits to /api/reviews with
// provider_type: 'driver' + provider_id: driver.id. Brand-yellow accents
// (no per-provider theme prop) so it slots into both /r and /car.
// -----------------------------------------------------------------------------
function ReviewsPanel({
  providerId, reviews, loading, onSubmitted,
}: {
  providerId:  string
  reviews:     Review[]
  loading:     boolean
  onSubmitted: () => void
}) {
  const [formOpen, setFormOpen]     = useState(false)
  const [stars, setStars]           = useState(0)
  const [name, setName]             = useState('')
  const [comment, setComment]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState<string | null>(null)

  const visible = reviews ?? []
  const avg = visible.length === 0
    ? 0
    : visible.reduce((s, r) => s + r.rating, 0) / visible.length

  async function submit() {
    setErr(null)
    if (!providerId) { setErr('Driver profile not loaded yet.'); return }
    if (stars < 1 || stars > 5) { setErr('Pick a 1-5 star rating.'); return }
    if (!name.trim())           { setErr('Please enter your name.'); return }
    if (comment.trim().length > 600) { setErr('Review max 600 characters.'); return }
    setSubmitting(true)
    try {
      const sessionId = readOrMakeReviewSessionId()
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_type: 'driver',
          provider_id:   providerId,
          reviewer_name: name.trim(),
          rating:        stars,
          comment:       comment.trim() || undefined,
          session_id:    sessionId,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j?.error || 'Failed to submit review.'); return }
      // Reset + close + refetch via parent.
      setStars(0); setName(''); setComment(''); setFormOpen(false)
      onSubmitted()
    } catch {
      setErr('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-2" style={{ marginTop: 16 }}>
      {!formOpen && (
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_INK }}>
            Reviews
          </h2>
          <div className="text-[12px] font-bold" style={{ color: TEXT_MUTED }}>
            <span className="font-black text-[14px]" style={{ color: TEXT_INK }}>
              {avg > 0 ? avg.toFixed(1) : '—'}
            </span>
            {' · '}{visible.length} {visible.length === 1 ? 'review' : 'reviews'}
          </div>
        </div>
      )}

      {/* Inline review form — opened by the "Leave a review" CTA below
          the list. Renders directly on the page background (no card
          wrapper) so it doesn't feel like a nested popup. */}
      {formOpen && (
        <div className="space-y-2.5 px-1 pt-1">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-extrabold" style={{ color: TEXT_INK }}>Leave a review</div>
            <button
              type="button"
              onClick={() => { setFormOpen(false); setErr(null) }}
              aria-label="Close form"
              className="rounded-full flex items-center justify-center shadow-sm active:scale-[0.95] transition"
              style={{
                background: BRAND_YELLOW, color: TEXT_INK,
                minWidth: 44, minHeight: 44,
              }}
            >
              <XIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* 5-star picker — unselected stars are gray; selected stars
              turn solid yellow so the chosen rating is unambiguous. */}
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const filled = i < stars
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStars(i + 1)}
                  aria-label={`Rate ${i + 1} star${i ? 's' : ''}`}
                  className="active:scale-[0.9] transition flex items-center justify-center"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  <Star
                    className="w-7 h-7 transition-colors"
                    strokeWidth={1.5}
                    fill={filled ? BRAND_YELLOW : '#D1D5DB'}
                    style={{ color: filled ? BRAND_YELLOW : '#9CA3AF' }}
                  />
                </button>
              )
            })}
          </div>

          <input
            type="text"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg px-3 text-[13px] focus:outline-none"
            style={{
              minHeight: 44,
              background: '#FFFFFF',
              border: `1px solid ${BORDER}`,
              color: TEXT_INK,
            }}
          />
          <div className="space-y-1">
            <textarea
              value={comment}
              maxLength={600}
              rows={4}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (max 600 characters)"
              className="w-full rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none"
              style={{
                background: '#FFFFFF',
                border: `1px solid ${BORDER}`,
                color: TEXT_INK,
              }}
            />
            <div className="text-[12px] text-right" style={{ color: TEXT_MUTED }}>
              {comment.length}/600
            </div>
          </div>

          {err && (
            <div
              className="rounded-md text-[12px] px-2 py-1.5"
              style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}
            >
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center rounded-full font-extrabold disabled:opacity-60 active:scale-[0.98] transition"
            style={{
              minHeight: 48,
              background: BRAND_YELLOW, color: TEXT_INK,
              border: `1px solid ${BRAND_YELLOW}`,
              fontSize: 13,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      )}

      {/* List + Leave-Review CTA — hidden while the inline form is open. */}
      {!formOpen && (
        <>
          <div className="space-y-2 pr-1">
            {loading && visible.length === 0 && (
              <div className="text-[12px] italic" style={{ color: TEXT_MUTED }}>Loading reviews…</div>
            )}
            {!loading && visible.length === 0 && (
              <div
                className="rounded-xl p-4 text-center"
                style={{ background: '#FAFAFA', border: `1px solid ${BORDER}` }}
              >
                <div className="text-[12px]" style={{ color: TEXT_MUTED }}>
                  No reviews yet. Be the first to leave one.
                </div>
              </div>
            )}
            {visible.map((r) => (
              <div
                key={r.id}
                className="rounded-xl p-3 space-y-1.5"
                style={{ background: '#FAFAFA', border: `1px solid ${BORDER}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black shrink-0"
                      style={{ background: BRAND_YELLOW, color: TEXT_INK }}
                    >
                      {r.reviewer_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-extrabold truncate" style={{ color: TEXT_INK }}>
                        {r.reviewer_name}
                      </div>
                      <div className="text-[12px]" style={{ color: TEXT_MUTED }}>
                        {formatReviewWhen(r.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className="w-3 h-3"
                        strokeWidth={0}
                        fill={j < r.rating ? BRAND_YELLOW : '#E5E7EB'}
                        style={{ color: j < r.rating ? BRAND_YELLOW : '#E5E7EB' }}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-[13px] leading-snug" style={{ color: TEXT_SECOND }}>
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Leave Review CTA — opens the inline form above. */}
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-full font-extrabold uppercase tracking-wider active:scale-[0.98] transition"
            style={{
              marginTop: 12,
              minHeight: 48,
              background: BRAND_YELLOW, color: TEXT_INK,
              border: `1px solid ${BRAND_YELLOW}`,
              fontSize: 13,
              boxShadow: '0 8px 18px rgba(250,204,21,0.35)',
            }}
          >
            <Star className="w-4 h-4" strokeWidth={0} fill={TEXT_INK} />
            Leave a review
          </button>
        </>
      )}
    </section>
  )
}

// -----------------------------------------------------------------------------
// Stable per-browser session id for review dedup. Reused across leave-
// review submissions; the API rejects same-session-same-provider dupes.
// Copied verbatim from beautician/[slug]/page.tsx so both verticals
// share the same `cr-review-sid` localStorage key (a customer who has
// reviewed multiple providers stays the same anonymous identity).
// -----------------------------------------------------------------------------
function readOrMakeReviewSessionId(): string {
  try {
    let v = localStorage.getItem('cr-review-sid')
    if (!v) {
      v = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `sid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('cr-review-sid', v)
    }
    return v
  } catch { return `sid-${Date.now()}` }
}

// -----------------------------------------------------------------------------
// Human-readable relative time for review timestamps. Copied verbatim
// from beautician/[slug]/page.tsx for byte-for-byte format parity.
// -----------------------------------------------------------------------------
function formatReviewWhen(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const m = Math.floor(ms / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
