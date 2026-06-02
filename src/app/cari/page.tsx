'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Compass,
  MapPin,
  Package,
  Plus,
  Star,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import DriverDotsOverlay from '@/components/cari/DriverDotsOverlay'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useCountryFromCoords } from '@/hooks/useCountryFromCoords'
import { useHaptic } from '@/hooks/useHaptic'
import { fetchRoadDistanceKm, instantRoadDistance, type RoadDistance } from '@/lib/geo/route-distance'
import { haversineKm } from '@/lib/geo/haversine'
import { logNav } from '@/lib/perf/navTiming'
import { fetchActiveDriversBrowser } from '@/lib/drivers/queries'
import { isHourlyTimeAvailable, HOURLY_TIERS } from '@/lib/pricing/hourlyHire'
import { buildBookingWaLink } from '@/lib/whatsapp/buildBookingMessage'
import { fireConnectIntent } from '@/lib/connectIntent'
import type { Rider, ServiceType } from '@/types/rider'
import { getBikeImageUrl } from '@/data/bikeImages'
import { getCarImageUrl, GENERIC_CAR_FALLBACK } from '@/data/carImages'
import { getJeepImageUrl } from '@/data/jeepImages'
import { getBusImageUrl } from '@/data/busImages'

// ============================================================================
// /cari — Card-based booking page (full redesign 2026-05-27)
// ----------------------------------------------------------------------------
// REPLACES the fullscreen-map + bottom-sheet layout. The map became a static
// image background; the active widget is a white container floating over it
// with pickup/dropoff inputs, a vehicle toggle (Car/Bike), an inline driver
// list, and the Citypass promo. The Find-my-ride CTA sits OUTSIDE the
// container as a primary action terminus.
//
// Compliance posture: CityDrivers is a software directory (PM 12/2019). The
// driver cards label fares as "From Rp X" — never as a calculated trip
// price. A persistent disclaimer sits under the CTA.
//
// ⚠ HARD POLICY — NO PAYMENTS / NO CART ON CITYRIDERS SURFACES ⚠
// Founder decision 2026-05-29: this page (and every driver/rider surface
// — `/r/[slug]`, `/car/[slug]`, `/bus/[slug]`, `/cari/rider`, the rental
// flows, DriverProfileShell, RentalDriverCard) MUST NOT import or use
// VendorCartButton, VendorCartSheet, useVendorCart, or any cart helper.
// MUST NOT add `payment_provider` to the drivers / mock_drivers tables.
// MUST NOT add 'driver' / 'car_driver' / 'bike_rider' / 'rental' to the
// /api/checkout VENDOR_TABLES allowlist.
//
// Why: Indonesian Permenhub 118/2018 classifies platforms that "arrange
// transport" — especially those that handle fare collection — as
// transport aplikators (Gojek/Grab category). That triggers licensing,
// KIR inspection, cooperative routing, commission caps, and OJK fintech
// regs. CityDrivers deliberately sits in the lighter "directory + driver
// SaaS" lane: drivers pay a flat subscription, the platform never moves
// money, customers and drivers transact privately over WhatsApp.
//
// Service marketplace verticals (beautician, facial, skincare, future
// handyman/laundry/massage/home-clean propagation) are a DIFFERENT
// regulatory category and CAN use the payment plumbing. This restriction
// applies ONLY to ride / transport surfaces.
// ============================================================================

// Per-service placeholder key map — resolves to translated copy via the
// `cari` namespace at render time so deep-links from /places and other
// entry points still read naturally in the active locale.
const PLACEHOLDER_KEYS: Record<ServiceType, { pickup: string; dropoff: string }> = {
  person: { pickup: 'placeholderPersonPickup', dropoff: 'placeholderPersonDropoff' },
  parcel: { pickup: 'placeholderParcelPickup', dropoff: 'placeholderParcelDropoff' },
  food:   { pickup: 'placeholderFoodPickup',   dropoff: 'placeholderFoodDropoff' },
  car:    { pickup: 'placeholderCarPickup',    dropoff: 'placeholderCarDropoff' },
  bus:    { pickup: 'placeholderBusPickup',    dropoff: 'placeholderBusDropoff' },
  truck:  { pickup: 'placeholderTruckPickup',  dropoff: 'placeholderTruckDropoff' },
  jeep:   { pickup: 'placeholderJeepPickup',   dropoff: 'placeholderJeepDropoff' },
}

function parseService(raw: string | null): ServiceType {
  if (
    raw === 'person' || raw === 'parcel' || raw === 'food' ||
    raw === 'car'    || raw === 'bus'    || raw === 'truck' || raw === 'jeep'
  ) return raw
  // Default to 'car'. Legacy entries (?service=person|parcel|food) still
  // resolve correctly to the bike side via the vehicleType derivation.
  return 'car'
}

// `mode` is the new top-of-page axis the customer toggles:
//   ride   → "Book a ride" (passenger transport)
//   parcel → "Send a parcel" (parcel courier)
// Persists in the URL as ?mode=ride|parcel, default 'ride'. Combines
// with the existing vehicle (Car / Bike) axis below it.
type BookingMode = 'ride' | 'parcel'
function parseMode(raw: string | null): BookingMode {
  return raw === 'parcel' ? 'parcel' : 'ride'
}

// Recent-places localStorage cache (same shape as the old /cari so the
// store is shared and doesn't reset between deploys).
const RECENT_PLACES_KEY = 'citydrivers:recent-places:v1'
const RECENT_PLACES_CAP = 10

type RecentPlace = { lat: number; lng: number; label: string; usedAt: number }

function useRecentPlaces() {
  const [recents, setRecents] = useState<RecentPlace[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_PLACES_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const safe = parsed.filter(
          (p): p is RecentPlace =>
            typeof p?.lat === 'number' &&
            typeof p?.lng === 'number' &&
            typeof p?.label === 'string' &&
            typeof p?.usedAt === 'number',
        )
        setRecents(safe.slice(0, RECENT_PLACES_CAP))
      }
    } catch {
      /* fail silent — recents are a nice-to-have, never a blocker */
    }
  }, [])

  const addRecent = useCallback((place: { lat: number; lng: number; label: string }) => {
    if (!place.label || !place.label.trim()) return
    setRecents((prev) => {
      const cleanedLabel = place.label.trim()
      const filtered = prev.filter(
        (p) => p.label.toLowerCase() !== cleanedLabel.toLowerCase(),
      )
      const next: RecentPlace[] = [
        { lat: place.lat, lng: place.lng, label: cleanedLabel, usedAt: Date.now() },
        ...filtered,
      ].slice(0, RECENT_PLACES_CAP)
      try {
        localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(next))
      } catch {
        /* fail silent — quota exceeded or private mode */
      }
      return next
    })
  }, [])

  return { recents, addRecent }
}

// Next 15 requires any component that calls useSearchParams() to live
// under a <Suspense> boundary — otherwise the whole route bails out at
// build time and the dev server errors out on refresh.
export default function PlanTripPage() {
  return (
    <Suspense fallback={null}>
      <PlanTripPageInner />
    </Suspense>
  )
}

function PlanTripPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const t = useTranslations('cari')
  // autoRequest=false — defer the browser GPS prompt until the user
  // explicitly taps a control. Mirrors the old /cari behaviour.
  const geo = useGeolocation(false)
  const haptic = useHaptic()
  const { recents, addRecent } = useRecentPlaces()

  // Optional ?pLat=&pLng=&dLat=&dLng= handoff — pre-fills pickup +
  // destination so deep-links from /places, /car, etc. land with values
  // ready and the customer only has to confirm.
  const initialDropoffLat = parseFloat(params.get('dLat') ?? '')
  const initialDropoffLng = parseFloat(params.get('dLng') ?? '')
  const hasInitialDropoff =
    Number.isFinite(initialDropoffLat) && Number.isFinite(initialDropoffLng)
  const initialPickupLat = parseFloat(params.get('pLat') ?? '')
  const initialPickupLng = parseFloat(params.get('pLng') ?? '')
  const hasInitialPickup =
    Number.isFinite(initialPickupLat) && Number.isFinite(initialPickupLng)

  const [pickup, setPickup] = useState<GeoPoint | null>(
    hasInitialPickup ? { lat: initialPickupLat, lng: initialPickupLng, accuracyM: 0 } : null,
  )
  const [dropoff, setDropoff] = useState<GeoPoint | null>(
    hasInitialDropoff ? { lat: initialDropoffLat, lng: initialDropoffLng, accuracyM: 0 } : null,
  )
  const [pickupLabel, setPickupLabel] = useState(params.get('pName') ?? '')
  const [dropoffLabel, setDropoffLabel] = useState(params.get('dName') ?? '')
  const [pitstopOpen, setPitstopOpen] = useState(false)
  const [pitstopNote, setPitstopNote] = useState('')

  // service comes from the URL (?service=) and drives the vehicle toggle.
  // New default is 'car' so the toggle lands on Car first per spec; the
  // Bike legacy mappings (person/parcel/food → Bike side) still resolve.
  const service: ServiceType = parseService(params.get('service'))
  // Map customer-facing service → DB vehicle_type discriminator used by
  // the driver query. Bike is the catch-all for any service that doesn't
  // map to its own vehicle category (person/parcel/food are all bikes).
  const vehicleType: 'bike' | 'car' | 'minibus' | 'truck' | 'jeep' =
    service === 'car'   ? 'car'
    : service === 'bus' ? 'minibus'
    : service === 'truck' ? 'truck'
    : service === 'jeep'  ? 'jeep'
    : 'bike'
  const mode: BookingMode = parseMode(params.get('mode'))

  // perf instrumentation
  useEffect(() => { logNav('cari:mount') }, [])

  // Auto-fill pickup with customer GPS on grant (kept from old /cari).
  useEffect(() => {
    if (geo.coords && !pickup) {
      setPickup(geo.coords)
      if (!pickupLabel) setPickupLabel(t('myLocation'))
    }
  }, [geo.coords, pickup, pickupLabel, t])

  // Road-distance preview — still useful for the driver-card ETA line
  // even without a visible polyline. Renders instantly with haversine ×
  // 1.3 then upgrades to the OSRM value when the proxy responds.
  const [tripRoute, setTripRoute] = useState<RoadDistance | null>(null)
  useEffect(() => {
    if (!pickup || !dropoff) {
      setTripRoute(null)
      return
    }
    setTripRoute(instantRoadDistance(pickup, dropoff))
    let cancelled = false
    fetchRoadDistanceKm(pickup, dropoff).then((r) => {
      if (!cancelled) setTripRoute(r)
    })
    return () => { cancelled = true }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng])
  const tripKm = tripRoute?.km ?? null
  const canSearch = !!pickup && !!dropoff

  // Lowest published driver fare in the area + count (same /api/drivers/
  // lowest-fare endpoint we used before — refetches on pickup change).
  const [lowestFareIdr, setLowestFareIdr] = useState<number | null>(null)
  const [nearbyCount, setNearbyCount] = useState<number | null>(null)
  const queryCoords = pickup ?? geo.coords ?? null
  const queryLat = queryCoords?.lat ?? null
  const queryLng = queryCoords?.lng ?? null
  useEffect(() => {
    if (queryLat == null || queryLng == null) return
    const ctrl = new AbortController()
    const params = new URLSearchParams({
      lat: queryLat.toFixed(4),
      lng: queryLng.toFixed(4),
      radiusKm: '30',
      vehicleType,
    })
    fetch(`/api/drivers/lowest-fare?${params}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { lowestFareIdr: number | null; driverCount: number | null } | null) => {
        if (!d) return
        if (typeof d.lowestFareIdr === 'number') setLowestFareIdr(d.lowestFareIdr)
        if (typeof d.driverCount === 'number') setNearbyCount(d.driverCount)
      })
      .catch(() => { /* silent — UI gracefully omits price */ })
    return () => ctrl.abort()
  }, [queryLat, queryLng, vehicleType])

  // Inline driver list for the new layout. Fetched once per vehicleType
  // flip; the list re-renders against the active toggle without needing
  // a server round-trip beyond the initial pull.
  const [drivers, setDrivers] = useState<Rider[]>([])
  const [driversLoading, setDriversLoading] = useState(false)
  useEffect(() => {
    let cancelled = false
    setDriversLoading(true)
    fetchActiveDriversBrowser(vehicleType)
      .then((rows) => {
        if (cancelled) return
        setDrivers(rows)
      })
      .catch(() => {
        if (cancelled) return
        setDrivers([])
      })
      .finally(() => {
        if (cancelled) return
        setDriversLoading(false)
      })
    return () => { cancelled = true }
  }, [vehicleType])

  // Visible-drivers filter — combines the vehicle axis (Car/Bike, already
  // applied at fetch time) with the new mode axis (Ride/Parcel). For
  // bike+parcel we require the driver to have opted into 'parcel'
  // service. For car+parcel we don't filter — most car drivers can take
  // a parcel job; the customer signals intent via the WhatsApp message
  // prefix. For ride mode we don't filter either (drivers without an
  // explicit 'person' service still get bookings via direct contact).
  // Hourly-hire filter — when the customer arrives here from a driver
  // profile whose working window didn't fit, the URL carries
  // ?hourlyTier=3h|6h|8h & ?hourlyDate & ?hourlyTime. We narrow the
  // list to drivers of the same vehicle type whose working window
  // accommodates the requested interval. Mocks (hourly_enabled == null)
  // are always treated as available so the demo surface stays populated.
  const hourlyFilter = useMemo(() => {
    const tier = params.get('hourlyTier')
    const date = params.get('hourlyDate')
    const time = params.get('hourlyTime')
    if (!tier || !date || !time) return null
    const hours = tier === '8h' ? 8 : tier === '6h' ? 6 : 3
    return { tier, date, time, hours }
  }, [params])

  const visibleDrivers = useMemo(() => {
    let list = drivers
    if (mode === 'parcel' && vehicleType === 'bike') {
      list = list.filter((d) => d.services?.includes('parcel'))
    }
    if (hourlyFilter) {
      list = list.filter((d) => {
        const isMock = d.isMock === true
        const enabled = d.hourlyEnabled === true
        if (!enabled && !isMock) return false
        return isHourlyTimeAvailable({
          workingHoursStart: d.workingHoursStart ?? null,
          workingHoursEnd:   d.workingHoursEnd ?? null,
          startTime:         hourlyFilter.time,
          tierHours:         hourlyFilter.hours,
        })
      })
    }
    return list
  }, [drivers, mode, vehicleType, hourlyFilter])

  // Count of vehicles online RIGHT NOW for the header pill. Combines
  // real drivers (drivers_public, availability='online') and the
  // visible mock pool — so customers always see a credible "X
  // vehicles online" figure regardless of real supply ramp. Re-derives
  // whenever the customer flips Car/Bike or Ride/Parcel.
  const onlineCount = useMemo(
    () => visibleDrivers.filter((d) => d.isOnline || d.availability === 'online').length,
    [visibleDrivers],
  )
  const busyCount = useMemo(
    () => visibleDrivers.filter((d) => d.availability === 'busy').length,
    [visibleDrivers],
  )

  // Sort by distance-to-customer (fastest first), break ties with
  // min_fee ascending (cheapest after that). When the customer hasn't
  // typed a pickup AND hasn't granted GPS, fall back to fee-only sort
  // so the list still feels intentional. Also derive the fastest +
  // cheapest IDs so the card row can render the matching badges in
  // the top-right corner.
  const customerOrigin = useMemo(
    () => pickup ?? geo.coords ?? null,
    [pickup, geo.coords],
  )
  const sortedDrivers = useMemo(() => {
    if (visibleDrivers.length === 0) return visibleDrivers
    const withDist = visibleDrivers.map((d) => {
      const dist = customerOrigin && d.lat && d.lng
        ? haversineKm({ lat: customerOrigin.lat, lng: customerOrigin.lng }, { lat: d.lat, lng: d.lng })
        : Number.POSITIVE_INFINITY
      const fee = d.minFee ?? d.pricePerKm ?? Number.POSITIVE_INFINITY
      return { d, dist, fee }
    })
    withDist.sort((a, b) => {
      if (a.dist !== b.dist) return a.dist - b.dist
      return a.fee - b.fee
    })
    return withDist.map((x) => x.d)
  }, [visibleDrivers, customerOrigin])

  const fastestId = useMemo(() => {
    if (!customerOrigin) return null
    let best: { id: string; dist: number } | null = null
    for (const d of visibleDrivers) {
      if (!d.lat || !d.lng) continue
      const km = haversineKm({ lat: customerOrigin.lat, lng: customerOrigin.lng }, { lat: d.lat, lng: d.lng })
      if (!Number.isFinite(km)) continue
      if (!best || km < best.dist) best = { id: d.id, dist: km }
    }
    return best?.id ?? null
  }, [visibleDrivers, customerOrigin])

  const cheapestId = useMemo(() => {
    let best: { id: string; fee: number } | null = null
    for (const d of visibleDrivers) {
      const fee = d.minFee ?? d.pricePerKm ?? null
      if (fee == null || !Number.isFinite(fee)) continue
      if (!best || fee < best.fee) best = { id: d.id, fee }
    }
    return best?.id ?? null
  }, [visibleDrivers])

  // Selection state for the cheapest-by-default booking pattern. /cari
  // is the ride / parcel surface — speed-driven (Gojek/Grab style: pick
  // cheapest, tap one button, go). The other 8 lifestyle marketplaces
  // keep the profile-first pattern because trust matters more than
  // speed there. Here the card body SELECTS the driver and a single
  // sticky CTA at the bottom opens that selected driver's WhatsApp.
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)

  // Auto-select the cheapest driver as soon as the list lands. Cheapest
  // = lowest min_fee (the published "From Rp X" headline). When min_fee
  // is missing we fall back to price_per_km — keeps the surface usable
  // for drivers who only set a per-km rate. Guard against racing the
  // fetch by waiting for drivers.length > 0, AND only auto-select when
  // nothing is selected yet so customer choices stick across re-renders
  // (e.g., the lowest-fare endpoint refetching, drivers refreshing).
  useEffect(() => {
    if (selectedDriverId !== null) return
    if (visibleDrivers.length === 0) return
    let cheapest: Rider | null = null
    let cheapestFee = Number.POSITIVE_INFINITY
    for (const d of visibleDrivers) {
      const fee = d.minFee ?? d.pricePerKm ?? null
      if (fee == null || !Number.isFinite(fee)) continue
      if (fee < cheapestFee) {
        cheapestFee = fee
        cheapest = d
      }
    }
    // Final fallback: if no driver had a usable fee, select the first
    // one in the list so the BOOK NOW CTA still renders.
    const pick = cheapest ?? visibleDrivers[0]
    if (pick) setSelectedDriverId(pick.id)
  }, [visibleDrivers, selectedDriverId])

  // Reset selection when the mode flips and the previously-selected
  // driver is no longer visible — otherwise the sticky CTA would book
  // someone the customer isn't looking at.
  useEffect(() => {
    if (!selectedDriverId) return
    if (!visibleDrivers.find((d) => d.id === selectedDriverId)) {
      setSelectedDriverId(null)
    }
  }, [visibleDrivers, selectedDriverId])

  const selectedDriver = useMemo(
    () => visibleDrivers.find((d) => d.id === selectedDriverId) ?? null,
    [visibleDrivers, selectedDriverId],
  )

  // Detect user country for the autocomplete bias (unchanged).
  const userCountry = useCountryFromCoords(geo.coords ?? null)
  const countryCodes = useMemo(() => (userCountry ? [userCountry] : []), [userCountry])

  // Swap pickup ↔ dropoff — both coords and the typed labels swap so the
  // visual order matches what the customer sees in the inputs.
  function handleSwap() {
    haptic.tap()
    setPickup(dropoff)
    setDropoff(pickup)
    setPickupLabel(dropoffLabel)
    setDropoffLabel(pickupLabel)
  }

  // Driver cards SELECT a driver (cheapest is auto-selected on mount —
  // see the useEffect above). A single sticky BOOK NOW CTA at the
  // bottom of the container opens the SELECTED driver's WhatsApp with
  // a prefilled trip message. Each card also carries a small Profile →
  // pill for customers who want to vet a specific driver before
  // tapping BOOK NOW. This is /cari-only — the lifestyle marketplaces
  // keep the profile-first pattern.

  // Compose the WhatsApp deep-link body for the sticky CTA. Pickup +
  // dropoff come from the typed inputs at the top of the page — we
  // intentionally avoid embedding geocoded coords here so the message
  // matches what the customer wrote (no surprise "wrong street"
  // dispatches). Returns '' when the driver's number is unusable —
  // caller falls back to disabling the CTA.
  function buildSelectedWhatsAppLink(d: Rider): string {
    return buildBookingWaLink({
      driver: {
        business_name: d.name,
        whatsapp_e164: d.whatsappE164 ?? null,
      },
      mode,
      pickup: {
        label: pickupLabel,
        coord: pickup ? { lat: pickup.lat, lng: pickup.lng } : null,
      },
      dropoff: {
        label: dropoffLabel,
        coord: dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : null,
      },
      pitstop: pitstopOpen && pitstopNote.trim()
        ? { note: pitstopNote }
        : null,
      tripKm,
    })
  }

  // Legacy "View drivers" navigation is kept available for deep-link
  // compatibility with anything that still POSTs `/cari?p..&d..` and
  // expects the rider-list page to follow — not wired to a visible CTA
  // in the new layout, but preserved so /cari/rider deep-links don't
  // break.
  function handleSearch() {
    if (!canSearch) return
    logNav('cari:view-drivers')
    haptic.impact()
    const vehicleTypeForRider = vehicleType
    const sp = new URLSearchParams({
      pLat: pickup!.lat.toString(),
      pLng: pickup!.lng.toString(),
      pName: pickupLabel || t('myLocation'),
      dLat: dropoff!.lat.toString(),
      dLng: dropoff!.lng.toString(),
      dName: dropoffLabel || t('destinationDefault'),
    })
    if (pitstopOpen && pitstopNote.trim()) sp.set('stop', pitstopNote.trim())
    sp.set('filter', service)
    sp.set('vehicleType', vehicleTypeForRider)
    router.push(`/cari/rider?${sp.toString()}`)
  }
  void handleSearch // referenced for future deep-link wiring; quietens unused-fn lint

  // ───────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────
  return (
    <main
      className="relative min-h-[100dvh]"
      style={{
        // Soft cream backdrop on desktop frames the centred phone-style
        // booking app. Invisible on mobile (full-width content).
        background:
          'radial-gradient(circle at top, #FEF3C7 0%, #F5F5F4 70%, #E7E5E4 100%)',
      }}
    >
      {/* Phone-frame on desktop — matches /cityriders, /drivers,
          /drivers/car. The 480px frame becomes the positioning context
          for the fixed children below (hero bg, booking container) on
          desktop via a no-op translateZ transform applied via the
          .cari-frame CSS rule below — putting `transform` on the element
          makes it a containing block for `position: fixed` descendants
          per CSS spec, so they stay inside the frame instead of the
          full viewport. The .cari-fixed → absolute swap completes the
          handoff. */}
      <div className="cari-frame relative lg:my-6 lg:mx-auto lg:max-w-[480px] lg:rounded-[32px] lg:shadow-[0_24px_80px_rgba(10,10,10,0.18)] lg:overflow-hidden lg:bg-white">
      {/* Custom yellow scrollbar for the driver list — thin rail, short
          rounded thumb. Hits both WebKit (Chrome/Safari/Edge) and Firefox.
          `min-height` on the thumb keeps it visible even on very tall
          lists where it'd otherwise compress to a sliver. */}
      <style>{`
        .cari-driver-scroll {
          scrollbar-width: thin;
          scrollbar-color: #FACC15 transparent;
        }
        .cari-driver-scroll::-webkit-scrollbar { width: 6px; }
        .cari-driver-scroll::-webkit-scrollbar-track { background: transparent; }
        .cari-driver-scroll::-webkit-scrollbar-thumb {
          background-color: #FACC15;
          border-radius: 9999px;
          min-height: 36px;
        }
        .cari-driver-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #EAB308;
        }
        /* On lg+, make the phone-frame a containing block for fixed
           children so the hero map background and the booking sheet
           stay inside the frame rather than the full viewport. */
        @media (min-width: 1024px) {
          .cari-frame {
            transform: translateZ(0);
            height: calc(100dvh - 48px);
          }
          .cari-frame .cari-fixed {
            position: absolute !important;
          }
        }
      `}</style>

      {/* HERO MAP IMAGE — fixed full-viewport background, sits at z-0
          behind the header (z-30) and the bottom-anchored 70vh booking
          container (z-20). The ~30vh gap above the white container is
          where this illustration reads through, with the pickup/dropoff
          map icons + route line displaying as an overlay on it.
          `background-position: center -120px` lifts the composition's
          focal area into that visible band (founder direction from the
          original implementation). On desktop the `cari-fixed` rule
          swaps fixed → absolute so it anchors inside the phone frame. */}
      <div
        className="cari-fixed fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url("https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2006_53_11%20AM.png")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center -120px',
          backgroundRepeat: 'no-repeat',
        }}
        aria-hidden
      >
        {/* Live availability dots — yellow (online) + red (busy). Count
            varies by hour: few in early morning, many in afternoon /
            evening. See DriverDotsOverlay header for the schedule. */}
        <DriverDotsOverlay onlineCount={onlineCount} busyCount={busyCount} />

        {/* Pickup + dropoff pin overlay + animated dashed route line.
            Pins are founder-supplied PNG art. Route is an SVG path with
            cubic-bezier control points so it reads as a "real" turning
            route (not a straight ruler), gradient stroke from black at
            the pickup end to yellow at the dropoff end, and an animated
            stroke-dashoffset for the "running" marching-ants effect. */}
      </div>

      {/* PICKUP + DROPOFF PIN OVERLAY — hoisted OUT of the hero (z-0)
          stacking context into its own z-25 fixed layer so the pins +
          animated route line render ABOVE the booking container (z-20)
          but BELOW the header (z-30). Pointer-events disabled so taps
          pass through to the map / booking sheet underneath. */}
      {(pickupLabel.trim().length > 0 || dropoffLabel.trim().length > 0) && (
        <div
          className="cari-fixed fixed inset-0 z-[25] pointer-events-none"
          aria-hidden
        >
          {pickupLabel.trim().length > 0 && (
            <div
              className="absolute"
              style={{ left: '18%', top: '14%', transform: 'translate(-50%, -100%)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2002_38_07%20PM.png"
                alt=""
                className="h-14 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.55))' }}
              />
            </div>
          )}

          {dropoffLabel.trim().length > 0 && (
            <div
              className="absolute"
              style={{ left: '82%', top: '20%', transform: 'translate(-50%, -100%)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2002_40_21%20PM.png"
                alt=""
                className="h-14 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.55))' }}
              />
            </div>
          )}

          {pickupLabel.trim().length > 0 && dropoffLabel.trim().length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="cariRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#0A0A0A" />
                  <stop offset="55%"  stopColor="#0A0A0A" />
                  <stop offset="80%"  stopColor="#FACC15" />
                  <stop offset="100%" stopColor="#FACC15" />
                </linearGradient>
              </defs>
              {/* Route path runs across the upper hero band (between the
                  two pins at y=14% → 20%). Cubic bezier inflections give
                  it the right-straight-left rhythm of a real route. */}
              <path
                d="M 18 14 C 30 8, 40 22, 50 16 S 70 26, 82 20"
                stroke="url(#cariRouteGrad)"
                strokeWidth="0.9"
                strokeDasharray="2.4 1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))' }}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-8"
                  dur="0.9s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          )}
        </div>
      )}

      {/* HEADER — CityDrivers brand mark on the left, nearby pill on the
          right. Logo + wordmark style matches the /cityriders, /drivers,
          and /drivers/car landings so the whole family reads consistent. */}
      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/cityriders"
            className="inline-flex items-center gap-2 hover:opacity-85 active:scale-[0.97] transition"
            aria-label={t('homeAria')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351"
              alt=""
              className="w-11 h-11 rounded-xl"
              style={{ boxShadow: '0 2px 8px rgba(10,10,10,0.18)' }}
            />
            <span
              className="font-black tracking-tight text-[20px] sm:text-[22px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              CityDrivers
            </span>
          </Link>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: '#FACC15',
              border: '1.5px solid #EAB308',
              boxShadow: '0 6px 16px rgba(15,23,42,0.18)',
              minHeight: 32,
            }}
          >
            <span className="relative inline-flex items-center justify-center" style={{ width: 12, height: 12 }}>
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(34,197,94,0.55)',
                  animation: 'ridePing 2.2s ease-out infinite',
                }}
              />
              <span
                aria-hidden
                className="absolute rounded-full"
                style={{
                  width: 8, height: 8,
                  background: '#16A34A',
                  boxShadow: '0 0 6px rgba(34,197,94,0.95), 0 0 0 1.5px #FFFFFF',
                }}
              />
            </span>
            <span
              className="text-[12.5px] font-extrabold uppercase tracking-wider tabular-nums"
              style={{ color: '#0A0A0A' }}
            >
              {driversLoading && onlineCount === 0
                ? t('statusLoading')
                : onlineCount === 0
                  ? vehicleType === 'car' ? t('statusNoCars') : t('statusNoRiders')
                  : vehicleType === 'car'
                    ? (onlineCount === 1
                        ? t('statusOnlineCar', { count: onlineCount })
                        : t('statusOnlineCarPlural', { count: onlineCount }))
                    : (onlineCount === 1
                        ? t('statusOnlineBike', { count: onlineCount })
                        : t('statusOnlineBikePlural', { count: onlineCount }))}
            </span>
          </div>
        </div>
      </header>

      {/* BOOKING CONTAINER — white card sized at 70% of the viewport
          height, FIXED to the bottom edge of the screen. The ~30% gap
          above is the HERO area where the static map image (page
          background) shows through under the header. Container bleeds
          flush to the bottom and rounds only on the top corners so it
          reads as a panel emerging from the footer. 15px horizontal
          insets from the screen edges. */}
      <div
        className="cari-fixed fixed left-0 right-0 bottom-0 z-20"
        style={{ paddingLeft: 15, paddingRight: 15 }}
      >
        <div
          className="mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden w-full"
          style={{ height: '70vh', maxWidth: 640 }}
        >
          <div className="flex flex-col h-full p-4 sm:p-5 pb-safe">
            {/* ROW 1 — Header bar: mode icon + "Where to?" + Add Stop.
                The mode icon (UserRound for Ride, Package for Parcel) is
                the passive indicator now that the explicit toggle moved
                to /cityriders. Tinted yellow so it visually anchors the
                page intent at a glance. */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <h1 className="text-[18px] sm:text-[20px] font-black tracking-tight text-bg inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full"
                  style={{ background: '#FACC15', color: '#0A0A0A' }}
                  title={mode === 'parcel' ? t('modeIconParcel') : t('modeIconRide')}
                >
                  {mode === 'parcel'
                    ? <Package className="w-4 h-4" strokeWidth={2.75} />
                    : <UserRound className="w-4 h-4" strokeWidth={2.75} />}
                </span>
                {mode === 'parcel' ? t('headerParcelPickup') : t('headerWhereTo')}
              </h1>
              <button
                type="button"
                onClick={() => { setPitstopOpen((v) => !v); haptic.tap() }}
                aria-label={pitstopOpen ? t('removeStopAria') : t('addStopAria')}
                aria-pressed={pitstopOpen}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-bg font-extrabold text-[13px] active:scale-95 transition"
                style={{
                  background: '#FACC15',
                  boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
                  minHeight: 32,
                }}
              >
                <span
                  className="w-5 h-5 rounded-full inline-flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.10)' }}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                <span>{pitstopOpen ? t('stopLabel') : t('addStopLabel')}</span>
              </button>
            </div>

            {/* ROW 2 — Pickup/Dropoff stack with connector column + saved
                + swap controls. 4 columns: connector dots, inputs,
                saved-place chip, swap arrows. */}
            <div className="mt-3 shrink-0">
              <div className="flex items-stretch gap-2">
                {/* Connector column — black ring at top, dotted line, yellow filled circle */}
                <div className="flex flex-col items-center justify-between py-2.5 shrink-0" style={{ width: 16 }}>
                  <div
                    className="w-3 h-3 rounded-full border-2"
                    style={{ borderColor: '#0A0A0A', background: 'transparent' }}
                    aria-hidden
                  />
                  <div
                    className="flex-1 my-1"
                    style={{
                      width: 2,
                      backgroundImage: 'repeating-linear-gradient(to bottom, #0A0A0A 0 3px, transparent 3px 6px)',
                    }}
                    aria-hidden
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#FACC15', boxShadow: '0 0 0 2px #0A0A0A inset' }}
                    aria-hidden
                  />
                </div>

                {/* Inputs column */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <PlaceAutocomplete
                    value={pickupLabel}
                    onChange={setPickupLabel}
                    onSelect={(s) => {
                      setPickup({ lat: s.lat, lng: s.lng, accuracyM: 0 })
                      setPickupLabel(s.label)
                      addRecent({ lat: s.lat, lng: s.lng, label: s.label })
                      haptic.tap()
                    }}
                    placeholder={pickup ? t('pickupOptional') : t(PLACEHOLDER_KEYS[service].pickup)}
                    className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-bg placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                    near={geo.coords ?? null}
                    countryCodes={countryCodes}
                    ariaLabel={t('pickupAria')}
                    clearOnFocus
                    dropdownDirection="down"
                    maxResults={3}
                    rightSlot={
                      // Always render the yellow "Set location" button —
                      // even when GPS is already granted, the customer
                      // may want to refresh to their current spot (they
                      // could have moved since the page loaded). Re-tap
                      // calls geo.request() which is idempotent.
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          haptic.tap()
                          // Force-set pickup to the freshly returned coords.
                          // The previous behaviour just kicked off geo.request()
                          // and hoped the useEffect at line ~220 would pick it
                          // up — but that effect short-circuits when `pickup`
                          // is already truthy, so a tap on the yellow button
                          // when pickup had already been auto-filled did
                          // nothing. Awaiting the promise + setting pickup
                          // directly here means the button always works.
                          ;(async () => {
                            const point = await geo.request()
                            if (point) {
                              setPickup(point)
                              setPickupLabel(t('myLocation'))
                            }
                          })()
                        }}
                        disabled={geo.status === 'requesting'}
                        aria-label={geo.status === 'granted' ? t('refreshLocationAria') : t('useLocationAria')}
                        title={geo.status === 'granted' ? t('refreshLocationTitle') : t('useLocationTitle')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-lg active:scale-[0.95] transition disabled:opacity-60"
                        style={{
                          minHeight: 36,
                          minWidth: 36,
                          background: geo.status === 'requesting' ? 'rgba(250,204,21,0.08)' : '#FACC15',
                          color: '#0A0A0A',
                        }}
                      >
                        <Compass
                          className={`w-[16px] h-[16px] ${geo.status === 'requesting' ? 'animate-spin' : ''}`}
                          strokeWidth={2.6}
                        />
                      </button>
                    }
                  />
                  <PlaceAutocomplete
                    value={dropoffLabel}
                    onChange={setDropoffLabel}
                    onSelect={(s) => {
                      setDropoff({ lat: s.lat, lng: s.lng, accuracyM: 0 })
                      setDropoffLabel(s.label)
                      addRecent({ lat: s.lat, lng: s.lng, label: s.label })
                      haptic.tap()
                    }}
                    placeholder={t(PLACEHOLDER_KEYS[service].dropoff)}
                    className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-bg placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                    near={pickup ?? geo.coords ?? null}
                    countryCodes={countryCodes}
                    ariaLabel={t('dropoffAria')}
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

                {/* Swap arrows column — black button with stacked yellow
                    up/down arrows per founder spec. Tapping swaps
                    pickup ↔ dropoff (coords + labels). */}
                <button
                  type="button"
                  onClick={handleSwap}
                  aria-label={t('swapAria')}
                  className="shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 active:scale-95 transition"
                  style={{
                    background: '#0A0A0A',
                    border: '1px solid #0A0A0A',
                    minWidth: 36,
                    minHeight: 44,
                  }}
                >
                  <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} style={{ color: '#FACC15' }} />
                  <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} style={{ color: '#FACC15' }} />
                </button>
              </div>

              {/* PIT-STOP inline textarea — collapses by default; expanded
                  when the Add Stop button is pressed. Kept lightweight
                  inside the same row so the layout doesn't reflow much. */}
              {pitstopOpen && (
                <div className="mt-2 relative">
                  <textarea
                    rows={2}
                    maxLength={140}
                    placeholder={t('pitstopPlaceholder')}
                    value={pitstopNote}
                    onChange={(e) => setPitstopNote(e.target.value)}
                    className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-bg placeholder:text-[#71717A] rounded-xl px-3 py-2 text-[13px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition resize-none"
                  />
                  {pitstopNote.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setPitstopNote(''); haptic.tap() }}
                      aria-label={t('pitstopClearAria')}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full inline-flex items-center justify-center text-[#71717A] hover:text-bg transition"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}

              {/* Recent-places chips dropped per founder direction. The
                  recent-places store is still maintained via addRecent()
                  on field selects, ready to power a saved-places picker
                  (compass / star icon taps) when that flow is wired. */}
            </div>

            {/* ROW 3 — Vehicle picker. Drives the inline driver list.
                Preserves the current `mode` so flipping vehicle types
                doesn't reset Ride↔Parcel.

                Parcel mode hides Bus + Jeep — those aren't parcel-
                delivery vehicles. Customers booking a parcel choose
                between Bike (city courier), Car (medium load), and
                Truck (bulk move). 3-col grid when filtered. */}
            <div className={`mt-3 shrink-0 grid gap-2 ${mode === 'parcel' ? 'grid-cols-3' : 'grid-cols-5'}`}>
              <VehicleImageButton href={`/cari?service=person&mode=${mode}`} active={vehicleType === 'bike'}    label={t('vehicleBike')}  imageUrl="https://ik.imagekit.io/nepgaxllc/Untitledadsaasdasdasdasad.png?tr=e-bgremove" />
              <VehicleImageButton href={`/cari?service=car&mode=${mode}`}    active={vehicleType === 'car'}     label={t('vehicleCar')}   imageUrl="https://ik.imagekit.io/nepgaxllc/Untitledadsa.png?tr=e-bgremove" />
              {mode !== 'parcel' && (
                <VehicleImageButton href={`/cari?service=bus&mode=${mode}`}    active={vehicleType === 'minibus'} label={t('vehicleBus')}   imageUrl="https://ik.imagekit.io/nepgaxllc/Untitledadsaasdasd.png?tr=e-bgremove" />
              )}
              {mode !== 'parcel' && (
                <VehicleImageButton href={`/cari?service=jeep&mode=${mode}`}   active={vehicleType === 'jeep'}    label={t('vehicleJeep')}  imageUrl="https://ik.imagekit.io/nepgaxllc/Untitledadsaasdasdasdasadasda.png?tr=e-bgremove" sizeBoost={1.15} />
              )}
              <VehicleImageButton href={`/cari?service=truck&mode=${mode}`}  active={vehicleType === 'truck'}   label={t('vehicleTruck')} imageUrl="https://ik.imagekit.io/nepgaxllc/Untitledadsaasdasdasda.png?tr=e-bgremove" />
            </div>

            {/* Hourly-filter banner — surfaces when the customer arrived
                here from a driver profile whose working window didn't
                fit their requested (tier, date, time). Lists ONLY drivers
                of the same vehicle type whose window does fit. */}
            {hourlyFilter && (
              <div
                className="mt-3 rounded-xl px-3 py-2.5 flex items-start gap-2"
                style={{ background: '#FEF9C3', border: '1px solid #FDE68A', color: '#854D0E' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider">
                    {t('hourlyBannerLabel')}
                  </div>
                  <div className="text-[12px] font-bold leading-snug mt-0.5">
                    {t(vehicleType === 'car' ? 'hourlyBannerBodyCar' : 'hourlyBannerBodyBike', {
                      tier: HOURLY_TIERS.find((x) => x.id === hourlyFilter.tier)?.label ?? hourlyFilter.tier,
                      date: hourlyFilter.date,
                      time: hourlyFilter.time,
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sp = new URLSearchParams(params.toString())
                    sp.delete('hourlyTier'); sp.delete('hourlyDate'); sp.delete('hourlyTime')
                    router.replace(`/cari${sp.toString() ? `?${sp.toString()}` : ''}`)
                  }}
                  aria-label={t('hourlyBannerClearAria')}
                  className="shrink-0 inline-flex items-center justify-center rounded-full text-[11px] font-extrabold px-2 py-1"
                  style={{ background: '#0A0A0A', color: '#FACC15' }}
                >
                  {t('hourlyBannerClear')}
                </button>
              </div>
            )}

            {/* ROW 4 — Scrollable driver list. Filtered by vehicleType.
                Custom yellow scrollbar (`cari-driver-scroll`) — thin
                rail + short rounded thumb so customers see the scroll
                affordance without it eating page width. WebKit + Firefox
                rules below; styles live in a <style> tag near the top of
                the component so the class is portable. */}
            <div
              className="cari-driver-scroll mt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 -mx-1 px-1"
            >
              {driversLoading && visibleDrivers.length === 0 && (
                <div className="py-6 text-center text-[13px] font-bold text-[#71717A]">
                  {t('listLoading')}
                </div>
              )}
              {!driversLoading && visibleDrivers.length === 0 && (
                <div className="py-6 text-center text-[13px] font-bold text-[#71717A]">
                  {mode === 'parcel' && vehicleType === 'bike'
                    ? t('listEmptyParcelBike')
                    : vehicleType === 'car' ? t('listEmptyCar') : t('listEmptyBike')}
                </div>
              )}
              {sortedDrivers.map((d) => (
                <DriverCard
                  key={d.id}
                  driver={d}
                  vehicleType={vehicleType}
                  pickup={pickup}
                  selected={d.id === selectedDriverId}
                  isFastest={d.id === fastestId}
                  isCheapest={d.id === cheapestId}
                  onSelect={() => {
                    setSelectedDriverId(d.id)
                    haptic.tap()
                  }}
                />
              ))}
            </div>

            {/* ROW 5 — Citypass promo banner. Yellow shaded card with a
                bright yellow Explore button on the right. Routes to /places
                with `from=cari` + the customer's current pickup so the
                place picker can redirect back here with the chosen place
                set as the drop-off (auto-fills /cari?dLat=&dLng=&dName=). */}
            <Link
              href={(() => {
                const sp = new URLSearchParams()
                sp.set('from', 'cari')
                if (pickup) {
                  sp.set('pLat', pickup.lat.toString())
                  sp.set('pLng', pickup.lng.toString())
                  if (pickupLabel) sp.set('pName', pickupLabel)
                }
                return `/places?${sp.toString()}`
              })()}
              prefetch
              onClick={() => haptic.tap()}
              className="mt-3 shrink-0 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 active:scale-[0.99] transition"
              style={{
                background: 'rgba(250,204,21,0.15)',
                border: '1px solid rgba(250,204,21,0.45)',
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-black text-bg leading-tight">{t('citypassTitle')}</div>
                <div className="text-[11px] font-bold text-bg/65 leading-tight mt-0.5">
                  {t('citypassSubtitle')}
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-bg font-extrabold text-[12px]"
                style={{ background: '#FACC15', minHeight: 32 }}
              >
                {t('citypassCta')}
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
            </Link>

            {/* STICKY BOOK NOW — fires WhatsApp for the currently
                selected driver (cheapest by default, customer-chosen
                otherwise). Renders only when a driver is in fact
                selected. Single yellow gradient pill spanning the
                container width — Gojek/Grab-style "one big button to
                go". The Profile → pill on each card is the escape
                hatch for customers who want to vet a driver first. */}
            {selectedDriver && (() => {
              const waHref = buildSelectedWhatsAppLink(selectedDriver)
              const label = selectedDriver.name
              const disabled = !waHref
              return (
                <a
                  href={waHref || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={disabled}
                  onClick={(e) => {
                    if (disabled) {
                      e.preventDefault()
                      return
                    }
                    fireConnectIntent(
                      selectedDriver.id,
                      'cari',
                      vehicleType === 'car' ? 'car' : 'rider',
                    )
                    haptic.impact()
                  }}
                  className="mt-3 mb-6 shrink-0 flex items-center justify-center rounded-2xl font-extrabold tracking-tight active:scale-[0.99] transition"
                  style={{
                    minHeight: 56,
                    padding: '14px 18px',
                    background: disabled
                      ? '#E4E4E7'
                      : 'linear-gradient(90deg, #FACC15 0%, #F59E0B 100%)',
                    color: disabled ? '#71717A' : '#0F172A',
                    boxShadow: disabled
                      ? 'none'
                      : '0 6px 18px rgba(250,204,21,0.45)',
                    fontSize: 15,
                    opacity: disabled ? 0.7 : 1,
                  }}
                >
                  <span className="truncate">
                    {t('bookNowPrefix')} · {label}
                  </span>
                </a>
              )
            })()}

          </div>
        </div>
      </div>
      </div>{/* /cari-frame phone-frame wrapper */}
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle toggle button — equal-width row. Active = yellow with bold text;
// inactive = light gray with muted text. Uses prefetched Link so the URL
// flip (which carries service into the page state) is instant.
// ─────────────────────────────────────────────────────────────────────────────
function VehicleToggleButton({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      className="flex items-center justify-center py-2.5 rounded-xl font-extrabold text-[14px] tracking-tight transition active:scale-95"
      style={{
        background: active ? '#FACC15' : '#F4F4F5',
        color: active ? '#0A0A0A' : '#52525B',
        border: active ? '1px solid #FACC15' : '1px solid #E4E4E7',
        boxShadow: active ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
        minHeight: 44,
      }}
    >
      {label}
    </Link>
  )
}

// 5-way vehicle picker button — renders the founder-supplied vehicle
// PNG (transparent, on-brand yellow vehicle silhouette) directly without
// a containing circle. Active state gets a soft yellow glow under the
// image + bold label; inactive state dims the image slightly.
function VehicleImageButton({
  href, active, label, imageUrl, sizeBoost = 1,
}: {
  href:      string
  active:    boolean
  label:     string
  imageUrl:  string
  /** Optional per-vehicle scale multiplier on the rendered image, layered
   *  on top of the active-state scale. e.g. sizeBoost=1.15 makes the
   *  vehicle render 15% larger than its siblings. */
  sizeBoost?: number
}) {
  const activeScale = active ? 1.05 : 1
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className="flex flex-col items-center gap-1 active:scale-95 transition"
    >
      {/* All five icons render in their full solid colour at all times
          (no grayscale + opacity fade on inactive). The selected button
          is differentiated purely by a 3px yellow ring around the icon
          + a small scale-up, per founder spec. */}
      <div
        className="w-14 h-14 flex items-center justify-center rounded-full transition"
        style={{
          transform: `scale(${activeScale * sizeBoost})`,
          boxShadow: active ? '0 0 0 3px #FACC15' : 'none',
        }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="max-w-full max-h-full object-contain"
        />
      </div>
      <span
        className="text-[10.5px] font-extrabold tracking-tight"
        style={{ color: active ? '#0A0A0A' : '#52525B' }}
      >
        {label}
      </span>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Driver card — landscape layout per spec. Image left, title + subtitle +
// rating in the middle, price + ETA on the right. The card BODY is a
// <button> that selects this driver in the parent /cari state; the
// sticky BOOK NOW CTA at the bottom of the container then opens this
// driver's WhatsApp. A small Profile → pill in the lower-right is a
// <Link> to /r/{slug} (bike) or /car/{slug} (car) for customers who
// want to vet trust signals before tapping BOOK NOW; the pill stops
// propagation so tapping it doesn't also fire the card's select.
// ─────────────────────────────────────────────────────────────────────────────
function DriverCard({
  driver,
  vehicleType,
  pickup,
  selected,
  isFastest,
  isCheapest,
  onSelect,
}: {
  driver:     Rider
  vehicleType:'bike' | 'car' | 'minibus' | 'truck' | 'jeep'
  pickup:     GeoPoint | null
  selected:   boolean
  isFastest:  boolean
  isCheapest: boolean
  onSelect:   () => void
}) {
  // useRouter for the Profile pill's programmatic navigation. We can't
  // use a <Link> here because the parent div's onClick race-conditions
  // away the navigation on mobile (see Profile pill comment below).
  const router = useRouter()
  const t = useTranslations('cari')

  // Title: vehicle make + model when set, otherwise business name. The
  // Rider shape stores the vehicle on `bike` (legacy name — table covers
  // car + bike via the vehicle_type discriminator).
  const make = driver.bike?.make?.trim()
  const model = driver.bike?.model?.trim()
  const vehicleLabel = make || model ? `${make ?? ''} ${model ?? ''}`.trim() : driver.name

  // Card image — always the VEHICLE (car catalog for car drivers, bike
  // catalog for bike riders), never the driver's face. Profile photos
  // stay on the actual /car/[slug] or /r/[slug] page; the booking card
  // is a vehicle picker so it shows what the customer is hiring.
  // Both helpers ALWAYS return a non-empty string (generic silhouette
  // when the make/model isn't in the catalog yet) so there's never a
  // null src; the <img onError> below catches transient 404s and swaps
  // to the silhouette so a broken URL never leaves a blank tile.
  // Jeep cards always render the colour-keyed jeep photo (founder spec —
  // one curated jeep image per body colour, picked by the driver from
  // their dashboard /dashboard/jeep/vehicle). Bike uses the bike catalog;
  // everything else (car / bus / truck) falls through to the car catalog
  // silhouette helper.
  const imgSrc =
    vehicleType === 'jeep'    ? getJeepImageUrl(driver.bike?.color)
    : vehicleType === 'minibus' ? getBusImageUrl(driver.bike?.color)
    : vehicleType === 'bike'  ? getBikeImageUrl(make, model)
    : getCarImageUrl(make, model)

  // Subtitle: year + color when set, otherwise area/city.
  const year = driver.bike?.year
  const color = driver.bike?.color?.trim()
  let subtitle = ''
  if (year && color) subtitle = `${color} ${year}`
  else if (year) subtitle = `${year}`
  else if (color) subtitle = color
  else subtitle = driver.area || driver.city || ''

  // Proximity hint under the price — minutes-to-driver only. Derived
  // from haversine km / 25 km/h, floored at 2 min so a nearby driver
  // doesn't read "0 min away". Rendered in yellow per founder spec
  // (the same yellow accent the km line used before).
  //
  // Freshness gate (2026-06 audit fix): if the driver's GPS is stale,
  // src/lib/drivers/queries.ts has already swapped their lat/lng to the
  // service-zone centre. Reporting "8 min away" from a zone centre lies
  // to the customer, so we hide the ETA and surface a "Based in {area}"
  // label instead — same behaviour /cari/pending already has.
  let etaLabel: string | null = null
  let basedInLabel: string | null = null
  if (driver.locationFresh === false) {
    if (driver.area) basedInLabel = t('basedInArea', { area: driver.area })
    else if (driver.city) basedInLabel = t('basedInArea', { area: driver.city })
  } else if (pickup && driver.lat && driver.lng) {
    const km = haversineKm({ lat: pickup.lat, lng: pickup.lng }, { lat: driver.lat, lng: driver.lng })
    if (Number.isFinite(km)) {
      const minutes = Math.max(2, Math.round((km / 25) * 60))
      etaLabel = t('minAway', { minutes })
    }
  }

  // Price label — "From Rp X" or "Rp X". Never "trip price" / "total fare"
  // (PM 12/2019 safe-harbour copy). Charter vehicles (jeep / minibus /
  // truck) surface the 3h hourly-tier price because they charter as
  // packages, not per-km. Bike + car keep the legacy min_fee display.
  const TIER_3H_BY_TYPE: Record<string, number> = {
    jeep:    350_000, // matches HOURLY_DEFAULTS_JEEP
    minibus: 250_000, // matches HOURLY_DEFAULTS_INNOVA (Hiace / Innova tier)
    truck:   400_000, // pindahan / charter 3h floor
  }
  const tierFee = TIER_3H_BY_TYPE[vehicleType]
  const fee = tierFee ?? driver.minFee ?? driver.pricePerKm ?? null
  const priceLabel = fee != null
    ? (tierFee
        ? t('fromPriceTier3h', { price: tierFee.toLocaleString('id-ID') })
        : `Rp ${fee.toLocaleString('en-US')}`)
    : null

  // Route to the driver's profile based on the active vehicleType toggle.
  // /cari's driver list is server-filtered by vehicle_type (see
  // fetchActiveDriversBrowser), so every card under the picked vehicle
  // is the matching type. Route to the vertical's own /[slug] page so
  // mock + real drivers both land somewhere intentional.
  const profileHref =
    vehicleType === 'car'     ? `/car/${driver.slug}`
    : vehicleType === 'minibus' ? `/bus/${driver.slug}`
    : vehicleType === 'jeep'    ? `/jeep/${driver.slug}`
    : vehicleType === 'truck'   ? `/truck/${driver.slug}`
    : `/r/${driver.slug}` // bike

  // Selection visuals — yellow border, soft yellow tint, and a small
  // scale-up so the chosen card visibly "lifts" out of the list. The
  // base (unselected) state keeps the existing hover-yellow-border
  // affordance from the prior design so customers can still see which
  // card is interactive.
  const cardClass = selected
    ? 'relative w-full text-left flex items-center gap-3 p-2.5 rounded-xl transition border-2 border-[#FACC15] bg-[#FFFBEA] scale-[1.01] shadow-[0_4px_14px_rgba(250,204,21,0.30)]'
    : 'relative w-full text-left flex items-center gap-3 p-2.5 rounded-xl active:scale-[0.99] transition border border-[#E4E4E7] bg-white hover:border-[#FACC15]'

  // NOTE: card body is a div+role="button" rather than a real <button>
  // because we need to embed a <Link> (Profile pill) inside it — and
  // nesting an interactive <a> inside a real <button> is invalid HTML
  // and triggers a React hydration warning. The role + tabIndex +
  // keyboard handler give us the same a11y semantics.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      aria-pressed={selected}
      aria-label={t('selectAria', { name: driver.name })}
      className={`${cardClass} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]`}
      style={{ minHeight: 72 }}
    >
      {/* Top-LEFT badges — FASTEST (black pill with yellow bolt) on the
          nearest driver; CHEAPEST (black pill, matching style) on the
          lowest-fee driver. Mutually exclusive on a single card: when
          the same driver wins on both axes, we show CHEAPEST only
          (matches the cheapest-by-default auto-selection elsewhere in
          the page). Absolute-positioned so the rest of the card row
          layout doesn't shift. */}
      {(isFastest || isCheapest) && (
        <div className="absolute top-1.5 left-1.5 z-10 flex flex-col items-start gap-1 pointer-events-none">
          {isCheapest ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
              style={{
                background: '#0A0A0A',
                color:      '#FACC15',
                boxShadow:  '0 4px 10px rgba(10,10,10,0.32)',
                lineHeight: 1,
                minHeight:  18,
              }}
            >
              {t('badgeCheapest')}
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
              style={{
                background: '#0A0A0A',
                color:      '#FACC15',
                boxShadow:  '0 4px 10px rgba(10,10,10,0.32)',
                lineHeight: 1,
                minHeight:  18,
              }}
            >
              <Zap className="w-2.5 h-2.5" strokeWidth={3} fill="#FACC15" />
              {t('badgeFastest')}
            </span>
          )}
        </div>
      )}
      {/* Vehicle / brand image — landscape 84×56 (1.5:1) instead of the
          old 64×64 square so a car's side-profile fits without the
          front/rear bumpers being cropped by `object-cover`. Bikes are
          also more landscape than square in side profile, so the same
          shape helps them too. */}
      <div
        className="shrink-0 rounded-lg overflow-hidden"
        style={{
          width: 84,
          height: 56,
          background: selected ? 'transparent' : '#F4F4F5',
          // When a Cheapest / Fastest badge is shown at top-left, push
          // the vehicle image down so the badge isn't sitting on top
          // of it. The card naturally grows with the image's offset.
          marginTop: (isFastest || isCheapest) ? 16 : 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-contain p-0.5"
          loading="lazy"
          onError={(e) => {
            // Defence in depth — if the catalog URL ever 404s (ImageKit
            // blip, asset deleted, etc.) swap to the generic silhouette
            // so the tile is never blank. The `src` guard prevents an
            // infinite loop if the fallback itself fails.
            const el = e.currentTarget
            if (el.src !== GENERIC_CAR_FALLBACK) el.src = GENERIC_CAR_FALLBACK
          }}
        />
      </div>

      {/* Middle column — title + subtitle + price (moved from right) */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-black text-bg truncate">{vehicleLabel}</span>
        </div>
        {subtitle && (
          <div className="text-[12px] font-bold text-[#52525B] truncate leading-tight">
            {subtitle}
          </div>
        )}
        {/* Price + ETA — moved here from the right column so the rating
            star can move to the top-right and the Profile yellow button
            anchors the bottom-right. Inline so they sit on one line.
            Price is one step larger (16px / extra-black) so it reads
            as the most prominent number on the card. */}
        <div className="mt-0.5 flex items-center gap-1.5">
          {priceLabel && (
            <span className="text-[16px] font-black text-bg tracking-tight leading-tight">
              {priceLabel}
            </span>
          )}
          {etaLabel && (
            <>
              {priceLabel && <span aria-hidden className="text-[11px] text-[#A1A1AA]">·</span>}
              <span className="text-[11px] font-extrabold" style={{ color: '#F59E0B' }}>
                {etaLabel}
              </span>
            </>
          )}
          {basedInLabel && (
            <>
              {priceLabel && <span aria-hidden className="text-[11px] text-[#A1A1AA]">·</span>}
              <span className="text-[11px] font-bold text-[#71717A]" title={t('staleGpsTitle')}>
                {basedInLabel}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right column — star on top, yellow Profile button on bottom.
          `self-stretch` lets the column fill the card's full height
          (the card itself enforces min-height 72), so justify-between
          properly pins the star to the top edge and the Profile button
          to the bottom edge regardless of how tall the middle column
          gets. */}
      <div className="shrink-0 self-stretch flex flex-col items-end justify-between py-0.5">
        {/* Rating star — hidden when a Fastest/Cheapest badge already
            owns the card's top-right slot, so the two never crowd each
            other. */}
        {driver.rating !== undefined ? (
          <div className="inline-flex items-center gap-1 text-[12px] font-extrabold text-bg">
            <Star className="w-3 h-3" strokeWidth={2.5} fill="#FACC15" style={{ color: '#FACC15' }} />
            {driver.rating.toFixed(1)}
          </div>
        ) : (
          <span />
        )}
        {/* Profile pill — yellow chevron button, lower-right corner.
            Stops propagation so tapping the pill does NOT also fire the
            parent button's onSelect (otherwise the card would briefly
            flip selected on the way out). */}
        {/*
          Profile pill — secondary action. Programmatic router.push
          rather than <Link> because the previous <Link> + the parent
          div's onClick={onSelect} race-condition meant the navigation
          was getting swallowed on touch devices (the parent's select
          re-render fired before Link's click handler could push).

          Size: 32px tall (visually subtle — primary CTA is BOOK NOW
          at the sticky bottom; Profile is a vet-before-booking escape
          hatch), but the inner padding gives a ~40px hit area which
          is reliably tappable.
         */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            router.push(profileHref)
          }}
          aria-label={t('profilePillAria', { name: driver.name })}
          className="inline-flex items-center justify-center rounded-full px-3.5 text-[12px] font-extrabold uppercase tracking-wider shadow-sm active:scale-[0.97] transition"
          style={{
            background: '#FACC15',
            color: '#0A0A0A',
            minHeight: 32,
            minWidth: 64,
            lineHeight: 1,
          }}
        >
          {t('profilePill')}
        </button>
      </div>
    </div>
  )
}
