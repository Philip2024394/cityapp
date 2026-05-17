'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Search, MapPin, Crosshair, ArrowDown, Plus, X, StopCircle } from 'lucide-react'
import RiderMap from '@/components/map/RiderMapDynamic'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { haversineKm } from '@/lib/geo/haversine'

export default function PlanTripPage() {
  const router = useRouter()
  const geo = useGeolocation(true)
  const haptic = useHaptic()

  const [pickup, setPickup] = useState<GeoPoint | null>(null)
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null)
  const [pickupLabel, setPickupLabel] = useState('')
  const [dropoffLabel, setDropoffLabel] = useState('')
  const [pitstopOpen, setPitstopOpen] = useState(false)
  const [pitstopNote, setPitstopNote] = useState('')

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
    router.push(`/cari/rider?${params.toString()}`)
  }

  return (
    <>
      <Header />

      <main className="min-h-screen pb-32">
        <div className="max-w-xl mx-auto px-4 pt-3 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-muted">
            <StepDot n={1} active />
            <span className="text-brand">Plan trip</span>
            <span className="text-line">→</span>
            <StepDot n={2} />
            <span>Pick rider</span>
            <span className="text-line">→</span>
            <StepDot n={3} />
            <span>WhatsApp</span>
          </div>

          <h1 className="text-2xl font-extrabold leading-tight">
            Where do you need to ship from and to?
          </h1>

          {/* Small map preview at top */}
          <div>
            <RiderMap
              center={mapCenter}
              zoom={13}
              pickup={pickup}
              dropoff={dropoff}
              showRoute={canSearch}
              onDropoffSet={(c) => { setDropoff({ ...c, accuracyM: 0 }); haptic.tap() }}
              height="220px"
            />
            <p className="text-[12px] text-dim mt-2 text-center">
              Tap the map to set <span className="text-online font-bold">drop-off location</span>
            </p>
          </div>

          {/* Pickup → (optional) Pit stop → Drop off — all in one card.
              The left-side dot column dynamically grows a 3rd dot when pit
              stop is active so the visual route reads top-to-bottom. */}
          <div className="card p-4">
            <div className="flex items-start gap-3">
              {/* Left-side route dots */}
              <div className="flex flex-col items-center pt-3 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-glow" />
                <div className="w-px h-8 bg-line my-1" />
                {pitstopOpen && (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-brand/80" style={{ border: '2px solid #FACC15' }} />
                    <div className="w-px h-8 bg-line my-1" />
                  </>
                )}
                <div className="w-2.5 h-2.5 rounded-sm bg-online" />
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                {/* Pickup */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label !mb-0">Pick up</label>
                    <button
                      onClick={handleUseLocation}
                      className="text-brand text-[12px] font-bold flex items-center gap-1 normal-case tracking-normal"
                    >
                      <Crosshair className="w-3 h-3" />
                      {geo.status === 'requesting' ? 'Searching…' : 'My location'}
                    </button>
                  </div>
                  <input
                    className="input"
                    placeholder={pickup ? 'Place name (optional)' : 'Tap "My location" or type an address'}
                    value={pickupLabel}
                    onChange={e => setPickupLabel(e.target.value)}
                  />
                  {pickup && (
                    <div className="text-[12px] text-dim mt-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)}
                    </div>
                  )}
                </div>

                {/* PIT STOP — inline between pickup and dropoff. Collapsed
                    button when off; reveals a textarea when active. */}
                {!pitstopOpen ? (
                  <button
                    onClick={() => { setPitstopOpen(true); haptic.tap() }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-line hover:border-brand/40 hover:bg-brand/5 transition text-left text-[13px] font-bold text-muted min-h-[40px]"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand" />
                    Add a pit stop on the way
                  </button>
                ) : (
                  <div className="animate-[fadeUp_0.3s_ease-out_both]">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="label !mb-0 flex items-center gap-1.5">
                        <StopCircle className="w-3 h-3 text-brand" />
                        Pit stop
                      </label>
                      <button
                        onClick={() => { setPitstopOpen(false); setPitstopNote(''); haptic.tap() }}
                        className="text-dim hover:text-ink text-[12px] font-bold flex items-center gap-1 normal-case tracking-normal"
                        aria-label="Remove pit stop"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                    <textarea
                      className="input"
                      rows={2}
                      maxLength={140}
                      placeholder='e.g. "Stop at warung depan, buy 1 pack Marlboro Lights"'
                      value={pitstopNote}
                      onChange={e => setPitstopNote(e.target.value)}
                    />
                    <p className="text-[12px] text-dim mt-1.5 leading-relaxed">
                      💡 Rider sets their own pit-stop fee (Rp 0–25K). For item costs, transfer the rider via GoPay/QRIS upfront.
                    </p>
                  </div>
                )}

                {/* Drop off */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label !mb-0">Drop off</label>
                    <span className="text-dim text-[12px] font-bold flex items-center gap-1 normal-case tracking-normal">
                      <ArrowDown className="w-3 h-3" />
                      Tap on the map
                    </span>
                  </div>
                  <input
                    className="input"
                    placeholder="Destination address (e.g. Jl. Sudirman 120)"
                    value={dropoffLabel}
                    onChange={e => setDropoffLabel(e.target.value)}
                  />
                  {dropoff && (
                    <div className="text-[12px] text-dim mt-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {dropoff.lat.toFixed(4)}, {dropoff.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {geo.status === 'denied' && (
              <div className="mt-3 p-3 rounded-xl bg-danger/10 border border-danger/30 text-[13px] text-danger">
                GPS denied. Tap the map to set the pickup location too.
              </div>
            )}

            {tripKm != null && (
              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                <span className="text-[12px] text-dim uppercase tracking-wider font-extrabold">Distance</span>
                <span className="text-brand font-extrabold text-[16px]">~{tripKm.toFixed(1)} km</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="max-w-xl mx-auto px-4 pb-3">
          <div className="glass-strong rounded-2xl p-3">
            <button
              onClick={handleSearch}
              disabled={!canSearch}
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4" />
              {canSearch ? 'Find driver' : 'Set pickup & drop off first'}
              {canSearch && <ChevronLeft className="w-4 h-4 rotate-180" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 glass-strong pt-safe">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="text-[14px] font-extrabold">
          City <span className="gradient-text">Rider</span>
        </div>
        <div className="w-12" />
      </div>
    </header>
  )
}

function StepDot({ n, active }: { n: number; active?: boolean }) {
  return (
    <span
      className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-extrabold"
      style={{
        background: active ? '#FACC15' : 'rgba(255,255,255,0.08)',
        color: active ? '#0A0A0A' : 'rgba(255,255,255,0.5)',
      }}
    >
      {n}
    </span>
  )
}
