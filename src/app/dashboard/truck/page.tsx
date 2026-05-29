'use client'
// ============================================================================
// /dashboard/truck — Truck driver dashboard
// ----------------------------------------------------------------------------
// IndoCity is a SOFTWARE DIRECTORY under PM 12/2019. The driver self-publishes
// their own price_per_km, min_fee, pitstop_fee, photos, availability, AND
// rental rates. IndoCity NEVER computes fares, sets prices, or appoints
// orders. All copy in this file frames pricing/availability/rental as the
// DRIVER'S choice.
//
// Subscription: 38,000 IDR/month, admin-managed in Phase 1. The page shows
// a banner driven entirely by `drivers.paid_until` and a wa.me link to the
// official streetlocallive admin number. No billing logic lives here.
//
// Photos: Phase 1 collects pasted URLs only. Real file upload comes in v2.
//
// Truck customers care most about TRUCK CLASS (Pickup Bak, Box Van, Engkel,
// etc.) and DAILY/WEEKLY RENTAL — per-km direct booking is rare for trucks.
// The Rental section (new for truck) is the headline section because that's
// how most truck customers actually transact.
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, X, Upload, CheckCircle2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import PWAInstallCard from '@/components/dashboard/PWAInstallCard'
import { getBrowserSupabase } from '@/lib/supabase/client'
import RentalSection, { type RentalSavePayload } from '@/components/dashboard/RentalSection'

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const SUBSCRIPTION_IDR     = 38_000
const ADMIN_WHATSAPP_E164  = '6285183600015' // streetlocallive admin line
const ADMIN_WA_RENEW = `https://wa.me/${ADMIN_WHATSAPP_E164}?text=${encodeURIComponent(
  'Halo admin, saya mau bayar/renew langganan dashboard Truck driver Kita2u (Rp 38.000/bulan).',
)}`
// Founder will swap this to the real merchant QRIS image when ready. Swap
// this single constant — no other code changes needed.
const QRIS_IMAGE_URL = 'https://ik.imagekit.io/nepgaxllc/qris-placeholder.png'

// Row shape used by this page. The drivers table is untyped at the Supabase
// client level (see lib/supabase/client.ts) so we validate the shape here.
type TruckDriverRow = {
  user_id: string
  vehicle_type: string | null
  business_name: string | null
  bio: string | null
  whatsapp_e164: string | null
  city: string | null
  area: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_color: string | null
  vehicle_plate: string | null
  vehicle_seats: number | null
  vehicle_photos: string[] | null
  price_per_km: number | null
  min_fee: number | null
  pitstop_fee: number | null
  accepts_cash: boolean | null
  accepts_qr: boolean | null
  accepts_transfer: boolean | null
  qr_payment_url: string | null
  transfer_details: string | null
  availability: 'online' | 'busy' | 'offline' | null
  service_zone_radius_km: number | null
  paid_until: string | null // ISO date (YYYY-MM-DD) or null
  rental_type: 'self_drive' | 'with_driver' | 'both' | null
  rental_daily_rate_idr: number | null
  rental_weekly_rate_idr: number | null
  rental_monthly_rate_idr: number | null
  rental_min_days: number | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'wrong_type'; type: string }
  | { kind: 'ready'; row: TruckDriverRow }
  | { kind: 'error'; message: string }

// ----------------------------------------------------------------------------
// Subscription helpers
// ----------------------------------------------------------------------------
type SubStatus =
  | { kind: 'never' }
  | { kind: 'expired'; until: string }
  | { kind: 'active'; until: string }

