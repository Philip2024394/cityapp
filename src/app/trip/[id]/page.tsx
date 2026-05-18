'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import {
  ChevronLeft, MessageCircle, Phone, Clock, CheckCircle2, AlertCircle,
  Banknote, QrCode, Building2, Star, MapPin, Copy, Check, ChevronRight,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { idr } from '@/lib/format/idr'
import type { DriverRow, PaymentMethod, TripRow, TripStatus } from '@/types/database'

// ============================================================================
// Customer-side trip tracker — /trip/[id]?token=...
// ----------------------------------------------------------------------------
// Anonymous-customer companion to the driver's /dashboard/trip/[id]. Reads
// the trip via GET /api/trips/[id]?token=... (HMAC token issued at booking)
// and polls every 5s while the trip is in a non-terminal state. When the
// rider marks the trip completed, surfaces the rider's enabled payment
// methods (cash / QR / transfer) so the customer can mark how they paid.
// After the rider confirms receipt, the customer rates the rider.
//
// Anonymous customers can't subscribe via Realtime (RLS blocks the SELECT),
// so we poll. Authenticated customers (future) could swap to a Realtime
// channel for instant updates.
// ============================================================================

const POLL_INTERVAL_MS = 5000
const TERMINAL_STATUSES: TripStatus[] = ['canceled', 'expired']

