'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Search, MapPin, Plus, X, Landmark, Bike, Briefcase, Utensils } from 'lucide-react'
import RiderMap from '@/components/map/RiderMapDynamic'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import SavedPlacesChip from '@/components/cari/SavedPlacesChip'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useCountryFromCoords } from '@/hooks/useCountryFromCoords'
import { useHaptic } from '@/hooks/useHaptic'
import { haversineKm } from '@/lib/geo/haversine'
import { fetchRoadDistanceKm, instantRoadDistance, type RoadDistance } from '@/lib/geo/route-distance'
import { preloadBbox, bboxFromPoints } from '@/lib/map/preloadTiles'
import { logNav } from '@/lib/perf/navTiming'
import type { Rider, ServiceType } from '@/types/rider'

// Per-service placeholder text — tailors the inputs to the picked service.
// Service is picked on the LANDING page now (3 landscape tiles) and arrives
// here via the ?service=<id> query param.
const PLACEHOLDERS: Record<ServiceType, { pickup: string; dropoff: string }> = {
  person: { pickup: 'Where do you want to be picked up?', dropoff: 'Where do you want to go?' },
  parcel: { pickup: 'Where to pick up the package?',      dropoff: 'Destination address' },
  food:   { pickup: 'Restaurant or warung name',           dropoff: 'Drop-off address' },
}

// Nearby-rider scatter has been removed (audit 2026-05). The previous
// `buildNearbyRiders` invented 24 fake pings on the map regardless of
// real driver state and reported a fixed "42 nearby" badge. Replaced by:
//   • Real driver count from /api/drivers/lowest-fare (with lat/lng)
//   • Real driver markers rendered by the components that own them
//     (the live marketplace on /cari/rider, not the trip-planner map)

