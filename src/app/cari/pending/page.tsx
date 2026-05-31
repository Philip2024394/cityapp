'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, MessageCircle, ArrowRight, X as XIcon, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Users } from 'lucide-react'
import {
  readPendingBooking,
  writePendingBooking,
  clearPendingBooking,
  type PendingBooking,
  type ParallelAttempt,
} from '@/lib/booking/pending-booking'
import { useElapsedSince } from '@/hooks/useElapsedSince'
import { fetchActiveDriversBrowser } from '@/lib/drivers/queries'
import { quoteBreakdown, rateFor } from '@/lib/pricing/quote'
import { haversineKm } from '@/lib/geo/haversine'
import { buildWhatsAppLink } from '@/lib/whatsapp/buildLink'
import { etaMinutes } from '@/lib/geo/eta'
import { useHaptic } from '@/hooks/useHaptic'
import { idr } from '@/lib/format/idr'
import { presenceLabel, presenceTier, presenceDotColor, sessionLengthLabel } from '@/lib/drivers/presence'
import { logNav } from '@/lib/perf/navTiming'
import type { Rider, ServiceType } from '@/types/rider'

// ============================================================================
// /cari/pending — the post-WhatsApp waiting screen.
// ----------------------------------------------------------------------------
// Pure client-side UX. Nothing here writes to the server. The state lives
// in sessionStorage; the driver receives the WhatsApp message exactly the
// same as today and has no idea this screen exists. That is deliberate —
// it's how we keep cityrider on the directory side of PM 12/2019 while
// still making the customer experience feel professional.
//
// Two-tier ACK-centric ladder (redesigned 2026-05, take 2):
//
//   TIER 1 — ack_window (0–30s, no ACK yet)
//     Green, calm, hopeful. Driver has 30 seconds to tap "Got it" in
//     their dashboard before the screen escalates. This mirrors Gojek's
//     accept-button window — fast forcing function on the ONLY signal we
//     get fast (the ACK), not on the slow signal (the WA reply).
//
//   no_ack_switch (≥30s, still no ACK)
//     Red urgency, alternatives auto-expanded, prominent "Pilih driver
//     lain" notification card. Driver had their chance to ack and didn't.
//
//   TIER 2 — ack_received (ACK landed before 30s, 0–120s post-ACK)
//     Calm green. We KNOW the driver is engaged. Give them time to type.
//     Alternatives stay hidden.
//
//   reply_late (ACK + 120-600s, no WA reply yet)
//     Amber. Acknowledged but no reply for 2 minutes — soft escalation,
//     alternatives appear collapsed below.
//
//   stale (any state, 600s+ total elapsed)
//     Gray. Hard banner + "Mulai ulang booking" CTA.
// ============================================================================

type Stage = 'ack_window' | 'ack_received' | 'reply_late' | 'no_ack_switch' | 'stale'

const ACK_WINDOW_MS = 30_000          // driver has 30s to tap "Got it"
const POST_ACK_CALM_MS = 120_000      // 2 min calm after ACK
const STALE_MS = 600_000              // 10 min total = give-up

function stageFromState(elapsedMs: number, ackedAtMs: number | null): Stage {
  if (elapsedMs >= STALE_MS) return 'stale'
  if (ackedAtMs) {
    const sinceAckMs = Date.now() - ackedAtMs
    return sinceAckMs < POST_ACK_CALM_MS ? 'ack_received' : 'reply_late'
  }
  return elapsedMs < ACK_WINDOW_MS ? 'ack_window' : 'no_ack_switch'
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m <= 0) return `${s}s`
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

// Reassurance copy bank. We rotate one line every ~10s so the screen
// never feels static. Each stage gets its own bank.
const COPY_BANK: Record<Stage, string[]> = {
  ack_window: [
    'Driver biasanya konfirmasi dalam 30 detik',
    'Pesan sudah sampai di WhatsApp driver',
    'Tunggu sebentar — driver akan segera respon',
  ],
  ack_received: [
    'Driver sudah lihat pesanmu — sedang ketik balasan',
    'Biasanya driver balas dalam 1-2 menit',
    'Buka WhatsApp untuk lihat percakapan',
  ],
  reply_late: [
    'Driver sudah lihat tapi belum balas — kemungkinan sibuk',
    'Coba pilih driver lain di bawah sambil tetap tunggu balasan',
    'Pesananmu ke driver pertama tetap aktif di WhatsApp',
  ],
  no_ack_switch: [
    'Driver tidak respon dalam 30 detik — pilih driver lain di bawah',
    'Banyak driver lain aktif sekarang',
    'Pesananmu ke driver pertama tetap di WhatsApp — bisa pilih kedua driver',
  ],
  stale: [
    'Sudah 10 menit — driver kemungkinan tidak akan respon',
    'Mulai ulang dengan driver lain untuk hasil tercepat',
  ],
}

