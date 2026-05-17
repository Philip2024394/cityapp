'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Search, MapPin, Plus, X } from 'lucide-react'
import RiderMap from '@/components/map/RiderMapDynamic'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useCountryFromCoords } from '@/hooks/useCountryFromCoords'
import { useHaptic } from '@/hooks/useHaptic'
import { haversineKm } from '@/lib/geo/haversine'
import type { Rider, ServiceType } from '@/types/rider'

// Per-service placeholder text — tailors the inputs to the picked service.
// Service is picked on the LANDING page now (3 landscape tiles) and arrives
// here via the ?service=<id> query param.
const PLACEHOLDERS: Record<ServiceType, { pickup: string; dropoff: string }> = {
  person: { pickup: 'Where do you want to be picked up?', dropoff: 'Where do you want to go?' },
  parcel: { pickup: 'Where to pick up the package?',      dropoff: 'Destination address' },
  food:   { pickup: 'Restaurant or warung name',           dropoff: 'Drop-off address' },
}

// 24 nearby rider pings scattered around the current map centre — pure
// visual confirmation of the "42 nearby" claim in the top-left chip.
// Deterministic golden-angle scatter so SSR + client agree.
function buildNearbyRiders(centerLat: number, centerLng: number, count = 24): Rider[] {
  const out: Rider[] = []
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996323
    const radius = 0.003 + (i / count) * 0.022
    out.push({
      id: `nearby-${i}`,
      slug: `nearby-${i}`,
      name: '', photoUrl: '', whatsappE164: '', bio: '', area: '',
      city: 'Yogyakarta',
      services: [],
      bike: { make: '', model: '', year: 0, color: '', type: 'matic', hasBox: false },
      pricePerKm: 0, minFee: 0,
      isOnline: true, lastSeenAt: '',
      lat: centerLat + Math.sin(angle) * radius,
      lng: centerLng + Math.cos(angle) * radius,
      subscriptionStatus: 'active',
    })
  }
  return out
}

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
  const geo = useGeolocation(true)
  const haptic = useHaptic()

  const [pickup, setPickup] = useState<GeoPoint | null>(null)
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null)
  const [pickupLabel, setPickupLabel] = useState('')
  const [dropoffLabel, setDropoffLabel] = useState('')
  const [pitstopOpen, setPitstopOpen] = useState(false)
  const [pitstopNote, setPitstopNote] = useState('')
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

  const tripKm = pickup && dropoff ? haversineKm(pickup, dropoff) : null
  const canSearch = !!pickup && !!dropoff

  const mapCenter = pickup ?? geo.coords ?? { lat: -7.7928, lng: 110.3657, accuracyM: 0 }

  // Detect the user's country from their GPS so the place autocomplete
  // only surfaces local results. Null while GPS is pending or detection
  // fails → autocomplete falls back to global search (no harm).
  const userCountry = useCountryFromCoords(geo.coords ?? null)
  const countryCodes = userCountry ? [userCountry] : []

  // Nearby rider pings recompute when the map centre changes (after GPS
  // grant or pickup edit). useMemo so the array reference is stable
  // across re-renders that don't move the centre, avoiding marker churn.
  const nearbyRiders = useMemo(
    () => buildNearbyRiders(mapCenter.lat, mapCenter.lng, 24),
    [mapCenter.lat, mapCenter.lng]
  )

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
      {/* FULL-BLEED MAP — fixed to the viewport so it sits as the
          interactive hero behind every other UI layer. pitch=50 adds
          the Apple-Maps / Grab 3D perspective; zoom 14 lets the visible
          portion above the bottom sheet still show the route + pins. */}
      <div className="fixed inset-0 z-0">
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
          height="100dvh"
          pitch={50}
          // Reserve the bottom-sheet area + header area so the map's
          // visible "hero" portion (where the route + pickup pin +
          // drop-off pin + nearby driver pings live) is always above
          // the cards. Bigger bottom padding when the pit stop is
          // expanded so the expanded sheet doesn't cover anything.
          viewportPadding={{
            top: 100,
            bottom: pitstopOpen ? 480 : 400,
            left: 24,
            right: 24,
          }}
        />
      </div>

      {/* HEADER — transparent, sits over the map. Logo + brand on the
          left, "42 nearby" black badge with yellow text + green dot
          (pink satellite ping ring) on the right. Text shadow keeps
          the brand legible over any map content underneath. */}
      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition" aria-label="City Rider home">
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png"
              alt=""
              className="h-11 w-auto"
              loading="eager"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.85))' }}
            />
            <div
              className="font-extrabold tracking-tight text-[16px]"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.85)' }}
            >
              City <span className="gradient-text">Rider</span>
            </div>
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
              42 nearby
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
      <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
        <div className="mx-auto max-w-xl px-3 pb-2 space-y-2">
          {/* PICKUP TILE — dark-red round GPS button sits INSIDE the input
              on the right, auto-sets the location to the customer's GPS
              coords on tap. Replaces the previous "My location" text link. */}
          <div
            className="rounded-2xl p-2.5 text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)]"
          >
            <div className="mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Pick up</span>
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
              rightSlot={
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
                  <Plus className="w-4 h-4 shrink-0" strokeWidth={3} />
                  <span className="flex-1 text-left text-[13px] font-extrabold uppercase tracking-wider">Add a pit stop</span>
                  <img
                    src="https://ik.imagekit.io/nepgaxllc/Untitledasdasaa-removebg-preview.png"
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
                    src="https://ik.imagekit.io/nepgaxllc/Untitledasdasaa-removebg-preview.png"
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
                    src="https://ik.imagekit.io/nepgaxllc/Untitledasdasaa-removebg-preview.png"
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
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Drop off</span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-75">Tap map</span>
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
            />
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
            {canSearch && tripKm != null && (
              <span className="text-[12px] font-bold text-dim ml-1">· ~{tripKm.toFixed(1)} km</span>
            )}
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    </>
  )
}

