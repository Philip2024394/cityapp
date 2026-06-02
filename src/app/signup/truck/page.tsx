'use client'
// ============================================================================
// /signup/truck — Multi-step sign-up flow for new TRUCK / PICKUP drivers.
// ----------------------------------------------------------------------------
// CityDrivers is a SOFTWARE DIRECTORY under PM 12/2019, NOT a transport operator.
// This page collects the data needed to create a `drivers` row with
// vehicle_type='truck'. After signup the driver lands on /dashboard/truck
// where the QRIS pay modal handles the Rp 38.000/month subscription that
// flips their listing live in the /rentals/truck marketplace (per-km truck
// booking is a niche use case in this market, so trucks live on /rentals/truck
// only — no live truck marketplace exists).
//
// Steps:
//   1. Phone OTP            (Indonesian +62, mirrors /signup)
//   2. Basic profile        (business name, full name, WA, city, area, bio, radius)
//   3. Vehicle details      (truck class, make/model, year, color, plate, seats, photos)
//   4. Published rates      (price_per_km + min_fee + OPTIONAL rental section)
//   5. Payment methods      (cash / QR / bank transfer)
//   6. Review + submit      (read-only summary, SIM B1 / B1 Umum + STNK confirmation)
//
// Submit calls POST /api/signup/truck which writes the profile + drivers row
// server-side using the service role.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Phone, KeyRound, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import CityDriversBrandStrip from '@/components/dashboard/CityDriversBrandStrip'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { INDONESIAN_CITIES } from '@/data/indonesianCities'
import { ANTI_SPAM_MIN_FEE } from '@/lib/pricing/zones'
import { loadDraft, saveDraft, clearDraft, SIGNUP_DRAFT_KEYS } from '@/lib/signup/drafts'

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const TOTAL_STEPS = 6
const STEP_LABELS = ['Phone', 'Profile', 'Vehicle', 'Rates', 'Payment', 'Review'] as const

const CURRENT_YEAR = new Date().getFullYear()
// Truck cab seat counts — typical pickup / engkel cab fits 2–3 people including driver.
const SEAT_OPTIONS = [2, 3] as const
const RADIUS_OPTIONS = [5, 10, 20, 50] as const

// Truck class dropdown — the most common pindahan / distribusi vehicles in
// the Yogya/Bali market. Maps to `vehicle_model` field (free-text fallback
// also supported via the model input below).
const TRUCK_CLASS_OPTIONS = [
  'Pickup Bak',
  'Pickup Box',
  'Blind Van',
  'Engkel Bak',
  'Engkel Box',
] as const

// 2026-06 audit fix: dropped the hardcoded 12-city list (which excluded
// Papua, Kalimantan, most Sulawesi, most Sumatra, Maluku) in favour of
// the shared INDONESIAN_CITIES typeahead. Driver can pick a suggestion
// OR free-text any city in Indonesia — no province goes unreachable.
const CITY_DATALIST_ID = 'signup-truck-cities'

// Rental type dropdown values — mirror migration 0097 schema check constraint.
const RENTAL_TYPE_OPTIONS = [
  { value: 'with_driver', label: 'With driver (+ helper typical)' },
  { value: 'self_drive',  label: 'Self-drive (lepas kunci)' },
  { value: 'both',        label: 'Both — customer chooses' },
] as const
type RentalType = typeof RENTAL_TYPE_OPTIONS[number]['value']

// ----------------------------------------------------------------------------
// Phone helpers — mirror /signup
// ----------------------------------------------------------------------------
function normalizePhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('62')) return digits
  return null
}

