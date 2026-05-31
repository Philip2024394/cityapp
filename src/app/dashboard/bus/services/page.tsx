'use client'
// ============================================================================
// /dashboard/bus/services — Services & rates (Phase 1B real implementation)
// ----------------------------------------------------------------------------
// Replaces the placeholder stub. Mirrors the beautician services page UX:
//   - rounded-3xl hero gradient strip + icon at top
//   - section cards (white, rounded-3xl, soft shadow) for each block
//   - save-on-blur for inputs, instant-save for toggles/chips
//   - inline "Saved" flash feedback + loading skeleton on mount
//   - brand yellow (#FACC15 / #EAB308) for accents
//   - mobile-first, 13px text floor, 44px tap targets, max-w-2xl container
//
// Edited fields (subset of the drivers row):
//   1. service_offerings  text[]  — checkboxes/chips of trip types
//   2. price_per_km       int     — per-km transport pricing
//      min_fee            int     — minimum per-trip fee
//      (pitstop_fee tucked behind "Advanced pricing")
//   3. rental_type, rental_daily_rate_idr, rental_weekly_rate_idr,
//      rental_monthly_rate_idr, rental_min_days — only shown when the
//      driver has 'daily_hire' enabled in service_offerings.
//
// All currency inputs render IDR with thousand-separator dots and parse
// back to plain integers before saving.
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. The driver
// self-publishes every price here. We never compute fares, never appoint
// orders, never custody funds. Copy frames pricing as "YOUR published rates".
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Layers, DollarSign, Car, Check, Loader2, Package, Clock, Lock, MapPin,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'
import { SERVICE_OFFERINGS, type ServiceOfferingId } from '@/lib/drivers/serviceOfferings'
import {
  defaultsFor,
  parseRateTiers,
  PARCEL_TIER_DEFINITIONS,
  type ParcelRateTiers,
  type ParcelRateTierKey,
} from '@/lib/parcel/defaults'
import {
  hourlyDefaultsForVehicle,
  HOURLY_DEFAULTS_INNOVA,
} from '@/lib/pricing/hourlyHire'

// ----------------------------------------------------------------------------
// Row shape — only the columns this page edits.
// ----------------------------------------------------------------------------
type ServicesRow = {
  user_id: string
  vehicle_type: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  service_offerings: string[] | null
  price_per_km: number | null
  min_fee: number | null
  pitstop_fee: number | null
  rental_type: 'self_drive' | 'with_driver' | 'both' | null
  rental_daily_rate_idr: number | null
  rental_weekly_rate_idr: number | null
  rental_monthly_rate_idr: number | null
  rental_min_days: number | null
  parcel_b2b_enabled: boolean | null
  parcel_rate_tiers: unknown | null
  parcel_daily_capacity: number | null
  parcel_service_zone: string | null
  parcel_outer_zone_surcharge: number | null
  hourly_enabled: boolean | null
  hourly_3h_rate_idr: number | null
  hourly_6h_rate_idr: number | null
  hourly_8h_rate_idr: number | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'ready'; row: ServicesRow }
  | { kind: 'error'; message: string }

// ----------------------------------------------------------------------------
// IDR formatting helpers — display thousands with dots, parse digits-only.
// ----------------------------------------------------------------------------
function formatIdr(value: number | null | undefined | string): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\D/g, ''))
  if (!Number.isFinite(n) || n <= 0) return ''
  return n.toLocaleString('id-ID')
}
function parseIdr(text: string): number | null {
  const digits = text.replace(/\D/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) ? n : null
}

