'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft, MessageCircle, Navigation, Phone,
  CheckCircle2, StopCircle, MapPin, Banknote, QrCode, Building2, Star,
} from 'lucide-react'
import RiderMap from '@/components/map/RiderMapDynamic'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { idr } from '@/lib/format/idr'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { fetchMyDriverRowBrowser } from '@/lib/drivers/queries'
import type { DriverRow, PaymentMethod, TripRow } from '@/types/database'

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
  const params = useParams<{ id: string }>()
  const tripId = (params?.id ?? '') as string
  const haptic = useHaptic()
  const geo = useGeolocation(true)

  // Server-side trip row + the rider's own driver row (for payment methods).
  // Server is the source of truth; URL params hydrate the first paint and
  // the demo-mode (no Supabase) fallback below.
  const [serverTrip, setServerTrip] = useState<TripRow | null>(null)
  const [myDriver, setMyDriver] = useState<DriverRow | null>(null)
  const [actionInFlight, setActionInFlight] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // URL params — used for the initial paint and as a demo-mode fallback
  // when Supabase isn't configured.
  const urlPickup = readCoord(sp, 'pLat', 'pLng')
  const urlDropoff = readCoord(sp, 'dLat', 'dLng')
  const urlPickupName = sp.get('pName') ?? 'Pickup'
  const urlDropoffName = sp.get('dName') ?? 'Drop-off'
  const urlCustomerName = sp.get('cName') ?? 'Customer'
  const urlCustomerWa = (sp.get('cWa') ?? '').replace(/[^0-9]/g, '')
  const urlTripKm = parseFloat(sp.get('km') ?? '0') || 0
  const urlFare = parseFloat(sp.get('fare') ?? '0') || 0
  const urlStopNote = sp.get('stop')
  const urlStopFee = parseFloat(sp.get('stopFee') ?? '0') || 0

  // Prefer server values when available, fall back to URL params.
  const pickup = serverTrip ? { lat: serverTrip.pickup_lat, lng: serverTrip.pickup_lng } : urlPickup
  const dropoff = serverTrip ? { lat: serverTrip.dropoff_lat, lng: serverTrip.dropoff_lng } : urlDropoff
  const pickupName = serverTrip?.pickup_label ?? urlPickupName
  const dropoffName = serverTrip?.dropoff_label ?? urlDropoffName
  const customerName = serverTrip?.customer_name ?? urlCustomerName
  const customerWa = (serverTrip?.customer_phone ?? urlCustomerWa).replace(/[^0-9]/g, '')
  const tripKm = serverTrip?.distance_km ? Number(serverTrip.distance_km) : urlTripKm
  const fare = serverTrip?.estimated_fare ?? urlFare
  const stopNote = serverTrip?.pitstop_note ?? urlStopNote
  const stopFee = urlStopFee

  // Local status — kept for demo-mode fallback. When we have a server trip,
  // the derived `status` below ignores this.
  const [localStatus, setLocalStatus] = useState<TripStatus>('going_to_pickup')
  const status: TripStatus = serverTrip ? serverStatusToLocal(serverTrip.status) : localStatus
  const isCompletedServer = serverTrip?.status === 'completed'
  const paymentStatus = serverTrip?.payment_status ?? 'pending'

  // Load the trip + driver row, then subscribe to UPDATEs (driver SELECTs
  // own trips via RLS — Realtime delivers UPDATE payloads).
  useEffect(() => {
    let cancelled = false
    if (!tripId) return
    const supabase = getBrowserSupabase()
    if (!supabase) return  // demo mode — stay on local state
    fetchMyDriverRowBrowser().then((d) => { if (!cancelled) setMyDriver(d) })
    supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setServerTrip(data as TripRow)
      })
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        (payload) => { if (!cancelled) setServerTrip(payload.new as TripRow) },
      )
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [tripId])

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

  // Driver-side payment options — only the methods this rider accepts.
  const availableMethods = useMemo<PaymentMethod[]>(() => {
    if (!myDriver) return ['cash', 'qr', 'transfer']  // safe default until we load
    const methods: PaymentMethod[] = []
    if (myDriver.accepts_cash) methods.push('cash')
    if (myDriver.accepts_qr) methods.push('qr')
    if (myDriver.accepts_transfer) methods.push('transfer')
    return methods.length > 0 ? methods : ['cash']
  }, [myDriver])

  async function advance() {
    haptic.impact()
    // Demo mode (no server trip) — keep the old local-only state machine
    if (!serverTrip) {
      setLocalStatus(s => {
        if (s === 'going_to_pickup') return 'arrived_pickup'
        if (s === 'arrived_pickup')  return 'in_trip'
        if (s === 'in_trip')         return 'completed'
        return s
      })
      return
    }
    const action =
      status === 'going_to_pickup' ? 'arrive'
      : status === 'arrived_pickup' ? 'start'
      : status === 'in_trip' ? 'complete'
      : null
    if (!action) return
    await patchTrip(action, {})
  }

  async function confirmPayment(method: PaymentMethod) {
    haptic.impact()
    await patchTrip('confirm_payment', { payment_method: method })
  }

  async function patchTrip(action: string, extra: Record<string, unknown>) {
    if (!tripId || actionInFlight) return
    setActionInFlight(action)
    setActionError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(json.error || `Could not ${action} — try again`)
      }
    } catch (e) {
      setActionError((e as Error).message || `Could not ${action} — try again`)
    } finally {
      setActionInFlight(null)
    }
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
                disabled={!!actionInFlight}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-extrabold text-[14px] text-bg transition active:scale-[0.99] min-h-[48px] disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
                  boxShadow: '0 8px 22px rgba(250,204,21,0.35)',
                }}
              >
                <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
                {actionInFlight ? 'Saving…' : advanceLabel(status)}
              </button>
              {actionError && (
                <p className="text-[12px] text-red-400 text-center">{actionError}</p>
              )}
            </div>
          ) : isCompletedServer && paymentStatus !== 'confirmed' ? (
            <PaymentCollectionPanel
              methods={availableMethods}
              fare={fare}
              busy={actionInFlight === 'confirm_payment'}
              error={actionError}
              onConfirm={confirmPayment}
            />
          ) : (
            <div className="space-y-2">
              {isCompletedServer && paymentStatus === 'confirmed' && (
                <div className="card p-3 flex items-center gap-2 text-[13px]" style={{ background: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.35)' }}>
                  <CheckCircle2 className="w-4 h-4 text-online shrink-0" />
                  <span className="font-bold">Payment confirmed{serverTrip?.payment_method ? ` · ${methodLabel(serverTrip.payment_method)}` : ''}</span>
                </div>
              )}
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
            </div>
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

// Maps the server TripStatus (requested|accepted|arrived|in_progress|completed|…)
// onto the simpler local 4-step state. requested/canceled/expired collapse
// to the closest sensible UI state.
function serverStatusToLocal(s: TripRow['status']): TripStatus {
  if (s === 'arrived') return 'arrived_pickup'
  if (s === 'in_progress') return 'in_trip'
  if (s === 'completed') return 'completed'
  return 'going_to_pickup'  // requested / accepted / canceled / expired
}

function methodLabel(m: PaymentMethod): string {
  if (m === 'cash') return 'Cash'
  if (m === 'qr') return 'QR / e-wallet'
  return 'Bank transfer'
}

function methodIcon(m: PaymentMethod) {
  if (m === 'cash') return <Banknote className="w-4 h-4" />
  if (m === 'qr') return <QrCode className="w-4 h-4" />
  return <Building2 className="w-4 h-4" />
}

function PaymentCollectionPanel({
  methods, fare, busy, error, onConfirm,
}: {
  methods: PaymentMethod[]
  fare: number
  busy: boolean
  error: string | null
  onConfirm: (m: PaymentMethod) => void
}) {
  return (
    <div className="space-y-2">
      <div className="card p-3" style={{ background: 'rgba(250,204,21,0.06)', borderColor: 'rgba(250,204,21,0.30)' }}>
        <div className="text-[11px] uppercase tracking-wider font-extrabold text-brand">Collect payment</div>
        <div className="text-[14px] font-extrabold mt-1">
          {fare > 0 ? `Amount due · ${idr(fare)}` : 'Confirm how the customer paid'}
        </div>
        <p className="text-[12px] text-muted mt-1">
          Tap the method the customer used. They&apos;ll see the confirmation in their tracker.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {methods.map((m) => (
          <button
            key={m}
            onClick={() => onConfirm(m)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-[14px] text-bg transition active:scale-[0.99] min-h-[44px] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
              boxShadow: '0 6px 16px rgba(250,204,21,0.30)',
            }}
          >
            {methodIcon(m)}
            {busy ? 'Saving…' : `Confirm ${methodLabel(m)} received`}
          </button>
        ))}
      </div>
      {error && <p className="text-[12px] text-red-400 text-center">{error}</p>}
    </div>
  )
}