// ============================================================================
// Page
// ============================================================================
export default function SignupTruckPage() {
  const router = useRouter()
  const [step, setStep] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)

  // ── Step 1: Phone + password (no OTP, 2026-06 simplified) ──────────────
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [authPending, setAuthPending] = useState(false)

  // ── Step 2: Basic profile ───────────────────────────────────────────────
  const [businessName, setBusinessName] = useState('')
  const [fullName, setFullName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState<string>('Yogyakarta')
  const [area, setArea] = useState('')
  const [bio, setBio] = useState('')
  const [radius, setRadius] = useState<number>(20)

  // ── Step 3: Vehicle ─────────────────────────────────────────────────────
  const [vTruckClass, setVTruckClass] = useState<typeof TRUCK_CLASS_OPTIONS[number]>('Pickup Bak')
  const [vMake, setVMake] = useState('')
  const [vModel, setVModel] = useState('')
  const [vYear, setVYear] = useState<string>('')
  const [vColor, setVColor] = useState('')
  const [vPlate, setVPlate] = useState('')
  // Default seats = 3 — standard pickup cab fits driver + helper + 1.
  const [vSeats, setVSeats] = useState<number>(3)
  const [vPhotos, setVPhotos] = useState<string[]>([''])

  // ── Step 4: Pricing ─────────────────────────────────────────────────────
  // Truck defaults: Rp 6,000/km + Rp 60,000 min fee (one-way pickup norm).
  // NOTE: Trucks are CHARTER vehicles, not ride-hailing. KP 564/2022
  // (ojek) and PM 118/2018 (taxi) do not set per-zone minimums for
  // trucks/jeeps/minibuses. The hardcoded defaults below are charter-
  // market sampling, NOT zone-aware. Drivers self-publish on the
  // dashboard editor (where the placeholder shows "Charter ref").
  const [pricePerKm, setPricePerKm] = useState<number>(6000)
  const [minFee, setMinFee] = useState<number>(60000)
  const [pitstopFee, setPitstopFee] = useState<number>(0)
  // ── Step 4: Optional rental ─────────────────────────────────────────────
  // Trucks are often rented by the day for moving / distribution. Driver
  // can self-publish daily/weekly rates immediately at signup so the
  // /rentals/truck listing surfaces with pricing on day one.
  const [offersRental, setOffersRental] = useState(false)
  const [rentalType, setRentalType] = useState<RentalType>('with_driver')
  const [rentalDaily, setRentalDaily] = useState<number>(600000)
  const [rentalWeekly, setRentalWeekly] = useState<number>(0)
  const [rentalMinDays, setRentalMinDays] = useState<number>(1)

  // ── Step 5: Payment methods ─────────────────────────────────────────────
  const [acceptsCash, setAcceptsCash] = useState(true)
  const [acceptsQr, setAcceptsQr] = useState(false)
  const [acceptsTransfer, setAcceptsTransfer] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [transferDetails, setTransferDetails] = useState('')

  // ── Step 6: Compliance confirmation + submit ────────────────────────────
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ── Draft persistence (audit M2) — Step 1 NEVER persisted ─────────────
  type TruckSignupDraft = {
    step?: number
    businessName?: string; fullName?: string; whatsapp?: string
    city?: string; area?: string; bio?: string; radius?: number
    vTruckClass?: typeof TRUCK_CLASS_OPTIONS[number]
    vMake?: string; vModel?: string; vYear?: string; vColor?: string
    vPlate?: string; vSeats?: number; vPhotos?: string[]
    pricePerKm?: number; minFee?: number; pitstopFee?: number
    offersRental?: boolean; rentalType?: RentalType
    rentalDaily?: number; rentalWeekly?: number; rentalMinDays?: number
    acceptsCash?: boolean; acceptsQr?: boolean; acceptsTransfer?: boolean
    qrUrl?: string; transferDetails?: string; agree?: boolean
  }
  const [draftHydrated, setDraftHydrated] = useState(false)

  useEffect(() => {
    if (draftHydrated) return
    const d = loadDraft<TruckSignupDraft>(SIGNUP_DRAFT_KEYS.truck)
    if (d) {
      if (typeof d.step === 'number' && d.step >= 2 && d.step <= 6) setStep(d.step)
      if (typeof d.businessName === 'string') setBusinessName(d.businessName)
      if (typeof d.fullName === 'string') setFullName(d.fullName)
      if (typeof d.whatsapp === 'string') setWhatsapp(d.whatsapp)
      if (typeof d.city === 'string') setCity(d.city)
      if (typeof d.area === 'string') setArea(d.area)
      if (typeof d.bio === 'string') setBio(d.bio)
      if (typeof d.radius === 'number') setRadius(d.radius)
      if (typeof d.vTruckClass === 'string') setVTruckClass(d.vTruckClass)
      if (typeof d.vMake === 'string') setVMake(d.vMake)
      if (typeof d.vModel === 'string') setVModel(d.vModel)
      if (typeof d.vYear === 'string') setVYear(d.vYear)
      if (typeof d.vColor === 'string') setVColor(d.vColor)
      if (typeof d.vPlate === 'string') setVPlate(d.vPlate)
      if (typeof d.vSeats === 'number') setVSeats(d.vSeats)
      if (Array.isArray(d.vPhotos)) setVPhotos(d.vPhotos)
      if (typeof d.pricePerKm === 'number') setPricePerKm(d.pricePerKm)
      if (typeof d.minFee === 'number') setMinFee(d.minFee)
      if (typeof d.pitstopFee === 'number') setPitstopFee(d.pitstopFee)
      if (typeof d.offersRental === 'boolean') setOffersRental(d.offersRental)
      if (typeof d.rentalType === 'string') setRentalType(d.rentalType)
      if (typeof d.rentalDaily === 'number') setRentalDaily(d.rentalDaily)
      if (typeof d.rentalWeekly === 'number') setRentalWeekly(d.rentalWeekly)
      if (typeof d.rentalMinDays === 'number') setRentalMinDays(d.rentalMinDays)
      if (typeof d.acceptsCash === 'boolean') setAcceptsCash(d.acceptsCash)
      if (typeof d.acceptsQr === 'boolean') setAcceptsQr(d.acceptsQr)
      if (typeof d.acceptsTransfer === 'boolean') setAcceptsTransfer(d.acceptsTransfer)
      if (typeof d.qrUrl === 'string') setQrUrl(d.qrUrl)
      if (typeof d.transferDetails === 'string') setTransferDetails(d.transferDetails)
      if (typeof d.agree === 'boolean') setAgree(d.agree)
    }
    setDraftHydrated(true)
  }, [draftHydrated])

  useEffect(() => {
    if (!draftHydrated) return
    saveDraft<TruckSignupDraft>(SIGNUP_DRAFT_KEYS.truck, {
      step,
      businessName, fullName, whatsapp, city, area, bio, radius,
      vTruckClass, vMake, vModel, vYear, vColor, vPlate, vSeats, vPhotos,
      pricePerKm, minFee, pitstopFee,
      offersRental, rentalType, rentalDaily, rentalWeekly, rentalMinDays,
      acceptsCash, acceptsQr, acceptsTransfer, qrUrl, transferDetails, agree,
    })
  })

  // ── Default whatsapp from the auth phone after step 1 ──────────────────
  useEffect(() => {
    if (step === 2 && !whatsapp && phone) setWhatsapp(phone)
  }, [step, whatsapp, phone])

  // ──────────────────────────────────────────────────────────────────────
  // Step 1 — phone + password (no OTP, 2026-06)
  // ──────────────────────────────────────────────────────────────────────
  async function signupWithPassword(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    const cleaned = normalizePhone(phone)
    if (!cleaned) {
      setError('Please enter a valid Indonesian mobile number (e.g. 6281234567890)')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setError('Auth not configured. Add Supabase keys to .env.local.')
      return
    }
    setAuthPending(true)
    const { error: err } = await supabase.auth.signUp({
      phone: cleaned,
      password,
      options: { data: { role: 'driver', vehicle_type: 'truck' } },
    })
    setAuthPending(false)
    if (err) { setError(humanAuthError(err.message)); return }
    setPhone(cleaned)
    setStep(2)
  }

  // ──────────────────────────────────────────────────────────────────────
  // Step validation gates (drive Next button enablement)
  // ──────────────────────────────────────────────────────────────────────
  const stepValid = useMemo(() => {
    switch (step) {
      case 1: return normalizePhone(phone) !== null && password.length >= 6
      case 2:
        return (
          businessName.trim().length >= 2 &&
          fullName.trim().length >= 2 &&
          normalizePhone(whatsapp) !== null &&
          city.trim().length > 0 &&
          area.trim().length > 0 &&
          bio.trim().length <= 280
        )
      case 3: {
        const yr = Number(vYear)
        return (
          vMake.trim().length > 0 &&
          vModel.trim().length > 0 &&
          Number.isFinite(yr) && yr >= 1990 && yr <= CURRENT_YEAR &&
          vColor.trim().length > 0 &&
          vPlate.trim().length >= 4 &&
          SEAT_OPTIONS.includes(vSeats as typeof SEAT_OPTIONS[number])
        )
      }
      case 4: {
        const baseOk = (
          Number.isFinite(pricePerKm) && pricePerKm >= 1000 &&
          Number.isFinite(minFee) && minFee >= ANTI_SPAM_MIN_FEE &&
          Number.isFinite(pitstopFee) && pitstopFee >= 0
        )
        if (!baseOk) return false
        if (!offersRental) return true
        // Rental section gates — daily rate required, weekly optional, min days >=1.
        if (!Number.isFinite(rentalDaily) || rentalDaily <= 0) return false
        if (rentalWeekly !== 0 && (!Number.isFinite(rentalWeekly) || rentalWeekly < 0)) return false
        if (!Number.isFinite(rentalMinDays) || rentalMinDays < 1) return false
        return true
      }
      case 5: {
        if (!acceptsCash && !acceptsQr && !acceptsTransfer) return false
        if (acceptsQr && !qrUrl.trim()) return false
        if (acceptsTransfer && !transferDetails.trim()) return false
        return true
      }
      case 6: return agree
      default: return false
    }
  }, [
    step, businessName, fullName, whatsapp, city, area, bio,
    vMake, vModel, vYear, vColor, vPlate, vSeats,
    pricePerKm, minFee, pitstopFee,
    offersRental, rentalDaily, rentalWeekly, rentalMinDays,
    acceptsCash, acceptsQr, acceptsTransfer, qrUrl, transferDetails,
    agree,
  ])

  // ──────────────────────────────────────────────────────────────────────
  // Final submit — POST /api/signup/truck
  // ──────────────────────────────────────────────────────────────────────
  async function submit() {
    setError(null)
    setSubmitting(true)
    try {
      const normalizedWa = normalizePhone(whatsapp) || phone
      const photos = vPhotos.map((u) => u.trim()).filter((u) => u.length > 0)
      const r = await fetch('/api/signup/truck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          full_name: fullName,
          bio,
          whatsapp_e164: normalizedWa,
          city,
          area,
          service_zone_radius_km: radius,
          truck_class: vTruckClass,
          vehicle_make: vMake,
          vehicle_model: vModel,
          vehicle_year: Number(vYear),
          vehicle_color: vColor,
          vehicle_plate: vPlate,
          vehicle_seats: vSeats,
          vehicle_photos: photos,
          price_per_km: pricePerKm,
          min_fee: minFee,
          pitstop_fee: pitstopFee,
          // Rental fields — only sent when the driver opted in.
          offers_rental: offersRental,
          rental_type:            offersRental ? rentalType    : null,
          rental_daily_rate_idr:  offersRental ? rentalDaily   : null,
          rental_weekly_rate_idr: offersRental && rentalWeekly > 0 ? rentalWeekly : null,
          rental_min_days:        offersRental ? rentalMinDays : 1,
          accepts_cash: acceptsCash,
          accepts_qr: acceptsQr,
          accepts_transfer: acceptsTransfer,
          qr_payment_url: qrUrl,
          transfer_details: transferDetails,
        }),
      })
      const json = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; redirectTo?: string }
      if (!r.ok || !json.ok) {
        setError(json.error || `Sign-up failed (${r.status})`)
        setSubmitting(false)
        return
      }
      clearDraft(SIGNUP_DRAFT_KEYS.truck)
      router.push(json.redirectTo || '/dashboard/truck')
      router.refresh()
    } catch (e) {
      setError((e as Error).message || 'Network error')
      setSubmitting(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-[100dvh] bg-white text-black">
      <CityDriversBrandStrip subtitle="Sign up — Truck driver" />
      <AppNav />
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <ProgressBar step={step} total={TOTAL_STEPS} />
        <div className="text-[13px] font-extrabold uppercase tracking-wider text-black/50 mt-3 mb-2">
          Step {step} of {TOTAL_STEPS} · {STEP_LABELS[step - 1]}
        </div>

        {step >= 2 && (
          <button
            type="button"
            onClick={() => { setError(null); setStep(Math.max(1, step - 1)) }}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-black/60 hover:text-black mb-3 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
          {/* ── Step 1: Phone OTP ─────────────────────────────────────── */}
          {step === 1 && (
            <>
              <Header
                title="Sign up as a Truck Driver"
                sub="List your truck. Customers find you. You agree the fare and trip directly."
              />
              <form className="space-y-3" onSubmit={signupWithPassword}>
                <Field label="Indonesian mobile number" hint="Start with 62, e.g. 6281234567890" icon={<Phone className="w-4 h-4 text-black/40" />}>
                  <input
                    className={inputCls + ' pl-11 font-mono'}
                    type="tel"
                    inputMode="numeric"
                    placeholder="6281234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </Field>
                <Field label="Password" hint="At least 6 characters. Write it down — no SMS code is sent." icon={<KeyRound className="w-4 h-4 text-black/40" />}>
                  <input
                    className={inputCls + ' pl-11 pr-11'}
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center text-black/40 hover:text-black"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </Field>
                <Compliance />
                {error && <ErrorBanner>{error}</ErrorBanner>}
                <PrimaryButton disabled={authPending}>
                  {authPending ? 'Creating account…' : 'Create account & continue'}
                  <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
              </form>
            </>
          )}

          {/* ── Step 2: Basic profile ─────────────────────────────────── */}
          {step === 2 && (
            <>
              <Header
                title="Your driver profile"
                sub="This is what customers see when they browse the /rentals/truck marketplace."
              />
              <Field label="Business name" hint="Customers see this in search and on your booking page.">
                <input
                  className={inputCls}
                  placeholder="Budi Truk Yogya"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Full name">
                <input
                  className={inputCls}
                  placeholder="Budi Santoso"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
              <Field label="WhatsApp number" hint="Where customers contact you. Defaults to your verified number — edit if different.">
                <input
                  className={inputCls + ' font-mono'}
                  type="tel"
                  inputMode="numeric"
                  placeholder="6281234567890"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="City" hint="Pick from the list or type any Indonesian city.">
                  <input
                    className={inputCls}
                    list={CITY_DATALIST_ID}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Pontianak, Sorong, Jayapura"
                    autoComplete="address-level2"
                  />
                  <datalist id={CITY_DATALIST_ID}>
                    {INDONESIAN_CITIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </Field>
                <Field label="Area">
                  <input
                    className={inputCls}
                    placeholder="Sleman, Ubud, etc."
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Short bio" hint={`${bio.length}/280 characters · Mention pindahan rumah, distribusi barang, jasa angkut so customers know what jobs you take.`}>
                <textarea
                  rows={3}
                  className={inputCls + ' resize-none'}
                  placeholder="6 years driving pickup — pindahan rumah, kos, distribusi UMKM around Yogya. Helper included."
                  value={bio}
                  maxLength={280}
                  onChange={(e) => setBio(e.target.value.slice(0, 280))}
                />
              </Field>
              <Field label={`Service zone radius · ${radius} km`} hint="How far you'll travel from your base for a one-way trip.">
                <div className="grid grid-cols-4 gap-2">
                  {RADIUS_OPTIONS.map((r) => (
                    <ToggleChip key={r} active={radius === r} onClick={() => setRadius(r)} label={`${r} km`} />
                  ))}
                </div>
              </Field>
              {error && <ErrorBanner>{error}</ErrorBanner>}
              <NextButton disabled={!stepValid} onClick={() => { setError(null); setStep(3) }} />
            </>
          )}

          {/* ── Step 3: Vehicle details ───────────────────────────────── */}
          {step === 3 && (
            <>
              <Header
                title="Your truck"
                sub="L300, Carry, Dutro, Engkel Box — for pindahan rumah, distribusi barang, jasa angkut."
              />
              <Field label="Truck class" hint="Pick the closest match. You can fine-tune the model below.">
                <select
                  className={inputCls + ' appearance-none'}
                  value={vTruckClass}
                  onChange={(e) => setVTruckClass(e.target.value as typeof TRUCK_CLASS_OPTIONS[number])}
                >
                  {TRUCK_CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Make">
                  <input className={inputCls} placeholder="Mitsubishi" value={vMake} onChange={(e) => setVMake(e.target.value)} />
                </Field>
                <Field label="Model">
                  <input
                    className={inputCls}
                    placeholder="L300 Pickup, Carry, Dutro 130HD, etc."
                    value={vModel}
                    onChange={(e) => setVModel(e.target.value)}
                  />
                </Field>
                <Field label="Year" hint={`1990–${CURRENT_YEAR}`}>
                  <input
                    type="number"
                    min={1990}
                    max={CURRENT_YEAR}
                    className={inputCls + ' font-mono'}
                    placeholder="2018"
                    value={vYear}
                    onChange={(e) => setVYear(e.target.value)}
                  />
                </Field>
                <Field label="Color">
                  <input className={inputCls} placeholder="White" value={vColor} onChange={(e) => setVColor(e.target.value)} />
                </Field>
                <Field label="Plate">
                  <input
                    className={inputCls + ' font-mono uppercase'}
                    placeholder="AB 1234 BD"
                    value={vPlate}
                    onChange={(e) => setVPlate(e.target.value.toUpperCase())}
                  />
                </Field>
                <Field label="Cab seats" hint="Driver + passengers in the truck cab (typically 2–3).">
                  <div className="grid grid-cols-2 gap-1">
                    {SEAT_OPTIONS.map((s) => (
                      <ToggleChip key={s} active={vSeats === s} onClick={() => setVSeats(s)} label={String(s)} />
                    ))}
                  </div>
                </Field>
              </div>
              <Field label="Vehicle photos" hint="Paste public image URLs (one per row). File upload coming soon.">
                <div className="space-y-2">
                  {vPhotos.map((u, i) => (
                    <div key={i} className="flex items-stretch gap-2">
                      <input
                        className={inputCls}
                        placeholder="https://…"
                        value={u}
                        onChange={(e) => {
                          const next = vPhotos.slice()
                          next[i] = e.target.value
                          setVPhotos(next)
                        }}
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
                          const next = vPhotos.filter((_, idx) => idx !== i)
                          setVPhotos(next.length ? next : [''])
                        }}
                        className="shrink-0 rounded-xl border border-gray-200 text-black/70 hover:bg-gray-50 px-3 text-[13px] font-bold min-h-[44px]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setVPhotos([...vPhotos, ''])}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[13px] font-extrabold text-black/80 hover:border-yellow-400 min-h-[44px]"
                  >
                    + Add another URL
                  </button>
                </div>
              </Field>
              {error && <ErrorBanner>{error}</ErrorBanner>}
              <NextButton disabled={!stepValid} onClick={() => { setError(null); setStep(4) }} />
            </>
          )}

          {/* ── Step 4: Pricing ───────────────────────────────────────── */}
          {step === 4 && (
            <>
              <Header
                title="Your published rates"
                sub="These are YOUR rates. CityDrivers displays them as-is — we never set or modify driver prices."
              />
              <ComplianceNote>
                CityDrivers is a software directory. Customers select drivers and agree fares directly. We never set, compute, or modify driver prices.
              </ComplianceNote>
              <Field label="Price per km (Rp)" hint="What you charge per kilometre on a one-way pickup.">
                <input
                  type="number"
                  min={1000}
                  className={inputCls + ' font-mono'}
                  placeholder="6000"
                  value={pricePerKm}
                  onChange={(e) => setPricePerKm(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              </Field>
              <Field label="Minimum fee (Rp)" hint="Used for very short pickup trips.">
                <input
                  type="number"
                  min={1}
                  className={inputCls + ' font-mono'}
                  placeholder="60000"
                  value={minFee}
                  onChange={(e) => setMinFee(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              </Field>
              <Field label="Pit-stop fee (Rp, optional)" hint="0 = pit stops free.">
                <input
                  type="number"
                  min={0}
                  className={inputCls + ' font-mono'}
                  placeholder="0"
                  value={pitstopFee}
                  onChange={(e) => setPitstopFee(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              </Field>

              {/* ── Optional: rental rates ────────────────────────────── */}
              <div className="pt-3 mt-2 border-t border-gray-200" />
              <div>
                <div className="text-[14px] font-extrabold text-black/85">Your rental rates · Self-published</div>
                <p className="text-[12px] text-black/55 mt-1 leading-snug">
                  Trucks are often hired by the day for moving / distribution. Publish your daily rate to appear in <strong className="text-black/80">/rentals/truck</strong>.
                </p>
              </div>
              <Toggle
                label="I offer my truck for daily rental"
                checked={offersRental}
                onChange={setOffersRental}
              />
              {offersRental && (
                <>
                  <Field label="Rental type" hint="Most truck rentals come with driver + helper.">
                    <select
                      className={inputCls + ' appearance-none'}
                      value={rentalType}
                      onChange={(e) => setRentalType(e.target.value as RentalType)}
                    >
                      {RENTAL_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Daily rate (Rp)" hint="Yogya pickup market norm: around Rp 600,000/day.">
                    <input
                      type="number"
                      min={1}
                      className={inputCls + ' font-mono'}
                      placeholder="600000"
                      value={rentalDaily}
                      onChange={(e) => setRentalDaily(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Weekly rate (Rp, optional)" hint="Leave 0 if you only quote daily.">
                    <input
                      type="number"
                      min={0}
                      className={inputCls + ' font-mono'}
                      placeholder="0"
                      value={rentalWeekly}
                      onChange={(e) => setRentalWeekly(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Minimum rental days" hint="At least 1 day.">
                    <input
                      type="number"
                      min={1}
                      className={inputCls + ' font-mono'}
                      placeholder="1"
                      value={rentalMinDays}
                      onChange={(e) => setRentalMinDays(e.target.value === '' ? 1 : Math.max(1, Number(e.target.value)))}
                    />
                  </Field>
                </>
              )}

              {error && <ErrorBanner>{error}</ErrorBanner>}
              <NextButton disabled={!stepValid} onClick={() => { setError(null); setStep(5) }} />
            </>
          )}

          {/* ── Step 5: Payment methods ──────────────────────────────── */}
          {step === 5 && (
            <>
              <Header
                title="Payment methods accepted"
                sub="Tell customers how you accept payment. CityDrivers never handles funds — payments go directly between you and the customer."
              />
              <Toggle label="Accept cash" checked={acceptsCash} onChange={setAcceptsCash} />
              <Toggle label="Accept QR (QRIS)" checked={acceptsQr} onChange={setAcceptsQr} />
              {acceptsQr && (
                <Field label="QR payment URL">
                  <input
                    className={inputCls}
                    placeholder="https://… (your QRIS image or link)"
                    value={qrUrl}
                    onChange={(e) => setQrUrl(e.target.value)}
                  />
                </Field>
              )}
              <Toggle label="Accept bank transfer" checked={acceptsTransfer} onChange={setAcceptsTransfer} />
              {acceptsTransfer && (
                <Field label="Bank transfer details">
                  <textarea
                    rows={3}
                    className={inputCls + ' resize-none'}
                    placeholder="BCA 1234567890 a/n Budi Santoso"
                    value={transferDetails}
                    onChange={(e) => setTransferDetails(e.target.value)}
                  />
                </Field>
              )}
              {error && <ErrorBanner>{error}</ErrorBanner>}
              <NextButton disabled={!stepValid} onClick={() => { setError(null); setStep(6) }} />
            </>
          )}

          {/* ── Step 6: Review + submit ──────────────────────────────── */}
          {step === 6 && (
            <>
              <Header
                title="Review your listing"
                sub="Check everything below before you create your listing."
              />
              <ReviewBlock title="Profile">
                <ReviewLine label="Business" value={businessName} />
                <ReviewLine label="Driver" value={fullName} />
                <ReviewLine label="Phone" value={`+${phone}`} />
                <ReviewLine label="WhatsApp" value={`+${normalizePhone(whatsapp) || whatsapp}`} />
                <ReviewLine label="City / area" value={`${city} · ${area}`} />
                <ReviewLine label="Service radius" value={`${radius} km`} />
                {bio && <ReviewLine label="Bio" value={bio} />}
              </ReviewBlock>
              <ReviewBlock title="Vehicle">
                <ReviewLine label="Class" value={vTruckClass} />
                <ReviewLine label="Make / model" value={`${vMake} ${vModel}`} />
                <ReviewLine label="Year" value={vYear} />
                <ReviewLine label="Color" value={vColor} />
                <ReviewLine label="Plate" value={vPlate} />
                <ReviewLine label="Cab seats" value={String(vSeats)} />
                <ReviewLine label="Photos" value={`${vPhotos.filter((u) => u.trim()).length} uploaded`} />
              </ReviewBlock>
              <ReviewBlock title="Your published rates">
                <ReviewLine label="Per km" value={`Rp ${pricePerKm.toLocaleString('id-ID')}`} />
                <ReviewLine label="Min fee" value={`Rp ${minFee.toLocaleString('id-ID')}`} />
                <ReviewLine label="Pit-stop" value={`Rp ${pitstopFee.toLocaleString('id-ID')}`} />
              </ReviewBlock>
              {offersRental && (
                <ReviewBlock title="Your rental rates · Self-published">
                  <ReviewLine
                    label="Type"
                    value={RENTAL_TYPE_OPTIONS.find((o) => o.value === rentalType)?.label ?? rentalType}
                  />
                  <ReviewLine label="Daily" value={`Rp ${rentalDaily.toLocaleString('id-ID')}`} />
                  <ReviewLine
                    label="Weekly"
                    value={rentalWeekly > 0 ? `Rp ${rentalWeekly.toLocaleString('id-ID')}` : '— (ask via WhatsApp)'}
                  />
                  <ReviewLine label="Min days" value={String(rentalMinDays)} />
                </ReviewBlock>
              )}
              <ReviewBlock title="Payment methods">
                <ReviewLine label="Cash" value={acceptsCash ? 'Yes' : 'No'} />
                <ReviewLine label="QR (QRIS)" value={acceptsQr ? (qrUrl ? 'Yes' : 'Yes (URL missing)') : 'No'} />
                <ReviewLine label="Bank transfer" value={acceptsTransfer ? (transferDetails ? 'Yes' : 'Yes (details missing)') : 'No'} />
              </ReviewBlock>

              <label className="flex items-start gap-2.5 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#FACC15] shrink-0 cursor-pointer"
                />
                <span className="text-[13px] text-black/75 leading-relaxed">
                  By creating my listing, I confirm I have a valid <strong className="text-black">SIM B1 / B1 Umum</strong> and <strong className="text-black">STNK</strong> for the vehicle above.
                  CityDrivers does not verify driving licences.
                  I am an independent driver business — not an employee or contractor of CityDrivers.
                </span>
              </label>

              <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2 text-[12px] text-yellow-900 leading-snug">
                Next step after sign-up: pay your <strong>Rp 38.000/month</strong> dashboard subscription via QRIS to flip your listing live in the public /rentals/truck marketplace.
              </div>

              {error && <ErrorBanner>{error}</ErrorBanner>}

              <button
                type="button"
                onClick={submit}
                disabled={!stepValid || submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 text-black px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-60 active:scale-[0.99]"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating listing…</> : <>Create my listing <Check className="w-4 h-4" /></>}
              </button>
            </>
          )}
        </div>

        <div className="text-center text-[13px] text-black/60 pt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-yellow-600 font-bold">Sign in</Link>
        </div>
      </div>
    </main>
  )
}

// ============================================================================
// Sub-components
// ============================================================================
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1
        const isCurrent = idx === step
        const isDone = idx < step
        return (
          <span
            key={i}
            className="flex-1 h-1.5 rounded-full transition-colors"
            style={{
              background: isCurrent ? '#FACC15' : isDone ? '#9CA3AF' : '#E5E7EB',
            }}
            aria-hidden
          />
        )
      })}
    </div>
  )
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="text-[20px] font-black leading-tight">{title}</h1>
      <p className="text-[13px] text-black/60 mt-1 leading-snug">{sub}</p>
    </div>
  )
}

function Field({
  label, hint, icon, children,
}: { label: string; hint?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-black/70 mb-1.5">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</span>}
        {children}
      </div>
      {hint && <p className="text-[12px] text-black/50 mt-1.5 leading-snug">{hint}</p>}
    </div>
  )
}

function ToggleChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-2 rounded-xl text-[13px] font-bold border transition min-h-[44px]"
      style={{
        background: active ? '#FACC15' : '#FFFFFF',
        color: active ? '#000' : 'rgba(0,0,0,0.75)',
        borderColor: active ? '#FACC15' : '#D1D5DB',
      }}
    >
      {label}
    </button>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[#FACC15] w-5 h-5"
      />
      <span className="text-[14px] font-bold text-black/85">{label}</span>
    </label>
  )
}

function PrimaryButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 text-black px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-60 active:scale-[0.99]"
    >
      {children}
    </button>
  )
}

function NextButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 text-black px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-60 active:scale-[0.99]"
    >
      Next <ArrowRight className="w-4 h-4" />
    </button>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">{children}</p>
  )
}

function ComplianceNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] text-black/65 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 leading-snug">
      {children}
    </p>
  )
}

function Compliance() {
  return (
    <p className="text-[12px] text-black/60 leading-snug">
      By continuing you confirm you are 18+ and have a valid <strong className="text-black">SIM B1 / B1 Umum</strong> and <strong className="text-black">STNK</strong>.
      You agree to the{' '}
      <Link href="/terms" target="_blank" className="text-yellow-600 hover:underline">Terms</Link>{' '}and{' '}
      <Link href="/privacy" target="_blank" className="text-yellow-600 hover:underline">Privacy Policy</Link>.
    </p>
  )
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-1.5">
      <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/55">{title}</div>
      {children}
    </div>
  )
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="text-black/60 shrink-0">{label}</span>
      <span className="text-black font-bold text-right break-words">{value || '—'}</span>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Shared input class — Tailwind. 13px minimum + 44px tap target.
// ----------------------------------------------------------------------------
const inputCls =
  'w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-[14px] text-black placeholder:text-black/40 focus:outline-none focus:border-yellow-400 min-h-[44px]'

// Map Supabase auth errors to driver-friendly copy. Mirrors the helper in
// /login + /signup root so wording is consistent across surfaces.
function humanAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('user already registered') || m.includes('already_exists') || m.includes('duplicate key')) {
    return 'A driver with this WhatsApp number already exists. Sign in instead, or contact support to reset your password.'
  }
  if (m.includes('phone not confirmed') || m.includes('phone_not_confirmed')) {
    return 'Sign-up needs Supabase phone-confirm OFF (Auth → Providers → Phone). Ask your admin.'
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  return msg
}
