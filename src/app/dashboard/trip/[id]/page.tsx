'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft, MessageCircle, Navigation, Phone,
  CheckCircle2, StopCircle, MapPin,
} from 'lucide-react'
import RiderMap from '@/components/map/RiderMapDynamic'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { idr } from '@/lib/format/idr'

/* ─────────────────────────────────────────────────────────────────────────
   Active-trip page
   Driver lands here after tapping Accept in the IncomingOrderModal.

   What it does:
   - Renders an overview map: pickup pin + drop-off pin + route line.
   - Shows the customer card (name, distance, fare, WhatsApp + Call buttons).
   - Shows the pit-stop note if any.
   - Runs a 4-step state machine:
       going_to_pickup → arrived_pickup → in_trip → completed
   - "Navigate" button deep-links to Google Maps (driver's installed nav app
     handles the actual turn-by-turn — voice, traffic, lane guidance).
   - When the driver completes the trip, they return to the dashboard.

   Trip data comes in via URL params from the dashboard's onAccept handler:
     pLat, pLng, pName, dLat, dLng, dName,
     cName, cWa, km, fare, stop, stopFee
   ───────────────────────────────────────────────────────────────────── */

type TripStatus = 'going_to_pickup' | 'arrived_pickup' | 'in_trip' | 'completed'

export default function TripPage() {
  return (
    <Suspense fallback={null}>
      <TripPageInner />
    </Suspense>
  )
}

function TripPageInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const haptic = useHaptic()
  const geo = useGeolocation(true)

  const pickup = readCoord(sp, 'pLat', 'pLng')
  const dropoff = readCoord(sp, 'dLat', 'dLng')
  const pickupName = sp.get('pName') ?? 'Pickup'
  const dropoffName = sp.get('dName') ?? 'Drop-off'
  const customerName = sp.get('cName') ?? 'Customer'
  const customerWa = (sp.get('cWa') ?? '').replace(/[^0-9]/g, '')
  const tripKm = parseFloat(sp.get('km') ?? '0') || 0
  const fare = parseFloat(sp.get('fare') ?? '0') || 0
  const stopNote = sp.get('stop')
  const stopFee = parseFloat(sp.get('stopFee') ?? '0') || 0

  const [status, setStatus] = useState<TripStatus>('going_to_pickup')

  // Live-measure header + bottom panel so the map sits inside the hero
  // band only (same pattern as /cari — guarantees pins stay visible).
  const headerRef = useRef<HTMLElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [headerH, setHeaderH] = useState(64)
  const [bottomH, setBottomH] = useState(340)

  useEffect(() => {
    const h = headerRef.current, b = bottomRef.current
    if (!h || !b) return
    const measure = () => { setHeaderH(h.offsetHeight); setBottomH(b.offsetHeight) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(h); ro.observe(b)
    window.addEventListener('orientationchange', measure)
    return () => { ro.disconnect(); window.removeEventListener('orientationchange', measure) }
  }, [])

  // Current navigation target — flips from pickup → drop-off once the
  // driver confirms arrival. The Google-Maps deep link uses this.
  const target = (status === 'going_to_pickup') ? pickup : dropoff
  const targetName = (status === 'going_to_pickup') ? pickupName : dropoffName

  const mapCenter = pickup ?? geo.coords ?? { lat: -7.7928, lng: 110.3657, accuracyM: 0 }

  function openGoogleNav() {
    if (!target) return
    haptic.tap()
    // Universal Google Maps deep link. On Android phones it launches the
    // Google Maps app directly with turn-by-turn nav already running.
    // On iOS it opens the Google Maps app (or web if not installed).
    const url = `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function openCustomerWA() {
    if (!customerWa) return
    haptic.tap()
    const msg = encodeURIComponent(
      status === 'going_to_pickup'
        ? `Halo ${customerName}, saya rider Anda — sedang menuju lokasi jemput. 🛵`
        : `Halo ${customerName}, perjalanan sedang berlangsung. 🛵`,
    )
    window.open(`https://wa.me/${customerWa}?text=${msg}`, '_blank', 'noopener,noreferrer')
  }

  function callCustomer() {
    if (!customerWa) return
    haptic.tap()
    window.location.href = `tel:+${customerWa}`
  }

  function advance() {
    haptic.impact()
    setStatus(s => {
      if (s === 'going_to_pickup') return 'arrived_pickup'
      if (s === 'arrived_pickup')  return 'in_trip'
      if (s === 'in_trip')         return 'completed'
      return s
    })
  }

  function finishTrip() {
    haptic.impact()
    router.push('/dashboard')
  }

  return (
    <>
      {/* Dark backdrop so the page reads full-bleed while the active map
          is confined to the hero band between header and bottom panel. */}
      <div className="fixed inset-0 z-0" style={{ background: '#0A0A0A' }} />

      <div
        className="fixed left-0 right-0 z-[1]"
        style={{
          top: `${headerH}px`,
          bottom: `${bottomH}px`,
          transition: 'top 220ms ease, bottom 220ms ease',
        }}
      >
        <RiderMap
          center={mapCenter}
          zoom={14}
          pickup={pickup ?? null}
          dropoff={dropoff ?? null}
          showRoute={!!pickup && !!dropoff}
          pitStop={!!stopNote && !!pickup && !!dropoff}
          height="100%"
          pitch={0}
          viewportPadding={{ top: 24, bottom: 24, left: 32, right: 32 }}
        />
      </div>

      {/* Header — back to dashboard, status badge */}
      <header ref={headerRef} className="relative z-30 pt-safe glass-strong">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <StatusBadge status={status} />
          <div className="w-20" />
        </div>
      </header>

      {/* Bottom panel — customer card + pit-stop note + action stack */}
      <div ref={bottomRef} className="fixed bottom-0 left-0 right-0 z-40 pb-safe glass-strong">
        <div className="mx-auto max-w-xl px-4 pt-3 pb-3 space-y-3">
          {/* Customer card */}
          <div className="card p-3 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(250,204,21,0.12)', color: '#FACC15' }}
              aria-hidden
            >
              👤
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-extrabold truncate">{customerName}</div>
              <div className="text-[12px] text-muted truncate">
                {tripKm.toFixed(1)} km · <span className="text-brand font-bold">{idr(fare)}</span>
              </div>
            </div>
            {customerWa && (
              <>
                <button
                  onClick={callCustomer}
                  className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-95 min-h-[44px] min-w-[44px]"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  aria-label={`Call ${customerName}`}
                >
                  <Phone className="w-4 h-4 text-ink" />
                </button>
                <button
                  onClick={openCustomerWA}
                  className="shrink-0 h-11 px-3 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-extrabold transition active:scale-95 min-h-[44px]"
                  style={{
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    color: 'white',
                    boxShadow: '0 6px 16px rgba(37,211,102,0.35)',
                  }}
                  aria-label={`WhatsApp ${customerName}`}
                >
                  <MessageCircle className="w-4 h-4" />
                  WA
                </button>
              </>
            )}
          </div>

          {/* Pickup / drop-off summary */}
          <div className="card p-3 space-y-2 text-[13px]">
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-dim">Pick up</div>
                <div className="truncate text-ink">{pickupName}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-online mt-0.5 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-dim">Drop off</div>
                <div className="truncate text-ink">{dropoffName}</div>
              </div>
            </div>
          </div>

          {/* Pit-stop note — only when present */}
          {stopNote && (
            <div className="card p-3" style={{ borderLeft: '2px solid rgba(250,204,21,0.6)' }}>
              <div className="text-[10px] text-brand uppercase tracking-wider font-extrabold flex items-center gap-1">
                <StopCircle className="w-3 h-3" />
                Pit stop
              </div>
              <div className="text-[13px] mt-1 text-ink">{stopNote}</div>
              {stopFee > 0 && (
                <div className="text-[11px] text-muted mt-1">Fee: {idr(stopFee)}</div>
              )}
            </div>
          )}

          {/* Action stack — Navigate (Google Maps) + advance state */}
          {status !== 'completed' ? (
            <div className="space-y-2">
              {target && (
                <button
                  onClick={openGoogleNav}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-extrabold text-[14px] transition active:scale-[0.99] min-h-[48px]"
                  style={{
                    background: 'linear-gradient(135deg, #4285F4, #1A73E8)',
                    color: 'white',
                    boxShadow: '0 8px 22px rgba(66,133,244,0.35)',
                  }}
                  aria-label={`Navigate to ${targetName} in Google Maps`}
                >
                  <Navigation className="w-4 h-4" />
                  Navigate to {status === 'going_to_pickup' ? 'pickup' : 'drop-off'} in Google Maps
                </button>
              )}
              <button
                onClick={advance}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-extrabold text-[14px] text-bg transition active:scale-[0.99] min-h-[48px]"
                style={{
                  background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
                  boxShadow: '0 8px 22px rgba(250,204,21,0.35)',
                }}
              >
                <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
                {advanceLabel(status)}
              </button>
            </div>
          ) : (
            <button
              onClick={finishTrip}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-extrabold text-[14px] text-bg transition active:scale-[0.99] min-h-[48px]"
              style={{
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                color: 'white',
                boxShadow: '0 8px 22px rgba(34,197,94,0.35)',
              }}
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
              Finish trip — back to dashboard
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function StatusBadge({ status }: { status: TripStatus }) {
  const map = {
    going_to_pickup: { label: 'Going to pickup', bg: 'rgba(250,204,21,0.18)', color: '#FACC15' },
    arrived_pickup:  { label: 'At pickup',       bg: 'rgba(249,115,22,0.20)', color: '#F97316' },
    in_trip:         { label: 'In trip',         bg: 'rgba(34,197,94,0.20)',  color: '#22C55E' },
    completed:       { label: 'Completed',       bg: 'rgba(34,197,94,0.20)',  color: '#22C55E' },
  } as const
  const s = map[status]
  return (
    <span
      className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function advanceLabel(s: TripStatus): string {
  if (s === 'going_to_pickup') return "I've arrived at pickup"
  if (s === 'arrived_pickup')  return 'Start trip'
  if (s === 'in_trip')         return "I've arrived at drop-off"
  return 'Complete'
}

function readCoord(sp: URLSearchParams, latKey: string, lngKey: string) {
  const lat = parseFloat(sp.get(latKey) ?? '')
  const lng = parseFloat(sp.get(lngKey) ?? '')
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
}
