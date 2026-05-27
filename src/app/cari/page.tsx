'use client'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  ChevronRight,
  Compass,
  MapPin,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useCountryFromCoords } from '@/hooks/useCountryFromCoords'
import { useHaptic } from '@/hooks/useHaptic'
import { fetchRoadDistanceKm, instantRoadDistance, type RoadDistance } from '@/lib/geo/route-distance'
import { haversineKm } from '@/lib/geo/haversine'
import { logNav } from '@/lib/perf/navTiming'
import { fetchActiveDriversBrowser } from '@/lib/drivers/queries'
import type { Rider, ServiceType } from '@/types/rider'

// ============================================================================
// /cari — Card-based booking page (full redesign 2026-05-27)
// ----------------------------------------------------------------------------
// REPLACES the fullscreen-map + bottom-sheet layout. The map became a static
// image background; the active widget is a white container floating over it
// with pickup/dropoff inputs, a vehicle toggle (Car/Bike), an inline driver
// list, and the Citypass promo. The Find-my-ride CTA sits OUTSIDE the
// container as a primary action terminus.
//
// Compliance posture: IndoCity is a software directory (PM 12/2019). The
// driver cards label fares as "From Rp X" — never as a calculated trip
// price. A persistent disclaimer sits under the CTA.
// ============================================================================

const BG_IMAGE = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2006_53_11%20AM.png'

// Per-service placeholder text — same dictionary as before so deep-links
// from /places and other entry points still read naturally.
const PLACEHOLDERS: Record<ServiceType, { pickup: string; dropoff: string }> = {
  person: { pickup: 'Where do you want to be picked up?', dropoff: 'Where do you want to go?' },
  parcel: { pickup: 'Where to pick up the package?', dropoff: 'Destination address' },
  food: { pickup: 'Restaurant or warung name', dropoff: 'Drop-off address' },
  car: { pickup: 'Where do you want to be picked up?', dropoff: 'Where do you want to go?' },
  bus: { pickup: 'Group pickup location', dropoff: 'Destination or tour itinerary' },
}

function parseService(raw: string | null): ServiceType {
  if (raw === 'parcel' || raw === 'food' || raw === 'car' || raw === 'bus') return raw
  // New layout defaults to 'car' per founder spec (Car tile shown active
  // first in the vehicle toggle). Legacy entries still resolve correctly.
  return 'car'
}