export default function CustomerTripPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const params = useParams<{ id: string }>()
  const sp = useSearchParams()
  const tripId = (params?.id ?? '') as string
  const token = sp.get('token') ?? ''

  const [trip, setTrip] = useState<TripRow | null>(null)
  const [driver, setDriver] = useState<DriverRow | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInFlight, setActionInFlight] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load the trip + schedule the next poll. We poll until the trip reaches
  // a terminal state AND payment_status is confirmed; once both, we stop.
  useEffect(() => {
    if (!tripId) return
    let cancelled = false

    async function fetchTrip(): Promise<TripRow | null> {
      try {
        const url = `/api/trips/${tripId}${token ? `?token=${encodeURIComponent(token)}` : ''}`
        const res = await fetch(url, { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return null
        if (!res.ok) {
          setLoadError(json.error || 'Could not load this trip')
          return null
        }
        const next = json.trip as TripRow
        setTrip(next)
        setLoadError(null)
        return next
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message)
        return null
      }
    }

    async function loop() {
      const next = await fetchTrip()
      if (cancelled || !next) return
      const done = TERMINAL_STATUSES.includes(next.status)
        || (next.status === 'completed' && next.payment_status === 'confirmed')
      if (done) return
      pollRef.current = setTimeout(loop, POLL_INTERVAL_MS)
    }

    void loop()
    return () => {
      cancelled = true
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [tripId, token])

  // Resolve the rider profile (public RLS — anyone can read active drivers)
  useEffect(() => {
    if (!trip?.driver_id) return
    let cancelled = false
    const supabase = getBrowserSupabase()
    if (!supabase) return
    supabase
      .from('drivers')
      .select('*')
      .eq('user_id', trip.driver_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setDriver(data as DriverRow)
      })
    return () => { cancelled = true }
  }, [trip?.driver_id])

  async function patchTrip(action: string, extra: Record<string, unknown>): Promise<boolean> {
    if (!tripId || actionInFlight) return false
    setActionInFlight(action)
    setActionError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token, ...extra }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(json.error || `Could not ${action}`)
        return false
      }
      // Optimistic re-poll so the UI reflects the change immediately
      const refresh = await fetch(`/api/trips/${tripId}?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      const refreshJson = await refresh.json().catch(() => ({}))
      if (refresh.ok && refreshJson.trip) setTrip(refreshJson.trip as TripRow)
      return true
    } catch (e) {
      setActionError((e as Error).message || `Could not ${action}`)
      return false
    } finally {
      setActionInFlight(null)
    }
  }

  // Payment methods the rider has enabled — drives the "I paid via …" panel
  const availableMethods = useMemo<PaymentMethod[]>(() => {
    if (!driver) return []
    const m: PaymentMethod[] = []
    if (driver.accepts_cash) m.push('cash')
    if (driver.accepts_qr) m.push('qr')
    if (driver.accepts_transfer) m.push('transfer')
    return m
  }, [driver])

  // Header — always present
  const header = (
    <header className="sticky top-0 z-40 glass-strong pt-safe">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink">
          <ChevronLeft className="w-4 h-4" />
          Home
        </Link>
        <div className="text-[15px] font-extrabold tracking-tight">
          Your <span className="gradient-text">trip</span>
        </div>
        <div className="w-12" />
      </div>
    </header>
  )

  if (loadError && !trip) {
    return (
      <>
        {header}
        <main className="min-h-screen p-6 flex items-center justify-center">
          <div className="card p-6 text-center max-w-sm space-y-3">
            <AlertCircle className="w-10 h-10 text-danger mx-auto" />
            <h2 className="font-extrabold text-lg">Can&apos;t open this trip</h2>
            <p className="text-[13px] text-muted">{loadError}</p>
            <Link href="/cari" className="btn-primary w-full">Book a new trip</Link>
          </div>
        </main>
      </>
    )
  }

  if (!trip) {
    return (
      <>
        {header}
        <LoadingShell />
      </>
    )
  }

  return (
    <>
      {header}
      <main className="min-h-screen pb-12">
        <div className="max-w-xl mx-auto px-4 pt-3 space-y-3">
          <StatusBlock trip={trip} />

          {driver && <RiderCard driver={driver} customerName={trip.customer_name} />}

          <TripSummary trip={trip} />

          {trip.status === 'completed' && trip.payment_status !== 'confirmed' && (
            <PaymentMarkPanel
              trip={trip}
              driver={driver}
              methods={availableMethods}
              busyMethod={actionInFlight === 'mark_paid' ? 'pending' : null}
              error={actionError}
              onMarkPaid={(method) => patchTrip('mark_paid', { payment_method: method })}
            />
          )}

          {trip.status === 'completed' && trip.payment_status === 'confirmed' && trip.rating == null && (
            <RatingPanel
              busy={actionInFlight === 'rate'}
              error={actionError}
              onSubmit={(rating, comment) => patchTrip('rate', { rating, rating_comment: comment })}
            />
          )}

          {trip.rating != null && <RatedConfirmation rating={trip.rating} />}
        </div>
      </main>
    </>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusBlock({ trip }: { trip: TripRow }) {
  const map: Record<TripStatus, { label: string; sub: string; tone: 'brand' | 'online' | 'muted' | 'danger' }> = {
    requested: { label: 'Waiting for rider', sub: 'Your booking was sent. The rider is being notified.', tone: 'brand' },
    accepted: { label: 'Rider accepted', sub: "They're heading to pick you up.", tone: 'online' },
    arrived: { label: 'Rider has arrived', sub: 'Look out for them at the pickup point.', tone: 'online' },
    in_progress: { label: 'Trip in progress', sub: "You're on the way.", tone: 'brand' },
    completed: {
      label: trip.payment_status === 'confirmed' ? 'Trip complete · paid' : 'Trip complete',
      sub: trip.payment_status === 'confirmed' ? 'Thanks for riding with us.' : 'Mark how you paid so the rider can confirm.',
      tone: trip.payment_status === 'confirmed' ? 'online' : 'brand',
    },
    canceled: { label: 'Trip canceled', sub: trip.cancel_reason || 'This booking was canceled.', tone: 'muted' },
    expired: { label: 'Trip expired', sub: "The rider didn't respond. Pick another rider to try again.", tone: 'danger' },
  }
  const s = map[trip.status]
  const palette = {
    brand: { bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.30)', text: '#FACC15' },
    online: { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.30)', text: '#22C55E' },
    muted: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', text: 'rgba(255,255,255,0.6)' },
    danger: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.30)', text: '#EF4444' },
  }[s.tone]

  const Icon = trip.status === 'completed' ? CheckCircle2
    : trip.status === 'canceled' || trip.status === 'expired' ? AlertCircle
    : Clock

  return (
    <div className="card p-4" style={{ background: palette.bg, borderColor: palette.border }}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: palette.text }} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider font-extrabold" style={{ color: palette.text }}>
            {s.label}
          </div>
          <div className="text-[13px] mt-1 text-ink">{s.sub}</div>
        </div>
      </div>
    </div>
  )
}

function RiderCard({ driver, customerName }: { driver: DriverRow; customerName: string | null }) {
  const waNumber = driver.whatsapp_e164.replace(/\D/g, '')
  const greeting = customerName
    ? `Halo ${driver.business_name}, ini ${customerName}.`
    : `Halo ${driver.business_name}.`
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(greeting)}`
  return (
    <div className="card p-3 flex items-center gap-3">
      <img
        src={driver.brand_logo_url || `https://i.pravatar.cc/300?u=${driver.slug}`}
        alt={driver.business_name}
        className="w-12 h-12 rounded-2xl object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-extrabold truncate">{driver.business_name}</div>
        <div className="text-[12px] text-muted truncate">
          {[driver.bike_make, driver.bike_model, driver.bike_plate].filter(Boolean).join(' · ') || 'City Rider'}
        </div>
      </div>
      <a
        href={`tel:+${waNumber}`}
        aria-label={`Call ${driver.business_name}`}
        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-95"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <Phone className="w-4 h-4 text-ink" />
      </a>
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`WhatsApp ${driver.business_name}`}
        className="shrink-0 h-11 px-3 rounded-xl flex items-center gap-1.5 text-[13px] font-extrabold transition active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          color: 'white',
          boxShadow: '0 6px 16px rgba(37,211,102,0.35)',
        }}
      >
        <MessageCircle className="w-4 h-4" />
        WA
      </a>
    </div>
  )
}