function stageColor(stage: Stage): { ring: string; text: string; glow: string } {
  switch (stage) {
    case 'ack_window':    return { ring: '#22C55E', text: '#22C55E', glow: 'rgba(34,197,94,0.85)' }
    case 'ack_received':  return { ring: '#22C55E', text: '#22C55E', glow: 'rgba(34,197,94,0.55)' }
    case 'reply_late':    return { ring: '#F59E0B', text: '#F59E0B', glow: 'rgba(245,158,11,0.85)' }
    case 'no_ack_switch': return { ring: '#EF4444', text: '#EF4444', glow: 'rgba(239,68,68,0.85)' }
    case 'stale':         return { ring: '#64748B', text: '#94A3B8', glow: 'rgba(148,163,184,0.50)' }
  }
}

function stageHeadline(stage: Stage, name: string): string {
  switch (stage) {
    case 'ack_window':    return `Pesanan terkirim ke ${name}`
    case 'ack_received':  return `${name} sudah lihat — menunggu balasan…`
    case 'reply_late':    return `${name} sudah lihat tapi belum balas`
    case 'no_ack_switch': return `Pilih driver lain — ${name} tidak respon`
    case 'stale':         return `Sudah lama tidak ada balasan`
  }
}

export default function PendingBookingPage() {
  const router = useRouter()
  const haptic = useHaptic()
  const [booking, setBooking] = useState<PendingBooking | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [riders, setRiders] = useState<Rider[]>([])
  const [welcomeBack, setWelcomeBack] = useState(false)
  // Bottom-sheet for the Replace-vs-Both choice when user taps an alt.
  const [choiceForAlt, setChoiceForAlt] = useState<RankedAlt | null>(null)
  // Inline "Who replied?" prompt when there are parallel attempts.
  const [showConfirmChooser, setShowConfirmChooser] = useState(false)

  // perf instrumentation — measures /cari/rider → /cari/pending transition.
  useEffect(() => { logNav('cari/pending:mount') }, [])

  // Hydrate from sessionStorage on mount. If there's no pending booking,
  // bounce the user back to /cari.
  useEffect(() => {
    const b = readPendingBooking()
    setBooking(b)
    setHydrated(true)
    if (!b) router.replace('/cari')
  }, [router])

  // Welcome-back card — fires once when the tab regains visibility
  // AFTER the booking was set.
  useEffect(() => {
    if (!booking) return
    let shown = false
    const onVis = () => {
      if (shown) return
      if (document.visibilityState !== 'visible') return
      if (Date.now() - booking.sentAtMs < 1500) return
      shown = true
      setWelcomeBack(true)
      window.setTimeout(() => setWelcomeBack(false), 6000)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [booking])

  // Load active drivers so we can offer alternatives + render the bottom
  // ticker. Cheap network call; same query the marketplace uses.
  useEffect(() => {
    let cancelled = false
    fetchActiveDriversBrowser().then((list) => {
      if (!cancelled) setRiders(list)
    })
    return () => { cancelled = true }
  }, [])

  // ── Driver-ack polling (audit 2026-05) ────────────────────────────────
  // Driver dashboard has a "Got it" button that records acknowledged_at on
  // driver_contact_pings. We poll every 5s so the customer sees a green
  // "Driver melihat pesanmu · HH:MM ✓" badge as soon as the driver acks —
  // a meaningful trust signal even before the WA reply lands.
  const [ackedAt, setAckedAt] = useState<string | null>(null)
  useEffect(() => {
    if (!booking || ackedAt) return
    if (typeof window === 'undefined') return
    let cancelled = false
    let anonId = ''
    try { anonId = window.localStorage.getItem('cr_anon_id') ?? '' } catch { /* ignore */ }
    if (!anonId) return

    async function poll() {
      if (cancelled || !booking) return
      const params = new URLSearchParams({
        driverId: booking.driverId,
        customerAnonId: anonId,
        sinceMs: String(booking.sentAtMs),
      })
      try {
        const res = await fetch(`/api/contact/ack-status?${params}`)
        if (!cancelled && res.ok) {
          const j = (await res.json()) as { ackedAt: string | null }
          if (j.ackedAt) setAckedAt(j.ackedAt)
        }
      } catch { /* network blip — try again on next tick */ }
    }
    void poll()
    const interval = window.setInterval(poll, 5000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [booking, ackedAt])

  const elapsedMs = useElapsedSince(booking?.sentAtMs ?? null)
  // Parse ackedAt ISO into ms once per change so the stage derivation
  // doesn't re-parse on every tick.
  const ackedAtMs = useMemo(() => (ackedAt ? new Date(ackedAt).getTime() : null), [ackedAt])
  const stage: Stage = stageFromState(elapsedMs, ackedAtMs)
  const colors = stageColor(stage)

  const alternatives: RankedAlt[] = useMemo(() => {
    if (!booking) return []
    const tried = new Set<string>([
      booking.driverId,
      ...booking.triedDriverIds,
      ...booking.parallelAttempts.map((a) => a.driverId),
    ])
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

  // Count of online drivers in the same service category — drives the
  // bottom ticker. Helps the screen never feel "empty".
  const onlineCount = useMemo(() => {
    if (!booking) return 0
    const service: ServiceType | null = booking.trip.service
    return riders.filter((r) =>
      r.isOnline &&
      r.subscriptionStatus !== 'past_due' &&
      (service ? r.services.includes(service) : true),
    ).length
  }, [riders, booking])

  function openWhatsAppLink(link: string) {
    haptic.tap()
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  function buildAltLink(alt: RankedAlt): string | null {
    if (!booking) return null
    return buildWhatsAppLink({
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
  }

  function onReplaceWith(alt: RankedAlt) {
    if (!booking) return
    const link = buildAltLink(alt)
    if (!link) { alert('Driver has no valid WhatsApp number. Please pick another.'); return }
    haptic.buzz()
    window.open(link, '_blank', 'noopener,noreferrer')
    const next = writePendingBooking({
      driverId: alt.rider.id,
      driverSlug: alt.rider.slug,
      driverName: alt.rider.name,
      driverPhotoUrl: alt.rider.photoUrl,
      driverWhatsAppE164: alt.rider.whatsappE164,
      driverWhatsAppLink: link,
      driverLastSeenAt: alt.rider.lastSeenAt,
      driverSessionStartedAt: alt.rider.sessionStartedAt ?? null,
      trip: booking.trip,
      sentAtMs: Date.now(),
      // Archive the previous primary + any parallel attempts.
      triedDriverIds: Array.from(new Set([
        ...booking.triedDriverIds,
        booking.driverId,
        ...booking.parallelAttempts.map((a) => a.driverId),
      ])),
      // Parallel attempts reset — a fresh primary starts a new fan-out.
      parallelAttempts: [],
    })
    setBooking(next)
    setChoiceForAlt(null)
    setWelcomeBack(false)
  }

  function onMessageBoth(alt: RankedAlt) {
    if (!booking) return
    if (booking.parallelAttempts.length >= 3) {
      alert('You already have 3 backup drivers messaged. Replace one before adding another.')
      return
    }
    const link = buildAltLink(alt)
    if (!link) { alert('Driver has no valid WhatsApp number. Please pick another.'); return }
    haptic.buzz()
    window.open(link, '_blank', 'noopener,noreferrer')
    const attempt: ParallelAttempt = {
      driverId: alt.rider.id,
      driverSlug: alt.rider.slug,
      driverName: alt.rider.name,
      driverPhotoUrl: alt.rider.photoUrl,
      driverWhatsAppE164: alt.rider.whatsappE164,
      driverWhatsAppLink: link,
      sentAtMs: Date.now(),
    }
    const next = writePendingBooking({
      ...booking,
      parallelAttempts: [...booking.parallelAttempts, attempt],
    })
    setBooking(next)
    setChoiceForAlt(null)
  }

  function onRemoveParallel(driverId: string) {
    if (!booking) return
    const next = writePendingBooking({
      ...booking,
      parallelAttempts: booking.parallelAttempts.filter((a) => a.driverId !== driverId),
      triedDriverIds: Array.from(new Set([...booking.triedDriverIds, driverId])),
    })
    setBooking(next)
  }

  // Idempotency window — block double-tap from firing two window.open()
  // calls (which would either stack WhatsApp tabs or get caught by the
  // popup blocker). 800ms covers low-end Android touch lag.
  const lastReopenAt = useRef<number>(0)
  function onReopenWhatsApp() {
    if (!booking) return
    const now = Date.now()
    if (now - lastReopenAt.current < 800) return
    lastReopenAt.current = now
    openWhatsAppLink(booking.driverWhatsAppLink)
  }

  function onConfirmed() {
    if (!booking) return
    // If there are parallel attempts, ask which driver actually replied
    // — we don't want to credit the wrong one in the user's mental model.
    if (booking.parallelAttempts.length > 0) {
      setShowConfirmChooser(true)
      return
    }
    haptic.impact()
    clearPendingBooking()
    router.push('/cari?booked=1')
  }

  function onConfirmedWith(_driverId: string) {
    // We don't record server-side which driver was chosen — directory
    // posture. We just clear local state and return the customer to
    // the marketplace with the confirmed flag.
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
    writePendingBooking({
      ...booking,
      triedDriverIds: Array.from(new Set([...booking.triedDriverIds, booking.driverId])),
    })
    router.push('/cari/rider')
  }

  if (!hydrated || !booking) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center p-6">
        <p className="text-[14px] text-muted">Loading…</p>
      </main>
    )
  }

  const tripKm = booking.trip.distanceKm
  const fare = booking.trip.fare + (booking.trip.pitstop?.fee ?? 0)
  // Reassurance line rotates every 10s within the current stage.
  const copyBank = COPY_BANK[stage]
  const reassuranceIdx = Math.floor(elapsedMs / 10_000) % copyBank.length
  const reassuranceLine = copyBank[reassuranceIdx]
  // Progress bar fills against the active window for the current stage:
  //   ack_window     → 0→100% across 30s (urgency to ACK)
  //   ack_received   → 0→100% across the 2-min post-ACK calm
  //   reply_late /   → 100% with shimmer (waiting indefinitely)
  //   no_ack_switch
  //   stale          → not rendered (banner takes over)
  let progressPct = 100
  if (stage === 'ack_window') {
    progressPct = Math.min(100, (elapsedMs / ACK_WINDOW_MS) * 100)
  } else if (stage === 'ack_received' && ackedAtMs) {
    progressPct = Math.min(100, ((Date.now() - ackedAtMs) / POST_ACK_CALM_MS) * 100)
  }
  const driverTier = presenceTier(booking.driverLastSeenAt)
  const driverPresence = presenceLabel(booking.driverLastSeenAt)
  const driverSession = sessionLengthLabel(booking.driverSessionStartedAt)

  return (
    <main className="min-h-[100dvh] pb-32">
      {/* Header */}
      <header className="pt-safe">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-85 transition" aria-label="CityDrivers home">
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351"
              alt="CityDrivers"
              className="h-7 sm:h-8 w-auto"
            />
          </Link>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-2 space-y-4">

        {/* Welcome-back card */}
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
              {/* Pulsing ring — stage-coloured, runs while waiting. Kills
                  the "dead screen" feeling without any backend work. */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-2xl"
                style={{
                  boxShadow: `0 0 0 0 ${colors.glow}`,
                  animation: 'pendingRing 1.8s ease-out infinite',
                  // CSS keyframe injected at the bottom of the file
                }}
              />
              <img
                src={booking.driverPhotoUrl}
                alt=""
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/15 relative"
              />
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-bg2"
                style={{
                  background: colors.ring,
                  boxShadow: `0 0 10px ${colors.glow}`,
                  animation: 'pulse 1.4s ease-in-out infinite',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[12px] uppercase tracking-wider font-extrabold"
                style={{ color: colors.text }}
              >
                {stage === 'ack_window'    && 'Notifying driver · Memberi tahu driver'}
                {stage === 'ack_received'  && 'Driver engaged · Driver sudah lihat'}
                {stage === 'reply_late'    && 'Slow reply · Belum balas'}
                {stage === 'no_ack_switch' && 'Driver tidak respon · Pilih lain'}
              </div>
              <h1 className="text-xl font-extrabold leading-tight mt-0.5 truncate">
                {booking.driverName}
              </h1>
              {ackedAt && (
                <div
                  className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-extrabold"
                  style={{
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.40)',
                    color: '#22C55E',
                  }}
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                  Driver melihat pesanmu · {new Date(ackedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <div className="text-[12px] text-muted mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-mono tabular-nums">
                  Sent {formatElapsed(elapsedMs)} ago
                </span>
                <span aria-hidden className="text-dim">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{
                      background: presenceDotColor(driverTier),
                      boxShadow: driverTier === 'active_now' ? `0 0 5px ${presenceDotColor(driverTier)}` : undefined,
                      animation: driverTier === 'active_now' ? 'pulse 1.6s ease-in-out infinite' : undefined,
                    }}
                  />
                  {driverPresence}
                </span>
                {driverSession && (
                  <>
                    <span aria-hidden className="text-dim">·</span>
                    <span>{driverSession}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Soft progress bar — fills 0→100% across the first 90 seconds.
              After that, it sits at 100% with a shimmer to convey
              "still waiting, actively monitoring". */}
          <div
            className="mt-4 h-1.5 rounded-full overflow-hidden relative"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={90}
            aria-valuenow={Math.min(90, Math.floor(elapsedMs / 1000))}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${colors.ring}, ${colors.ring}cc)`,
                boxShadow: `0 0 8px ${colors.glow}`,
              }}
            />
            {(stage === 'no_ack_switch' || stage === 'reply_late') && (
              <div
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                  animation: 'shimmer 1.4s linear infinite',
                  backgroundSize: '50% 100%',
                }}
              />
            )}
          </div>

          {/* Headline + typing dots in the awaiting stage */}
          <div className="flex items-center gap-2 mt-4">
            <p className="text-[14px] font-extrabold leading-tight flex-1">
              {stageHeadline(stage, booking.driverName)}
            </p>
            {stage === 'ack_received' && <TypingDots color={colors.ring} />}
          </div>

          {/* Rotating reassurance line — never the same for >10s, never
              feels static. Locale-light copy. */}
          <p className="text-[13px] text-muted leading-relaxed mt-2 min-h-[1.5em]">
            {reassuranceLine}
          </p>

          {/* Post-WhatsApp disclosure card (PM 12/2019 safe) — surfaces
              the directory positioning that's also in T&Cs so the
              customer knows:
                a) the message reached the driver,
                b) any trip arrangement happens between them on WhatsApp,
                c) safety / payment is direct (not via the platform).
              No booking, no fare control, no dispatch claim — just an
              honest restatement of what already happened. */}
          {(stage === 'ack_window' || stage === 'ack_received') && (
            <div
              className="mt-3 rounded-xl p-3 text-[12px] leading-relaxed"
              style={{
                background: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.25)',
                color: 'rgba(255,255,255,0.80)',
              }}
            >
              <div className="font-extrabold flex items-center gap-1.5 mb-1" style={{ color: '#22C55E' }}>
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                Pesan sudah ada di WhatsApp driver
              </div>
              <p>
                Chat selanjutnya dilanjutkan langsung di WhatsApp — tarif,
                jam berangkat, dan pembayaran kamu sepakati dengan driver.
                CityDrivers adalah direktori, bukan operator perjalanan.
              </p>
              <ul className="mt-1.5 space-y-0.5 text-muted">
                <li>· Cek helm tersedia sebelum berangkat</li>
                <li>· Konfirmasi tarif total dengan driver</li>
                <li>· Bayar langsung (cash / QRIS / transfer)</li>
              </ul>
            </div>
          )}

          {/* Urgent "Choose another driver" notification — fires when the
              30-second ACK window expires with no driver acknowledgement.
              Auto-dismisses if the driver acks late (stage transitions to
              ack_received / reply_late). Red border + pulse to grab
              attention without being modal-blocking. */}
          {stage === 'no_ack_switch' && (
            <div
              role="alert"
              className="mt-3 rounded-xl p-3"
              style={{
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.55)',
                boxShadow: '0 0 0 1px rgba(239,68,68,0.20), 0 6px 20px rgba(239,68,68,0.20)',
                animation: 'pendingRing 2.4s ease-out infinite',
              }}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-[14px]" style={{ color: '#EF4444' }}>
                    Pilih driver lain · Choose another driver
                  </div>
                  <p className="text-[13px] mt-1 leading-snug" style={{ color: 'rgba(255,255,255,0.78)' }}>
                    {booking.driverName} belum konfirmasi dalam 30 detik. Pilih dari daftar driver online di bawah — pesananmu di WhatsApp tetap aktif.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trip summary chip */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-line p-2">
              <div className="text-[12px] uppercase tracking-wider text-dim font-extrabold">Distance</div>
              <div className="text-[14px] font-extrabold mt-0.5">{tripKm.toFixed(1)} km</div>
            </div>
            <div className="rounded-xl border border-line p-2">
              <div className="text-[12px] uppercase tracking-wider text-dim font-extrabold">ETA</div>
              <div className="text-[14px] font-extrabold mt-0.5">~{booking.trip.etaMin || etaMinutes(tripKm)} min</div>
            </div>
            <div className="rounded-xl border border-line p-2">
              <div className="text-[12px] uppercase tracking-wider text-dim font-extrabold">Fare</div>
              <div className="text-[14px] font-extrabold mt-0.5 text-brand">{idr(fare)}</div>
            </div>
          </div>
        </div>

        {/* Parallel attempts strip — appears when the customer chose
            "Message both" on an alternative. Each chip has its own live
            timer and an Open/Remove action set. */}
        {booking.parallelAttempts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Users className="w-4 h-4 text-muted" />
              <h2 className="text-[12px] uppercase tracking-wider font-extrabold text-muted">
                Backup drivers messaged
              </h2>
            </div>
            <div className="space-y-2">
              {booking.parallelAttempts.map((a) => (
                <ParallelAttemptChip
                  key={a.driverId}
                  attempt={a}
                  onOpen={() => openWhatsAppLink(a.driverWhatsAppLink)}
                  onRemove={() => onRemoveParallel(a.driverId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stale-state escape banner (audit fix 2026-05) — after 10 min
            with no driver response, the welcome-back card was re-showing
            yesterday's dead attempt. Hard banner + Start-over CTA breaks
            the loop. */}
        {stage === 'stale' && (
          <div
            className="rounded-2xl p-4 mb-1"
            style={{
              background: 'rgba(148,163,184,0.08)',
              border: '1px solid rgba(148,163,184,0.35)',
            }}
          >
            <div className="text-[14px] font-extrabold text-ink leading-snug">
              Booking ini sudah {Math.floor(elapsedMs / 60000)} menit tanpa respon
            </div>
            <p className="text-[13px] text-muted leading-snug mt-1 mb-3">
              Driver kemungkinan offline atau lagi sibuk. Mulai ulang dengan
              driver lain untuk hasil tercepat.
            </p>
            <button
              type="button"
              onClick={() => {
                haptic.tap()
                clearPendingBooking()
                router.push('/cari')
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99]"
              style={{ minHeight: 48 }}
            >
              Mulai ulang booking
            </button>
          </div>
        )}

        {/* Primary actions */}
        <div className="space-y-2.5">
          <button
            onClick={onReopenWhatsApp}
            className="w-full p-4 rounded-2xl font-extrabold text-[15px] text-bg active:scale-[0.99] transition flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              boxShadow: '0 10px 24px rgba(37,211,102,0.35)',
              minHeight: 52,
            }}
          >
            <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
            Open WhatsApp again
          </button>

          <button
            onClick={onConfirmed}
            className="w-full p-3.5 rounded-2xl font-extrabold text-[14px] active:scale-[0.99] transition flex items-center justify-center gap-2"
            style={{
              background: 'rgba(34,197,94,0.10)',
              border: '1px solid rgba(34,197,94,0.40)',
              color: '#22C55E',
              minHeight: 48,
            }}
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Driver confirmed — done
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onPickAnother}
              className="p-3.5 rounded-2xl font-extrabold text-[13px] text-ink active:scale-[0.99] transition flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', minHeight: 48 }}
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
              Pick another driver
            </button>
            <button
              onClick={onCancel}
              className="p-3.5 rounded-2xl font-extrabold text-[13px] text-muted active:scale-[0.99] transition flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', minHeight: 48 }}
            >
              <XIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              Cancel request
            </button>
          </div>
        </div>

        {/* Alternative drivers — collapsed at the nudge stage (60s),
            expanded at the switch stage (90s+). The customer always
            picks — we never auto-broadcast. */}
        {(stage === 'no_ack_switch' || stage === 'reply_late') && alternatives.length > 0 && (
          <AlternativesSection
            alternatives={alternatives}
            forceOpen={stage === 'no_ack_switch'}
            urgent={stage === 'no_ack_switch'}
            onTap={(alt) => setChoiceForAlt(alt)}
          />
        )}

        {/* Honest footer note. */}
        <p className="text-[12px] text-dim leading-relaxed px-1 pt-2">
          This screen lives only in your browser — we don&apos;t record bookings or driver
          messages. The conversation with {booking.driverName} happens entirely on
          WhatsApp. <Link href="/legal" className="underline">Learn how cityrider works</Link>.
        </p>
      </div>

      {/* Bottom marketplace ticker — quiet social-proof. Keeps the page
          feeling alive even when nothing else is moving. */}
      <div
        className="fixed bottom-0 inset-x-0 z-30 px-4 pb-safe"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(10,10,10,0.85) 60%, rgba(10,10,10,0.95))',
        }}
      >
        <div className="max-w-2xl mx-auto py-3 flex items-center justify-center gap-2 text-[12px] text-muted">
          <span
            aria-hidden
            className="inline-block w-2 h-2 rounded-full"
            style={{
              background: '#22C55E',
              boxShadow: '0 0 6px rgba(34,197,94,0.85)',
              animation: 'pulse 1.6s ease-in-out infinite',
            }}
          />
          <span className="font-bold tabular-nums">
            {onlineCount} {onlineCount === 1 ? 'driver' : 'drivers'} active right now
          </span>
        </div>
      </div>

      {/* Choice sheet — Replace primary vs Message both. */}
      {choiceForAlt && (
        <ChoiceSheet
          alt={choiceForAlt}
          primaryName={booking.driverName}
          onReplace={() => onReplaceWith(choiceForAlt)}
          onBoth={() => onMessageBoth(choiceForAlt)}
          onDismiss={() => setChoiceForAlt(null)}
        />
      )}

      {/* Who-replied chooser — only shown when there are parallel
          attempts and the user taps Confirmed. */}
      {showConfirmChooser && booking && (
        <ConfirmChooser
          primary={{
            driverId: booking.driverId,
            driverName: booking.driverName,
            driverPhotoUrl: booking.driverPhotoUrl,
            sentAtMs: booking.sentAtMs,
          }}
          attempts={booking.parallelAttempts}
          onPick={(id) => { setShowConfirmChooser(false); onConfirmedWith(id) }}
          onDismiss={() => setShowConfirmChooser(false)}
        />
      )}

      {/* Inline keyframes for the pulsing ring + shimmer. Scoped to this
          page so we don't bloat the global stylesheet. */}
      <style jsx global>{`
        @keyframes pendingRing {
          0%   { box-shadow: 0 0 0 0 ${colors.glow}; }
          70%  { box-shadow: 0 0 0 14px rgba(0,0,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30%           { opacity: 1;    transform: translateY(-3px); }
        }
      `}</style>
    </main>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

type RankedAlt = {
  rider: Rider
  fare: number
  pitFee: number
  total: number
  distanceToPickup: number
  perKm: number
}

function TypingDots({ color }: { color: string }) {
  const dotStyle = (delay: string): React.CSSProperties => ({
    width: 6,
    height: 6,
    borderRadius: 999,
    background: color,
    display: 'inline-block',
    animation: 'typingDot 1.2s ease-in-out infinite',
    animationDelay: delay,
  })
  return (
    <span aria-hidden className="inline-flex items-center gap-1 shrink-0" style={{ paddingLeft: 4 }}>
      <span style={dotStyle('0s')} />
      <span style={dotStyle('0.2s')} />
      <span style={dotStyle('0.4s')} />
    </span>
  )
}

function ParallelAttemptChip({
  attempt, onOpen, onRemove,
}: {
  attempt: ParallelAttempt
  onOpen: () => void
  onRemove: () => void
}) {
  const elapsed = useElapsedSince(attempt.sentAtMs)
  return (
    <div
      className="card p-2.5 flex items-center gap-3"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <img
        src={attempt.driverPhotoUrl}
        alt=""
        className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[13px] truncate">{attempt.driverName}</div>
        <div className="text-[12px] text-muted mt-0.5 font-mono tabular-nums">
          Sent {formatElapsed(elapsed)} ago
        </div>
      </div>
      <button
        onClick={onOpen}
        aria-label={`Open WhatsApp with ${attempt.driverName}`}
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
          boxShadow: '0 4px 12px rgba(37,211,102,0.30)',
        }}
      >
        <MessageCircle className="w-4 h-4 text-bg" strokeWidth={2.5} />
      </button>
      <button
        onClick={onRemove}
        aria-label={`Remove ${attempt.driverName} from backups`}
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <XIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
    </div>
  )
}

function AlternativesSection({
  alternatives, forceOpen, urgent, onTap,
}: {
  alternatives: RankedAlt[]
  forceOpen: boolean
  urgent: boolean
  onTap: (alt: RankedAlt) => void
}) {
  const [open, setOpen] = useState(forceOpen)
  // When the parent flips to forceOpen (switch stage), open automatically.
  useEffect(() => {
    if (forceOpen) setOpen(true)
  }, [forceOpen])

  return (
    <div className="space-y-2 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-1 py-1"
        aria-expanded={open}
        style={{ minHeight: 44 }}
      >
        <div className="flex items-center gap-2">
          {urgent && <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />}
          <h2 className="text-[12px] uppercase tracking-wider font-extrabold text-muted">
            {urgent ? 'Suggested alternatives' : `${alternatives.length} other ${alternatives.length === 1 ? 'driver' : 'drivers'} nearby`}
          </h2>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted" />
          : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>

      {open && (
        <div className="space-y-2 animate-[fadeUp_0.25s_ease-out]">
          {alternatives.map((alt) => {
            const tier = presenceTier(alt.rider.lastSeenAt)
            const label = presenceLabel(alt.rider.lastSeenAt)
            return (
              <button
                key={alt.rider.id}
                onClick={() => onTap(alt)}
                className="w-full card card-interactive p-3 flex items-center gap-3 text-left active:scale-[0.99] transition"
                style={{
                  borderColor: urgent ? 'rgba(250,204,21,0.30)' : undefined,
                  minHeight: 64,
                }}
              >
                <img src={alt.rider.photoUrl} alt="" className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-[14px] truncate">{alt.rider.name}</div>
                  <div className="text-[12px] text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <span
                        aria-hidden
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{
                          background: presenceDotColor(tier),
                          boxShadow: tier === 'active_now' ? `0 0 5px ${presenceDotColor(tier)}` : undefined,
                          animation: tier === 'active_now' ? 'pulse 1.6s ease-in-out infinite' : undefined,
                        }}
                      />
                      {label}
                    </span>
                    {alt.rider.locationFresh && (
                      <>
                        <span aria-hidden className="text-dim">·</span>
                        <span>{alt.distanceToPickup.toFixed(1)} km away</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[14px] font-extrabold text-brand">{idr(alt.total)}</div>
                  <div className="text-[12px] text-dim mt-0.5 flex items-center gap-1 justify-end">
                    Contact <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ChoiceSheet({
  alt, primaryName, onReplace, onBoth, onDismiss,
}: {
  alt: RankedAlt
  primaryName: string
  onReplace: () => void
  onBoth: () => void
  onDismiss: () => void
}) {
  return (
    <>
      <div
        onClick={onDismiss}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose how to contact this driver"
        className="fixed inset-x-0 bottom-0 z-50 animate-[fadeUp_0.25s_ease-out]"
      >
        <div
          className="max-w-2xl mx-auto rounded-t-3xl p-5 pb-safe space-y-4"
          style={{
            background: 'rgba(20,20,20,0.97)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderBottom: 'none',
            boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center gap-3">
            <img
              src={alt.rider.photoUrl}
              alt=""
              className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-[15px] truncate">{alt.rider.name}</div>
              <div className="text-[12px] text-muted mt-0.5">
                {idr(alt.total)} · {alt.distanceToPickup.toFixed(1)} km away
              </div>
            </div>
            <button
              onClick={onDismiss}
              aria-label="Close"
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <XIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <p className="text-[13px] text-muted leading-relaxed">
            You already have a request out to <span className="text-ink font-bold">{primaryName}</span>.
            How do you want to handle {alt.rider.name}?
          </p>

          <div className="space-y-2">
            <button
              onClick={onBoth}
              className="w-full p-3.5 rounded-2xl font-extrabold text-[14px] text-ink active:scale-[0.99] transition flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)',
                color: '#0A0A0A',
                boxShadow: '0 8px 20px rgba(250,204,21,0.25)',
                minHeight: 52,
              }}
            >
              <Users className="w-4 h-4" strokeWidth={2.5} />
              Message both — keep {primaryName} too
            </button>
            <button
              onClick={onReplace}
              className="w-full p-3.5 rounded-2xl font-extrabold text-[14px] text-ink active:scale-[0.99] transition flex items-center justify-center gap-2"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
                minHeight: 52,
              }}
            >
              <RefreshCw className="w-4 h-4" strokeWidth={2.5} />
              Replace {primaryName} with {alt.rider.name}
            </button>
            <button
              onClick={onDismiss}
              className="w-full p-3 rounded-2xl font-bold text-[13px] text-muted active:scale-[0.99] transition"
              style={{ minHeight: 44 }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function ConfirmChooser({
  primary, attempts, onPick, onDismiss,
}: {
  primary: { driverId: string; driverName: string; driverPhotoUrl: string; sentAtMs: number }
  attempts: ParallelAttempt[]
  onPick: (driverId: string) => void
  onDismiss: () => void
}) {
  return (
    <>
      <div
        onClick={onDismiss}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Which driver replied?"
        className="fixed inset-x-0 bottom-0 z-50 animate-[fadeUp_0.25s_ease-out]"
      >
        <div
          className="max-w-2xl mx-auto rounded-t-3xl p-5 pb-safe space-y-4"
          style={{
            background: 'rgba(20,20,20,0.97)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderBottom: 'none',
            boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-extrabold">Which driver replied?</h2>
              <p className="text-[13px] text-muted mt-1 leading-relaxed">
                Pick the one you&apos;re going with so we can clear the waiting screen.
              </p>
            </div>
            <button
              onClick={onDismiss}
              aria-label="Close"
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <XIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="space-y-2">
            <ConfirmChooserRow
              driverName={primary.driverName}
              driverPhotoUrl={primary.driverPhotoUrl}
              sentAtMs={primary.sentAtMs}
              onPick={() => onPick(primary.driverId)}
              tag="Primary"
            />
            {attempts.map((a) => (
              <ConfirmChooserRow
                key={a.driverId}
                driverName={a.driverName}
                driverPhotoUrl={a.driverPhotoUrl}
                sentAtMs={a.sentAtMs}
                onPick={() => onPick(a.driverId)}
                tag="Backup"
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function ConfirmChooserRow({
  driverName, driverPhotoUrl, sentAtMs, onPick, tag,
}: {
  driverName: string
  driverPhotoUrl: string
  sentAtMs: number
  onPick: () => void
  tag: 'Primary' | 'Backup'
}) {
  const elapsed = useElapsedSince(sentAtMs)
  return (
    <button
      onClick={onPick}
      className="w-full card card-interactive p-3 flex items-center gap-3 text-left active:scale-[0.99] transition"
      style={{ minHeight: 64 }}
    >
      <img
        src={driverPhotoUrl}
        alt=""
        className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-extrabold text-[14px] truncate">{driverName}</div>
          <span
            className="text-[12px] font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: tag === 'Primary' ? 'rgba(96,165,250,0.15)' : 'rgba(250,204,21,0.15)',
              color:      tag === 'Primary' ? '#60A5FA' : '#FACC15',
            }}
          >
            {tag}
          </span>
        </div>
        <div className="text-[12px] text-muted mt-0.5 font-mono tabular-nums">
          Sent {formatElapsed(elapsed)} ago
        </div>
      </div>
      <Check className="w-5 h-5 text-muted shrink-0" strokeWidth={2.5} />
    </button>
  )
}