function classifySubscription(paidUntil: string | null): SubStatus {
  if (!paidUntil) return { kind: 'never' }
  // Compare as ISO date strings (YYYY-MM-DD lexicographic == chronological).
  const today = new Date().toISOString().slice(0, 10)
  if (paidUntil < today) return { kind: 'expired', until: paidUntil }
  return { kind: 'active', until: paidUntil }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

// ============================================================================
// Page
// ============================================================================
export default function TruckDriverDashboardPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('drivers')
      .select(
        'user_id, vehicle_type, business_name, bio, whatsapp_e164, city, area, ' +
        'vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos, ' +
        'price_per_km, min_fee, pitstop_fee, ' +
        'accepts_cash, accepts_qr, accepts_transfer, qr_payment_url, transfer_details, ' +
        'availability, service_zone_radius_km, paid_until, ' +
        'rental_type, rental_daily_rate_idr, rental_weekly_rate_idr, rental_monthly_rate_idr, rental_min_days',
      )
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { setState({ kind: 'error', message: error.message }); return }
    if (!data) { setState({ kind: 'no_driver' }); return }
    const row = data as unknown as TruckDriverRow
    if (row.vehicle_type !== 'truck') {
      setState({ kind: 'wrong_type', type: row.vehicle_type ?? 'unknown' })
      return
    }
    setState({ kind: 'ready', row })
  }, [])

  useEffect(() => { reload() }, [reload])

  if (state.kind === 'loading') {
    return <Shell><div className="px-4 pt-6 text-black/50 text-[13px]">Loading…</div></Shell>
  }
  if (state.kind === 'no_supabase') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Auth not configured</h1>
          <p className="text-[13px] text-black/70">Supabase is not configured in this environment.</p>
        </div>
      </Shell>
    )
  }
  if (state.kind === 'unauth') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link
            href="/login?next=/dashboard/truck"
            className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block min-h-[44px]"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    )
  }
  if (state.kind === 'no_driver') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">No driver profile yet</h1>
          <p className="text-[13px] text-black/70 mb-6">
            This account is not registered as a Truck driver. Sign up at <span className="font-mono">/signup/truck</span> with vehicle type Truck.
          </p>
          <Link
            href="/signup/truck"
            className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block min-h-[44px]"
          >
            Go to sign up
          </Link>
        </div>
      </Shell>
    )
  }
  if (state.kind === 'wrong_type') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Not a truck driver</h1>
          <p className="text-[13px] text-black/70 mb-6">
            This account is not registered as a Truck driver. Sign up at <span className="font-mono">/signup/truck</span> with vehicle type Truck.
            (Current registration: <span className="font-mono font-bold">{state.type}</span>.)
          </p>
          <div className="flex flex-col gap-2 items-center">
            <Link
              href="/signup/truck"
              className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block min-h-[44px]"
            >
              Sign up as Truck driver
            </Link>
            <Link href="/dashboard" className="text-[13px] font-bold text-brand hover:underline min-h-[44px] inline-flex items-center">
              Back to main dashboard
            </Link>
          </div>
        </div>
      </Shell>
    )
  }
  if (state.kind === 'error') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Could not load profile</h1>
          <p className="text-[13px] text-black/70 mb-4">{state.message}</p>
          <button
            onClick={reload}
            className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block min-h-[44px]"
          >
            Retry
          </button>
        </div>
      </Shell>
    )
  }

  return <Dashboard row={state.row} onReload={reload} />
}

// ============================================================================
// Dashboard — only mounts when we have a valid truck-type drivers row
// ----------------------------------------------------------------------------
// QRIS modal lives at this level so that on a successful upload we can
// optimistically override paid_until — the banner flips to green
// immediately, before the (slower) full row reload completes.
// ============================================================================
function Dashboard({ row, onReload }: { row: TruckDriverRow; onReload: () => void }) {
  // Optimistic override — replaces row.paid_until until the next reload.
  const [paidUntilOverride, setPaidUntilOverride] = useState<string | null>(null)
  const [payOpen, setPayOpen]   = useState(false)
  const [paidToast, setPaidToast] = useState<string | null>(null)
  const effectivePaidUntil = paidUntilOverride ?? row.paid_until
  const sub = classifySubscription(effectivePaidUntil)

  function handlePaymentSubmitted(activeUntil: string) {
    setPaidUntilOverride(activeUntil)
    setPayOpen(false)
    setPaidToast('Payment submitted! Your listing is active.')
    setTimeout(() => setPaidToast(null), 4200)
    // Refresh so the row is hydrated from the DB (drops the override).
    onReload()
  }

  return (
    <Shell>
      <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
        <PWAInstallCard />
        {paidToast && (
          <div
            className="rounded-xl border border-green-300 bg-green-50 text-green-800 text-[13px] px-4 py-3 flex items-center gap-2 shadow-sm"
            role="status"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
            <span className="font-bold">{paidToast}</span>
          </div>
        )}

        <SubscriptionBanner sub={sub} onPay={() => setPayOpen(true)} />

        <header className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h1 className="text-[20px] font-black mb-1 truncate">{row.business_name || 'Truck driver'}</h1>
          <div className="text-[13px] text-black/60">
            Truck driver dashboard · Kita2u is software — you set every price below.
          </div>
        </header>

        <AvailabilitySection row={row} onSaved={onReload} />
        <VehicleSection      row={row} onSaved={onReload} />
        <PhotosSection       row={row} onSaved={onReload} />
        <PricingSection      row={row} onSaved={onReload} />
        <TruckRentalSection  row={row} onSaved={onReload} />
        <PaymentMethodsSection row={row} onSaved={onReload} />
        <BusinessProfileSection row={row} onSaved={onReload} />
      </div>

      <QrisPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onSubmitted={handlePaymentSubmitted}
      />
    </Shell>
  )
}

