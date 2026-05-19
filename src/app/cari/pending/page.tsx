'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, MessageCircle, ArrowRight, X as XIcon, AlertTriangle, RefreshCw } from 'lucide-react'
import {
  readPendingBooking,
  writePendingBooking,
  clearPendingBooking,
  type PendingBooking,
} from '@/lib/booking/pending-booking'
import { useElapsedSince } from '@/hooks/useElapsedSince'
import { fetchActiveDriversBrowser } from '@/lib/drivers/queries'
import { quoteBreakdown, rateFor } from '@/lib/pricing/quote'
import { haversineKm } from '@/lib/geo/haversine'
import { buildWhatsAppLink } from '@/lib/whatsapp/buildLink'
import { etaMinutes } from '@/lib/geo/eta'
import { useHaptic } from '@/hooks/useHaptic'
import { idr } from '@/lib/format/idr'
import type { Rider, ServiceType } from '@/types/rider'

// ============================================================================
// /cari/pending — the post-WhatsApp waiting screen.
// ----------------------------------------------------------------------------
// Pure client-side UX. Nothing here writes to the server. The state lives
// in sessionStorage; the driver receives the WhatsApp message exactly the
// same as today and has no idea this screen exists. That is deliberate —
// it's how we keep cityrider on the directory side of PM 12/2019 while
// still making the customer experience feel professional.
// ============================================================================

type Stage = 0 | 1 | 2 | 3

