'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Search, MapPin, Crosshair, ArrowDown, Plus, X, StopCircle } from 'lucide-react'
import RiderMap from '@/components/map/RiderMapDynamic'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { haversineKm } from '@/lib/geo/haversine'
import type { ServiceType } from '@/types/rider'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'

// Brand images for the 3 service categories — same imagekit PNGs as the
// selling page so the visual identity is consistent end-to-end.
const SERVICE_OPTIONS: Array<{ id: ServiceType; label: string; sub: string; img: string }> = [
  { id: 'person', label: 'Bike Ride',   sub: 'Passenger',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitleddasdas-removebg-preview.png' },
  { id: 'parcel', label: 'Bike Parcel', sub: 'Package · Courier',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitledsddasd-removebg-preview.png?updatedAt=1779013880961' },
  { id: 'food',   label: 'Bike Food',   sub: 'Resto · Warung',
    img: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2017,%202026,%2005_29_25%20PM.png?updatedAt=1779013783890' },
]

// Per-service placeholder text — tailors the inputs to the picked service
const PLACEHOLDERS: Record<ServiceType, { pickup: string; dropoff: string }> = {
  person: { pickup: 'Where do you want to be picked up?', dropoff: 'Where do you want to go?' },
  parcel: { pickup: 'Where to pick up the package?',      dropoff: 'Destination address' },
  food:   { pickup: 'Restaurant or warung name',           dropoff: 'Drop-off address' },
}

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
  // Default to Parcel — the platform's primary focus per Services page.
  // Most common kurir use case in Indonesia + covers documents/small food.
  const [service, setService] = useState<ServiceType>('parcel')

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

  return (
    <>
      <Header />

      <main className="pb-28">
        <div className="max-w-xl mx-auto px-3 pt-2 space-y-2.5">
          {/* SERVICE TYPE — 3 image cards, right under the header. Default
              Parcel. Active card gets brand-yellow ring + raised. */}
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_OPTIONS.map(opt => {
              const active = service === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => { setService(opt.id); haptic.tap() }}
                  className="card p-2 text-center transition relative"
                  style={{
                    // Solid frosted backdrop so the service cards stay
                    // clearly visible over the map background.
                    borderColor: active ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)',
                    background:  active ? 'rgba(250,204,21,0.10)' : 'rgba(17,17,22,0.72)',
                    backdropFilter: 'blur(14px) saturate(1.3)',
                    WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
                    transform:   active ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow:   active
                      ? '0 0 0 1px rgba(250,204,21,0.22), 0 10px 24px rgba(250,204,21,0.18)'
                      : '0 6px 18px rgba(0,0,0,0.45)',
                  }}
                  aria-pressed={active}
                >
                  <img src={opt.img} alt="" aria-hidden loading="lazy"
                       className="h-9 w-auto object-contain mx-auto"
                       style={{ filter: active ? 'drop-shadow(0 4px 10px rgba(250,204,21,0.35))' : 'none' }} />
                  <div className="text-[13px] font-extrabold mt-1 leading-tight"
                       style={{ color: active ? '#FACC15' : '#fff' }}>
                    {opt.label}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Trip preview map — frosted brand-bordered container.
              Height kept tight so the full booking flow fits on one screen. */}
          <div
            className="rounded-[18px] p-1.5 border"
            style={{
              borderColor: 'rgba(250,204,21,0.28)',
              background: 'rgba(10,10,12,0.55)',
              backdropFilter: 'blur(14px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
              boxShadow:
                '0 0 0 1px rgba(250,204,21,0.10), 0 16px 32px rgba(0,0,0,0.55)',
            }}
          >
            <RiderMap
              center={mapCenter}
              zoom={13}
              pickup={pickup}
              dropoff={dropoff}
              showRoute={canSearch}
              onDropoffSet={(c) => { setDropoff({ ...c, accuracyM: 0 }); haptic.tap() }}
              height="150px"
            />
          </div>

          {/* Pickup → (optional) Pit stop → Drop off — all in one frosted
              card. The left-side dot column dynamically grows a 3rd dot
              when pit stop is active so the visual route reads top-to-bottom.
              Tightened paddings + reduced internal spacing so the full
              booking flow fits on one screen without scrolling. */}
          <div
            className="rounded-[18px] p-3 border"
            style={{
              borderColor: 'rgba(255,255,255,0.10)',
              background: 'rgba(17,17,22,0.72)',
              backdropFilter: 'blur(14px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
              boxShadow: '0 16px 36px rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex items-start gap-2.5">
              {/* Left-side route dots */}
              <div className="flex flex-col items-center pt-2 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-glow" />
                <div className="w-px h-6 bg-line my-1" />
                {pitstopOpen && (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-brand/80" style={{ border: '2px solid #FACC15' }} />
                    <div className="w-px h-6 bg-line my-1" />
                  </>
                )}
                <div className="w-2.5 h-2.5 rounded-sm bg-online" />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
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
                    placeholder={pickup ? 'Place name (optional)' : PLACEHOLDERS[service].pickup}
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
                    button when off; reveals a textarea when active.
                    Both states show the pit-stop graphic on the right edge
                    for visual identity. */}
                {!pitstopOpen ? (
                  <button
                    onClick={() => { setPitstopOpen(true); haptic.tap() }}
                    className="w-full flex items-center gap-2.5 pl-2 pr-2 py-2 rounded-xl border border-dashed border-line hover:border-brand/40 hover:bg-brand/5 transition text-left text-[13px] font-bold text-muted min-h-[48px]"
                  >
                    <span
                      className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-brand to-brand2 text-bg flex items-center justify-center shadow-[0_4px_12px_rgba(250,204,21,0.45)]"
                      aria-hidden
                    >
                      <Plus className="w-4 h-4" strokeWidth={3} />
                    </span>
                    <span className="flex-1">Add a pit stop on the way</span>
                    <img
                      src="https://ik.imagekit.io/nepgaxllc/Untitledasdasaa-removebg-preview.png"
                      alt=""
                      className="h-9 w-auto object-contain shrink-0"
                      loading="lazy"
                    />
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
                    <div className="relative">
                      <textarea
                        className="input pr-16"
                        rows={2}
                        maxLength={140}
                        placeholder='e.g. "Stop at warung depan, buy 1 pack Marlboro Lights"'
                        value={pitstopNote}
                        onChange={e => setPitstopNote(e.target.value)}
                      />
                      <img
                        src="https://ik.imagekit.io/nepgaxllc/Untitledasdasaa-removebg-preview.png"
                        alt=""
                        className="absolute top-1/2 right-2 -translate-y-1/2 h-10 w-auto object-contain pointer-events-none opacity-90"
                        loading="lazy"
                      />
                    </div>
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
                    placeholder={PLACEHOLDERS[service].dropoff}
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

          {/* Inline disclaimer (compact) above the sticky CTA */}
          <PlatformDisclaimer variant="compact" />
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
        <Link href="/" className="shrink-0" aria-label="City Rider home">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png"
            alt=""
            className="h-9 w-auto hover:opacity-85 transition"
            loading="eager"
          />
        </Link>
        <div className="text-[14px] font-extrabold">
          City <span className="gradient-text">Rider</span>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
      </div>
    </header>
  )
}