// ============================================================================
// Subscription banner
// ----------------------------------------------------------------------------
// "never" — yellow CTA banner, listing is unlisted from /truck marketplace.
// "expired" — yellow CTA banner with expiry date.
// "active" — small green pill at top of page.
// ============================================================================
function SubscriptionBanner({ sub, onPay }: { sub: SubStatus; onPay: () => void }) {
  if (sub.kind === 'active') {
    return (
      <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-2">
        <span className="inline-flex items-center gap-2 text-[13px] font-extrabold text-green-800">
          <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
          Subscription active until {formatDate(sub.until)}
        </span>
        <span className="text-[12px] text-green-700/80">Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')} / month</span>
      </div>
    )
  }

  const isExpired = sub.kind === 'expired'
  const heading = isExpired
    ? `Your subscription expired on ${formatDate(sub.until)}`
    : 'Welcome! Your Truck driver listing is currently unlisted.'
  const body = isExpired
    ? `Renew (Rp ${SUBSCRIPTION_IDR.toLocaleString('id-ID')}/month) to keep your listing live in the public /truck marketplace.`
    : `Subscribe (Rp ${SUBSCRIPTION_IDR.toLocaleString('id-ID')}/month) to appear in the public /truck marketplace.`

  return (
    <div className="rounded-2xl bg-yellow-50 border border-yellow-300 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-yellow-900"
          style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)' }}
        >
          !
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-black text-yellow-900 leading-snug">{heading}</h2>
          <p className="text-[13px] text-yellow-900/85 leading-relaxed mt-1">{body}</p>
          <p className="text-[13px] text-yellow-900/85 leading-relaxed mt-1">
            Pay Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')}/month via QRIS — your listing activates immediately.
          </p>
          <button
            type="button"
            onClick={onPay}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 text-yellow-950 px-5 py-3 text-[13px] font-extrabold min-h-[44px] active:scale-[0.99]"
          >
            Pay Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')} →
          </button>
          <div className="mt-2">
            <a
              href={ADMIN_WA_RENEW}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold text-yellow-900/70 hover:text-yellow-900 hover:underline"
            >
              Need help paying? WhatsApp admin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Section shells — Card + collapsible Edit/Save split per section so edits
// in one card don't conflict with others.
// ============================================================================
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      <h2 className="text-[14px] font-extrabold uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  )
}

function SaveButton({ saving, dirty }: { saving: boolean; dirty: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving || !dirty}
      className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-60"
    >
      {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
    </button>
  )
}

function Toast({ kind, children }: { kind: 'ok' | 'err'; children: React.ReactNode }) {
  const cls = kind === 'ok'
    ? 'border-green-300 bg-green-50 text-green-800'
    : 'border-red-300 bg-red-50 text-red-800'
  return (
    <div className={`rounded-lg border ${cls} text-[13px] px-3 py-2`}>{children}</div>
  )
}

const inputCls =
  'w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-[14px] text-black placeholder:text-black/40 focus:outline-none focus:border-brand min-h-[44px]'

const labelCls = 'block'
const labelTextCls = 'text-[13px] font-bold text-black/70 mb-1 inline-block'

// ============================================================================
// Hook: useSectionForm — generic, shared per-section save state with optimistic
// flash + error capture. Saves to `drivers` table scoped to current user_id.
// ============================================================================
function useSectionSaver(onSaved: () => void) {
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const save = useCallback(async (patch: Record<string, unknown>) => {
    setToast(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setToast({ kind: 'err', msg: 'Supabase not configured.' }); return false }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setToast({ kind: 'err', msg: 'Not signed in.' }); return false }
    setSaving(true)
    const { error } = await supabase.from('drivers').update(patch).eq('user_id', user.id)
    setSaving(false)
    if (error) { setToast({ kind: 'err', msg: error.message }); return false }
    setToast({ kind: 'ok', msg: 'Saved.' })
    setTimeout(() => setToast(null), 2400)
    onSaved()
    return true
  }, [onSaved])

  return { saving, toast, save }
}

