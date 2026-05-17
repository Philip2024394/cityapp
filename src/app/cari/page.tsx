'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Search, Crosshair, Plus, X } from 'lucide-react'
import RiderMap from '@/components/map/RiderMapDynamic'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { haversineKm } from '@/lib/geo/haversine'
import type { ServiceType } from '@/types/rider'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'

// Per-service placeholder text — tailors the inputs to the picked service.
// Service is picked on the LANDING page now (3 landscape tiles) and arrives
// here via the ?service=<id> query param.
const PLACEHOLDERS: Record<ServiceType, { pickup: string; dropoff: string }> = {
  person: { pickup: 'Where do you want to be picked up?', dropoff: 'Where do you want to go?' },
  parcel: { pickup: 'Where to pick up the package?',      dropoff: 'Destination address' },
  food:   { pickup: 'Restaurant or warung name',           dropoff: 'Drop-off address' },
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

  const serviceLabel = service === 'person' ? 'Bike Ride' : service === 'food' ? 'Bike Food' : 'Bike Parcel'
  const serviceEmoji = service === 'person' ? '🛵' : service === 'food' ? '🍱' : '📦'

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

      {/* FLOATING CHIPS — top-left "riders nearby" pulse (mirrors the
          landing's online pill), top-right active service tile + change
          link. Both float over the map for the premium ride-hail look. */}
      <div className="relative z-30 px-3 -mt-1 flex items-start justify-between gap-2">
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

        <Link
          href="/"
          aria-label={`Service: ${serviceLabel} — tap to change`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:opacity-90 transition"
          style={{
            background: 'rgba(250,204,21,0.18)',
            backdropFilter: 'blur(16px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
            border: '1px solid rgba(250,204,21,0.45)',
            boxShadow: '0 4px 14px rgba(250,204,21,0.22)',
          }}
        >
          <span className="text-[14px] leading-none" aria-hidden>{serviceEmoji}</span>
          <span className="text-[12px] font-extrabold text-brand">{serviceLabel}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand/65 ml-0.5">change</span>
        </Link>
      </div>

      {/* BOTTOM SHEET — glass panel anchored to the bottom of the viewport.
          Holds the entire trip-planning form + the Find driver CTA. The
          map is interactive above it; user taps the visible map area to
          set drop-off. Decorative drag handle keeps the sheet aesthetic
          consistent with native iOS/Android bottom sheets. */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
        <div className="mx-auto max-w-xl px-3 pb-2">
          <div
            className="rounded-[24px] border border-line/40 p-3 space-y-2.5"
            style={{
              background: 'rgba(10,10,12,0.88)',
              backdropFilter: 'blur(22px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
              boxShadow: '0 -12px 36px rgba(0,0,0,0.55)',
            }}
          >
            {/* Decorative drag handle — purely aesthetic */}
            <div className="mx-auto w-10 h-1 rounded-full bg-white/20" />

            {/* Route field group — left dot column, right field column */}
            <div className="flex items-start gap-2.5">
              <div className="flex flex-col items-center pt-2.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-glow" />
                <div className="w-px h-7 bg-line my-1" />
                {pitstopOpen && (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-brand/80" style={{ border: '2px solid #FACC15' }} />
                    <div className="w-px h-7 bg-line my-1" />
                  </>
                )}
                <div className="w-2.5 h-2.5 rounded-sm bg-online" />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {/* Pickup — input + inline GPS button */}
                <div className="relative">
                  <input
                    className="input pr-11"
                    placeholder={pickup ? 'Pick-up name (optional)' : PLACEHOLDERS[service].pickup}
                    value={pickupLabel}
                    onChange={e => setPickupLabel(e.target.value)}
                  />
                  <button
                    onClick={handleUseLocation}
                    aria-label="Use my GPS location"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-brand hover:bg-white/5 transition"
                  >
                    <Crosshair className={`w-4 h-4 ${geo.status === 'requesting' ? 'animate-pulse' : ''}`} />
                  </button>
                </div>

                {/* Pit stop — compact collapsed button, expands to textarea */}
                {!pitstopOpen ? (
                  <button
                    onClick={() => { setPitstopOpen(true); haptic.tap() }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-line hover:border-brand/40 hover:bg-brand/5 transition text-left text-[12px] font-bold text-muted"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand" strokeWidth={3} />
                    Add a pit stop on the way
                  </button>
                ) : (
                  <div className="animate-[fadeUp_0.3s_ease-out_both] relative">
                    <textarea
                      className="input pr-9"
                      rows={2}
                      maxLength={140}
                      placeholder='e.g. "Stop at warung, buy 1 pack Marlboro"'
                      value={pitstopNote}
                      onChange={e => setPitstopNote(e.target.value)}
                    />
                    <button
                      onClick={() => { setPitstopOpen(false); setPitstopNote(''); haptic.tap() }}
                      aria-label="Remove pit stop"
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg flex items-center justify-center text-dim hover:text-ink hover:bg-white/5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Drop off */}
                <input
                  className="input"
                  placeholder={PLACEHOLDERS[service].dropoff}
                  value={dropoffLabel}
                  onChange={e => setDropoffLabel(e.target.value)}
                />
              </div>
            </div>

            {/* CTA row — optional distance chip + Find driver primary */}
            <div className="flex items-stretch gap-2 pt-1">
              {tripKm != null && (
                <span className="shrink-0 inline-flex items-center text-[12px] font-extrabold text-brand bg-brand/10 border border-brand/25 px-2.5 rounded-xl">
                  ~{tripKm.toFixed(1)} km
                </span>
              )}
              <button
                onClick={handleSearch}
                disabled={!canSearch}
                className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                {canSearch ? 'Find driver' : 'Set pickup & drop off'}
                {canSearch && <ChevronLeft className="w-4 h-4 rotate-180" />}
              </button>
            </div>

            {/* Compact disclaimer — legal anchor kept on every booking page */}
            <PlatformDisclaimer variant="compact" />
          </div>
        </div>
      </div>
    </>
  )
}