function parseService(raw: string | null): ServiceType {
  return raw === 'person' || raw === 'food' ? raw : 'parcel'
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
  // taps the "Use my location" pin button. Previously fired on mount,
  // blocking first paint for 2-5s while the permission dialog was open.
  const geo = useGeolocation(false)
  const haptic = useHaptic()

  // Optional ?dLat=&dLng=&dName= handoff from /places — pre-fills the
  // destination so the customer only has to confirm/edit the pickup
  // before tapping View drivers. Pickup pre-fill from URL is supported
  // too for symmetry, but Places never passes one.
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

  // Live measurement of the bottom stack so the map's viewport padding
  // exactly matches the obscured area — no more hardcoded 380/460 guesses
  // that clipped the route on small phones or when the pit-stop expanded.
  const bottomStackRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const [bottomHeight, setBottomHeight] = useState(380)
  const [headerHeight, setHeaderHeight] = useState(96)
  // Soft-keyboard inset (iOS/Android). When the keyboard opens, the visual
  // viewport shrinks — we add that delta to the bottom padding so the route
  // re-fits into the still-visible map area above the keyboard.
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  // perf instrumentation — logs first useful client mount for the
  // landing → /cari navigation pair. Paste console output into the
  // perf audit doc to see the actual tap-to-paint delta.
  useEffect(() => { logNav('cari:mount') }, [])

  useEffect(() => {
    const stack = bottomStackRef.current
    const header = headerRef.current
    if (!stack || !header) return
    const measure = () => {
      setBottomHeight(stack.offsetHeight)
      setHeaderHeight(header.offsetHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stack)
    ro.observe(header)
    window.addEventListener('orientationchange', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return
    const vv = window.visualViewport
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardOffset(offset)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  // Service comes from the landing page via ?service=<id>. Defaults to
  // parcel (the platform's primary focus + most common kurir use case).
  const service: ServiceType = parseService(params.get('service'))

  // Auto-fill pickup with customer GPS on grant
  useEffect(() => {
    if (geo.coords && !pickup) {
      setPickup(geo.coords)
      if (!pickupLabel) setPickupLabel('My location')
    }
  }, [geo.coords, pickup, pickupLabel])

  // Phase C — auto-warm the pickup→dropoff bbox once both ends are set.
  // Fires only once per coord pair (state guard via JSON key), idle-
  // scheduled so it never competes with the user typing. Cooperates
  // with shouldSkipPreload() so 2G / Save-Data users are unaffected.
  const [warmedKey, setWarmedKey] = useState<string | null>(null)
  useEffect(() => {
    if (!pickup || !dropoff) return
    const key = `${pickup.lat.toFixed(3)},${pickup.lng.toFixed(3)}|${dropoff.lat.toFixed(3)},${dropoff.lng.toFixed(3)}`
    if (warmedKey === key) return
    const idle = (cb: () => void) => {
      type RIC = (fn: () => void, opts?: { timeout?: number }) => number
      const ric = (window as Window & { requestIdleCallback?: RIC }).requestIdleCallback
      if (typeof ric === 'function') ric(cb, { timeout: 2500 })
      else setTimeout(cb, 600)
    }
    idle(() => {
      void preloadBbox(bboxFromPoints(pickup, dropoff, 5))
        .then(() => setWarmedKey(key))
        .catch(() => { /* best-effort */ })
    })
  }, [pickup, dropoff, warmedKey])

  // Road-distance preview. Renders instantly with haversine × 1.3
  // and upgrades to the OSRM real road km once the proxy responds, so
  // the preview here matches what /cari/rider will show on the next
  // step (same cache key).
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

  // Lowest published driver fare in the city — surfaced in the View
  // drivers CTA so customers see the entry price before tapping. We only
  // ever display what drivers themselves listed, never a calculation
  // (PM 12/2019 safe-harbour — see TripPriceBanner for the full reasoning).
  const [lowestFareIdr, setLowestFareIdr] = useState<number | null>(null)
  const [nearbyCount, setNearbyCount] = useState<number | null>(null)

  // Real driver count + lowest fare in the area, keyed on pickup coords.
  // Refetches whenever the customer moves the pickup pin so the badge
  // and "Starting from Rp X" reflect the actual marketplace.
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
    })
    fetch(`/api/drivers/lowest-fare?${params}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { lowestFareIdr: number | null; driverCount: number | null } | null) => {
        if (!d) return
        if (typeof d.lowestFareIdr === 'number') setLowestFareIdr(d.lowestFareIdr)
        if (typeof d.driverCount === 'number') setNearbyCount(d.driverCount)
      })
      .catch(() => { /* silent — button gracefully omits price */ })
    return () => ctrl.abort()
  }, [queryLat, queryLng])

  const mapCenter = pickup ?? geo.coords ?? { lat: -7.7928, lng: 110.3657, accuracyM: 0 }

  // Detect the user's country from their GPS so the place autocomplete
  // only surfaces local results. Null while GPS is pending or detection
  // fails → autocomplete falls back to global search (no harm).
  const userCountry = useCountryFromCoords(geo.coords ?? null)
  const countryCodes = userCountry ? [userCountry] : []

  // No more fabricated rider pings on the map (audit 2026-05). Real
  // driver markers belong on /cari/rider, where the customer is choosing
  // a specific rider. The trip-planner map stays clean.
  const nearbyRiders: Rider[] = []

  // Awaits the geolocation promise so we always set pickup with the
  // freshest coords. The old version checked `geo.coords` synchronously
  // after calling request() — that closure variable was stale, so on
  // first tap nothing happened.
  async function handleUseLocation() {
    haptic.tap()
    const point = geo.coords ?? await geo.request()
    if (point) {
      setPickup(point)
      setPickupLabel('My location')
    }
  }

  function handleSearch() {
    if (!canSearch) return
    logNav('cari:view-drivers')
    haptic.impact()
    const params = new URLSearchParams({
      pLat: pickup!.lat.toString(),
      pLng: pickup!.lng.toString(),
      pName: pickupLabel || 'My location',
      dLat: dropoff!.lat.toString(),
      dLng: dropoff!.lng.toString(),
      dName: dropoffLabel || 'Destination',
    })
    if (pitstopOpen && pitstopNote.trim()) {
      params.set('stop', pitstopNote.trim())
    }
    params.set('filter', service)
    router.push(`/cari/rider?${params.toString()}`)
  }

  return (
    <>
      {/* NAVY BACKDROP — /cari is map-first; the map needs dark surround
          so it pops visually and the yellow Rent / B2B / Contact CTAs
          read with high contrast. Uses the brand navy (#172554) — same
          hex as the landing-page tile icons + specialty chips, so the
          accent thread carries through. White-on-other-pages remains
          the rule everywhere else. */}
      <div className="fixed inset-0 z-0" style={{ background: '#0F172A' }} />

      {/* ACTIVE MAP — sized to EXACTLY the visible hero band between the
          header and the bottom stack. fitBounds now frames the route
          into the container's full size, so the pickup pin, drop-off
          pin and route line are guaranteed to sit in the visible area —
          no padding tricks fighting with chrome. The container animates
          when the bottom sheet expands (pit-stop) or the keyboard opens
          so the route smoothly re-fits into the new band. */}
      <div
        className="fixed left-0 right-0 z-[1] px-3"
        style={{
          top: `${headerHeight}px`,
          // +12px adds breathing room between the map's bottom edge and
          // the top of the bottom sheet (service tabs). Keeps the map
          // floating as a card instead of butting against the sheet.
          bottom: `${bottomHeight + keyboardOffset + 12}px`,
          transition: 'top 220ms ease, bottom 220ms ease',
        }}
      >
        {/* Inner wrapper rounds the map corners now that there is
            breathing room on the left + right (px-3 above). overflow
            hidden so the map tiles get clipped by the rounded mask. */}
        <div className="w-full h-full rounded-2xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
          <RiderMap
            center={mapCenter}
            zoom={14}
            riders={nearbyRiders}
            markerStyle="ping"
            pickup={pickup}
            dropoff={dropoff}
            showRoute={canSearch}
            pitStop={canSearch && pitstopNote.trim().length > 0}
            onDropoffSet={(c) => { setDropoff({ ...c, accuracyM: 0 }); haptic.tap() }}
            height="100%"
            // pitch flattens to 0 once a route is set so fitBounds can
            // place the line cleanly in the hero band. Before route: a
            // gentle 25° tilt for visual interest.
            pitch={canSearch ? 0 : 25}
            // Container IS the visible band — padding is just edge
            // clearance so markers aren't flush against the boundary.
            viewportPadding={{ top: 24, bottom: 24, left: 32, right: 32 }}
          />
        </div>
      </div>

      {/* FLOATING ACTION BUTTONS — vertically centred in the hero band
          (between header and bottom-stack). pointer-events-none on the
          wrapper so empty space falls through to the map for drop-off
          tap; pointer-events-auto on the buttons themselves. z-20 sits
          below the header (z-30) and bottom-sheet (z-40) chrome. */}
      <div
        className="fixed right-3 z-20 flex flex-col items-end justify-center gap-3 pointer-events-none"
        style={{
          top: `${headerHeight}px`,
          // Track the map's new bottom inset (+12px gap) so the Rent /
          // B2B buttons stay vertically centred in the map card band.
          bottom: `${bottomHeight + keyboardOffset + 12}px`,
          transition: 'top 220ms ease, bottom 220ms ease',
        }}
      >
        <Link
          href="/rent"
          onClick={() => haptic.tap()}
          aria-label="Rent a motorbike"
          className="pointer-events-auto flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-2xl text-brand bg-black/85 backdrop-blur-md border-2 border-brand/60 shadow-[0_10px_28px_rgba(0,0,0,0.55)] active:scale-95 transition"
        >
          <Bike className="w-6 h-6" strokeWidth={2.5} />
          <span className="text-[11px] font-extrabold uppercase tracking-wider">Rent</span>
        </Link>
        {/* B2B — small businesses (Shopee/TikTok sellers, restaurants,
            warungs) browse drivers for regular delivery contracts.
            Matches the Rent button styling for visual consistency. */}
        <Link
          href="/business"
          onClick={() => haptic.tap()}
          aria-label="Business contracts — find a driver for regular deliveries"
          className="pointer-events-auto flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-2xl text-brand bg-black/85 backdrop-blur-md border-2 border-brand/60 shadow-[0_10px_28px_rgba(0,0,0,0.55)] active:scale-95 transition"
        >
          <Briefcase className="w-6 h-6" strokeWidth={2.5} />
          <span className="text-[12px] font-extrabold uppercase tracking-wider">B2B</span>
        </Link>
      </div>

      {/* HEADER — transparent, sits over the map. Logo + brand on the
          left, "42 nearby" black badge with yellow text + green dot
          (pink satellite ping ring) on the right. Text shadow keeps
          the brand legible over any map content underneath. */}
      <header ref={headerRef} className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center hover:opacity-85 transition"
            aria-label="IndoCity home"
          >
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdadasdas-removebg-preview.png?updatedAt=1779782176718"
              alt="IndoCity"
              className="h-8 sm:h-10 w-auto"
              loading="eager"
            />
          </Link>

          {/* RIDERS-NEARBY BADGE — solid black pill, brand-yellow text,
              green dot wrapped in a pink satellite-pulse ring (reuses
              the ridePing keyframe with a pink colour override). */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: '#000',
              border: '1px solid rgba(250,204,21,0.30)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.4)',
            }}
          >
            <span className="relative inline-flex items-center justify-center" style={{ width: 10, height: 10 }}>
              {/* Pink satellite ping ring */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(236,72,153,0.55)',
                  animation: 'ridePing 2.2s ease-out infinite',
                }}
              />
              {/* Solid green dot at the centre */}
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
            <span className="text-[12px] font-extrabold text-brand uppercase tracking-wider">
              {nearbyCount == null
                ? 'Cek nearby…'
                : nearbyCount === 0
                  ? 'No driver online'
                  : `${nearbyCount} nearby`}
            </span>
          </div>
        </div>
      </header>

      {/* BOTTOM SHEET — glass panel anchored to the bottom of the viewport.
          Holds the entire trip-planning form + the Find driver CTA. The
          map is interactive above it; user taps the visible map area to
          set drop-off.

          YELLOW ACCENT: 3px brand-yellow top border + brand-yellow glow
          shadow above the sheet + brand-gradient drag handle. Carries
          the landing's bold yellow energy into the booking page without
          sacrificing form-input legibility (the sheet body stays dark
          glass, the CTA keeps its primary-yellow standout). */}
      {/* BOTTOM STACK — three separate brand-yellow tile cards (Pickup,
          Pit stop, Drop off), styled like the landing's service tiles
          so the booking page carries the same bold visual language.
          The CTA flips to a DARK tile so it stands out as the action
          terminus against the three yellow controls. */}
      <div ref={bottomStackRef} className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
        <div className="mx-auto max-w-xl px-3 pb-2 space-y-2">
          {/* SERVICE SWITCHER — 4 quick tabs that sit directly under the
              map. Bike / Parcel / Food flip the ?service= URL param so
              the form copy (placeholders, CTA) re-renders for that mode.
              Places navigates to /places (the venues directory) — it is
              not a transport service so it is never the "active" tab. */}
          <div className="grid grid-cols-4 gap-2">
            <ServiceTab
              href="/cari?service=person"
              active={service === 'person'}
              icon={<Bike className="w-[18px] h-[18px]" strokeWidth={2.5} />}
              label="Bike"
            />
            <ServiceTab
              href="/cari?service=parcel"
              active={service === 'parcel'}
              icon={<Briefcase className="w-[18px] h-[18px]" strokeWidth={2.5} />}
              label="Parcel"
            />
            <ServiceTab
              href="/cari?service=food"
              active={service === 'food'}
              icon={<Utensils className="w-[18px] h-[18px]" strokeWidth={2.5} />}
              label="Food"
            />
            <ServiceTab
              href="/places"
              active={false}
              icon={<Landmark className="w-[18px] h-[18px]" strokeWidth={2.5} />}
              label="Places"
            />
          </div>

          {/* PICKUP TILE — dark-red round GPS button sits INSIDE the input
              on the right, auto-sets the location to the customer's GPS
              coords on tap. Replaces the previous "My location" text link. */}
          <div
            className="rounded-2xl p-2.5 text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)]"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Pick up</span>
              {/* Saved-locations chip for the pickup tile. Replaces the old
                  "Places" link to /places — the 4-tab service switcher
                  above the bottom sheet now owns navigation to /places,
                  so the pickup tile gets the more useful saved-places
                  picker (one tap → fill pickup with Home/Office/etc). */}
              <SavedPlacesChip
                kind="pickup"
                currentLocation={pickup}
                currentLocationLabel={pickupLabel}
                onSelect={(p) => {
                  setPickup({ lat: p.lat, lng: p.lng, accuracyM: 0 })
                  setPickupLabel(p.label)
                  haptic.tap()
                }}
              />
            </div>
            <PlaceAutocomplete
              value={pickupLabel}
              onChange={setPickupLabel}
              onSelect={(s) => {
                setPickup({ lat: s.lat, lng: s.lng, accuracyM: 0 })
                setPickupLabel(s.label)
                haptic.tap()
              }}
              placeholder={pickup ? 'Pick-up name (optional)' : PLACEHOLDERS[service].pickup}
              className="flex-1 min-w-0 bg-bg/75 border border-bg/30 text-ink placeholder:text-white/50 rounded-xl px-3 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-bg/90 transition"
              near={geo.coords ?? null}
              countryCodes={countryCodes}
              ariaLabel="Pick up location"
              clearOnFocus
              leftSlot={
                <button
                  onClick={handleUseLocation}
                  aria-label="Auto-set my GPS location"
                  className="shrink-0 w-12 rounded-xl flex items-center justify-center text-white transition active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #B91C1C, #7F1D1D)',
                    boxShadow:
                      '0 4px 12px rgba(127,29,29,0.55), 0 0 0 2px rgba(0,0,0,0.18) inset',
                  }}
                >
                  <MapPin className={`w-5 h-5 ${geo.status === 'requesting' ? 'animate-pulse' : ''}`} strokeWidth={2.5} />
                </button>
              }
            />
          </div>

          {/* PIT STOP TILE — 3 states driven by (pitstopOpen, pitstopNote):
              1. collapsed + empty  → "+ Add a pit stop" CTA tile
              2. collapsed + text   → "✓ Pit stop set: …" compact tile (tap to edit)
              3. expanded           → textarea + dynamic close/save button */}
          {(() => {
            const hasNote = pitstopNote.trim().length > 0
            if (!pitstopOpen && !hasNote) {
              return (
                <button
                  onClick={() => { setPitstopOpen(true); haptic.tap() }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)] hover:from-brand2 hover:to-brand transition"
                >
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: '#0A0A0A', boxShadow: '0 0 0 2px rgba(0,0,0,0.18) inset' }}
                  >
                    <Plus className="w-4 h-4 text-white" strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-left text-[13px] font-extrabold uppercase tracking-wider">Add a pit stop</span>
                  <img
                    src="https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2007_57_14%20PM.png"
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="h-10 w-auto shrink-0"
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}
                  />
                </button>
              )
            }
            if (!pitstopOpen && hasNote) {
              return (
                <button
                  onClick={() => { setPitstopOpen(true); haptic.tap() }}
                  aria-label="Edit pit stop"
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)] hover:from-brand2 hover:to-brand transition"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-bg flex items-center justify-center" style={{ boxShadow: '0 0 10px rgba(249,115,22,0.65)' }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F97316' }} />
                  </span>
                  <span className="flex-1 text-left min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80">Pit stop set · tap to edit</span>
                    <span className="block text-[13px] font-extrabold truncate">{pitstopNote.trim()}</span>
                  </span>
                  <img
                    src="https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2007_57_14%20PM.png"
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="h-10 w-auto shrink-0"
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}
                  />
                </button>
              )
            }
            // expanded
            return (
              <div className="rounded-2xl p-2.5 text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)] animate-[fadeUp_0.3s_ease-out_both] space-y-2">
                <div className="mb-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">Pit stop</span>
                </div>
                <div className="relative">
                  <textarea
                    rows={2}
                    maxLength={140}
                    className="w-full bg-bg/75 border border-bg/30 text-ink placeholder:text-white/50 rounded-xl pl-3 pr-14 py-2.5 text-[13px] font-bold focus:outline-none focus:bg-bg/90 transition resize-none"
                    placeholder='e.g. "Stop at warung, buy 1 pack Marlboro"'
                    value={pitstopNote}
                    onChange={e => setPitstopNote(e.target.value)}
                    autoFocus
                  />
                  <img
                    src="https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2007_57_14%20PM.png"
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="absolute top-1/2 right-2 -translate-y-1/2 h-10 w-auto pointer-events-none"
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}
                  />
                </div>
                {/* Button label flips based on text state: cancel when
                    empty, save (keeps text + closes tile) when present. */}
                {hasNote ? (
                  <button
                    onClick={() => { setPitstopOpen(false); haptic.tap() }}
                    aria-label="Save pit stop"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg text-brand font-extrabold text-[12px] uppercase tracking-wider hover:bg-black transition"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    Add pit stop
                  </button>
                ) : (
                  <button
                    onClick={() => { setPitstopOpen(false); setPitstopNote(''); haptic.tap() }}
                    aria-label="Close pit stop"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg text-ink font-extrabold text-[12px] uppercase tracking-wider hover:bg-black transition"
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                    Close pit stop
                  </button>
                )}
              </div>
            )
          })()}

          {/* DROP OFF TILE — same autocomplete pattern as pickup, but
              without a GPS button (drop-off is wherever the customer is
              going, not where they are). Tap-map still works as a
              fallback for setting drop-off coords. */}
          <div
            className="rounded-2xl p-2.5 text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)]"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Drop off</span>
              <SavedPlacesChip
                kind="dropoff"
                currentLocation={dropoff}
                currentLocationLabel={dropoffLabel}
                onSelect={(p) => {
                  setDropoff({ lat: p.lat, lng: p.lng, accuracyM: 0 })
                  setDropoffLabel(p.label)
                  haptic.tap()
                }}
              />
            </div>
            <PlaceAutocomplete
              value={dropoffLabel}
              onChange={setDropoffLabel}
              onSelect={(s) => {
                setDropoff({ lat: s.lat, lng: s.lng, accuracyM: 0 })
                setDropoffLabel(s.label)
                haptic.tap()
              }}
              placeholder={PLACEHOLDERS[service].dropoff}
              className="w-full bg-bg/75 border border-bg/30 text-ink placeholder:text-white/50 rounded-xl px-3 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-bg/90 transition"
              near={pickup ?? geo.coords ?? null}
              countryCodes={countryCodes}
              ariaLabel="Drop off location"
              clearOnFocus
            />
            {/* INLINE PRICE READOUT — ALWAYS rendered (so the customer
                sees a price line even before they pick a destination).
                Empty state reads "Total fare Rp 0.00"; once pickup +
                dropoff are both set, it switches to the lowest published
                driver fare ("Lowest Trip Price Rp 12,000").
                COMPLIANCE NOTE: the founder chose this copy explicitly
                — see the chat. "Total fare" / "Trip Price" wording was
                previously avoided per PM 12/2019 directory safe-harbour.
                Revisit if regulator pushback occurs. */}
            <div className="mt-2 pt-2 border-t border-bg/25">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                {canSearch && tripKm != null && lowestFareIdr != null ? (
                  <span className="text-[13px] font-extrabold tracking-tight text-bg">
                    Lowest Trip Price Rp {lowestFareIdr.toLocaleString('en-US')}
                  </span>
                ) : (
                  <span className="text-[13px] font-extrabold tracking-tight text-bg/85">
                    Total fare Rp 0.00
                  </span>
                )}
                {canSearch && tripKm != null && (
                  <span className="text-[11px] font-bold tracking-tight text-bg/80">
                    {tripKm.toFixed(1)} km
                  </span>
                )}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-bg/55 mt-0.5">
                Estimate · agreed with driver
              </div>
            </div>
          </div>

          {/* CTA TILE — black infill with brand-yellow edge line. Under
              the three yellow tiles, this dark fill creates the contrast
              terminus. !mt-6 forces a clear gap above (parent's
              space-y-2 has higher specificity than plain mt-N, so we
              use Tailwind's ! prefix to win). Always reads "View
              drivers". */}
          <button
            onClick={handleSearch}
            disabled={!canSearch}
            className="w-full flex items-center justify-center gap-2 p-3.5 !mt-6 rounded-2xl text-brand font-extrabold text-[15px] bg-gradient-to-r from-bg to-[#1a1a1a] border-2 border-brand hover:border-brand2 active:scale-[0.99] transition-all shadow-[0_10px_28px_rgba(0,0,0,0.55),0_0_0_1px_rgba(250,204,21,0.18)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
            <span>View drivers</span>
            {canSearch && lowestFareIdr != null && (
              <span className="text-[12px] font-bold text-dim ml-1">
                · from Rp {lowestFareIdr.toLocaleString('en-US')}
              </span>
            )}
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    </>
  )
}

// Service-switcher tab used in the bottom sheet on /cari. Renders as a
// rounded tile with an icon + label, stacked vertically. Active state
// is the brand-yellow gradient (matches the booking tiles below);
// inactive is a dark glass on the navy backdrop. Prefetches the target
// so the tab swap is instant — the form state for /cari?service= reuses
// the same component tree, so the URL flip is effectively zero-cost.
function ServiceTab({
  href,
  active,
  icon,
  label,
}: {
  href: string
  active: boolean
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      className={
        'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-extrabold uppercase tracking-wider transition active:scale-95 ' +
        (active
          ? 'text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_6px_18px_rgba(250,204,21,0.32)]'
          : 'text-white bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.10]')
      }
    >
      {icon}
      {label}
    </Link>
  )
}