function TripSummary({ trip }: { trip: TripRow }) {
  return (
    <div className="card p-3 space-y-2 text-[13px]">
      <div className="flex items-start gap-2">
        <MapPin className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-dim">Pick up</div>
          <div className="truncate text-ink">{trip.pickup_label || `${trip.pickup_lat.toFixed(4)}, ${trip.pickup_lng.toFixed(4)}`}</div>
        </div>
      </div>
      {trip.pitstop_note && (
        <div className="pl-2 -ml-2 border-l-2 border-brand/40">
          <div className="text-[10px] text-brand uppercase tracking-wider font-extrabold">Pit stop</div>
          <div className="text-[12px] text-ink/85 mt-0.5">{trip.pitstop_note}</div>
        </div>
      )}
      <div className="flex items-start gap-2">
        <MapPin className="w-3.5 h-3.5 text-online mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-dim">Drop off</div>
          <div className="truncate text-ink">{trip.dropoff_label || `${trip.dropoff_lat.toFixed(4)}, ${trip.dropoff_lng.toFixed(4)}`}</div>
        </div>
      </div>
      {trip.estimated_fare != null && (
        <div className="pt-1 mt-1 border-t border-line flex items-baseline justify-between">
          <span className="text-[12px] text-muted">Estimated fare</span>
          <span className="font-extrabold gradient-text">{idr(trip.estimated_fare)}</span>
        </div>
      )}
    </div>
  )
}

