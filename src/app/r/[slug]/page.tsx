'use client'
import { use, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { ChevronLeft, MapPin, Box, Bike as BikeIcon, MessageCircle } from 'lucide-react'
import RiderRadar from '@/components/rider/RiderRadar'
import PickupDropoffPicker from '@/components/rider/PickupDropoffPicker'
import OfflineFallback from '@/components/rider/OfflineFallback'
import CustomerWaitingState, { type WaitingStatus, type RiderSuggestion } from '@/components/rider/CustomerWaitingState'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import { findRiderBySlug, getOnlineRiders, MOCK_RIDERS } from '@/data/mockRiders'
import { fetchDriverBySlugBrowser } from '@/lib/drivers/queries'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { useBeep } from '@/hooks/useBeep'
import { useOrderChannel, getCustomerSessionId, type OrderEvent } from '@/hooks/useOrderChannel'
import { haversineKm } from '@/lib/geo/haversine'
import { quoteBreakdown, rateFor } from '@/lib/pricing/quote'
import { buildWhatsAppLink } from '@/lib/whatsapp/buildLink'
import { idr } from '@/lib/format/idr'
import { SERVICE_ICONS, SERVICE_LABELS, SERVICE_SHORT, type ServiceType, type Rider } from '@/types/rider'

export default function RiderProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  // Initial render uses sync mock lookup so the page boots instantly.
  // Then we upgrade to the live Supabase row if one exists.
  const [maybeRider, setMaybeRider] = useState<Rider | null>(() => findRiderBySlug(slug) ?? null)
  useEffect(() => {
    let cancelled = false
    fetchDriverBySlugBrowser(slug).then((r) => {
      if (!cancelled && r) setMaybeRider(r)
    })
    return () => { cancelled = true }
  }, [slug])

  const geo = useGeolocation(true)
  const haptic = useHaptic()
  const beep = useBeep()

  const [pickup, setPickup] = useState<GeoPoint | null>(null)
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null)
  const [pickupLabel, setPickupLabel] = useState('My location')
  const [dropoffLabel, setDropoffLabel] = useState('')

  // Selected service — defaults to the first one the rider offers.
  const [service, setService] = useState<ServiceType | null>(
    maybeRider?.services[0] ?? null,
  )

  const pricing = useMemo(() => {
    if (!maybeRider || !service) {
      return { pricePerKm: maybeRider?.pricePerKm ?? 0, minFee: maybeRider?.minFee ?? 0 }
    }
    return rateFor(maybeRider, service)
  }, [maybeRider, service])

  const quote = useMemo(() => {
    if (!maybeRider || !pickup || !dropoff) return null
    const distanceKm = haversineKm(pickup, dropoff)
    const { final, minApplied } = quoteBreakdown(distanceKm, pricing)
    return { distanceKm, fare: final, minApplied }
  }, [pickup, dropoff, maybeRider, pricing])

  // Real-time waiting state — once customer taps WhatsApp, we broadcast
  // a pending order, the rider's dashboard receives it, and the rider's
  // accept/decline broadcasts back. UI flips through pending → accepted/
  // declined/expired. `waiting.rider` is the rider we're CURRENTLY
  // waiting for — may differ from the page's profile rider after the
  // customer picks a suggestion. Cross-tab today via BroadcastChannel;
  // swap for Supabase Realtime channel in Phase 3.
  const [waiting, setWaiting] = useState<{
    orderId: string
    rider: { id: string; name: string; photoUrl: string; whatsappE164: string }
    startedAt: number
    status: WaitingStatus
    whatsappLink: string
  } | null>(null)

  const { broadcast } = useOrderChannel((e: OrderEvent) => {
    if (!waiting) return
    if ('orderId' in e && e.orderId !== waiting.orderId) return
    if (e.type === 'accepted') setWaiting({ ...waiting, status: 'accepted' })
    if (e.type === 'declined') setWaiting({ ...waiting, status: 'declined' })
    if (e.type === 'expired')  setWaiting({ ...waiting, status: 'expired' })
  })

  // Auto-expire customer-side after 5 min (mirrors driver-side timer)
  useEffect(() => {
    if (!waiting || waiting.status !== 'pending') return
    const elapsed = Date.now() - waiting.startedAt
    const remaining = 5 * 60 * 1000 - elapsed
    if (remaining <= 0) { setWaiting({ ...waiting, status: 'expired' }); return }
    const t = setTimeout(() => setWaiting(w => w && w.status === 'pending' ? { ...w, status: 'expired' } : w), remaining)
    return () => clearTimeout(t)
  }, [waiting])

  // Customer identity — anonymous, persisted in localStorage between visits so
  // repeat customers skip the modal. Shared with /cari/rider via the same keys.
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  useEffect(() => {
    if (typeof window === 'undefined') return
    setCustomerPhone(localStorage.getItem('cityrider:customer_phone') || '')
    setCustomerName(localStorage.getItem('cityrider:customer_name') || '')
  }, [])

  // Pending-book intent — captured when customer presses Send WhatsApp
  // without saved phone+name. Modal collects the missing info, then we
  // continue with recordTripAndOpenChat against the stashed rider.
  type PendingBook = {
    rider: Rider
    fare: number
    perKm: number
    whatsappLink: string
  }
  const [pendingBook, setPendingBook] = useState<PendingBook | null>(null)
  const [submittingBook, setSubmittingBook] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

  // Compute 3 nearest online riders (excluding the currently-waiting one)
  // for the soft-suggest list shown in declined/expired states.
  const suggestions: RiderSuggestion[] = useMemo(() => {
    if (!waiting || !pickup || !quote) return []
    if (waiting.status !== 'expired' && waiting.status !== 'declined') return []
    return getOnlineRiders(waiting.rider.id)
      .filter(r => !service || r.services.includes(service))
      .map(r => {
        const rPricing = service ? rateFor(r, service) : { pricePerKm: r.pricePerKm, minFee: r.minFee }
        const { final } = quoteBreakdown(quote.distanceKm, rPricing)
        return {
          rider: r,
          fare: final,
          distanceFromCustomer: haversineKm(pickup, { lat: r.lat, lng: r.lng }),
        }
      })
      .sort((a, b) => a.distanceFromCustomer - b.distanceFromCustomer)
      .slice(0, 3)
      .map(({ rider: r, fare, distanceFromCustomer }) => ({
        riderId:    r.id,
        name:       r.name,
        photoUrl:   r.photoUrl,
        bikeLabel:  `${r.bike.make} ${r.bike.model}`,
        distanceKm: distanceFromCustomer,
        fare,
      }))
  }, [waiting, pickup, quote, service])

  // Re-send the same trip to a different rider when customer picks a suggestion
  function onPickSuggestion(newRiderId: string) {
    const newRider = MOCK_RIDERS.find(r => r.id === newRiderId)
    if (!newRider || !pickup || !dropoff || !quote) return
    const newPricing = service ? rateFor(newRider, service) : { pricePerKm: newRider.pricePerKm, minFee: newRider.minFee }
    const { final: newFare } = quoteBreakdown(quote.distanceKm, newPricing)
    const newLink = buildWhatsAppLink({
      riderName: newRider.name,
      riderWhatsAppE164: newRider.whatsappE164,
      pickup: { lat: pickup.lat, lng: pickup.lng, label: pickupLabel || undefined },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng, label: dropoffLabel || undefined },
      distanceKm: quote.distanceKm,
      pricePerKm: newPricing.pricePerKm,
      fare: newFare,
    })
    beep.play()
    haptic.buzz()
    if (!customerPhone || customerPhone.length < 10) {
      setPendingBook({ rider: newRider, fare: newFare, perKm: newPricing.pricePerKm, whatsappLink: newLink })
      return
    }
    void recordTripAndOpenChat({ rider: newRider, fare: newFare, perKm: newPricing.pricePerKm, whatsappLink: newLink })
  }

  // Server insert + WhatsApp handoff. Inserts a `trips` row pointed at the
  // chosen rider so their dashboard receives a real-time notification via the
  // Supabase Realtime subscription. WhatsApp is opened either way — if the
  // server is unreachable, the legacy BroadcastChannel signal still drives
  // the same-browser demo path.
  async function recordTripAndOpenChat(intent: PendingBook) {
    if (!pickup || !dropoff || !quote) return
    setBookError(null)
    const chosenService: ServiceType = service ?? intent.rider.services[0] ?? 'person'

    let tripId: string | null = null
    let tripToken: string | null = null
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: intent.rider.id,
          customer_phone: customerPhone,
          customer_name: customerName || undefined,
          service: chosenService,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          pickup_label: pickupLabel || undefined,
          dropoff_lat: dropoff.lat,
          dropoff_lng: dropoff.lng,
          dropoff_label: dropoffLabel || undefined,
          distance_km: Number(quote.distanceKm.toFixed(2)),
          estimated_fare: intent.fare,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        tripId = json.trip_id as string
        tripToken = (json.token as string) || null
        if (typeof window !== 'undefined' && tripId) {
          localStorage.setItem('cityrider:last_trip_id', tripId)
          if (tripToken) localStorage.setItem('cityrider:last_trip_token', tripToken)
        }
      } else if (res.status === 409) {
        setBookError(json.error || 'Rider is no longer available — please pick another.')
        return
      } else {
        console.warn('[trips] create failed:', json.error)
      }
    } catch (e) {
      console.warn('[trips] create failed:', (e as Error).message)
    }

    // Open WhatsApp regardless — it's the fallback chat layer
    window.open(intent.whatsappLink, '_blank', 'noopener,noreferrer')

    // Server-backed flow — navigate the customer to the trip tracker
    if (tripId) {
      const trackUrl = `/trip/${tripId}${tripToken ? `?token=${encodeURIComponent(tripToken)}` : ''}`
      router.push(trackUrl)
      return
    }

    // Demo-mode (no Supabase) — fall through to the legacy BroadcastChannel
    // waiting state in the sticky bottom bar.
    const orderId = 'o_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)
    broadcast({
      type: 'created',
      order: {
        id: orderId,
        customerSession: getCustomerSessionId(),
        riderId: intent.rider.id,
        riderName: intent.rider.name,
        pickupLabel: pickupLabel || 'My location',
        dropoffLabel: dropoffLabel || 'Destination',
        distanceKm: quote.distanceKm,
        fare: intent.fare,
        createdAt: Date.now(),
      },
    })
    setWaiting({
      orderId,
      rider: { id: intent.rider.id, name: intent.rider.name, photoUrl: intent.rider.photoUrl, whatsappE164: intent.rider.whatsappE164 },
      startedAt: Date.now(),
      status: 'pending',
      whatsappLink: intent.whatsappLink,
    })
  }

  // Submit handler for the customer-info modal — normalizes phone, persists,
  // then continues with the stashed booking intent.
  async function submitCustomerInfo() {
    const cleaned = customerPhone.replace(/\D/g, '')
    let normalized = cleaned
    if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1)
    if (!normalized.startsWith('62') || normalized.length < 10) {
      setBookError('Please enter a valid Indonesian phone, e.g. 6281234567890')
      return
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('cityrider:customer_phone', normalized)
      localStorage.setItem('cityrider:customer_name', customerName.trim())
    }
    setCustomerPhone(normalized)
    setBookError(null)
    const intent = pendingBook
    setPendingBook(null)
    if (intent) {
      setSubmittingBook(true)
      await recordTripAndOpenChat(intent)
      setSubmittingBook(false)
    }
  }

  // Auto-fill pickup with customer GPS on grant
  useMemo(() => {
    if (geo.coords && !pickup) setPickup(geo.coords)
  }, [geo.coords, pickup])

  if (!maybeRider) {
    notFound()
  }
  const rider = maybeRider

  function onUseMyLocation() {
    haptic.tap()
    geo.request()
    if (geo.coords) { setPickup(geo.coords); setPickupLabel('My location') }
  }

  function onSend() {
    if (!pickup || !dropoff || !quote) return
    const link = buildWhatsAppLink({
      riderName: rider.name,
      riderWhatsAppE164: rider.whatsappE164,
      pickup: { lat: pickup.lat, lng: pickup.lng, label: pickupLabel || undefined },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng, label: dropoffLabel || undefined },
      distanceKm: quote.distanceKm,
      pricePerKm: pricing.pricePerKm,
      fare: quote.fare,
    })
    beep.play()
    haptic.buzz()
    const intent: PendingBook = { rider, fare: quote.fare, perKm: pricing.pricePerKm, whatsappLink: link }
    if (!customerPhone || customerPhone.length < 10) {
      setPendingBook(intent)
      return
    }
    void recordTripAndOpenChat(intent)
  }

  // OFFLINE fallback view
  if (!rider.isOnline || rider.subscriptionStatus === 'past_due') {
    const nearby = getOnlineRiders(rider.id)
    return (
      <main className="min-h-screen pb-16">
        <BackNav />
        <div className="max-w-2xl mx-auto px-4 pt-2">
          <RiderHero rider={rider} dimmed />
          <div className="mt-5">
            <OfflineFallback
              offlineRider={rider}
              nearbyRiders={nearby}
              customerLocation={pickup ?? geo.coords}
            />
          </div>
        </div>
      </main>
    )
  }

  // ONLINE view
  return (
    <main className="min-h-screen pb-40">
      <BackNav />
      <div className="max-w-2xl mx-auto px-4 pt-2 space-y-5">
        <RiderHero rider={rider} />

        <RiderRadar
          customer={pickup ?? geo.coords ?? null}
          rider={{ lat: rider.lat, lng: rider.lng, name: rider.name }}
        />

        <PickupDropoffPicker
          pickup={pickup}
          dropoff={dropoff}
          pickupLabel={pickupLabel}
          dropoffLabel={dropoffLabel}
          onUseMyLocation={onUseMyLocation}
          onPickupLabelChange={setPickupLabel}
          onDropoffLabelChange={setDropoffLabel}
          status={geo.status}
        />

        {/* Service picker (only when rider offers > 1 service) */}
        {rider.services.length > 1 && (
          <div className="card p-4">
            <div className="text-[12px] text-dim uppercase tracking-wider font-extrabold mb-2.5">
              Service
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rider.services.length}, 1fr)` }}>
              {rider.services.map(s => {
                const r = rateFor(rider, s)
                const active = service === s
                return (
                  <button
                    key={s}
                    onClick={() => { setService(s); haptic.tap() }}
                    className="rounded-2xl border text-center py-2.5 px-2 transition"
                    style={{
                      background:   active ? 'rgba(250,204,21,0.10)' : 'rgba(255,255,255,0.04)',
                      borderColor:  active ? 'rgba(250,204,21,0.45)' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="text-[20px] leading-none">{SERVICE_ICONS[s]}</div>
                    <div className="text-[13px] font-extrabold mt-1.5" style={{ color: active ? '#FACC15' : '#fff' }}>
                      {SERVICE_SHORT[s]}
                    </div>
                    <div className="text-[12px] text-muted mt-0.5">{idr(r.pricePerKm)}/km</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Live quote card */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-60"
               style={{ background: 'radial-gradient(ellipse at top right, rgba(250,204,21,0.16), transparent 60%)' }} />
          <div className="relative flex items-baseline justify-between">
            <div>
              <div className="text-[12px] text-dim uppercase tracking-wider font-bold">
                Fare estimate{service && <> · {SERVICE_SHORT[service]}</>}
              </div>
              <div className="text-[34px] font-extrabold gradient-text mt-1 leading-none">
                {quote ? idr(quote.fare) : '—'}
              </div>
              <div className="text-[13px] text-muted mt-2">
                {quote
                  ? `${quote.distanceKm.toFixed(1)} km × ${idr(pricing.pricePerKm)}`
                  : 'Set pickup & drop off to see price'}
              </div>
              {quote?.minApplied && (
                <div className="text-brand text-[12px] mt-1">Min fee {idr(pricing.minFee)} applies</div>
              )}
            </div>
            <div className="text-right text-[13px] text-muted">
              <div className="font-bold text-ink">{idr(pricing.pricePerKm)}</div>
              <div className="text-dim">/km</div>
              <div className="mt-2 font-bold text-ink">min {idr(pricing.minFee)}</div>
            </div>
          </div>
        </div>

        {/* Bike section */}
        <div className="card p-5">
          <div className="text-[12px] text-dim uppercase tracking-wider font-bold mb-2">Bike</div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/5 flex items-center justify-center text-3xl">
              🛵
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-lg">{rider.bike.make} {rider.bike.model}</div>
              <div className="text-[13px] text-muted">
                {rider.bike.year} · {rider.bike.color} · <span className="capitalize">{rider.bike.type}</span>
              </div>
              {rider.bike.plate && (
                <div className="text-[12px] text-dim mt-1 font-mono">{rider.bike.plate}</div>
              )}
            </div>
            {rider.bike.hasBox && (
              <span className="chip-online chip">
                <Box className="w-3 h-3" />
                Box
              </span>
            )}
          </div>
        </div>

        {/* Bio */}
        {rider.bio && (
          <div className="card p-5">
            <div className="text-[12px] text-dim uppercase tracking-wider font-bold mb-2">About the rider</div>
            <p className="text-[14px] leading-relaxed text-ink/90">{rider.bio}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom bar — either the WhatsApp CTA (idle) or the
          customer waiting state (after they tapped) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="max-w-2xl mx-auto px-4 pb-3">
          {waiting ? (
            <CustomerWaitingState
              riderName={waiting.rider.name}
              riderPhotoUrl={waiting.rider.photoUrl}
              status={waiting.status}
              startedAt={waiting.startedAt}
              whatsappLink={waiting.whatsappLink}
              suggestions={suggestions}
              onPickSuggestion={onPickSuggestion}
              onCancel={() => setWaiting(null)}
              onSeeOthers={() => { setWaiting(null); window.location.href = '/cari' }}
            />
          ) : (
            <div className="glass-strong rounded-2xl p-3">
              <button
                onClick={onSend}
                disabled={!quote}
                className="btn-wa w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle className="w-5 h-5" />
                {quote
                  ? `Send WhatsApp · ${idr(quote.fare)}`
                  : 'Set pickup & drop off to send'}
              </button>
              <p className="text-[11px] text-dim text-center mt-2">
                Booking via WhatsApp · the rider gets an instant notification
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compact disclaimer above the sticky CTA (rendered in page body
          padding so it sits visible above the fixed bottom area) */}
      <div className="max-w-2xl mx-auto"><PlatformDisclaimer variant="compact" /></div>

      {/* Customer info prompt — opens on first Send WhatsApp tap if we don't
          have the customer's phone yet. Saved to localStorage for repeat visits. */}
      {pendingBook && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div className="card w-full max-w-md p-5 space-y-4" style={{ background: '#0E0E0E' }}>
            <div>
              <h2 className="text-xl font-extrabold">Almost there</h2>
              <p className="text-muted text-[13px] mt-1">
                Your phone number is shared with <span className="text-brand font-bold">{pendingBook.rider.name}</span> only — so they can reply on WhatsApp.
              </p>
            </div>
            <div>
              <label className="label">Your name</label>
              <input
                className="input"
                placeholder="Wayan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label">WhatsApp number</label>
              <input
                className="input font-mono"
                inputMode="numeric"
                placeholder="6281234567890"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              <p className="text-[12px] text-dim mt-1.5">Start with 62 (no +). Saved locally for next time.</p>
            </div>
            {bookError && <p className="text-[13px] text-red-400">{bookError}</p>}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setPendingBook(null); setBookError(null) }}
                className="btn-secondary"
                disabled={submittingBook}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCustomerInfo}
                className="btn-primary flex-1"
                disabled={submittingBook}
              >
                {submittingBook ? 'Sending…' : `Send to ${pendingBook.rider.name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function BackNav() {
  return (
    <header className="sticky top-0 z-40 glass-strong pt-safe">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-[14px] font-bold text-muted hover:text-ink">
          <ChevronLeft className="w-4 h-4" />
          Marketplace
        </Link>
        <div className="text-[15px] font-extrabold gradient-text">City Rider</div>
      </div>
    </header>
  )
}

function RiderHero({ rider, dimmed }: { rider: ReturnType<typeof findRiderBySlug>; dimmed?: boolean }) {
  if (!rider) return null
  return (
    <div className="card p-5 grid-bg relative overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="relative">
          <img
            src={rider.photoUrl}
            alt={rider.name}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-line"
            style={{ filter: dimmed ? 'grayscale(1) brightness(0.6)' : undefined }}
          />
          {!dimmed && rider.isOnline && (
            <span className="dot-online absolute -bottom-1 -right-1 ring-2 ring-bg2 !w-3.5 !h-3.5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight">{rider.name}</h1>
          <div className="flex items-center gap-1.5 text-[13px] text-muted mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {rider.area} · {rider.city}
          </div>
          <div className="flex items-center gap-1.5 text-[13px] mt-1">
            <BikeIcon className="w-3.5 h-3.5 text-brand" />
            <span className="text-ink/90 font-bold">{rider.bike.make} {rider.bike.model} {rider.bike.year}</span>
          </div>
          <div className="text-[12px] text-dim mt-0.5">
            {rider.bike.color} · {rider.bike.type[0]!.toUpperCase() + rider.bike.type.slice(1)}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {rider.services.map(s => (
              <span key={s} className="chip-muted chip">
                <span>{SERVICE_ICONS[s]}</span>
                <span>{SERVICE_LABELS[s]}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
