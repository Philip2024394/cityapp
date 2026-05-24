'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Star, ArrowRight, RotateCw, Bike, Cog, Settings2, Palette, Hash, Package } from 'lucide-react'
import { fetchActiveDriversBrowser } from '@/lib/drivers/queries'
import { haversineKm } from '@/lib/geo/haversine'
import { etaMinutes } from '@/lib/geo/eta'
import { fetchRoadDistanceKm, instantRoadDistance, type RoadDistance } from '@/lib/geo/route-distance'
import { quoteBreakdown, rateFor, isOutOfZone } from '@/lib/pricing/quote'
import { buildWhatsAppLink } from '@/lib/whatsapp/buildLink'
import { writePendingBooking, readTriedDriverIds, readPendingBooking } from '@/lib/booking/pending-booking'
import { idr } from '@/lib/format/idr'
import { useHaptic } from '@/hooks/useHaptic'
import { useBeep } from '@/hooks/useBeep'
import { SERVICE_ICONS, SERVICE_LABELS, SERVICE_SHORT, type Rider, type ServiceType } from '@/types/rider'
import { presenceLabel, presenceTier, presenceDotColor } from '@/lib/drivers/presence'
import { pingDriverContact } from '@/lib/notify/clientPing'
import { logNav } from '@/lib/perf/navTiming'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import PartnerBookingBadge from '@/components/rider/PartnerBookingBadge'
import { getBikeImageUrl } from '@/data/bikeImages'

