'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Search, MapPin, Plus, X } from 'lucide-react'
import RiderMap from '@/components/map/RiderMapDynamic'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
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

  // Nearby rider pings recompute when the map centre changes (after GPS
  // grant or pickup edit). useMemo so the array reference is stable
  // across re-renders that don't move the centre, avoiding marker churn.
  const nearbyRiders = useMemo(
    () => buildNearbyRiders(mapCenter.lat, mapCenter.lng, 24),
    [mapCenter.lat, mapCenter.lng]
  )

  function handleUseLocation() {
    haptic.tap()
    geo.request()
    if (geo.coords) {
      setPickup(geo.coords)
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
          onDropoffSet={(c) => { setDropoff({ ...c, accuracyM: 0 }); haptic.tap() }}
          height="100dvh"
          pitch={50}
        />
      </div>

      {/* HEADER — transparent, sits over the map. Same brand row as the
          landing for consistency. Text shadow keeps it legible over any
          map content underneath. */}
      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
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
        </div>
      </header>

      {/* FLOATING CHIP — top-left "riders nearby" pulse mirrors the
          landing's online pill. Floats over the map for the ride-hail
          look. Top-right active-service badge removed per design. */}
      <div className="relative z-30 px-3 -mt-1 flex items-start">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(10,10,12,0.78)',
            backdropFilter: 'blur(16px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
            border: '1px solid rgba(34,197,94,0.30)',
            boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
          }}
        >
          <span className="dot-online !w-2 !h-2" />
          <span className="text-[12px] font-extrabold text-online uppercase tracking-wider">
            42 nearby
          </span>
        </div>
      </div>

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
            <div className="relative">
              <input
                className="w-full bg-bg/15 border border-bg/20 text-bg placeholder:text-bg/60 rounded-xl pl-3 pr-14 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-bg/25 transition"
                placeholder={pickup ? 'Pick-up name (optional)' : PLACEHOLDERS[service].pickup}
                value={pickupLabel}
                onChange={e => setPickupLabel(e.target.value)}
              />
              <button
                onClick={handleUseLocation}
                aria-label="Auto-set my GPS location"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white transition active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #B91C1C, #7F1D1D)',
                  boxShadow:
                    '0 4px 12px rgba(127,29,29,0.55), 0 0 0 2px rgba(0,0,0,0.18) inset',
                }}
              >
                <MapPin className={`w-4 h-4 ${geo.status === 'requesting' ? 'animate-pulse' : ''}`} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* PIT STOP TILE — collapsed: yellow CTA with the pit-stop flag
              image on the right; expanded: yellow tile with textarea +
              flag image floating in the input's right edge. */}
          {!pitstopOpen ? (
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
          ) : (
            <div className="rounded-2xl p-2.5 text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)] animate-[fadeUp_0.3s_ease-out_both] space-y-2">
              <div className="mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Pit stop</span>
              </div>
              <div className="relative">
                <textarea
                  rows={2}
                  maxLength={140}
                  className="w-full bg-bg/15 border border-bg/20 text-bg placeholder:text-bg/60 rounded-xl pl-3 pr-14 py-2.5 text-[13px] font-bold focus:outline-none focus:bg-bg/25 transition resize-none"
                  placeholder='e.g. "Stop at warung, buy 1 pack Marlboro"'
                  value={pitstopNote}
                  onChange={e => setPitstopNote(e.target.value)}
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
              {/* Long black close button — sits as the full-width bottom
                  action of the pit-stop tile, clear way to dismiss. */}
              <button
                onClick={() => { setPitstopOpen(false); setPitstopNote(''); haptic.tap() }}
                aria-label="Remove pit stop"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg text-ink font-extrabold text-[12px] uppercase tracking-wider hover:bg-black transition"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
                Close pit stop
              </button>
            </div>
          )}

          {/* DROP OFF TILE */}
          <div
            className="rounded-2xl p-2.5 text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Drop off</span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-75">Tap map</span>
            </div>
            <input
              className="w-full bg-bg/15 border border-bg/20 text-bg placeholder:text-bg/60 rounded-xl px-3 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-bg/25 transition"
              placeholder={PLACEHOLDERS[service].dropoff}
              value={dropoffLabel}
              onChange={e => setDropoffLabel(e.target.value)}
            />
          </div>

          {/* CTA TILE — flipped DARK so the action terminus stands out
              against the three yellow controls above. Brand-yellow text
              + brand border keeps it on-brand. */}
          <button
            onClick={handleSearch}
            disabled={!canSearch}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-brand font-extrabold text-[15px] bg-gradient-to-r from-bg to-[#1a1a1a] border-2 border-brand/70 shadow-[0_10px_28px_rgba(0,0,0,0.55),0_0_0_1px_rgba(250,204,21,0.18)] hover:border-brand transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
            {canSearch ? (
              <>
                <span>Find driver</span>
                {tripKm != null && (
                  <span className="text-[12px] font-bold text-dim ml-1">· ~{tripKm.toFixed(1)} km</span>
                )}
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </>
            ) : (
              <span>Set pickup &amp; drop off</span>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