// ============================================================================
// Availability
// ============================================================================
function AvailabilitySection({ row, onSaved }: { row: TruckDriverRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(onSaved)
  const current = row.availability ?? 'offline'

  async function set(next: 'online' | 'busy' | 'offline') {
    if (next === current || saving) return
    await save({ availability: next })
  }

  return (
    <SectionCard title="Availability">
      <p className="text-[13px] text-black/70">
        You control when you appear as online. Kita2u does not match or appoint orders.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(['online', 'busy', 'offline'] as const).map((a) => {
          const active = current === a
          return (
            <button
              key={a}
              type="button"
              disabled={saving}
              onClick={() => set(a)}
              className={`rounded-xl px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider transition border min-h-[44px] ${
                active
                  ? 'bg-brand text-bg border-brand'
                  : 'bg-gray-100 text-black/80 border-gray-200 hover:bg-gray-200'
              }`}
              aria-pressed={active}
            >
              {a === 'online' ? 'Online' : a === 'busy' ? 'Busy' : 'Offline'}
            </button>
          )
        })}
      </div>
      {toast && <Toast kind={toast.kind}>{toast.msg}</Toast>}
    </SectionCard>
  )
}

// ============================================================================
// Vehicle — Truck class is the headline signal (Pickup Bak vs Box Van vs
// Engkel). Model placeholder pushes specific Indonesian truck names so the
// listing reads correctly to customers.
// ============================================================================
function VehicleSection({ row, onSaved }: { row: TruckDriverRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(onSaved)
  const [make,  setMake]  = useState(row.vehicle_make  ?? '')
  const [model, setModel] = useState(row.vehicle_model ?? '')
  const [year,  setYear]  = useState<string>(row.vehicle_year != null ? String(row.vehicle_year) : '')
  const [color, setColor] = useState(row.vehicle_color ?? '')
  const [plate, setPlate] = useState(row.vehicle_plate ?? '')
  const [seats, setSeats] = useState<string>(row.vehicle_seats != null ? String(row.vehicle_seats) : '')

  const dirty =
    make  !== (row.vehicle_make  ?? '') ||
    model !== (row.vehicle_model ?? '') ||
    year  !== (row.vehicle_year  != null ? String(row.vehicle_year)  : '') ||
    color !== (row.vehicle_color ?? '') ||
    plate !== (row.vehicle_plate ?? '') ||
    seats !== (row.vehicle_seats != null ? String(row.vehicle_seats) : '')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await save({
      vehicle_make:  make.trim()  || null,
      vehicle_model: model.trim() || null,
      vehicle_year:  year  === '' ? null : Number(year),
      vehicle_color: color.trim() || null,
      vehicle_plate: plate.trim() || null,
      vehicle_seats: seats === '' ? null : Number(seats),
    })
  }

  return (
    <SectionCard title="Vehicle">
      <p className="text-[13px] text-black/70 leading-snug">
        Truck class affects what customers pick you for — be specific
        (Pickup Bak / Box Van / Engkel).
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className={labelCls}>
            <span className={labelTextCls}>Make</span>
            <input className={inputCls} value={make}  onChange={(e) => setMake(e.target.value)}  placeholder="Mitsubishi" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Model</span>
            <input
              className={inputCls}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="L300 Pickup, Carry, Dutro 130HD, Engkel Box, etc."
            />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Year</span>
            <input type="number" min={1980} max={2100} className={inputCls} value={year}  onChange={(e) => setYear(e.target.value)}  placeholder="2018" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Color</span>
            <input className={inputCls} value={color} onChange={(e) => setColor(e.target.value)} placeholder="White" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Plate</span>
            <input className={inputCls} value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="AB 1234 XX" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Seats (cabin)</span>
            <input type="number" min={2} max={3} className={inputCls} value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="3" />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          {toast ? <Toast kind={toast.kind}>{toast.msg}</Toast> : <span />}
          <SaveButton saving={saving} dirty={dirty} />
        </div>
      </form>
    </SectionCard>
  )
}