// Customer-facing labels for the service-type toggle. Stable order so
// the underline bar always slides over consistent positions.
const SERVICE_TOGGLE: ReadonlyArray<{ id: ServiceType; label: string }> = [
  { id: 'person', label: 'Bike' },
  { id: 'parcel', label: 'Parcel'    },
  { id: 'food',   label: 'Food'      },
]

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

  // Hydrate from the in-flight pending booking when URL params are absent.
  // Lets `/cari/pending` send the user here via "Pick another driver"
  // without re-encoding the whole trip into the URL — pickup, dropoff,
  // pitstop, and service all survive the navigation.
  const pending = useMemo(() => readPendingBooking(), [])
  const pickup =
    readCoord(sp, 'pLat', 'pLng')
    ?? (pending?.trip.pickup ? { lat: pending.trip.pickup.lat, lng: pending.trip.pickup.lng } : null)
  const dropoff =
    readCoord(sp, 'dLat', 'dLng')
    ?? (pending?.trip.dropoff ? { lat: pending.trip.dropoff.lat, lng: pending.trip.dropoff.lng } : null)
  const pickupName  = sp.get('pName') ?? pending?.trip.pickup.label  ?? 'My location'
  const dropoffName = sp.get('dName') ?? pending?.trip.dropoff.label ?? 'Destination'
  const pitstopNote = sp.get('stop')  ?? pending?.trip.pitstop?.note ?? null

  // Sort is fixed to 'cheapest' since the badge row was replaced with a
  // service-type toggle (Passenger / Parcel / Food). State is preserved
  // so the FeaturedDriverCard's `isCheapest` flag keeps working.
  const [sort] = useState<'cheapest' | 'nearest'>('cheapest')
  // Read service choice from URL — set by /cari when customer picks one
  // of the 3 service cards. Falls back to the pending booking's service
  // (so /cari/pending → Pick another driver keeps the same service type)
  // then to 'person' (Passenger) since the new toggle has no "all" option.
  const initialFilter: ServiceType = (() => {
    const f = sp.get('filter')
    if (f === 'person' || f === 'parcel' || f === 'food') return f
    const fromPending = pending?.trip.service
    if (fromPending === 'person' || fromPending === 'parcel' || fromPending === 'food') return fromPending
    return 'person'
  })()
  const [filter, setFilter] = useState<ServiceType>(initialFilter)

  // Brief non-blocking toast shown when the user taps Book Driver. Tells
  // them WhatsApp is opening and the driver will reply there. Auto-dismiss.
  const [toast, setToast] = useState<{ driverName: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // perf instrumentation — measures /cari → /cari/rider transition.
  useEffect(() => { logNav('cari/rider:mount') }, [])

  // Drivers the user has already tried in this session — surfaced as a
  // "Tried" pill on the card so they're not re-contacted accidentally.
  // Lives in sessionStorage; no server record.
  const [triedIds, setTriedIds] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    setTriedIds(new Set(readTriedDriverIds()))
  }, [])

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

  // Back-to-booking URL — carries the current trip params so /cari can
  // reload exactly where the user left off rather than starting blank.
  const editTripHref = `/cari?${sp.toString()}`

  // Road-distance fast path: render with haversine × 1.3 immediately,
  // then upgrade to the real OSRM road km when the proxy responds. If
  // OSRM isn't configured (or is down) the upgrade is a no-op — we
  // keep the corrected haversine. Either way the customer sees a
  // realistic km, never the under-quoted straight line.
  const [tripRoute, setTripRoute] = useState<RoadDistance>(() =>
    pickup && dropoff
      ? instantRoadDistance(pickup, dropoff)
      : { km: 0, source: 'haversine_corrected' },
  )
  useEffect(() => {
    if (!pickup || !dropoff) return
    setTripRoute(instantRoadDistance(pickup, dropoff))
    let cancelled = false
    fetchRoadDistanceKm(pickup, dropoff).then((r) => {
      if (!cancelled) setTripRoute(r)
    })
    return () => { cancelled = true }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng])

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

  const tripKm = tripRoute.km

  const enriched = useMemo(() => {
    const list = riders.filter(r =>
      r.isOnline &&
      r.subscriptionStatus !== 'past_due' &&
      r.services.includes(filter),
    )
    const e = list.map(r => {
      // Price the trip for the actively-selected service. When the trip
      // distance exceeds this driver's service-zone radius, the fare
      // switches to round-trip (km × 2) — customer covers the return leg.
      const pricing = rateFor(r, filter)
      const outOfZone = isOutOfZone(tripKm, r.serviceZoneRadiusKm)
      const { final, minApplied, chargeableKm } = quoteBreakdown(tripKm, pricing, outOfZone)
      const distanceToPickup = haversineKm(pickup, { lat: r.lat, lng: r.lng })
      const hasOverrides = false
      const hasPitstop = !!pitstopNote
      const pitstopFee = hasPitstop ? (r.pitstopFee ?? 0) : 0
      const totalFare = final + pitstopFee
      return {
        rider: r, fare: final, pitstopFee, hasPitstop, totalFare, minApplied,
        distanceToPickup, perKm: pricing.pricePerKm, hasOverrides,
        outOfZone, chargeableKm,
      }
    })
    e.sort((a, b) =>
      sort === 'cheapest' ? a.totalFare - b.totalFare : a.distanceToPickup - b.distanceToPickup,
    )
    return e
  }, [tripKm, sort, filter, pickup, pitstopNote, riders])

  const cheapest = enriched[0]?.totalFare
  const mostExpensive = enriched.length > 0 ? Math.max(...enriched.map(x => x.totalFare)) : null

  // Book Driver — pure WhatsApp deep-link. No platform-side record of
  // the booking. The directory's job ends the moment the customer taps
  // through to wa.me; everything after that is between the customer and
  // the independent rider, exactly like a Yellow Pages listing.
  //
  // This is a deliberate legal posture: by NOT recording the trip on
  // our servers, the platform stays a software directory and falls
  // outside Permenhub PM 12/2019's definition of an aplikasi penyedia
  // jasa angkutan (transport-app operator).
  function onBookRider(rider: Rider, fare: number, perKm: number, pitstopFee: number) {
    logNav('cari/rider:book-driver')
    haptic.buzz()
    beep.play()
    const link = buildWhatsAppLink({
      riderName: rider.name,
      riderWhatsAppE164: rider.whatsappE164,
      pickup: { lat: pickup!.lat, lng: pickup!.lng, label: pickupName },
      dropoff: { lat: dropoff!.lat, lng: dropoff!.lng, label: dropoffName },
      distanceKm: tripKm,
      pricePerKm: perKm,
      fare,
      etaMin: etaMinutes(tripKm),
      pitstop: pitstopNote ? { note: pitstopNote, fee: pitstopFee } : undefined,
    })
    if (!link) {
      // Phone number unusable — refuse to open WhatsApp to a wrong
      // number. Visible toast so the customer knows something's off
      // with this rider's listing rather than launching a no-op chat.
      setToast({ driverName: rider.name + ' — nomor WhatsApp tidak valid' })
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToast(null), 3000)
      return
    }
    // iOS Safari 16+ popup-blocker rule: window.open MUST be the first
    // call inside the synchronous click handler — any prior microtask
    // breaks the user-gesture chain and the popup is silently blocked.
    // pingDriverContact uses sendBeacon (sync), so it's safe to run
    // either side, but we open first to defend against future changes.
    const opened = window.open(link, '_blank', 'noopener,noreferrer')
    if (!opened) {
      // Popup blocked — surface the WhatsApp link so the customer can
      // copy/long-press it instead of staring at a frozen UI.
      setToast({ driverName: rider.name + ' — buka manual: ' + link })
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToast(null), 6000)
      return
    }
    pingDriverContact(rider.id, 'cari_rider', {
      fareIdr: fare,
      pickupName,
      dropoffName,
      serviceType: filter,
    })
    writePendingBooking({
      driverId: rider.id,
      driverSlug: rider.slug,
      driverName: rider.name,
      driverPhotoUrl: rider.photoUrl,
      driverWhatsAppE164: rider.whatsappE164,
      driverWhatsAppLink: link,
      driverLastSeenAt: rider.lastSeenAt,
      driverSessionStartedAt: rider.sessionStartedAt ?? null,
      parallelAttempts: [],
      trip: {
        pickup: { lat: pickup!.lat, lng: pickup!.lng, label: pickupName },
        dropoff: { lat: dropoff!.lat, lng: dropoff!.lng, label: dropoffName },
        distanceKm: tripKm,
        fare,
        pricePerKm: perKm,
        etaMin: etaMinutes(tripKm),
        service: filter,
        pitstop: pitstopNote ? { note: pitstopNote, fee: pitstopFee } : null,
      },
      sentAtMs: Date.now(),
      // Carry over any drivers the user previously tried this session.
      triedDriverIds: Array.from(triedIds),
    })
    router.push('/cari/pending')
  }

  return (
    <>
      <Header />

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
                className="relative flex-1 min-w-0 p-4 space-y-3 overflow-hidden"
                style={{ background: '#000000' }}
              >
                {/* Decorative brand watermark — low opacity so the white
                    text on top stays legible. removebg PNG sits over the
                    black background, anchored to the right edge near the
                    ticket's punch-out seam. */}
                <img
                  aria-hidden
                  src="https://ik.imagekit.io/nepgaxllc/Untitledsssxx-removebg-preview.png?updatedAt=1779200415319"
                  alt=""
                  className="absolute pointer-events-none select-none"
                  style={{
                    right: 0, top: '50%', transform: 'translateY(-50%)',
                    height: '90%', width: 'auto', opacity: 0.18, zIndex: 0,
                  }}
                />
                <div className="relative z-10">
                  <div className="text-[12px] text-muted font-extrabold tracking-[0.2em]">DARI</div>
                  <div className="text-[15px] font-extrabold text-white mt-1 truncate">{pickupName}</div>
                </div>
                {pitstopNote && (
                  <div className="relative z-10 pl-2 -ml-2 border-l-2 border-brand/40">
                    <div className="text-[12px] text-brand font-extrabold tracking-[0.2em] flex items-center gap-1">
                      <span aria-hidden>🛑</span> PIT STOP
                    </div>
                    <div className="text-[14px] text-white/85 mt-1 truncate">{pitstopNote}</div>
                  </div>
                )}
                <div className="relative z-10">
                  <div className="text-[12px] text-muted font-extrabold tracking-[0.2em]">TUJUAN</div>
                  <div className="text-[15px] font-extrabold text-white mt-1 truncate">{dropoffName}</div>
                </div>
                {/* Converted from <button onClick={router.push}> to <Link prefetch>
                    2026-05 perf pass — same destination as the header
                    "Edit trip" link; lets Next prefetch /cari with the
                    trip params so the back-nav is instant.
                    Restyled to a solid yellow button so it reads as an
                    action (not a passive caption). */}
                <Link
                  href={editTripHref}
                  prefetch
                  className="relative z-10 mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand text-bg text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 active:scale-95 transition self-start"
                >
                  <span aria-hidden>✎</span> Edit trip
                </Link>
              </div>

              {/* Stub — distance / ETA / fare-from — solid brand yellow */}
              <div
                className="w-[30%] shrink-0 p-4 flex flex-col justify-around text-center gap-3"
                style={{ background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)' }}
              >
                <div>
                  <div className="text-[12px] font-extrabold tracking-wider text-black/60">JARAK</div>
                  <div className="text-[20px] font-extrabold text-black leading-none mt-1 whitespace-nowrap">
                    {tripKm.toFixed(1)}
                    <span className="text-[12px] ml-0.5 align-baseline">KM</span>
                  </div>
                </div>
                <div>
                  <div className="text-[12px] font-extrabold tracking-wider text-black/60">WAKTU</div>
                  <div className="text-[16px] font-extrabold text-black leading-none mt-1 whitespace-nowrap">
                    ~{etaMinutes(tripKm)}
                    <span className="text-[10px] ml-0.5 align-baseline">MIN AWAY</span>
                  </div>
                </div>
                {cheapest != null && (
                  <div>
                    <div className="text-[12px] font-extrabold tracking-wider text-black/60">MULAI</div>
                    <div className="text-[14px] font-extrabold text-black leading-tight mt-1 whitespace-nowrap">
                      {idr(cheapest)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Partner attribution banner — renders only when a hotel/villa
              QR has set partner_slug in localStorage (24h window). Tells
              the guest they're being referred and that the driver will
              owe a small commission to the venue. */}
          <PartnerBookingBadge fareIdr={cheapest ?? null} />

          {/* Service-type toggle — Passenger / Parcel / Food. Yellow
              gradient bar underlines the active option. Replaces the
              older overflow-scrolling chip row. */}
          <div
            className="flex items-stretch gap-1 border-b border-white/10"
            role="tablist"
            aria-label="Filter drivers by service"
          >
            {SERVICE_TOGGLE.map(({ id, label }) => {
              const active = filter === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setFilter(id); haptic.tap() }}
                  className="relative flex-1 px-1 py-2.5 text-center transition"
                  style={{ minHeight: 44 }}
                >
                  <span
                    className={`block text-[14px] font-extrabold uppercase tracking-wider transition ${
                      active ? 'text-brand' : 'text-muted'
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    aria-hidden
                    className={`absolute left-1/2 -translate-x-1/2 -bottom-[1px] h-[3px] rounded-full bg-gradient-to-r from-brand to-brand2 shadow-[0_0_10px_rgba(250,204,21,0.45)] transition-all ${
                      active ? 'w-12 opacity-100' : 'w-0 opacity-0'
                    }`}
                  />
                </button>
              )
            })}
          </div>

          {/* Driver cards — featured-banner style for the top 4 */}
          <div className="space-y-3">
            {enriched.slice(0, 4).map((item, idx) => (
              <FeaturedDriverCard
                key={item.rider.id}
                item={item}
                isCheapest={idx === 0 && sort === 'cheapest'}
                tried={triedIds.has(item.rider.id)}
                onWhatsApp={() => onBookRider(item.rider, item.fare, item.perKm, item.pitstopFee)}
              />
            ))}
          </div>

          {!ridersLoaded && enriched.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-muted text-[14px]">Mencari driver di sekitarmu…</p>
            </div>
          )}
          {ridersLoaded && enriched.length === 0 && (() => {
            const totalOnline = riders.filter(r => r.isOnline && r.subscriptionStatus !== 'past_due').length
            const otherServiceCounts = (['person', 'parcel', 'food'] as const)
              .filter(s => s !== filter)
              .map(s => ({
                id: s,
                count: riders.filter(r =>
                  r.isOnline &&
                  r.subscriptionStatus !== 'past_due' &&
                  r.services.includes(s),
                ).length,
              }))
              .filter(x => x.count > 0)

            if (totalOnline === 0) {
              return (
                <div className="card p-8 text-center space-y-2">
                  <p className="font-extrabold text-[15px]">Belum ada driver online</p>
                  <p className="text-muted text-[13px] leading-relaxed">
                    Coba beberapa menit lagi — driver biasanya aktif pagi (06-10) dan sore (16-21).
                  </p>
                </div>
              )
            }

            return (
              <div className="card p-6 text-center space-y-3">
                <p className="font-extrabold text-[15px]">
                  {totalOnline} driver online, tapi belum ada yang menawarkan {SERVICE_LABELS[filter]}
                </p>
                {otherServiceCounts.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-muted text-[13px]">Coba layanan lain:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {otherServiceCounts.map(({ id, count }) => (
                        <button
                          key={id}
                          onClick={() => { setFilter(id); haptic.tap() }}
                          className="px-3 py-2 rounded-full text-[13px] font-extrabold transition border active:scale-95"
                          style={{
                            background: 'rgba(250,204,21,0.10)',
                            borderColor: 'rgba(250,204,21,0.40)',
                            color: '#FACC15',
                          }}
                        >
                          {SERVICE_LABELS[id]} · {count}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted text-[13px] leading-relaxed">
                    Coba edit pickup / dropoff untuk memperluas area pencarian.
                  </p>
                )}
              </div>
            )
          })()}

          <PlatformDisclaimer variant="compact" />
        </div>
      </main>

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

function FeaturedDriverCard({
  item, isCheapest, tried, onWhatsApp,
}: {
  item: {
    rider: Rider
    fare: number
    pitstopFee: number
    hasPitstop: boolean
    totalFare: number
    minApplied: boolean
    distanceToPickup: number
    perKm: number
    hasOverrides: boolean
    outOfZone: boolean
    chargeableKm: number
  }
  isCheapest: boolean
  /** True if the user already contacted this driver in this session.
   *  We show a discreet "Tried" pill so they don't re-contact by
   *  accident — the Book button still works for a deliberate retry. */
  tried: boolean
  onWhatsApp: () => void
}) {
  const { rider, fare, distanceToPickup, minApplied } = item
  const eta = etaMinutes(distanceToPickup)
  const [flipped, setFlipped] = useState(false)

  function toggleFlip(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setFlipped((v) => !v)
  }

  const FlipBtn = ({ onBack = false }: { onBack?: boolean }) => (
    <button
      type="button"
      onClick={toggleFlip}
      aria-label={onBack ? 'Show driver details' : 'Show bike details'}
      className="absolute top-2 right-2 z-30 w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90"
      style={{
        background: 'rgba(10,10,10,0.92)',
        border: '1.5px solid #FACC15',
        color: '#FACC15',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        boxShadow: '0 3px 10px rgba(0,0,0,0.45)',
      }}
    >
      <RotateCw className="w-4 h-4" strokeWidth={2.5} />
    </button>
  )

  const transmissionLabel =
    rider.bike.type === 'matic'  ? 'Automatic' :
    rider.bike.type === 'sport'  ? 'Sport / Manual' :
    rider.bike.type === 'manual' ? 'Manual' : 'Unknown'

  // Bike gallery lookup — make+model → curated imagekit photo (catalog
  // first, then extension map, then a stable per-key recent variant,
  // finally generic silhouette). Never null.
  const bikePhotoUrl = getBikeImageUrl(rider.bike.make, rider.bike.model)

  return (
    <div
      className="relative animate-[fadeUp_0.4s_ease-out_both]"
      style={{ perspective: '1400px' }}
    >
      <div
        className="relative"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}
      >
        {/* Back-face spec sheet — yellow brand panel. Absolute inset:0 so
            it matches the front face's height (set by the photo image). */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden p-5 flex flex-col"
          style={{
            background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
            border: '1px solid rgba(0,0,0,0.85)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          }}
        >
          <FlipBtn onBack />

          {/* Bike hero photo — looked up from the gallery via make+model
              (data/bikeImages.ts). Sized to dominate the back face. */}
          <div
            className="relative -mx-5 -mt-5 mb-3 h-[140px] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(10,10,10,0.06), transparent 60%)',
            }}
          >
            <img
              src={bikePhotoUrl}
              alt={`${rider.bike.make || ''} ${rider.bike.model || ''}`.trim() || 'Bike'}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.30))' }}
            />
          </div>

          <div className="flex items-center gap-2 mb-3 pr-12">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#0A0A0A' }}
            >
              <Bike className="w-4 h-4 text-brand" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-black/65">Bike</div>
              <div className="text-[16px] font-black text-black leading-tight truncate">
                {rider.bike.make || '—'} {rider.bike.model || ''}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1 content-start">
            <SpecTile icon={Cog}        label="Engine"       value={rider.bike.cc ? `${rider.bike.cc} cc` : '—'} />
            <SpecTile icon={Settings2}  label="Transmission" value={transmissionLabel} />
            <SpecTile icon={Palette}    label="Colour"       value={rider.bike.color || '—'} />
            <SpecTile icon={Hash}       label="Plate"        value={rider.bike.plate || '—'} mono />
            <SpecTile icon={Bike}       label="Year"         value={rider.bike.year ? String(rider.bike.year) : '—'} />
            <SpecTile icon={Package}    label="Top box"      value={rider.bike.hasBox ? 'Yes' : 'No'} />
          </div>
        </div>

        {/* Front face — the original card photo + overlays. */}
        <article
          className={
            'card card-driver relative overflow-hidden' +
            (isCheapest ? ' card-driver-cheapest' : '')
          }
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <FlipBtn />
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
          Line 1: MAKE MODEL  |  Line 2: YEAR. Shifted left to clear the
          flip button at right-2. */}
      <div className="absolute top-3 right-[52px] z-10 text-right max-w-[38%]">
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
            className="w-[76px] h-[76px] rounded-2xl object-cover ring-2 ring-white/80"
          />
          <span className="dot-online absolute bottom-1 right-1 ring-2 ring-white" aria-label="Online" />
        </span>
        {/* Star rating + ETA stack — both shifted up via translateY so
            they sit nearer the top of the avatar row. ETA only renders
            when location is fresh; "Min 11" reads as "11 minutes away". */}
        <span className="flex flex-col gap-1" style={{ transform: 'translateY(-12px)' }}>
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
          <span
            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[12px] font-extrabold leading-none"
            style={{
              background: 'rgba(255,255,255,0.7)',
              color: '#0A0A0A',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            Min {String(Math.min(eta, 99)).padStart(2, '0')}
          </span>
        </span>
      </Link>

      {/* Bottom info panel — overlays the lower portion of the image */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none">
        <div className="relative px-3.5 pt-2.5 pb-3 space-y-1.5 pointer-events-auto">
          {/* Trust chips: services offered + live presence pill + optional
              "Online until 17:00" shift badge. All driver-self telemetry
              — no customer event data. */}
          {/* Presence pill ("Active 1h ago") + person/ride service pill
              removed per design — kept the data layer (presenceTier etc.)
              available for other surfaces. */}

          {/* Price block (left) + Primary CTA (right). When the driver's
              GPS is stale (>15 min) we refuse to render an ETA — it would
              be derived from a wrong distance. Falls back to "Based in
              {area}" using their declared service zone. */}
          <div className="pt-1 flex items-end justify-between gap-3">
            <div className="flex flex-col leading-none drop-shadow min-w-0">
              <span className="text-[17px] font-extrabold text-gray-700 whitespace-nowrap">
                {idr(fare)}
              </span>
              {rider.locationFresh && (
                <span className="mt-1.5 text-[12px] font-bold text-gray-700 whitespace-nowrap">
                  ~{eta} {eta === 1 ? 'min' : 'mins'} away
                  {minApplied && <span className="text-brand ml-1.5">· min fare</span>}
                </span>
              )}
              {/* Pit-stop fee line — only shown when the customer asked
                  for a pit stop (item.pitstopFee comes from the per-driver
                  pitstop_fee column). Free pit stop reads as "Free pitstop",
                  paid reads as "+Rp X pitstop". */}
              {item.pitstopFee >= 0 && item.hasPitstop && (
                <span
                  className="mt-1 inline-flex items-center gap-1 text-[12px] font-extrabold whitespace-nowrap"
                  style={{
                    color: item.pitstopFee === 0 ? '#16A34A' : '#0A0A0A',
                  }}
                >
                  <span aria-hidden>🛑</span>
                  {item.pitstopFee === 0
                    ? <>Free pitstop</>
                    : <>+{idr(item.pitstopFee)} pitstop</>}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <img
                src="https://ik.imagekit.io/nepgaxllc/Untitleddaaaaad-removebg-preview.png"
                alt=""
                aria-hidden
                loading="lazy"
                className="h-9 w-auto"
                style={{
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))',
                  transform: 'translateY(-3px)',
                }}
              />
              <button
                onClick={onWhatsApp}
                aria-label={tried ? `Re-contact ${rider.name}` : `Book ${rider.name}`}
                className="h-[32px] min-w-[118px] pl-2.5 pr-1 rounded-full flex items-center justify-between gap-1 border border-black active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-brand/60"
                style={{
                  background: tried
                    ? 'linear-gradient(135deg, #94A3B8, #64748B)'
                    : 'linear-gradient(135deg, #FACC15, #F59E0B)',
                  boxShadow: tried
                    ? '0 6px 16px rgba(100,116,139,0.28)'
                    : '0 6px 16px rgba(250,204,21,0.28)',
                }}
              >
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-black whitespace-nowrap">
                  {tried ? 'Tried · retry' : 'Book driver'}
                </span>
                <span
                  aria-hidden
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: '#000' }}
                >
                  <ArrowRight className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
        </article>
      </div>
    </div>
  )
}

// Spec tile for the back-face bike sheet. Black-on-yellow chip.
function SpecTile({
  icon: Icon, label, value, mono = false,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        background: 'rgba(10,10,10,0.92)',
        border: '1px solid rgba(0,0,0,0.85)',
      }}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold text-brand">
        <Icon className="w-3 h-3" strokeWidth={2.5} />
        {label}
      </div>
      <div
        className={`text-[14px] font-extrabold text-white mt-0.5 truncate ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

function Header() {
  // The header's "Edit trip" link was removed per design — the inline
  // yellow "Edit trip" button next to TUJUAN is now the single edit
  // entry point. Logo is left-aligned alone; no right slot needed.
  return (
    <header className="sticky top-0 z-40 glass-strong pt-safe">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center">
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
      </div>
    </header>
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