function stageFromElapsed(ms: number): Stage {
  const m = ms / 60_000
  if (m < 2) return 0
  if (m < 5) return 1
  if (m < 10) return 2
  return 3
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m <= 0) return `${s}s`
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export default function PendingBookingPage() {
  const router = useRouter()
  const haptic = useHaptic()
  const [booking, setBooking] = useState<PendingBooking | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [riders, setRiders] = useState<Rider[]>([])
  const [welcomeBack, setWelcomeBack] = useState(false)

  // Hydrate from sessionStorage on mount. If there's no pending booking,
  // bounce the user back to /cari — they probably hit /cari/pending by
  // accident (refreshed after Done, deep link from history, etc.).
  useEffect(() => {
    const b = readPendingBooking()
    setBooking(b)
    setHydrated(true)
    if (!b) router.replace('/cari')
  }, [router])

  // Welcome-back card — fires once when the tab regains visibility
  // AFTER the booking was set. This is our "user returned from WhatsApp"
  // signal. Visibility-API is the only sandbox-safe way to detect it.
  useEffect(() => {
    if (!booking) return
    let shown = false
    const onVis = () => {
      if (shown) return
      if (document.visibilityState !== 'visible') return
      // Skip on the very first render (we likely just navigated here
      // before WhatsApp launched — no "back from WA" moment yet).
      if (Date.now() - booking.sentAtMs < 1500) return
      shown = true
      setWelcomeBack(true)
      window.setTimeout(() => setWelcomeBack(false), 6000)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [booking])

  // Load active drivers so we can offer alternatives. Cheap network call;
  // same query the marketplace uses. We render whatever we have.
  useEffect(() => {
    let cancelled = false
    fetchActiveDriversBrowser().then((list) => {
      if (!cancelled) setRiders(list)
    })
    return () => { cancelled = true }
  }, [])

  const elapsedMs = useElapsedSince(booking?.sentAtMs ?? null)
  const stage: Stage = stageFromElapsed(elapsedMs)

  const alternatives = useMemo(() => {
    if (!booking) return []
    const tried = new Set([booking.driverId, ...booking.triedDriverIds])
    const service: ServiceType | null = booking.trip.service
    const candidates = riders.filter((r) => {
      if (tried.has(r.id)) return false
      if (!r.isOnline) return false
      if (service && !r.services.includes(service)) return false
      return true
    })
    const tripKm = booking.trip.distanceKm
    const ranked = candidates.map((r) => {
      const pricing = service ? rateFor(r, service) : { pricePerKm: r.pricePerKm, minFee: r.minFee }
      const { final } = quoteBreakdown(tripKm, pricing)
      const distanceToPickup = haversineKm(booking.trip.pickup, { lat: r.lat, lng: r.lng })
      const pitFee = booking.trip.pitstop ? (r.pitstopFee ?? 0) : 0
      return { rider: r, fare: final, pitFee, total: final + pitFee, distanceToPickup, perKm: pricing.pricePerKm }
    })
    ranked.sort((a, b) => a.total - b.total)
    return ranked.slice(0, 3)
  }, [booking, riders])

  function onContactAlternative(alt: typeof alternatives[number]) {
    if (!booking) return
    const link = buildWhatsAppLink({
      riderName: alt.rider.name,
      riderWhatsAppE164: alt.rider.whatsappE164,
      pickup: booking.trip.pickup,
      dropoff: booking.trip.dropoff,
      distanceKm: booking.trip.distanceKm,
      pricePerKm: alt.perKm,
      fare: alt.fare,
      etaMin: booking.trip.etaMin || etaMinutes(booking.trip.distanceKm),
      pitstop: booking.trip.pitstop ?? undefined,
    })
    if (!link) {
      alert('Driver has no valid WhatsApp number. Please pick another.')
      return
    }
    haptic.buzz()
    window.open(link, '_blank', 'noopener,noreferrer')
    const next = writePendingBooking({
      driverId: alt.rider.id,
      driverSlug: alt.rider.slug,
      driverName: alt.rider.name,
      driverPhotoUrl: alt.rider.photoUrl,
      driverWhatsAppE164: alt.rider.whatsappE164,
      driverWhatsAppLink: link,
      trip: booking.trip,
      sentAtMs: Date.now(),
      // Archive the previous driver as tried.
      triedDriverIds: Array.from(new Set([...booking.triedDriverIds, booking.driverId])),
    })
    setBooking(next)
    setWelcomeBack(false)
  }

  function onReopenWhatsApp() {
    if (!booking) return
    haptic.tap()
    window.open(booking.driverWhatsAppLink, '_blank', 'noopener,noreferrer')
  }

  function onConfirmed() {
    haptic.impact()
    clearPendingBooking()
    router.push('/cari?booked=1')
  }

  function onCancel() {
    if (!confirm('Cancel this request? The driver will still see your WhatsApp message — this only resets the screen on your side.')) return
    clearPendingBooking()
    router.push('/cari/rider')
  }

  function onPickAnother() {
    if (!booking) return
    // Archive the active one into tried so the marketplace marks it.
    writePendingBooking({
      ...booking,
      triedDriverIds: Array.from(new Set([...booking.triedDriverIds, booking.driverId])),
    })
    router.push('/cari/rider')
  }

  if (!hydrated || !booking) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-[14px] text-muted">Loading…</p>
      </main>
    )
  }

  const tripKm = booking.trip.distanceKm
  const fare = booking.trip.fare + (booking.trip.pitstop?.fee ?? 0)

  return (
    <main className="min-h-screen pb-16">
      {/* Header */}
      <header className="pt-safe">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714"
              alt=""
              className="h-7 w-auto shrink-0"
            />
            <span className="text-[15px] font-extrabold tracking-tight">
              City <span className="gradient-text">Rider</span>
            </span>
          </Link>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-2 space-y-4">

        {/* Welcome-back card — appears once after the user returns from
            WhatsApp. Disappears after ~6s or on next interaction. */}
        {welcomeBack && (
          <div
            role="status"
            className="card p-3 flex items-center gap-3 animate-[fadeUp_0.25s_ease-out]"
            style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.30)' }}
          >
            <Check className="w-4 h-4 shrink-0" style={{ color: '#22C55E' }} />
            <div className="text-[13px] text-ink">
              Looks like you sent the message — {booking.driverName} will reply on WhatsApp shortly.
            </div>
          </div>
        )}

        {/* Hero card — driver, status, live timer, escalation copy */}
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={booking.driverPhotoUrl}
                alt=""
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/15"
              />
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-bg2"
                style={{
                  background: stage >= 2 ? '#F59E0B' : '#60A5FA',
                  boxShadow: stage >= 2
                    ? '0 0 10px rgba(245,158,11,0.85)'
                    : '0 0 10px rgba(96,165,250,0.85)',
                  animation: 'pulse 1.4s ease-in-out infinite',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wider font-extrabold" style={{ color: stage >= 2 ? '#F59E0B' : '#60A5FA' }}>
                {stage === 3 ? 'Driver may be busy' : 'Menunggu balasan · Awaiting reply'}
              </div>
              <h1 className="text-xl font-extrabold leading-tight mt-0.5 truncate">
                {booking.driverName}
              </h1>
              <div className="text-[12px] text-muted mt-1 font-mono tabular-nums">
                Sent {formatElapsed(elapsedMs)} ago
              </div>
            </div>
          </div>

          {/* Stage-driven copy */}
          <p className="text-[13px] text-muted leading-relaxed mt-4">
            {stage === 0 && 'Driver biasanya balas dalam 2-5 menit. Keep this tab open — we will keep this screen ticking.'}
            {stage === 1 && 'Still waiting — most drivers reply within 5 minutes. Tap "Open WhatsApp again" to nudge them, or try another driver below.'}
            {stage === 2 && 'It has been a few minutes. The driver may be mid-trip. Try one of the alternatives below or wait a little longer.'}
            {stage === 3 && 'This driver has not replied in 10+ minutes — they may be off-duty. We strongly suggest picking another driver below.'}
          </p>

          {/* Trip summary chip */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-line p-2">
              <div className="text-[10px] uppercase tracking-wider text-dim font-extrabold">Distance</div>
              <div className="text-[14px] font-extrabold mt-0.5">{tripKm.toFixed(1)} km</div>
            </div>
            <div className="rounded-xl border border-line p-2">
              <div className="text-[10px] uppercase tracking-wider text-dim font-extrabold">ETA</div>
              <div className="text-[14px] font-extrabold mt-0.5">~{booking.trip.etaMin || etaMinutes(tripKm)} min</div>
            </div>
            <div className="rounded-xl border border-line p-2">
              <div className="text-[10px] uppercase tracking-wider text-dim font-extrabold">Fare</div>
              <div className="text-[14px] font-extrabold mt-0.5 text-brand">{idr(fare)}</div>
            </div>
          </div>
        </div>

        {/* Primary actions */}
        <div className="space-y-2.5">
          <button
            onClick={onReopenWhatsApp}
            className="w-full p-4 rounded-2xl font-extrabold text-[15px] text-bg active:scale-[0.99] transition flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              boxShadow: '0 10px 24px rgba(37,211,102,0.35)',
            }}
          >
            <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
            Open WhatsApp again
          </button>

          <button
            onClick={onConfirmed}
            className="w-full p-3.5 rounded-2xl font-extrabold text-[14px] text-ink active:scale-[0.99] transition flex items-center justify-center gap-2"
            style={{
              background: 'rgba(34,197,94,0.10)',
              border: '1px solid rgba(34,197,94,0.40)',
              color: '#22C55E',
            }}
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Driver confirmed — done
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onPickAnother}
              className="p-3.5 rounded-2xl font-extrabold text-[13px] text-ink active:scale-[0.99] transition flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
              Pick another driver
            </button>
            <button
              onClick={onCancel}
              className="p-3.5 rounded-2xl font-extrabold text-[13px] text-muted active:scale-[0.99] transition flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <XIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              Cancel request
            </button>
          </div>
        </div>

        {/* Alternative drivers — appear from stage 1+, emphasised from
            stage 2+. We never auto-broadcast; the customer picks. */}
        {stage >= 1 && alternatives.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 px-1">
              {stage >= 3 && <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />}
              <h2 className="text-[12px] uppercase tracking-wider font-extrabold text-muted">
                {stage >= 2 ? 'Suggested alternatives' : 'Other nearby drivers'}
              </h2>
            </div>
            {alternatives.map((alt) => (
              <button
                key={alt.rider.id}
                onClick={() => onContactAlternative(alt)}
                className="w-full card card-interactive p-3 flex items-center gap-3 text-left active:scale-[0.99] transition"
                style={stage >= 2 ? { borderColor: 'rgba(250,204,21,0.30)' } : undefined}
              >
                <img src={alt.rider.photoUrl} alt="" className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-[14px] truncate">{alt.rider.name}</div>
                  <div className="text-[12px] text-muted mt-0.5">
                    {alt.distanceToPickup.toFixed(1)} km away · {alt.rider.bike.make} {alt.rider.bike.model}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[14px] font-extrabold text-brand">{idr(alt.total)}</div>
                  <div className="text-[10px] text-dim mt-0.5 flex items-center gap-1 justify-end">
                    Contact <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Honest footer note — sets expectation + protects the
            directory posture. Customers see we're not pretending to
            be a dispatcher. */}
        <p className="text-[11px] text-dim leading-relaxed px-1 pt-2">
          This screen lives only in your browser — we don't record bookings or driver
          messages. The conversation with {booking.driverName} happens entirely on
          WhatsApp. <Link href="/legal" className="underline">Learn how cityrider works</Link>.
        </p>
      </div>
    </main>
  )
}