// Recent-places localStorage cache (same shape as the old /cari so the
// store is shared and doesn't reset between deploys).
const RECENT_PLACES_KEY = 'indocity:recent-places:v1'
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
  const vehicleType: 'car' | 'bike' = service === 'car' ? 'car' : 'bike'

  // perf instrumentation
  useEffect(() => { logNav('cari:mount') }, [])

  // Auto-fill pickup with customer GPS on grant (kept from old /cari).
  useEffect(() => {
    if (geo.coords && !pickup) {
      setPickup(geo.coords)
      if (!pickupLabel) setPickupLabel('My location')
    }
  }, [geo.coords, pickup, pickupLabel])

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

  // Selected-driver state. Customer taps a card in the inline list → that
  // driver is highlighted; the Book Driver CTA at the bottom activates.
  // No navigation to a separate list page (founder direction: inline
  // scrolling list IS the action path).
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId],
  )

  // Book Driver — opens WhatsApp to the selected driver with a pre-filled
  // Indonesian starter message that names the trip ends. Customer + driver
  // agree the fare directly there. IndoCity does not handle the booking
  // itself (PM 12/2019 directory safe-harbour: discovery + WhatsApp
  // hand-off only).
  function handleBookDriver() {
    if (!selectedDriver) return
    haptic.impact()
    logNav('cari:book-driver')
    const phone = selectedDriver.whatsappE164?.replace(/[^0-9]/g, '') ?? ''
    if (!phone) return
    const lines: string[] = ['Halo, saya tertarik booking via IndoCity.']
    if (pickupLabel) lines.push(`Pickup: ${pickupLabel}`)
    if (dropoffLabel) lines.push(`Drop-off: ${dropoffLabel}`)
    if (pitstopOpen && pitstopNote.trim()) lines.push(`Pit stop: ${pitstopNote.trim()}`)
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer')
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
      pName: pickupLabel || 'My location',
      dLat: dropoff!.lat.toString(),
      dLng: dropoff!.lng.toString(),
      dName: dropoffLabel || 'Destination',
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
    <>
      {/* STATIC MAP BACKGROUND — fixed inset-0, cover-fit. Replaces the
          interactive maplibre canvas. The image stays behind all chrome
          and reads as visual context, not a working map (founder
          approved trade-off: customers use the inputs, not the map). */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url("${BG_IMAGE}")`,
          backgroundSize: 'cover',
          // Push the image up by 120px so the visible composition in
          // the hero area sits higher (founder direction).
          backgroundPosition: 'center -120px',
          backgroundRepeat: 'no-repeat',
        }}
        aria-hidden
      />
      {/* HEADER — wordmark on the left, nearby pill on the right. */}
      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center hover:opacity-85 transition"
            aria-label="IndoCity home"
          >
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#FFFFFF', letterSpacing: '-0.02em' }}
            >
              Ind
            </span>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] mx-[1px] translate-y-[3px]"
            >
              <path
                d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
                fill="#FACC15"
              />
              <circle cx="12" cy="10" r="3" fill="#FFFFFF" />
            </svg>
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#FACC15', letterSpacing: '-0.02em' }}
            >
              City
            </span>
          </Link>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: '#000',
              border: '1px solid rgba(250,204,21,0.30)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.55)',
              minHeight: 32,
            }}
          >
            <span className="relative inline-flex items-center justify-center" style={{ width: 10, height: 10 }}>
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(236,72,153,0.55)',
                  animation: 'ridePing 2.2s ease-out infinite',
                }}
              />
              <span
                aria-hidden
                className="absolute rounded-full"
                style={{
                  width: 7, height: 7,
                  background: '#22C55E',
                  boxShadow: '0 0 6px rgba(34,197,94,0.95)',
                }}
              />
            </span>
            <span className="text-[13px] font-extrabold text-brand uppercase tracking-wider">
              {nearbyCount == null
                ? 'Cek nearby…'
                : nearbyCount === 0
                  ? 'No driver online'
                  : `${nearbyCount} nearby`}
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
        className="fixed left-0 right-0 bottom-0 z-20"
        style={{ paddingLeft: 15, paddingRight: 15 }}
      >
        <div
          className="mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden w-full"
          style={{ height: '70vh', maxWidth: 640 }}
        >
          <div className="flex flex-col h-full p-4 sm:p-5 pb-safe">
            {/* ROW 1 — Header bar: "Where to?" + Add Stop button */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <h1 className="text-[18px] sm:text-[20px] font-black tracking-tight text-bg">
                Where to?
              </h1>
              <button
                type="button"
                onClick={() => { setPitstopOpen((v) => !v); haptic.tap() }}
                aria-label={pitstopOpen ? 'Remove stop' : 'Add stop'}
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
                <span>{pitstopOpen ? 'Stop' : 'Add Stop'}</span>
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
                    placeholder={pickup ? 'Pick-up name (optional)' : PLACEHOLDERS[service].pickup}
                    className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-bg placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                    near={geo.coords ?? null}
                    countryCodes={countryCodes}
                    ariaLabel="Pick up location"
                    clearOnFocus
                    dropdownDirection="down"
                    rightSlot={
                      <span
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center"
                        aria-hidden
                      >
                        <Compass className="w-[18px] h-[18px] text-[#52525B]" strokeWidth={2.4} />
                      </span>
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
                    placeholder={PLACEHOLDERS[service].dropoff}
                    className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-bg placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                    near={pickup ?? geo.coords ?? null}
                    countryCodes={countryCodes}
                    ariaLabel="Drop off location"
                    clearOnFocus
                    dropdownDirection="down"
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

                {/* Swap arrows column — single button with stacked up/down
                    arrows. Tapping swaps pickup ↔ dropoff (coords + labels). */}
                <button
                  type="button"
                  onClick={handleSwap}
                  aria-label="Swap pickup and dropoff"
                  className="shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 active:scale-95 transition"
                  style={{
                    background: '#F4F4F5',
                    border: '1px solid #E4E4E7',
                    minWidth: 36,
                    minHeight: 44,
                  }}
                >
                  <ArrowUp className="w-3.5 h-3.5 text-bg" strokeWidth={3} />
                  <ArrowDown className="w-3.5 h-3.5 text-bg" strokeWidth={3} />
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
                    placeholder='Add a pit stop (e.g. "Stop at warung")'
                    value={pitstopNote}
                    onChange={(e) => setPitstopNote(e.target.value)}
                    className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-bg placeholder:text-[#71717A] rounded-xl px-3 py-2 text-[13px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition resize-none"
                  />
                  {pitstopNote.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setPitstopNote(''); haptic.tap() }}
                      aria-label="Clear pit stop"
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

            {/* ROW 3 — Vehicle toggle (Car / Bike). Drives the inline
                driver list + the vehicleType URL param when CTA is tapped. */}
            <div className="mt-3 shrink-0 grid grid-cols-2 gap-2">
              <VehicleToggleButton
                href="/cari?service=car"
                active={vehicleType === 'car'}
                label="Car"
              />
              <VehicleToggleButton
                href="/cari?service=person"
                active={vehicleType === 'bike'}
                label="Bike"
              />
            </div>

            {/* ROW 4 — Scrollable driver list. Filtered by vehicleType. */}
            <div
              className="mt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 -mx-1 px-1"
              style={{ scrollbarWidth: 'thin' }}
            >
              {driversLoading && drivers.length === 0 && (
                <div className="py-6 text-center text-[13px] font-bold text-[#71717A]">
                  Loading drivers…
                </div>
              )}
              {!driversLoading && drivers.length === 0 && (
                <div className="py-6 text-center text-[13px] font-bold text-[#71717A]">
                  No {vehicleType === 'car' ? 'car' : 'bike'} drivers online right now.
                </div>
              )}
              {drivers.map((d) => (
                <DriverCard
                  key={d.id}
                  driver={d}
                  vehicleType={vehicleType}
                  pickup={pickup}
                  selected={selectedDriverId === d.id}
                  onSelect={() => {
                    haptic.tap()
                    setSelectedDriverId((prev) => (prev === d.id ? null : d.id))
                  }}
                />
              ))}
            </div>

            {/* ROW 5 — Citypass promo banner. Yellow shaded card with a
                bright yellow Explore button on the right. Routes to /places. */}
            <Link
              href="/places"
              prefetch
              onClick={() => haptic.tap()}
              className="mt-3 shrink-0 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 active:scale-[0.99] transition"
              style={{
                background: 'rgba(250,204,21,0.15)',
                border: '1px solid rgba(250,204,21,0.45)',
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-black text-bg leading-tight">Citypass</div>
                <div className="text-[11px] font-bold text-bg/65 leading-tight mt-0.5">
                  Browse places worth visiting in your city
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-bg font-extrabold text-[12px]"
                style={{ background: '#FACC15', minHeight: 32 }}
              >
                Explore
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
            </Link>

            {/* BOOK DRIVER — primary CTA sitting INSIDE the booking
                container at the very bottom. Solid brand-yellow (no
                gradient) per founder direction. Disabled until the
                customer has tapped a driver in the inline list; then
                activates and opens WhatsApp to that driver with a
                pre-filled Indonesian starter message. IndoCity's
                involvement ends at the handoff — fare is agreed
                between customer and driver directly. */}
            <div className="mt-3 shrink-0">
              <button
                type="button"
                onClick={handleBookDriver}
                disabled={!selectedDriver}
                aria-label={selectedDriver ? `Book ${selectedDriver.name}` : 'Select a driver first'}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-bg font-black text-[15px] tracking-tight active:scale-[0.99] transition-all shadow-[0_10px_28px_rgba(250,204,21,0.45)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                style={{ background: '#FACC15', minHeight: 48 }}
              >
                <Search className="w-4 h-4" strokeWidth={3} />
                <span>
                  {selectedDriver
                    ? `Book Driver · ${selectedDriver.name.split(' ').slice(0, 2).join(' ')}`
                    : 'Book Driver'}
                </span>
                <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </button>
              <p className="mt-2 text-center text-[11px] text-[#52525B] font-bold leading-snug px-2">
                Self-published rates · IndoCity is a software directory.
                You agree the fare directly with the driver.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
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

// ─────────────────────────────────────────────────────────────────────────────
// Driver card — landscape layout per spec. Image left, title + subtitle +
// rating in the middle, price + ETA on the right. Tap routes to /car/[slug]
// or /r/[slug] depending on vehicle type.
// ─────────────────────────────────────────────────────────────────────────────
function DriverCard({
  driver,
  vehicleType,
  pickup,
  selected,
  onSelect,
}: {
  driver: Rider
  vehicleType: 'car' | 'bike'
  pickup: GeoPoint | null
  selected: boolean
  onSelect: () => void
}) {
  // Image: prefer brand_logo_url (drivers upload a photo of their vehicle
  // for their own profile page) — the legacy Rider shape exposes this as
  // `photoUrl`. Fallback is the pravatar URL generated in queries.ts.
  const imgSrc = driver.photoUrl

  // Title: vehicle make + model when set, otherwise business name. The
  // Rider shape stores the vehicle on `bike` (legacy name — table covers
  // car + bike via the vehicle_type discriminator).
  const make = driver.bike?.make?.trim()
  const model = driver.bike?.model?.trim()
  const vehicleLabel = make || model ? `${make ?? ''} ${model ?? ''}`.trim() : driver.name

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
  let etaLabel: string | null = null
  if (pickup && driver.lat && driver.lng) {
    const km = haversineKm({ lat: pickup.lat, lng: pickup.lng }, { lat: driver.lat, lng: driver.lng })
    if (Number.isFinite(km)) {
      const minutes = Math.max(2, Math.round((km / 25) * 60))
      etaLabel = `${minutes} min away`
    }
  }

  // Price label — "From Rp X" or "Rp X". Never "trip price" / "total fare"
  // (PM 12/2019 safe-harbour copy).
  const fee = driver.minFee ?? driver.pricePerKm ?? null
  const priceLabel = fee != null ? `Rp ${fee.toLocaleString('en-US')}` : null

  // Cards no longer navigate — they SELECT (highlight). The container's
  // Book Driver CTA at the bottom takes the selected driver to WhatsApp.
  // vehicleType is no longer needed for routing but retained for any
  // future per-vehicle card variations.
  void vehicleType

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${selected ? 'Deselect' : 'Select'} ${driver.name}`}
      className={
        'w-full text-left flex items-center gap-3 p-2.5 rounded-xl active:scale-[0.99] transition ' +
        (selected
          ? 'border-2 border-brand bg-[#FFFDF5] shadow-[0_4px_14px_rgba(250,204,21,0.30)]'
          : 'border border-[#E4E4E7] bg-white hover:border-[#FACC15]')
      }
      style={{ minHeight: 64 }}
    >
      {/* Vehicle / brand image */}
      <div
        className="shrink-0 rounded-lg overflow-hidden bg-[#F4F4F5]"
        style={{ width: 64, height: 64 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Middle column — title + subtitle + rating */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-black text-bg truncate">{vehicleLabel}</span>
        </div>
        {subtitle && (
          <div className="text-[12px] font-bold text-[#52525B] truncate leading-tight">
            {subtitle}
          </div>
        )}
        {driver.rating !== undefined && (
          <div className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-extrabold text-bg">
            <Star className="w-3 h-3" strokeWidth={2.5} fill="#FACC15" style={{ color: '#FACC15' }} />
            {driver.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Right column — price + ETA (yellow) */}
      <div className="shrink-0 text-right">
        {priceLabel && (
          <div className="text-[13px] font-black text-bg tracking-tight">
            {priceLabel}
          </div>
        )}
        {etaLabel && (
          <div
            className="text-[11px] font-extrabold mt-0.5"
            style={{ color: '#F59E0B' }}
          >
            {etaLabel}
          </div>
        )}
      </div>
    </button>
  )
}