function PaymentMarkPanel({
  trip, driver, methods, busyMethod, error, onMarkPaid,
}: {
  trip: TripRow
  driver: DriverRow | null
  methods: PaymentMethod[]
  busyMethod: string | null
  error: string | null
  onMarkPaid: (method: PaymentMethod) => void
}) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null)

  if (methods.length === 0) {
    return (
      <div className="card p-4 text-[13px] text-muted">
        Payment options will appear here once the rider confirms which methods they accept.
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-3" style={{ background: 'rgba(250,204,21,0.05)', borderColor: 'rgba(250,204,21,0.30)' }}>
      <div>
        <div className="text-[11px] uppercase tracking-wider font-extrabold text-brand">How did you pay?</div>
        <div className="text-[14px] font-extrabold mt-1">
          {trip.estimated_fare != null ? `Amount · ${idr(trip.estimated_fare)}` : 'Tap the method you used'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {methods.map((m) => (
          <button
            key={m}
            onClick={() => setSelected(m)}
            className="w-full rounded-xl border p-3 text-left transition"
            style={{
              background: selected === m ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.03)',
              borderColor: selected === m ? 'rgba(250,204,21,0.50)' : 'rgba(255,255,255,0.10)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(250,204,21,0.12)', color: '#FACC15' }}>
                {iconFor(m)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-extrabold">{labelFor(m)}</div>
                <PaymentMethodHint method={m} driver={driver} />
              </div>
              {selected === m && <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />}
            </div>
            {selected === m && m !== 'cash' && (
              <PaymentMethodDetails method={m} driver={driver} />
            )}
          </button>
        ))}
      </div>

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      <button
        onClick={() => selected && onMarkPaid(selected)}
        disabled={!selected || !!busyMethod}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-[14px] text-bg transition active:scale-[0.99] min-h-[44px] disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
          boxShadow: '0 6px 16px rgba(250,204,21,0.30)',
        }}
      >
        {busyMethod ? 'Sending…' : `I've paid${selected ? ` · ${labelFor(selected)}` : ''}`}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function PaymentMethodHint({ method, driver }: { method: PaymentMethod; driver: DriverRow | null }) {
  if (method === 'cash') return <div className="text-[12px] text-muted">Pay the rider in person</div>
  if (method === 'qr') return <div className="text-[12px] text-muted">Scan the rider&apos;s QR · GoPay / OVO / DANA</div>
  return (
    <div className="text-[12px] text-muted truncate">
      {driver?.transfer_details ? 'Bank account shown below' : 'Ask the rider for transfer details'}
    </div>
  )
}

function PaymentMethodDetails({ method, driver }: { method: PaymentMethod; driver: DriverRow | null }) {
  const [copied, setCopied] = useState(false)
  if (!driver) return null
  if (method === 'qr' && driver.qr_payment_url) {
    return (
      <div className="mt-3 flex flex-col items-center gap-2">
        <img
          src={driver.qr_payment_url}
          alt="Rider QR code"
          className="w-44 h-44 rounded-xl bg-white p-2 object-contain"
        />
        <div className="text-[11px] text-muted">Scan with your e-wallet app</div>
      </div>
    )
  }
  if (method === 'transfer' && driver.transfer_details) {
    async function copy() {
      try {
        await navigator.clipboard.writeText(driver!.transfer_details || '')
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      } catch { /* clipboard blocked */ }
    }
    return (
      <div className="mt-3 rounded-xl bg-white/5 p-3 space-y-2">
        <pre className="text-[12px] text-ink whitespace-pre-wrap font-mono leading-relaxed">{driver.transfer_details}</pre>
        <button
          onClick={copy}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border border-line hover:border-brand/40 transition"
        >
          {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy details</>}
        </button>
      </div>
    )
  }
  return null
}

function RatingPanel({
  busy, error, onSubmit,
}: {
  busy: boolean
  error: string | null
  onSubmit: (rating: number, comment: string | undefined) => void
}) {
  const [rating, setRating] = useState<number>(0)
  const [hover, setHover] = useState<number>(0)
  const [comment, setComment] = useState('')

  return (
    <div className="card p-4 space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-wider font-extrabold text-brand">Rate your rider</div>
        <div className="text-[14px] font-extrabold mt-1">How was the trip?</div>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || rating) >= n
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              className="p-1.5 transition active:scale-95"
            >
              <Star
                className="w-8 h-8"
                fill={filled ? '#FACC15' : 'transparent'}
                strokeWidth={2}
                stroke={filled ? '#FACC15' : 'rgba(255,255,255,0.35)'}
              />
            </button>
          )
        })}
      </div>
      <textarea
        className="input min-h-[72px] resize-none"
        placeholder="Optional comment (visible to the rider)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={400}
      />
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      <button
        onClick={() => onSubmit(rating, comment.trim() || undefined)}
        disabled={rating === 0 || busy}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-[14px] text-bg transition active:scale-[0.99] min-h-[44px] disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
          boxShadow: '0 6px 16px rgba(250,204,21,0.30)',
        }}
      >
        {busy ? 'Sending…' : 'Submit rating'}
      </button>
    </div>
  )
}

function RatedConfirmation({ rating }: { rating: number }) {
  return (
    <div className="card p-4 flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.30)' }}>
      <CheckCircle2 className="w-5 h-5 text-online shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-extrabold">Thanks for rating</div>
        <div className="text-[12px] text-muted">You gave this rider {rating} {rating === 1 ? 'star' : 'stars'}.</div>
      </div>
      <Link href="/cari" className="text-[12px] font-bold text-brand">Book again</Link>
    </div>
  )
}

function LoadingShell() {
  return (
    <main className="min-h-screen p-4 space-y-3">
      <div className="card h-24 shimmer" />
      <div className="card h-16 shimmer" />
      <div className="card h-32 shimmer" />
    </main>
  )
}

function iconFor(m: PaymentMethod) {
  if (m === 'cash') return <Banknote className="w-4 h-4" />
  if (m === 'qr') return <QrCode className="w-4 h-4" />
  return <Building2 className="w-4 h-4" />
}
function labelFor(m: PaymentMethod): string {
  if (m === 'cash') return 'Cash'
  if (m === 'qr') return 'QR / e-wallet'
  return 'Bank transfer'
}