// ============================================================================
// Vehicle photos — Phase 1: URL list editor (defer real upload to v2)
// ============================================================================
function PhotosSection({ row, onSaved }: { row: TruckDriverRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(onSaved)
  const initial = Array.isArray(row.vehicle_photos) ? row.vehicle_photos : []
  const [urls, setUrls] = useState<string[]>(initial.length ? initial : [''])

  const cleaned = urls.map((u) => u.trim()).filter((u) => u.length > 0)
  const initialCleaned = initial.map((u) => (u ?? '').trim()).filter((u) => u.length > 0)
  const dirty =
    cleaned.length !== initialCleaned.length ||
    cleaned.some((u, i) => u !== initialCleaned[i])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await save({ vehicle_photos: cleaned })
  }

  return (
    <SectionCard title="Vehicle photos">
      <p className="text-[13px] text-black/70">
        Paste public image URLs (one per row) — include a shot of the cargo bed / box so customers
        can see capacity. File upload is coming soon.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-2">
          {urls.map((u, i) => (
            <div key={i} className="flex items-stretch gap-2">
              <input
                className={inputCls}
                value={u}
                onChange={(e) => {
                  const next = urls.slice()
                  next[i] = e.target.value
                  setUrls(next)
                }}
                placeholder="https://…"
              />
              {u && /^https?:\/\//i.test(u) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  const next = urls.filter((_, idx) => idx !== i)
                  setUrls(next.length ? next : [''])
                }}
                className="shrink-0 rounded-xl border border-gray-200 text-black/70 hover:bg-gray-50 px-3 text-[13px] font-bold min-h-[44px]"
                aria-label="Remove"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setUrls([...urls, ''])}
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[13px] font-extrabold text-black/80 hover:border-brand min-h-[44px]"
        >
          + Add another URL
        </button>
        <div className="flex items-center justify-between gap-3">
          {toast ? <Toast kind={toast.kind}>{toast.msg}</Toast> : <span />}
          <SaveButton saving={saving} dirty={dirty} />
        </div>
      </form>
    </SectionCard>
  )
}

// ============================================================================
// Pricing — compliance-critical section. Header + helper text MUST frame
// pricing as the DRIVER'S choice. No language implying IndoCity sets fares.
// ----------------------------------------------------------------------------
// For trucks, per-km direct booking is rare — most customers want daily /
// weekly rental. The hint above the per-km field tells drivers to use the
// Rental section below for their primary pricing.
// ============================================================================
function PricingSection({ row, onSaved }: { row: TruckDriverRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(onSaved)
  const [perKm,    setPerKm]    = useState<string>(row.price_per_km   != null ? String(row.price_per_km)   : '')
  const [minFee,   setMinFee]   = useState<string>(row.min_fee        != null ? String(row.min_fee)        : '')
  const [pitstop,  setPitstop]  = useState<string>(row.pitstop_fee    != null ? String(row.pitstop_fee)    : '')

  const dirty =
    perKm   !== (row.price_per_km != null ? String(row.price_per_km) : '') ||
    minFee  !== (row.min_fee      != null ? String(row.min_fee)      : '') ||
    pitstop !== (row.pitstop_fee  != null ? String(row.pitstop_fee)  : '')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await save({
      price_per_km: perKm   === '' ? null : Number(perKm),
      min_fee:      minFee  === '' ? null : Number(minFee),
      pitstop_fee:  pitstop === '' ? null : Number(pitstop),
    })
  }

  return (
    <SectionCard title="Your published rates">
      <p className="text-[13px] text-black/70 leading-snug">
        These are <strong>YOUR</strong> published rates. Kita2u displays your rates
        as-is — we do not set or modify driver prices.
      </p>
      <p className="text-[13px] text-black/70 leading-snug">
        Per-km pricing applies for direct booking (rare for trucks). Most truck customers
        want daily/weekly rental rates — fill the Rental section below.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className={labelCls}>
            <span className={labelTextCls}>Price per km (Rp)</span>
            <input type="number" min={0} className={inputCls} value={perKm}   onChange={(e) => setPerKm(e.target.value)}   placeholder="10000" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Minimum fee (Rp)</span>
            <input type="number" min={0} className={inputCls} value={minFee}  onChange={(e) => setMinFee(e.target.value)}  placeholder="150000" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Pit stop fee (Rp)</span>
            <input type="number" min={0} className={inputCls} value={pitstop} onChange={(e) => setPitstop(e.target.value)} placeholder="15000" />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          {toast ? <Toast kind={toast.kind}>{toast.msg}</Toast> : <span />}
          <SaveButton saving={saving} dirty={dirty} />
        </div>
      </form>
    </SectionCard>
  )
}

// ============================================================================
// Rental rates — delegates to the shared <RentalSection /> component.
// ----------------------------------------------------------------------------
// Trucks transact mostly as DAILY/WEEKLY RENTAL — Pindahan rumah, distribusi
// barang, jasa angkut. The same component is reused on /dashboard/car and
// /dashboard/bus. Truck defaults rental_type to 'with_driver' since most
// truck rentals include a sopir.
//
// COMPLIANCE: rental rates are self-published — IndoCity displays them
// as-is, customers agree terms directly with the driver.
// ============================================================================
function TruckRentalSection({ row, onSaved }: { row: TruckDriverRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(onSaved)
  return (
    <RentalSection
      rentalType={row.rental_type}
      rentalDailyRateIdr={row.rental_daily_rate_idr}
      rentalWeeklyRateIdr={row.rental_weekly_rate_idr}
      rentalMonthlyRateIdr={row.rental_monthly_rate_idr}
      rentalMinDays={row.rental_min_days}
      defaultRentalType="with_driver"
      vehicleNoun="truck"
      saving={saving}
      toast={toast}
      onSave={(payload: RentalSavePayload) => save(payload)}
    />
  )
}

// ============================================================================
// Payment methods
// ============================================================================
function PaymentMethodsSection({ row, onSaved }: { row: TruckDriverRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(onSaved)
  const [cash,    setCash]    = useState<boolean>(row.accepts_cash     ?? false)
  const [qr,      setQr]      = useState<boolean>(row.accepts_qr       ?? false)
  const [bank,    setBank]    = useState<boolean>(row.accepts_transfer ?? false)
  const [qrUrl,   setQrUrl]   = useState<string>(row.qr_payment_url    ?? '')
  const [bankTx,  setBankTx]  = useState<string>(row.transfer_details  ?? '')

  const dirty =
    cash   !== (row.accepts_cash     ?? false) ||
    qr     !== (row.accepts_qr       ?? false) ||
    bank   !== (row.accepts_transfer ?? false) ||
    qrUrl  !== (row.qr_payment_url   ?? '')    ||
    bankTx !== (row.transfer_details ?? '')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await save({
      accepts_cash:     cash,
      accepts_qr:       qr,
      accepts_transfer: bank,
      qr_payment_url:   qrUrl.trim()  || null,
      transfer_details: bankTx.trim() || null,
    })
  }

  return (
    <SectionCard title="Payment methods">
      <p className="text-[13px] text-black/70">
        Tell customers how you accept payment. Kita2u never handles funds — payments
        go directly between you and the customer.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <Toggle label="Accept cash"          checked={cash} onChange={setCash} />
        <Toggle label="Accept QR (QRIS)"     checked={qr}   onChange={setQr} />
        {qr && (
          <label className={labelCls}>
            <span className={labelTextCls}>QR payment URL</span>
            <input className={inputCls} value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="https://… (your QRIS image or link)" />
          </label>
        )}
        <Toggle label="Accept bank transfer" checked={bank} onChange={setBank} />
        {bank && (
          <label className={labelCls}>
            <span className={labelTextCls}>Bank transfer details</span>
            <textarea
              rows={3}
              className={inputCls + ' resize-none'}
              value={bankTx}
              onChange={(e) => setBankTx(e.target.value)}
              placeholder="BCA 1234567890 a/n Nama Driver"
            />
          </label>
        )}
        <div className="flex items-center justify-between gap-3">
          {toast ? <Toast kind={toast.kind}>{toast.msg}</Toast> : <span />}
          <SaveButton saving={saving} dirty={dirty} />
        </div>
      </form>
    </SectionCard>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-brand w-5 h-5"
      />
      <span className="text-[14px] font-bold text-black/85">{label}</span>
    </label>
  )
}

// ============================================================================
// Business profile (name, bio, service area)
// ============================================================================
function BusinessProfileSection({ row, onSaved }: { row: TruckDriverRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(onSaved)
  const [name,    setName]    = useState(row.business_name ?? '')
  const [bio,     setBio]     = useState(row.bio ?? '')
  const [whats,   setWhats]   = useState(row.whatsapp_e164 ?? '')
  const [city,    setCity]    = useState(row.city ?? '')
  const [area,    setArea]    = useState(row.area ?? '')
  const [radius,  setRadius]  = useState<string>(row.service_zone_radius_km != null ? String(row.service_zone_radius_km) : '')

  const dirty =
    name   !== (row.business_name ?? '')          ||
    bio    !== (row.bio ?? '')                    ||
    whats  !== (row.whatsapp_e164 ?? '')          ||
    city   !== (row.city ?? '')                   ||
    area   !== (row.area ?? '')                   ||
    radius !== (row.service_zone_radius_km != null ? String(row.service_zone_radius_km) : '')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await save({
      business_name:           name.trim()  || null,
      bio:                     bio.trim()   || null,
      whatsapp_e164:           whats.trim() || null,
      city:                    city.trim()  || null,
      area:                    area.trim()  || null,
      service_zone_radius_km:  radius === '' ? null : Number(radius),
    })
  }

  return (
    <SectionCard title="Business profile">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className={labelCls}>
          <span className={labelTextCls}>Business / driver name</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Budi Truck Yogya" />
        </label>
        <label className={labelCls}>
          <span className={labelTextCls}>Bio</span>
          <textarea
            rows={3}
            maxLength={400}
            className={inputCls + ' resize-none'}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Pindahan rumah, distribusi barang, jasa angkut. Coverage: Yogya / Bali. Sopir + helper berpengalaman."
          />
        </label>
        <label className={labelCls}>
          <span className={labelTextCls}>WhatsApp (E.164)</span>
          <input type="tel" className={inputCls} value={whats} onChange={(e) => setWhats(e.target.value)} placeholder="+628123456789" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelCls}>
            <span className={labelTextCls}>City</span>
            <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Yogyakarta" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Area</span>
            <input className={inputCls} value={area} onChange={(e) => setArea(e.target.value)} placeholder="Sleman" />
          </label>
        </div>
        <label className={labelCls}>
          <span className={labelTextCls}>Service zone radius (km)</span>
          <input type="number" min={0} step="0.1" className={inputCls} value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="50" />
        </label>
        <div className="flex items-center justify-between gap-3">
          {toast ? <Toast kind={toast.kind}>{toast.msg}</Toast> : <span />}
          <SaveButton saving={saving} dirty={dirty} />
        </div>
      </form>
    </SectionCard>
  )
}

// ============================================================================
// QRIS payment modal
// ----------------------------------------------------------------------------
// Driver scans the QR in their bank/wallet app, pays externally, then
// uploads a screenshot. The /api/dashboard/subscription-payment endpoint
// records the proof and bumps drivers.paid_until = max(paid_until, today)
// + 30 days, so the listing flips active OPTIMISTICALLY. Admin verifies
// (or reverts) later via /admin/subscriptions.
//
// COMPLIANCE: IndoCity never custodies funds. The QR shown is the
// founder's merchant QRIS — payment is between the driver's bank and the
// founder's bank, not through IndoCity rails.
// ============================================================================
function QrisPaymentModal({
  open, onClose, onSubmitted,
}: {
  open: boolean
  onClose: () => void
  onSubmitted: (activeUntil: string) => void
}) {
  const [file,         setFile]         = useState<File | null>(null)
  const [filePreview,  setFilePreview]  = useState<string | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState<string | null>(null)

  // Reset state every time the modal reopens — stale errors / files
  // shouldn't bleed between attempts.
  useEffect(() => {
    if (open) {
      setFile(null)
      setFilePreview(null)
      setUploading(false)
      setUploadError(null)
    }
  }, [open])

  // Manage the object URL lifecycle for the screenshot preview so we
  // don't leak blobs across selections.
  useEffect(() => {
    if (!file) { setFilePreview(null); return }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Close on Escape — small affordance that costs nothing.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !uploading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, uploading, onClose])

  if (!open) return null

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f && !f.type.startsWith('image/')) {
      setUploadError('Please choose an image file (PNG / JPG).')
      return
    }
    setUploadError(null)
    setFile(f)
  }

  async function submit() {
    if (!file || uploading) return
    setUploadError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('screenshot', file)
      fd.append('vehicleType', 'truck')
      const r = await fetch('/api/dashboard/subscription-payment', {
        method: 'POST',
        body: fd,
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setUploadError(j?.error || 'Upload failed. Please try again.')
        setUploading(false)
        return
      }
      // Bubble the active-until back so the parent can flip the banner
      // green immediately. The parent also calls onClose + toast.
      onSubmitted(j.activeUntil as string)
    } catch {
      setUploadError('Network error. Please try again.')
      setUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={() => { if (!uploading) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qris-modal-title"
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-[#0F172A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={uploading}
          aria-label="Close"
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-5 pt-6 pb-5">
          <h2 id="qris-modal-title" className="text-[18px] font-black leading-tight pr-10">
            Pay subscription via QRIS
          </h2>
          <p className="text-[13px] text-black/65 mt-1 leading-snug">
            Pay Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')} to keep your truck listing live for 30 days.
          </p>

          {/* Amount pill */}
          <div className="mt-4 rounded-xl bg-[#FACC15]/15 border border-[#FACC15] px-4 py-3 flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#0F172A]/80">Amount</span>
            <span className="text-[15px] font-black text-[#0F172A]">
              Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')} <span className="font-bold text-[13px] text-[#0F172A]/70">/ 1 month</span>
            </span>
          </div>

          {/* QR display — white card with padding so it's scannable even
              over the dark backdrop showing through any transparency. */}
          <div className="mt-4 flex justify-center">
            <div className="bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={QRIS_IMAGE_URL}
                alt="Kita2u QRIS payment code"
                width={200}
                height={200}
                className="w-[200px] h-[200px] object-contain block"
              />
            </div>
          </div>

          {/* Steps */}
          <ol className="mt-5 space-y-2 text-[13px] text-black/80">
            <Step n={1}>
              Buka aplikasi banking / dompet digital
              <span className="block text-black/55 text-[12px]">(BCA, Mandiri, GoPay, OVO, Dana, ShopeePay, etc.)</span>
            </Step>
            <Step n={2}>Scan QRIS di atas / Scan the QR above</Step>
            <Step n={3}>Bayar <span className="font-black">Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')}</span> / Pay the amount</Step>
            <Step n={4}>Screenshot bukti pembayaran / Screenshot the receipt</Step>
            <Step n={5}>Upload screenshot di bawah — listing aktif segera</Step>
          </ol>

          {/* Upload zone */}
          <div className="mt-5">
            <label
              htmlFor="qris-screenshot-input"
              className="block w-full rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#FACC15] bg-gray-50 hover:bg-[#FACC15]/5 transition cursor-pointer"
            >
              <input
                id="qris-screenshot-input"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onPick}
                disabled={uploading}
              />
              {filePreview ? (
                <div className="p-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={filePreview}
                    alt="Screenshot preview"
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold truncate">{file?.name}</div>
                    <div className="text-[12px] text-black/55">Tap to choose a different screenshot</div>
                  </div>
                </div>
              ) : (
                <div className="p-5 flex flex-col items-center justify-center text-center min-h-[88px]">
                  <Upload className="w-5 h-5 text-black/50 mb-1" aria-hidden />
                  <div className="text-[13px] font-extrabold text-[#0F172A]">Choose screenshot</div>
                  <div className="text-[12px] text-black/55 mt-0.5">PNG or JPG of your payment receipt</div>
                </div>
              )}
            </label>
          </div>

          {uploadError && (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-50 text-red-800 text-[13px] px-3 py-2">
              {uploadError}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!file || uploading}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#FACC15] text-[#0F172A] px-5 py-3 text-[13px] font-extrabold min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Uploading…
              </>
            ) : (
              <>Submit payment proof</>
            )}
          </button>

          <p className="mt-3 text-[12px] text-black/55 leading-snug">
            Payment is between you and your bank/wallet. Kita2u is a software directory — we do not custody or process funds.
          </p>

          <div className="mt-3 text-center">
            <a
              href={ADMIN_WA_RENEW}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold text-black/60 hover:text-black hover:underline"
            >
              Need help paying? WhatsApp admin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="shrink-0 w-6 h-6 rounded-full bg-[#0F172A] text-white text-[12px] font-black flex items-center justify-center mt-[1px]"
      >
        {n}
      </span>
      <span className="leading-snug">{children}</span>
    </li>
  )
}

// ============================================================================
// Shell — page chrome (matches /dashboard/car + /dashboard/bus + /dashboard/handyman)
// ============================================================================
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}