// ============================================================================
// Page entry
// ============================================================================
export default function BusServicesPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    const dev = await tryLoadDevDriver()
    if (dev) { setState({ kind: 'ready', row: dev.driver as unknown as ServicesRow }); return }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('drivers')
      .select(
        'user_id, vehicle_type, vehicle_make, vehicle_model, service_offerings, ' +
        'price_per_km, min_fee, pitstop_fee, ' +
        'rental_type, rental_daily_rate_idr, rental_weekly_rate_idr, rental_monthly_rate_idr, rental_min_days, ' +
        'parcel_b2b_enabled, parcel_rate_tiers, parcel_daily_capacity, parcel_service_zone, parcel_outer_zone_surcharge, ' +
        'hourly_enabled, hourly_3h_rate_idr, hourly_6h_rate_idr, hourly_8h_rate_idr',
      )
      .eq('user_id', user.id)
      .maybeSingle()
    if (error)  { setState({ kind: 'error', message: error.message }); return }
    if (!data)  { setState({ kind: 'no_driver' }); return }
    setState({ kind: 'ready', row: data as unknown as ServicesRow })
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')     return <Shell><Skeleton /></Shell>
  if (state.kind === 'no_supabase') return <FullMsg>Auth not configured.</FullMsg>
  if (state.kind === 'unauth')      return <FullMsg cta={{ href: '/login?next=/dashboard/bus/services', label: 'Sign in' }}>Sign in to edit your services.</FullMsg>
  if (state.kind === 'no_driver')   return <FullMsg cta={{ href: '/signup?role=driver&vehicle=bus', label: 'Create driver profile' }}>No driver profile yet.</FullMsg>
  if (state.kind === 'error')       return <FullMsg>Could not load: {state.message}</FullMsg>

  return <ServicesEditor row={state.row} onReload={() => void reload()} />
}

