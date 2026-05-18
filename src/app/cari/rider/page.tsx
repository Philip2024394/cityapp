'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Star, ArrowRight } from 'lucide-react'
import { fetchActiveDriversBrowser } from '@/lib/drivers/queries'
import { haversineKm } from '@/lib/geo/haversine'
import { quoteBreakdown, rateFor, lowestStartingPrice, hasServiceOverrides } from '@/lib/pricing/quote'
import { buildWhatsAppLink } from '@/lib/whatsapp/buildLink'
import { idr } from '@/lib/format/idr'
import { bikeTitle } from '@/lib/format/bike'
import { useHaptic } from '@/hooks/useHaptic'
import { useBeep } from '@/hooks/useBeep'
import { SERVICE_ICONS, SERVICE_LABELS, SERVICE_SHORT, type Rider, type ServiceType } from '@/types/rider'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'

export default function Page() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <DriverResults />
    </Suspense>
  )
}

function DriverResults() {
  const router = useRouter()
  const sp = useSearchParams()
  const haptic = useHaptic()
  const beep = useBeep()

  const pickup = readCoord(sp, 'pLat', 'pLng')
  const dropoff = readCoord(sp, 'dLat', 'dLng')
  const pickupName = sp.get('pName') ?? 'My location'
  const dropoffName = sp.get('dName') ?? 'Destination'
  const pitstopNote = sp.get('stop') ?? null   // null = no pit stop requested

  const [sort, setSort] = useState<'cheapest' | 'nearest'>('cheapest')
  // Read service choice from URL — set by /cari when customer picks one of
  // the 3 service cards. Defaults to 'all' if the param is missing or invalid.
  const initialFilter = (() => {
    const f = sp.get('filter')
    if (f === 'person' || f === 'parcel' || f === 'food') return f
    return 'all' as const
  })()
  const [filter, setFilter] = useState<ServiceType | 'all'>(initialFilter)

  // Brief non-blocking toast shown when the user taps Book Driver. Tells
  // them WhatsApp is opening and the driver will reply there. Auto-dismiss.
  const [toast, setToast] = useState<{ driverName: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Independent riders fetched from Supabase (falls back to demo data when
  // env not configured). Each rider is their own independent business.
  const [riders, setRiders] = useState<Rider[]>([])
  const [ridersLoaded, setRidersLoaded] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetchActiveDriversBrowser().then((list) => {
      if (cancelled) return
      setRiders(list)
      setRidersLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  // Customer identity — anonymous, kept in localStorage between visits so
  // repeat customers don't have to re-enter their phone.
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  useEffect(() => {
    if (typeof window === 'undefined') return
    setCustomerPhone(localStorage.getItem('cityrider:customer_phone') || '')
    setCustomerName(localStorage.getItem('cityrider:customer_name') || '')
  }, [])

  // Modal state — when customer presses Book without saved info, we open
  // this to collect phone+name first, stash the chosen rider, then continue.
  type PendingBook = {
    rider: Rider
    fare: number
    perKm: number
    pitstopFee: number
    service: ServiceType
  }
  const [pendingBook, setPendingBook] = useState<PendingBook | null>(null)
  const [submittingBook, setSubmittingBook] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

  // Back-to-booking URL — carries the current trip params so /cari can
  // reload exactly where the user left off rather than starting blank.
  const editTripHref = `/cari?${sp.toString()}`

  // If trip missing, bounce to /cari
  if (!pickup || !dropoff) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <div className="card p-6 text-center max-w-sm">
          <p className="text-[14px] text-muted">Trip not set.</p>
          <Link href="/cari" className="btn-primary mt-4 w-full">Plan a trip first</Link>
        </div>
      </main>
    )
  }

  const tripKm = haversineKm(pickup, dropoff)

  const enriched = useMemo(() => {
    const list = riders.filter(r =>
      r.isOnline &&
      r.subscriptionStatus !== 'past_due' &&
      (filter === 'all' || r.services.includes(filter)),
    )
    const e = list.map(r => {
      // If a specific service is filtered, price for THAT service.
      // Otherwise show the lowest-starting price across the rider's enabled services.
      const pricing = filter === 'all' ? lowestStartingPrice(r) : rateFor(r, filter)
      const { final, minApplied } = quoteBreakdown(tripKm, pricing)
      const distanceToPickup = haversineKm(pickup, { lat: r.lat, lng: r.lng })
      const hasOverrides = filter === 'all' && hasServiceOverrides(r)
      const pitstopFee = pitstopNote ? (r.pitstopFee ?? 0) : 0
      const totalFare = final + pitstopFee
      return { rider: r, fare: final, pitstopFee, totalFare, minApplied, distanceToPickup, perKm: pricing.pricePerKm, hasOverrides }
    })
    e.sort((a, b) =>
      sort === 'cheapest' ? a.totalFare - b.totalFare : a.distanceToPickup - b.distanceToPickup,
    )
    return e
  }, [tripKm, sort, filter, pickup, pitstopNote, riders])

  const cheapest = enriched[0]?.totalFare
  const mostExpensive = enriched.length > 0 ? Math.max(...enriched.map(x => x.totalFare)) : null

  // Determine the service category for the trip (used by the trip record).
  // If the user filtered to a specific service, use it; otherwise default to
  // the rider's first listed service.
  function serviceForBooking(rider: Rider): ServiceType {
    if (filter !== 'all') return filter
    return rider.services[0] ?? 'person'
  }

  // Entry point for the Book Driver button on every card.
  // Step 1: ensure we have customer info; if not, open the info modal.
  // Step 2: hand off to recordTripAndOpenChat() with the chosen rider.
  function onBookRider(rider: Rider, fare: number, perKm: number, pitstopFee: number) {
    haptic.buzz()
    beep.play()
    const intent: PendingBook = {
      rider, fare, perKm, pitstopFee,
      service: serviceForBooking(rider),
    }
    if (!customerPhone || customerPhone.length < 10) {
      // Stash the intent + open the phone-info modal first
      setPendingBook(intent)
      return
    }
    void recordTripAndOpenChat(intent)
  }

  // Insert the trip server-side (so the rider sees it in-app via realtime)
  // and ALSO open WhatsApp for direct chat. WhatsApp is the chat layer
  // after acceptance — the trip record is the source of truth.
  async function recordTripAndOpenChat(intent: PendingBook) {
    setBookError(null)
    const link = buildWhatsAppLink({
      riderName: intent.rider.name,
      riderWhatsAppE164: intent.rider.whatsappE164,
      pickup: { lat: pickup!.lat, lng: pickup!.lng, label: pickupName },
      dropoff: { lat: dropoff!.lat, lng: dropoff!.lng, label: dropoffName },
      distanceKm: tripKm,
      pricePerKm: intent.perKm,
      fare: intent.fare,
      pitstop: pitstopNote ? { note: pitstopNote, fee: intent.pitstopFee } : undefined,
    })

    // POST to the server first — fire-and-don't-wait would lose the trip
    // if the request fails. But we do open WhatsApp even on failure so the
    // user experience never breaks: WhatsApp is the fallback chat channel.
    let tripId: string | null = null
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: intent.rider.id,
          customer_phone: customerPhone,
          customer_name: customerName || undefined,
          service: intent.service,
          pickup_lat: pickup!.lat,
          pickup_lng: pickup!.lng,
          pickup_label: pickupName,
          dropoff_lat: dropoff!.lat,
          dropoff_lng: dropoff!.lng,
          dropoff_label: dropoffName,
          pitstop_note: pitstopNote || undefined,
          distance_km: Number(tripKm.toFixed(2)),
          estimated_fare: intent.fare + intent.pitstopFee,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        tripId = json.trip_id as string
        // Remember for future tracking (Phase 3 ratings, payment confirm)
        if (typeof window !== 'undefined' && tripId) {
          localStorage.setItem('cityrider:last_trip_id', tripId)
          localStorage.setItem('cityrider:last_trip_token', json.token || '')
        }
      } else if (res.status === 409) {
        // Rider just went busy / accepted another booking
        setBookError(json.error || 'This rider is no longer available — please pick another.')
        return
      } else {
        // Surface the error but still open WhatsApp as fallback
        console.warn('[trips] create failed:', json.error)
      }
    } catch (e) {
      console.warn('[trips] create failed:', (e as Error).message)
    }

    setToast({ driverName: intent.rider.name })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  // Submit handler for the customer-info modal.
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

  return (
    <>
      <Header editTripHref={editTripHref} />

      <main className="min-h-screen pb-16">
        <div className="max-w-xl mx-auto px-4 pt-3 space-y-4">
          {/* Trip summary — boarding-pass. Black body (left) + brand-yellow
              stub (right), with punched cut-outs at the colour seam. */}
          <div className="relative">
            {/* Punched cut-outs at top/bottom of the colour boundary */}
            <div
              aria-hidden
              className="absolute w-5 h-5 rounded-full z-10"
              style={{ background: '#0A0A0A', top: '-10px', left: 'calc(70% - 10px)' }}
            />
            <div
              aria-hidden
              className="absolute w-5 h-5 rounded-full z-10"
              style={{ background: '#0A0A0A', bottom: '-10px', left: 'calc(70% - 10px)' }}
            />

            <div className="rounded-2xl overflow-hidden border border-line flex">
              {/* Main body — FROM / (PIT STOP) / TO — solid black */}
              <div
                className="flex-1 min-w-0 p-4 space-y-3"
                style={{ background: '#000000' }}
              >
                <div>
                  <div className="text-[12px] text-muted font-extrabold tracking-[0.2em]">FROM</div>
                  <div className="text-[15px] font-extrabold text-white mt-1 truncate">{pickupName}</div>
                </div>
                {pitstopNote && (
                  <div className="pl-2 -ml-2 border-l-2 border-brand/40">
                    <div className="text-[12px] text-brand font-extrabold tracking-[0.2em] flex items-center gap-1">
                      <span aria-hidden>🛑</span> PIT STOP
                    </div>
                    <div className="text-[14px] text-white/85 mt-1 truncate">{pitstopNote}</div>
                  </div>
                )}
                <div>
                  <div className="text-[12px] text-muted font-extrabold tracking-[0.2em]">TO</div>
                  <div className="text-[15px] font-extrabold text-white mt-1 truncate">{dropoffName}</div>
                </div>
                <button
                  onClick={() => router.push(editTripHref)}
                  className="text-[12px] font-bold text-muted hover:text-brand transition inline-flex items-center gap-1 pt-1"
                >
                  <span aria-hidden>✎</span> Edit trip
                </button>
              </div>

              {/* Stub — distance / ETA / fare-from — solid brand yellow */}
              <div
                className="w-[30%] shrink-0 p-4 flex flex-col justify-around text-center gap-3"
                style={{ background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)' }}
              >
                <div>
                  <div className="text-[12px] font-extrabold tracking-wider text-black/60">DISTANCE</div>
                  <div className="text-[20px] font-extrabold text-black leading-none mt-1 whitespace-nowrap">
                    {tripKm.toFixed(1)}
                    <span className="text-[12px] ml-0.5 align-baseline">KM</span>
                  </div>
                </div>
                <div>
                  <div className="text-[12px] font-extrabold tracking-wider text-black/60">ETA</div>
                  <div className="text-[16px] font-extrabold text-black leading-none mt-1 whitespace-nowrap">
                    ~{etaMinutes(tripKm)}
                    <span className="text-[12px] ml-0.5 align-baseline">MIN</span>
                  </div>
                </div>
                {cheapest != null && (
                  <div>
                    <div className="text-[12px] font-extrabold tracking-wider text-black/60">FROM</div>
                    <div className="text-[14px] font-extrabold text-black leading-tight mt-1 whitespace-nowrap">
                      {idr(cheapest)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter / sort */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <FilterChip
              active={sort === 'cheapest'}
              onClick={() => { setSort('cheapest'); haptic.tap() }}
              label="Cheapest"
            />
            <FilterChip
              active={sort === 'nearest'}
              onClick={() => { setSort('nearest'); haptic.tap() }}
              label="Nearest to pickup"
            />
            <div className="w-px h-5 bg-line shrink-0" />
            <FilterChip
              active={filter === 'all'}
              onClick={() => { setFilter('all'); haptic.tap() }}
              label="All"
            />
            {(Object.keys(SERVICE_LABELS) as ServiceType[]).map(s => (
              <FilterChip
                key={s}
                active={filter === s}
                onClick={() => { setFilter(s); haptic.tap() }}
                label={`${SERVICE_ICONS[s]} ${SERVICE_LABELS[s].split(' ')[0]}`}
              />
            ))}
          </div>

          {/* Driver cards — featured-banner style for the top 4 */}
          <div className="space-y-3">
            {enriched.slice(0, 4).map((item, idx) => (
              <FeaturedDriverCard
                key={item.rider.id}
                item={item}
                isCheapest={idx === 0 && sort === 'cheapest'}
                onWhatsApp={() => onBookRider(item.rider, item.fare, item.perKm, item.pitstopFee)}
              />
            ))}
          </div>

          {!ridersLoaded && enriched.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-muted text-[14px]">Finding nearby independent riders…</p>
            </div>
          )}
          {ridersLoaded && enriched.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-muted text-[14px]">No independent riders match this filter right now.</p>
              <button onClick={() => setFilter('all')} className="btn-secondary mt-4">Reset filter</button>
            </div>
          )}

          <PlatformDisclaimer variant="compact" />
        </div>
      </main>

      {/* Customer info prompt — opens on first Book tap if we don't have
          the customer's phone yet. Saved to localStorage for repeat visits. */}
      {pendingBook && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
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
                {submittingBook ? 'Sending…' : `Book ${pendingBook.rider.name}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking toast — fires when a driver's Book button is tapped.
          Opens WhatsApp immediately; the toast is a brief, non-blocking
          confirmation that the driver will reply there. */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 inset-x-4 max-w-sm mx-auto z-50 rounded-full px-4 py-3 flex items-center gap-2.5 text-[13px] font-bold animate-[fadeUp_0.25s_ease-out]"
          style={{
            background: 'rgba(10,10,10,0.92)',
            border: '1px solid rgba(250,204,21,0.40)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <span aria-hidden className="text-[16px] leading-none">💬</span>
          <span className="text-white truncate">
            Opening WhatsApp — <span className="text-brand">{toast.driverName}</span> will reply there
          </span>
        </div>
      )}
    </>
  )
}

// Rough pickup ETA estimate. Assumes ~25 km/h average city speed in Bali.
// Replace with real routing data (Mapbox/OSRM) when available.
function etaMinutes(km: number): number {
  return Math.max(1, Math.round((km / 25) * 60))
}

function FeaturedDriverCard({
  item, isCheapest, onWhatsApp,
}: {
  item: {
    rider: Rider
    fare: number
    pitstopFee: number
    totalFare: number
    minApplied: boolean
    distanceToPickup: number
    perKm: number
    hasOverrides: boolean
  }
  isCheapest: boolean
  onWhatsApp: () => void
}) {
  const { rider, fare, distanceToPickup, minApplied } = item
  const eta = etaMinutes(distanceToPickup)

  return (
    <article
      className={
        'card card-driver relative overflow-hidden animate-[fadeUp_0.4s_ease-out_both]' +
        (isCheapest ? ' card-driver-cheapest' : '')
      }
    >
      <img
        src="https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2018,%202026,%2001_32_57%20AM.png"
        alt=""
        className="block w-full h-auto"
        loading="lazy"
      />

      {/* Driver name ribbon — flush top-left edge, with logo before name */}
      <div className="absolute top-0 left-0 z-10 max-w-[60%]">
        <span className="ribbon-cheapest flex items-center min-w-0">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitledasdaaaaaaa-removebg-preview.png"
            alt=""
            className="h-5 w-auto shrink-0"
          />
          <span className="truncate min-w-0">{rider.name}</span>
        </span>
      </div>

      {/* Bike model — plain uppercase text in the top-right corner.
          Line 1: MAKE MODEL  |  Line 2: YEAR */}
      <div className="absolute top-3 right-[28px] z-10 text-right max-w-[42%]">
        <div className="text-[14px] font-extrabold text-black leading-tight truncate uppercase tracking-wide">
          {rider.bike.make} {rider.bike.model}
        </div>
        <div className="text-[12px] font-medium text-black/80 leading-tight mt-0.5">
          {rider.bike.year}
        </div>
      </div>

      {/* Avatar + identity with frosted scrim for contrast over photo */}
      <Link
        href={`/r/${rider.slug}`}
        aria-label={`View ${rider.name}'s profile`}
        className="absolute left-4 top-10 flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-brand/60 rounded-2xl z-10"
      >
        <span className="relative shrink-0">
          <img
            src={rider.photoUrl}
            alt={rider.name}
            className="w-[58px] h-[58px] rounded-2xl object-cover ring-2 ring-white/80"
          />
          <span className="dot-online absolute bottom-1 right-1 ring-2 ring-white" aria-label="Online" />
        </span>
        {rider.rating != null && (
          <span
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[13px] font-bold leading-none"
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 shrink-0" aria-hidden />
            <span className="text-black">{rider.rating.toFixed(1)}</span>
            {rider.trips != null && (
              <span className="text-[12px] text-gray-700 ml-0.5 font-semibold">
                ({rider.trips.toLocaleString('en-US')} trips)
              </span>
            )}
          </span>
        )}
      </Link>

      {/* Bottom info panel — overlays the lower portion of the image */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none">
        <div className="relative px-3.5 pt-2.5 pb-3 space-y-1.5 pointer-events-auto">
          {/* Trust chips: box + services (excl. parcel + food) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {rider.bike.hasBox && (
              <span className="pill-soft pill-soft-online" aria-label="Has box">
                <span aria-hidden>📦</span>
                Box
              </span>
            )}
            {rider.services.filter(s => s !== 'parcel' && s !== 'food').map(s => (
              <span key={s} className="pill-soft" aria-label={SERVICE_LABELS[s]}>
                <span aria-hidden>{SERVICE_ICONS[s]}</span>
                {SERVICE_SHORT[s]}
              </span>
            ))}
          </div>

          {/* Price block (left) + Primary CTA (right) */}
          <div className="pt-1 flex items-end justify-between gap-3">
            <div className="flex flex-col leading-none drop-shadow min-w-0">
              <span className="text-[17px] font-extrabold text-gray-700 whitespace-nowrap">
                {idr(fare)}
              </span>
              <span className="mt-1.5 text-[12px] font-bold text-gray-700 whitespace-nowrap">
                ~{eta} {eta === 1 ? 'min' : 'mins'} away
                {minApplied && <span className="text-brand ml-1.5">· min fare</span>}
              </span>
            </div>
            <button
              onClick={onWhatsApp}
              aria-label={`Book ${rider.name}`}
              className="h-[39px] min-w-[118px] pl-2.5 pr-1 rounded-full flex items-center justify-between gap-1 border border-black active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-brand/60 shrink-0"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
                boxShadow: '0 6px 16px rgba(250,204,21,0.28)',
              }}
            >
              <span className="text-[12px] font-extrabold uppercase tracking-wider text-black whitespace-nowrap">
                Book driver
              </span>
              <span
                aria-hidden
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#000' }}
              >
                <ArrowRight className="w-3 h-3 text-white" strokeWidth={3} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function Header({ editTripHref = '/cari' }: { editTripHref?: string }) {
  return (
    <header className="sticky top-0 z-40 glass-strong pt-safe">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png"
            alt=""
            className="h-9 w-auto"
            loading="eager"
          />
          <div className="text-[15px] font-extrabold tracking-tight">
            City <span className="gradient-text">Rider</span>
          </div>
        </div>
        <Link href={editTripHref} className="flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink">
          <ChevronLeft className="w-4 h-4" />
          Edit trip
        </Link>
      </div>
    </header>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition border whitespace-nowrap"
      style={{
        background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
        color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
        borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.1)',
      }}
    >
      {label}
    </button>
  )
}

function LoadingShell() {
  return (
    <main className="min-h-screen p-4 space-y-3">
      <div className="card h-24 shimmer" />
      <div className="card h-32 shimmer" />
      <div className="card h-32 shimmer" />
    </main>
  )
}

function readCoord(sp: URLSearchParams, latKey: string, lngKey: string) {
  const lat = parseFloat(sp.get(latKey) ?? '')
  const lng = parseFloat(sp.get(lngKey) ?? '')
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
}

