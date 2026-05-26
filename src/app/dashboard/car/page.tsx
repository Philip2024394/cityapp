'use client'
// ============================================================================
// /dashboard/car — Car driver dashboard
// ----------------------------------------------------------------------------
// IndoCity is a SOFTWARE DIRECTORY under PM 12/2019. The driver self-publishes
// their own price_per_km, min_fee, pitstop_fee, photos, availability, etc.
// IndoCity NEVER computes fares, sets prices, or appoints orders. All copy
// in this file frames pricing/availability as the DRIVER'S choice.
//
// Subscription: 38,000 IDR/month, admin-managed in Phase 1. The page shows
// a banner driven entirely by `drivers.paid_until` and a wa.me link to the
// official streetlocallive admin number. No billing logic lives here.
//
// Photos: Phase 1 collects pasted URLs only. Real file upload comes in v2.
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const SUBSCRIPTION_IDR     = 38_000
const ADMIN_WHATSAPP_E164  = '6285183600015' // streetlocallive admin line
const ADMIN_WA_RENEW = `https://wa.me/${ADMIN_WHATSAPP_E164}?text=${encodeURIComponent(
  'Halo admin, saya mau bayar/renew langganan dashboard Car driver IndoCity (Rp 38.000/bulan).',
)}`

// Row shape used by this page. The drivers table is untyped at the Supabase
// client level (see lib/supabase/client.ts) so we validate the shape here.
type CarDriverRow = {
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
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'wrong_type'; type: string }
  | { kind: 'ready'; row: CarDriverRow }
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
export default function CarDriverDashboardPage() {
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
        'availability, service_zone_radius_km, paid_until',
      )
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { setState({ kind: 'error', message: error.message }); return }
    if (!data) { setState({ kind: 'no_driver' }); return }
    const row = data as unknown as CarDriverRow
    if (row.vehicle_type !== 'car') {
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
            href="/login?next=/dashboard/car"
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
            This account is not registered as a driver. Sign up at <span className="font-mono">/signup</span> with vehicle type Car.
          </p>
          <Link
            href="/signup"
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
          <h1 className="text-[20px] font-black mb-2">Not a car driver</h1>
          <p className="text-[13px] text-black/70 mb-6">
            This account is registered as <span className="font-mono font-bold">{state.type}</span>, not <span className="font-mono font-bold">car</span>.
            Sign up at <span className="font-mono">/signup</span> with vehicle type Car, or visit your existing dashboard.
          </p>
          <div className="flex flex-col gap-2 items-center">
            <Link
              href="/signup"
              className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block min-h-[44px]"
            >
              Sign up as Car driver
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
// Dashboard — only mounts when we have a valid car-type drivers row
// ============================================================================
function Dashboard({ row, onReload }: { row: CarDriverRow; onReload: () => void }) {
  const sub = classifySubscription(row.paid_until)

  return (
    <Shell>
      <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
        <SubscriptionBanner sub={sub} />

        <header className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h1 className="text-[20px] font-black mb-1 truncate">{row.business_name || 'Car driver'}</h1>
          <div className="text-[13px] text-black/60">
            Car driver dashboard · IndoCity is software — you set every price below.
          </div>
        </header>

        <AvailabilitySection row={row} onSaved={onReload} />
        <VehicleSection      row={row} onSaved={onReload} />
        <PhotosSection       row={row} onSaved={onReload} />
        <PricingSection      row={row} onSaved={onReload} />
        <PaymentMethodsSection row={row} onSaved={onReload} />
        <BusinessProfileSection row={row} onSaved={onReload} />
      </div>
    </Shell>
  )
}

// ============================================================================
// Subscription banner
// ----------------------------------------------------------------------------
// "never" — yellow CTA banner, listing is unlisted from /car marketplace.
// "expired" — yellow CTA banner with expiry date.
// "active" — small green pill at top of page.
// ============================================================================
function SubscriptionBanner({ sub }: { sub: SubStatus }) {
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
    : 'Welcome! Your Car driver listing is currently unlisted.'
  const body = isExpired
    ? `Renew (Rp ${SUBSCRIPTION_IDR.toLocaleString('id-ID')}/month) to keep your listing live in the public /car marketplace.`
    : `Subscribe (Rp ${SUBSCRIPTION_IDR.toLocaleString('id-ID')}/month) to appear in the public /car marketplace.`

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
            Your dashboard subscription is Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')}/month. Pay via WhatsApp transfer.
          </p>
          <a
            href={ADMIN_WA_RENEW}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 text-yellow-950 px-5 py-3 text-[13px] font-extrabold min-h-[44px] active:scale-[0.99]"
          >
            Contact admin on WhatsApp →
          </a>
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
function AvailabilitySection({ row, onSaved }: { row: CarDriverRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(onSaved)
  const current = row.availability ?? 'offline'

  async function set(next: 'online' | 'busy' | 'offline') {
    if (next === current || saving) return
    await save({ availability: next })
  }

  return (
    <SectionCard title="Availability">
      <p className="text-[13px] text-black/70">
        You control when you appear as online. IndoCity does not match or appoint orders.
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
// Vehicle
// ============================================================================
function VehicleSection({ row, onSaved }: { row: CarDriverRow; onSaved: () => void }) {
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
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className={labelCls}>
            <span className={labelTextCls}>Make</span>
            <input className={inputCls} value={make}  onChange={(e) => setMake(e.target.value)}  placeholder="Toyota" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Model</span>
            <input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} placeholder="Avanza" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Year</span>
            <input type="number" min={1980} max={2100} className={inputCls} value={year}  onChange={(e) => setYear(e.target.value)}  placeholder="2020" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Color</span>
            <input className={inputCls} value={color} onChange={(e) => setColor(e.target.value)} placeholder="Silver" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Plate</span>
            <input className={inputCls} value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="AB 1234 XX" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Seats</span>
            <input type="number" min={1} max={20} className={inputCls} value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="4" />
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
function PhotosSection({ row, onSaved }: { row: CarDriverRow; onSaved: () => void }) {
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
        Paste public image URLs (one per row). File upload is coming soon.
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
// ============================================================================
function PricingSection({ row, onSaved }: { row: CarDriverRow; onSaved: () => void }) {
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
        These are <strong>YOUR</strong> published rates. IndoCity surfaces them as-is —
        we do not set or modify driver prices.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className={labelCls}>
            <span className={labelTextCls}>Price per km (Rp)</span>
            <input type="number" min={0} className={inputCls} value={perKm}   onChange={(e) => setPerKm(e.target.value)}   placeholder="6000" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Minimum fee (Rp)</span>
            <input type="number" min={0} className={inputCls} value={minFee}  onChange={(e) => setMinFee(e.target.value)}  placeholder="35000" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Pit stop fee (Rp)</span>
            <input type="number" min={0} className={inputCls} value={pitstop} onChange={(e) => setPitstop(e.target.value)} placeholder="5000" />
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
// Payment methods
// ============================================================================
function PaymentMethodsSection({ row, onSaved }: { row: CarDriverRow; onSaved: () => void }) {
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
        Tell customers how you accept payment. IndoCity never handles funds — payments
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
function BusinessProfileSection({ row, onSaved }: { row: CarDriverRow; onSaved: () => void }) {
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
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Budi Car Yogya" />
        </label>
        <label className={labelCls}>
          <span className={labelTextCls}>Bio</span>
          <textarea
            rows={3}
            maxLength={400}
            className={inputCls + ' resize-none'}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Pengalaman 5 tahun antar wisatawan keliling Yogya…"
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
          <input type="number" min={0} step="0.1" className={inputCls} value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="20" />
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
// Shell — page chrome (matches /dashboard/handyman + /dashboard/massage)
// ============================================================================
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}