// ============================================================================
// Editor — composes the section cards.
// ============================================================================
function ServicesEditor({ row, onReload }: { row: ServicesRow; onReload: () => void }) {
  const [savedFlash, setSavedFlash] = useState(false)

  const save = useCallback(async (patch: Record<string, unknown>): Promise<boolean> => {
    const supabase = getBrowserSupabase()
    if (!supabase) return false
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase.from('drivers').update(patch).eq('user_id', user.id)
    if (error) {
      alert(error.message)
      return false
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1600)
    onReload()
    return true
  }, [onReload])

  const offerings = (row.service_offerings ?? []) as ServiceOfferingId[]
  const rentalEnabled = offerings.includes('daily_hire')

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-32">
        <Link
          href="/dashboard/bus"
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black mb-3 min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to dashboard
        </Link>

        {/* Hero strip — yellow gradient with icon */}
        <div
          className="rounded-3xl p-5 shadow-sm mb-4"
          style={{
            background: 'linear-gradient(135deg, #FACC15 0%, #FEF9C3 100%)',
            border: '1px solid rgba(234,179,8,0.35)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
              style={{ background: '#EAB308', color: '#0A0A0A' }}
            >
              <Layers size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-[#0A0A0A] truncate">Services &amp; rates</h1>
                <span
                  className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 border transition ${
                    savedFlash
                      ? 'text-emerald-700 bg-emerald-100 border-emerald-200'
                      : 'text-[#854D0E] bg-white/70 border-[#FACC15]'
                  }`}
                >
                  {savedFlash ? <><Check size={11} strokeWidth={3} /> Saved</> : 'Live'}
                </span>
              </div>
              <p className="text-[12.5px] text-[#0A0A0A]/75 leading-snug">
                Pick what trips you offer and set <strong>your</strong> rates. CityDrivers displays them as-is.
              </p>
            </div>
          </div>
        </div>

        <OfferingsCard offerings={offerings} onSave={save} />
        <PricingCard row={row} onSave={save} />
        <PitstopFeeCard row={row} onSave={save} />
        {rentalEnabled && <RentalCard row={row} onSave={save} />}
        <ParcelB2BCard row={row} onSave={save} />
        <HourlyHireCard row={row} onSave={save} />
      </div>
    </Shell>
  )
}

// ============================================================================
// 5. Hourly hire packages — block-rate car+driver hire, petrol billed separately
// ============================================================================
function HourlyHireCard({
  row, onSave,
}: {
  row:    ServicesRow
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const enabled = !!row.hourly_enabled
  const [busyToggle, setBusyToggle] = useState(false)

  const defaults = hourlyDefaultsForVehicle(row.vehicle_make, row.vehicle_model)
  const tierLabel = defaults === HOURLY_DEFAULTS_INNOVA ? 'Innova tier' : 'Avanza tier'

  const [r3h, setR3h] = useState<string>(formatIdr(row.hourly_3h_rate_idr))
  const [r6h, setR6h] = useState<string>(formatIdr(row.hourly_6h_rate_idr))
  const [r8h, setR8h] = useState<string>(formatIdr(row.hourly_8h_rate_idr))

  useEffect(() => { setR3h(formatIdr(row.hourly_3h_rate_idr)) }, [row.hourly_3h_rate_idr])
  useEffect(() => { setR6h(formatIdr(row.hourly_6h_rate_idr)) }, [row.hourly_6h_rate_idr])
  useEffect(() => { setR8h(formatIdr(row.hourly_8h_rate_idr)) }, [row.hourly_8h_rate_idr])

  async function toggleEnabled() {
    if (busyToggle) return
    setBusyToggle(true)
    await onSave({ hourly_enabled: !enabled })
    setBusyToggle(false)
  }

  async function commitRate(
    field: 'hourly_3h_rate_idr' | 'hourly_6h_rate_idr' | 'hourly_8h_rate_idr',
    raw: string,
    current: number | null,
  ) {
    const next = parseIdr(raw)
    if (next === current) return
    await onSave({ [field]: next })
  }

  async function resetDefaults() {
    setR3h(formatIdr(defaults.tier_3h))
    setR6h(formatIdr(defaults.tier_6h))
    setR8h(formatIdr(defaults.tier_8h))
    await onSave({
      hourly_3h_rate_idr: defaults.tier_3h,
      hourly_6h_rate_idr: defaults.tier_6h,
      hourly_8h_rate_idr: defaults.tier_8h,
    })
  }

  return (
    <Card
      title="Hourly hire packages"
      hint="Block-rate car + driver hire. Petrol billed separately at SPBU."
      icon={<Clock size={18} />}
    >
      {/* Master toggle */}
      <button
        type="button"
        onClick={toggleEnabled}
        disabled={busyToggle}
        aria-pressed={enabled}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition active:scale-[0.99] disabled:opacity-70 min-h-[44px]"
        style={{
          background:  enabled ? '#FACC15' : '#F9FAFB',
          borderColor: enabled ? '#EAB308' : '#E4E4E7',
          boxShadow:   enabled ? '0 2px 8px rgba(250,204,21,0.30)' : 'none',
        }}
      >
        <span className="text-left">
          <span className="block text-[13px] font-extrabold text-[#0A0A0A]">Offer hourly hire</span>
          <span className="block text-[13px] font-bold text-black/60 mt-0.5">
            {enabled ? '3h / 6h / 8h block rates shown on your profile.' : 'Hourly packages hidden from your profile.'}
          </span>
        </span>
        <span
          className="relative inline-flex items-center shrink-0 rounded-full transition"
          style={{
            width: 40, height: 22,
            background: enabled ? '#0A0A0A' : '#D4D4D8',
          }}
        >
          <span
            className="absolute top-0.5 rounded-full bg-white shadow transition-all"
            style={{
              width: 18, height: 18,
              left: enabled ? 20 : 2,
            }}
          />
          {busyToggle && <Loader2 size={10} className="animate-spin absolute left-1/2 -translate-x-1/2 text-white/80" />}
        </span>
      </button>

      {/* Body — dimmed when disabled */}
      <div className={enabled ? '' : 'opacity-50 pointer-events-none'}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <IdrInput
            label="3-hour block"
            placeholder={formatIdr(defaults.tier_3h)}
            value={r3h}
            onChange={setR3h}
            onBlur={() => commitRate('hourly_3h_rate_idr', r3h, row.hourly_3h_rate_idr)}
          />
          <IdrInput
            label="6-hour block"
            placeholder={formatIdr(defaults.tier_6h)}
            value={r6h}
            onChange={setR6h}
            onBlur={() => commitRate('hourly_6h_rate_idr', r6h, row.hourly_6h_rate_idr)}
          />
          <IdrInput
            label="8-hour block"
            placeholder={formatIdr(defaults.tier_8h)}
            value={r8h}
            onChange={setR8h}
            onBlur={() => commitRate('hourly_8h_rate_idr', r8h, row.hourly_8h_rate_idr)}
          />
        </div>

        <div className="pt-1 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={resetDefaults}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-extrabold uppercase tracking-wider bg-[#FACC15] hover:bg-[#EAB308] text-[#0A0A0A] border border-[#EAB308] transition min-h-[44px] active:scale-[0.98]"
          >
            Reset to suggested defaults
          </button>
          <span className="text-[13px] font-bold text-black/55">
            Reset to {tierLabel}
          </span>
        </div>

        <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 flex items-start gap-2">
          <Lock size={14} className="shrink-0 mt-0.5 text-black/50" strokeWidth={2.5} />
          <p className="text-[13px] text-black/65 leading-snug">
            Petrol policy: customer pays separately at SPBU. We don&apos;t store fuel data.
          </p>
        </div>
      </div>
    </Card>
  )
}

// ============================================================================
// 1. Services offered — chip toggles, instant save
// ============================================================================
function OfferingsCard({
  offerings, onSave,
}: {
  offerings: ServiceOfferingId[]
  onSave:    (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const [selected, setSelected] = useState<ServiceOfferingId[]>(offerings)
  const [busy, setBusy] = useState<ServiceOfferingId | null>(null)

  useEffect(() => { setSelected(offerings) }, [offerings])

  async function toggle(id: ServiceOfferingId) {
    if (busy) return
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id]
    setBusy(id)
    setSelected(next) // optimistic
    const ok = await onSave({ service_offerings: next })
    if (!ok) setSelected(selected) // rollback
    setBusy(null)
  }

  return (
    <Card
      title="What services do you offer?"
      hint="Tick every trip type you do. Customers see these badges on your profile."
      icon={<Layers size={18} />}
    >
      <div className="flex flex-wrap gap-1.5">
        {SERVICE_OFFERINGS.map((s) => {
          const on  = selected.includes(s.id)
          const sp  = busy === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              disabled={!!busy}
              aria-pressed={on}
              className="text-[13px] font-extrabold px-3.5 py-2 rounded-full border transition min-h-[44px] active:scale-[0.98] disabled:opacity-70 inline-flex items-center gap-1.5"
              style={{
                background: on ? '#FACC15' : '#F9FAFB',
                color:      on ? '#0A0A0A' : 'rgba(10,10,10,0.80)',
                borderColor: on ? '#EAB308' : '#E4E4E7',
                boxShadow: on ? '0 2px 8px rgba(250,204,21,0.30)' : 'none',
              }}
            >
              {sp && <Loader2 size={12} className="animate-spin" />}
              {s.label}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ============================================================================
// 2. Per-km transport pricing — save on blur
// ============================================================================
function PricingCard({
  row, onSave,
}: {
  row:    ServicesRow
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const [perKm,   setPerKm]   = useState<string>(formatIdr(row.price_per_km))
  const [minFee,  setMinFee]  = useState<string>(formatIdr(row.min_fee))

  // Keep local in sync if row changes (e.g. another tab saved).
  useEffect(() => { setPerKm(formatIdr(row.price_per_km)) },   [row.price_per_km])
  useEffect(() => { setMinFee(formatIdr(row.min_fee)) },        [row.min_fee])

  async function commit(field: 'price_per_km' | 'min_fee', raw: string, current: number | null) {
    const next = parseIdr(raw)
    if (next === current) return
    await onSave({ [field]: next })
  }

  return (
    <Card
      title="Per-km transport rates"
      hint="YOUR published rates for point-to-point trips. CityDrivers shows them as-is — we never compute fares."
      icon={<DollarSign size={18} />}
    >
      <div className="grid grid-cols-2 gap-2">
        <IdrInput
          label="Price per km"
          placeholder="6.000"
          value={perKm}
          onChange={setPerKm}
          onBlur={() => commit('price_per_km', perKm, row.price_per_km)}
        />
        <IdrInput
          label="Minimum fee"
          placeholder="35.000"
          value={minFee}
          onChange={setMinFee}
          onBlur={() => commit('min_fee', minFee, row.min_fee)}
        />
      </div>
    </Card>
  )
}

// ============================================================================
// 2b. Pitstop fee — one flat fee per booking, default 0 = free
// ============================================================================
function PitstopFeeCard({
  row, onSave,
}: {
  row:    ServicesRow
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const initial = row.pitstop_fee ?? 0
  const [pitstop, setPitstop] = useState<string>(initial > 0 ? formatIdr(initial) : '')

  // Keep local in sync if the row changes (e.g. another tab saved).
  useEffect(() => {
    const v = row.pitstop_fee ?? 0
    setPitstop(v > 0 ? formatIdr(v) : '')
  }, [row.pitstop_fee])

  async function commit() {
    // Reject anything that isn't a non-negative integer; parseIdr already
    // strips non-digits, so this guards against empty + invalid input.
    const digits = pitstop.replace(/\D/g, '')
    const next = digits ? Number(digits) : 0
    if (!Number.isFinite(next) || next < 0) {
      setPitstop((row.pitstop_fee ?? 0) > 0 ? formatIdr(row.pitstop_fee) : '')
      return
    }
    if (next === (row.pitstop_fee ?? 0)) return
    await onSave({ pitstop_fee: next })
  }

  return (
    <Card
      title="Pitstop fee"
      hint="What you charge when the customer asks for a quick stop along the way (ATM, buy something, restroom). One single price covers any number of stops the customer adds. Default Rp 0 = free."
      icon={<MapPin size={18} />}
    >
      <IdrInput
        label="Pitstop fee per booking"
        placeholder="0"
        value={pitstop}
        onChange={setPitstop}
        onBlur={commit}
      />
      <p className="text-[11.5px] italic text-black/55 leading-snug">
        Per booking, not per stop — even if the customer adds 5 stops, this fee applies once.
      </p>
    </Card>
  )
}

// ============================================================================
// 3. Daily rental block — only mounts when 'daily_hire' is in offerings
// ============================================================================
function RentalCard({
  row, onSave,
}: {
  row:    ServicesRow
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const initialType: 'self_drive' | 'with_driver' | 'both' = row.rental_type ?? 'both'
  const [rType,   setRType]   = useState<'self_drive' | 'with_driver' | 'both'>(initialType)
  const [daily,   setDaily]   = useState<string>(formatIdr(row.rental_daily_rate_idr))
  const [weekly,  setWeekly]  = useState<string>(formatIdr(row.rental_weekly_rate_idr))
  const [monthly, setMonthly] = useState<string>(formatIdr(row.rental_monthly_rate_idr))
  const [minDays, setMinDays] = useState<string>(row.rental_min_days != null ? String(row.rental_min_days) : '1')

  useEffect(() => { setRType(row.rental_type ?? 'both') },                 [row.rental_type])
  useEffect(() => { setDaily(formatIdr(row.rental_daily_rate_idr)) },      [row.rental_daily_rate_idr])
  useEffect(() => { setWeekly(formatIdr(row.rental_weekly_rate_idr)) },    [row.rental_weekly_rate_idr])
  useEffect(() => { setMonthly(formatIdr(row.rental_monthly_rate_idr)) },  [row.rental_monthly_rate_idr])
  useEffect(() => { setMinDays(row.rental_min_days != null ? String(row.rental_min_days) : '1') }, [row.rental_min_days])

  async function commitType(next: 'self_drive' | 'with_driver' | 'both') {
    if (next === rType) return
    setRType(next)
    await onSave({ rental_type: next })
  }

  async function commitRate(field: 'rental_daily_rate_idr' | 'rental_weekly_rate_idr' | 'rental_monthly_rate_idr', raw: string, current: number | null) {
    const next = parseIdr(raw)
    if (next === current) return
    await onSave({ [field]: next })
  }

  async function commitMinDays() {
    const n = Math.max(1, Number(minDays) || 1)
    if (n === (row.rental_min_days ?? 1)) return
    await onSave({ rental_min_days: n })
  }

  return (
    <Card
      title="Daily rental rates"
      hint="You enabled Daily Hire above. Set your rental rates — customers agree terms directly with you."
      icon={<Car size={18} />}
    >
      {/* Rental type picker */}
      <div>
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 mb-1.5">Rental type</div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'with_driver', label: 'With driver' },
            { id: 'self_drive',  label: 'Self-drive' },
            { id: 'both',        label: 'Both' },
          ] as const).map((opt) => {
            const on = rType === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => commitType(opt.id)}
                aria-pressed={on}
                className="rounded-xl px-3 py-3 text-[13px] font-extrabold transition border min-h-[44px] active:scale-[0.98]"
                style={{
                  background:  on ? '#FACC15' : '#F9FAFB',
                  borderColor: on ? '#EAB308' : '#E4E4E7',
                  color:       on ? '#0A0A0A' : 'rgba(10,10,10,0.80)',
                  boxShadow:   on ? '0 2px 8px rgba(250,204,21,0.30)' : 'none',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <IdrInput
          label="Daily rate"
          placeholder="600.000"
          value={daily}
          onChange={setDaily}
          onBlur={() => commitRate('rental_daily_rate_idr', daily, row.rental_daily_rate_idr)}
        />
        <IdrInput
          label="Weekly (opt)"
          placeholder="3.500.000"
          value={weekly}
          onChange={setWeekly}
          onBlur={() => commitRate('rental_weekly_rate_idr', weekly, row.rental_weekly_rate_idr)}
        />
        <IdrInput
          label="Monthly (opt)"
          placeholder="12.000.000"
          value={monthly}
          onChange={setMonthly}
          onBlur={() => commitRate('rental_monthly_rate_idr', monthly, row.rental_monthly_rate_idr)}
        />
      </div>

      <label className="block">
        <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 mb-1 inline-block">
          Minimum rental (days)
        </span>
        <input
          type="number"
          min={1}
          value={minDays}
          onChange={(e) => setMinDays(e.target.value)}
          onBlur={commitMinDays}
          className={inputCls}
          placeholder="1"
        />
      </label>
    </Card>
  )
}

// ============================================================================
// 4. Parcel B2B contracts — opt-in + 5-tier volume rate card
// ----------------------------------------------------------------------------
// Drivers opt into bulk parcel jobs (UMKM / Shopee seller contracts). When
// enabled, we surface them on /cityriders/parcel under car drivers and
// display their self-published 5-tier volume rate card + daily capacity +
// service zone + outer-zone surcharge.
// ============================================================================
function ParcelB2BCard({
  row, onSave,
}: {
  row:    ServicesRow
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const enabled = !!row.parcel_b2b_enabled
  const [busyToggle, setBusyToggle] = useState(false)

  const tiers: ParcelRateTiers = parseRateTiers(row.parcel_rate_tiers, 'car')
  const carDefaults = defaultsFor('car')

  // Local state for tier IDR inputs (formatted strings).
  const [t1_5,   setT1_5]   = useState<string>(formatIdr(tiers.tier_1_5))
  const [t6_20,  setT6_20]  = useState<string>(formatIdr(tiers.tier_6_20))
  const [t21_50, setT21_50] = useState<string>(formatIdr(tiers.tier_21_50))
  const [t51_100,setT51_100]= useState<string>(formatIdr(tiers.tier_51_100))
  const [capacity, setCapacity] = useState<string>(row.parcel_daily_capacity != null ? String(row.parcel_daily_capacity) : '')
  const [zone, setZone]         = useState<string>(row.parcel_service_zone ?? '')
  const [surcharge, setSurcharge] = useState<string>(formatIdr(row.parcel_outer_zone_surcharge))

  // Keep local in sync if row changes (other tab saved, defaults reset, etc.).
  useEffect(() => { setT1_5(formatIdr(tiers.tier_1_5)) },     [tiers.tier_1_5])
  useEffect(() => { setT6_20(formatIdr(tiers.tier_6_20)) },   [tiers.tier_6_20])
  useEffect(() => { setT21_50(formatIdr(tiers.tier_21_50)) }, [tiers.tier_21_50])
  useEffect(() => { setT51_100(formatIdr(tiers.tier_51_100)) },[tiers.tier_51_100])
  useEffect(() => { setCapacity(row.parcel_daily_capacity != null ? String(row.parcel_daily_capacity) : '') }, [row.parcel_daily_capacity])
  useEffect(() => { setZone(row.parcel_service_zone ?? '') }, [row.parcel_service_zone])
  useEffect(() => { setSurcharge(formatIdr(row.parcel_outer_zone_surcharge)) }, [row.parcel_outer_zone_surcharge])

  async function toggleEnabled() {
    if (busyToggle) return
    setBusyToggle(true)
    await onSave({ parcel_b2b_enabled: !enabled })
    setBusyToggle(false)
  }

  async function commitTier(key: ParcelRateTierKey, raw: string) {
    const next = parseIdr(raw)
    if (next == null || next <= 0) return
    if (next === tiers[key]) return
    const merged: ParcelRateTiers = { ...tiers, [key]: next }
    await onSave({ parcel_rate_tiers: merged })
  }

  async function commitCapacity() {
    const n = Number(capacity)
    if (!Number.isFinite(n) || n <= 0) return
    const clamped = Math.max(1, Math.min(500, Math.round(n)))
    if (clamped === (row.parcel_daily_capacity ?? null)) return
    await onSave({ parcel_daily_capacity: clamped })
  }

  async function commitZone() {
    const next = zone.trim() || null
    if (next === (row.parcel_service_zone ?? null)) return
    await onSave({ parcel_service_zone: next })
  }

  async function commitSurcharge() {
    const next = parseIdr(surcharge)
    if (next === (row.parcel_outer_zone_surcharge ?? null)) return
    await onSave({ parcel_outer_zone_surcharge: next })
  }

  async function resetDefaults() {
    if (!confirm('Reset to suggested defaults? This overwrites your current tier rates, daily capacity, and outer-zone surcharge.')) return
    await onSave({
      parcel_rate_tiers:           carDefaults.tiers,
      parcel_daily_capacity:       carDefaults.capacity,
      parcel_outer_zone_surcharge: carDefaults.surcharge,
    })
  }

  return (
    <Card
      title="Parcel B2B contracts"
      hint="Opt in to bulk parcel jobs from UMKM and Shopee sellers. Customers see your published tier card and contact you directly on WhatsApp — 0% commission."
      icon={<Package size={18} />}
    >
      {/* Master toggle */}
      <button
        type="button"
        onClick={toggleEnabled}
        disabled={busyToggle}
        aria-pressed={enabled}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition active:scale-[0.99] disabled:opacity-70 min-h-[44px]"
        style={{
          background:  enabled ? '#FACC15' : '#F9FAFB',
          borderColor: enabled ? '#EAB308' : '#E4E4E7',
          boxShadow:   enabled ? '0 2px 8px rgba(250,204,21,0.30)' : 'none',
        }}
      >
        <span className="text-left">
          <span className="block text-[13px] font-extrabold text-[#0A0A0A]">Accept bulk parcel jobs</span>
          <span className="block text-[11.5px] font-bold text-black/60 mt-0.5">
            {enabled ? 'Visible to customers on the parcel hub.' : 'Hidden from the parcel hub.'}
          </span>
        </span>
        <span
          className="relative inline-flex items-center shrink-0 rounded-full transition"
          style={{
            width: 40, height: 22,
            background: enabled ? '#0A0A0A' : '#D4D4D8',
          }}
        >
          <span
            className="absolute top-0.5 rounded-full bg-white shadow transition-all"
            style={{
              width: 18, height: 18,
              left: enabled ? 20 : 2,
            }}
          />
          {busyToggle && <Loader2 size={10} className="animate-spin absolute left-1/2 -translate-x-1/2 text-white/80" />}
        </span>
      </button>

      {!enabled && (
        <p className="text-[12px] text-black/60 leading-snug">
          When enabled, customers find you at <strong>citydrivers.id/parcel</strong> under car drivers.
        </p>
      )}

      {enabled && (
        <>
          {/* Tier inputs */}
          <div className="space-y-2">
            <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">
              Per-parcel rates by volume
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PARCEL_TIER_DEFINITIONS.map((def) => {
                const valueState = {
                  tier_1_5:    [t1_5,    setT1_5]    as const,
                  tier_6_20:   [t6_20,   setT6_20]   as const,
                  tier_21_50:  [t21_50,  setT21_50]  as const,
                  tier_51_100: [t51_100, setT51_100] as const,
                }[def.key]
                const [val, setVal] = valueState
                return (
                  <IdrInput
                    key={def.key}
                    label={`${def.label} — ${def.range}`}
                    placeholder={formatIdr(carDefaults.tiers[def.key])}
                    value={val}
                    onChange={setVal}
                    onBlur={() => commitTier(def.key, val)}
                  />
                )
              })}
            </div>
            <p className="text-[11.5px] text-black/55 leading-snug">
              <strong>100+ parcels/day:</strong> negotiate direct on WhatsApp — no fixed rate.
            </p>
          </div>

          {/* Daily capacity */}
          <label className="block">
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 mb-1 inline-block">
              Daily capacity (parcels)
            </span>
            <input
              type="number"
              min={1}
              max={500}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              onBlur={commitCapacity}
              className={inputCls}
              placeholder={String(carDefaults.capacity)}
            />
            <p className="text-[11.5px] text-black/55 leading-snug mt-1">
              Maximum parcels per day you commit to handling.
            </p>
          </label>

          {/* Service zone */}
          <label className="block">
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 mb-1 inline-block">
              Service zone
            </span>
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              onBlur={commitZone}
              className={inputCls}
              placeholder="e.g. All Sleman + Bantul"
            />
            <p className="text-[11.5px] text-black/55 leading-snug mt-1">
              Free text — where you regularly deliver without a surcharge.
            </p>
          </label>

          {/* Outer-zone surcharge */}
          <IdrInput
            label="Outer-zone surcharge (per parcel)"
            placeholder={formatIdr(carDefaults.surcharge)}
            value={surcharge}
            onChange={setSurcharge}
            onBlur={commitSurcharge}
            hint="Extra per parcel for deliveries outside your stated service zone."
          />

          {/* Reset defaults */}
          <div className="pt-1">
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[#854D0E] hover:text-[#0A0A0A] uppercase tracking-wider min-h-[44px]"
            >
              Reset to suggested defaults
            </button>
          </div>
        </>
      )}
    </Card>
  )
}

// ============================================================================
// Building blocks
// ============================================================================
function IdrInput({
  label, placeholder, value, onChange, onBlur, hint,
}: {
  label:       string
  placeholder: string
  value:       string
  onChange:    (v: string) => void
  onBlur:      () => void
  hint?:       string
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 mb-1 inline-block">
        {label}
      </span>
      <div className="relative">
        <span
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-[#EAB308] pointer-events-none select-none"
        >
          Rp
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '')
            onChange(raw ? Number(raw).toLocaleString('id-ID') : '')
          }}
          onBlur={onBlur}
          placeholder={placeholder}
          className={inputCls + ' pl-9 tabular-nums'}
        />
      </div>
      {hint && <p className="text-[11.5px] text-black/55 leading-snug mt-1">{hint}</p>}
    </label>
  )
}

function Card({
  title, hint, icon, children,
}: {
  title:    string
  hint?:    string
  icon?:    React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3 mb-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
            style={{ background: '#FEF9C3', color: '#854D0E' }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-black text-[#0A0A0A] leading-tight">{title}</h2>
          {hint && <p className="text-[12px] text-black/65 leading-snug mt-1">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Skeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-32 animate-pulse">
      <div className="h-4 w-32 rounded bg-gray-200 mb-3" />
      <div className="rounded-3xl bg-gray-100 h-24 mb-4" />
      <div className="rounded-3xl bg-gray-100 h-44 mb-4" />
      <div className="rounded-3xl bg-gray-100 h-44 mb-4" />
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      {children}
    </main>
  )
}

function FullMsg({
  children, cta,
}: {
  children: React.ReactNode
  cta?:     { href: string; label: string }
}) {
  return (
    <Shell>
      <div className="max-w-md mx-auto px-4 pt-24 text-center">
        <div className="text-[14px] font-bold text-black/70 leading-relaxed">{children}</div>
        {cta && (
          <Link
            href={cta.href}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[13px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            {cta.label}
          </Link>
        )}
      </div>
    </Shell>
  )
}

const inputCls =
  'w-full rounded-xl bg-white border border-gray-300 px-3 py-3 text-[14px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#EAB308] focus:ring-2 focus:ring-yellow-100 min-h-[44px]'
