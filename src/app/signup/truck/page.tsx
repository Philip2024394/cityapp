'use client'
// ============================================================================
// /signup/truck — Multi-step sign-up flow for new TRUCK / PICKUP drivers.
// ----------------------------------------------------------------------------
// IndoCity is a SOFTWARE DIRECTORY under PM 12/2019, NOT a transport operator.
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
import { ArrowLeft, ArrowRight, Phone, KeyRound, Check, Loader2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'

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

const CITY_OPTIONS = [
  'Yogyakarta', 'Bali', 'Jakarta', 'Bandung', 'Surabaya', 'Semarang',
  'Solo', 'Malang', 'Medan', 'Makassar', 'Lombok', 'Other',
] as const

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

  // ── Step 1: Phone OTP ───────────────────────────────────────────────────
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpPending, setOtpPending] = useState(false)
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0)
  const [resending, setResending] = useState(false)

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

  // ── Resend cooldown timer (mirrors /signup) ─────────────────────────────
  useEffect(() => {
    if (resendSecondsLeft <= 0) return
    const t = setTimeout(() => setResendSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [resendSecondsLeft])

  // ── Auto-advance once 6 digits typed ────────────────────────────────────
  useEffect(() => {
    if (!otpSent) return
    if (otp.length !== 6 || otpPending) return
    void verifyOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, otpSent])

  // ── Default whatsapp from verified phone after step 1 ───────────────────
  useEffect(() => {
    if (step === 2 && !whatsapp && phone) setWhatsapp(phone)
  }, [step, whatsapp, phone])

  // ──────────────────────────────────────────────────────────────────────
  // Step 1 — OTP
  // ──────────────────────────────────────────────────────────────────────
  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    const cleaned = normalizePhone(phone)
    if (!cleaned) {
      setError('Please enter a valid Indonesian mobile number (e.g. 6281234567890)')
      return
    }
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setError('Auth not configured. Add Supabase keys to .env.local.')
      return
    }
    setOtpPending(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: cleaned,
      options: { shouldCreateUser: true, data: { role: 'driver' } },
    })
    setOtpPending(false)
    if (err) { setError(err.message); return }
    setPhone(cleaned)
    setOtpSent(true)
    setResendSecondsLeft(30)
  }

  async function resendOtp() {
    if (resendSecondsLeft > 0 || resending) return
    setError(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setError('Auth not configured.'); return }
    setResending(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true, data: { role: 'driver' } },
    })
    setResending(false)
    if (err) { setError(err.message); return }
    setResendSecondsLeft(30)
  }

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setError('Auth not configured.'); return }
    setOtpPending(true)
    const { error: err } = await supabase.auth.verifyOtp({
      phone,
      token: otp.trim(),
      type: 'sms',
    })
    setOtpPending(false)
    if (err) { setError(err.message); return }
    setStep(2)
  }

  // ──────────────────────────────────────────────────────────────────────
  // Step validation gates (drive Next button enablement)
  // ──────────────────────────────────────────────────────────────────────
  const stepValid = useMemo(() => {
    switch (step) {
      case 1: return false // step 1 advances via verifyOtp side effect
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
          Number.isFinite(minFee) && minFee > 0 &&
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
          {step === 1 && !otpSent && (
            <>
              <Header
                title="Sign up as a Truck Driver"
                sub="List your truck. Customers find you. You agree the fare and trip directly."
              />
              <form className="space-y-3" onSubmit={sendOtp}>
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
                <Compliance />
                {error && <ErrorBanner>{error}</ErrorBanner>}
                <PrimaryButton disabled={otpPending}>
                  {otpPending ? 'Sending code…' : 'Send verification code'}
                  <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
              </form>
            </>
          )}

          {step === 1 && otpSent && (
            <>
              <Header
                title="Verify your phone"
                sub={`We sent a 6-digit code to +${phone}`}
              />
              <form className="space-y-3" onSubmit={verifyOtp}>
                <Field label="6-digit code" icon={<KeyRound className="w-4 h-4 text-black/40" />}>
                  <input
                    className={inputCls + ' pl-11 font-mono tracking-[0.4em] text-center text-[18px]'}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </Field>
                {error && <ErrorBanner>{error}</ErrorBanner>}
                <PrimaryButton disabled={otpPending || otp.length !== 6}>
                  {otpPending ? 'Verifying…' : 'Verify & continue'}
                  <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={resendSecondsLeft > 0 || resending}
                  className="w-full text-[13px] text-yellow-600 font-bold inline-flex items-center justify-center gap-1.5 disabled:text-black/40 disabled:font-normal min-h-[44px]"
                >
                  {resending
                    ? 'Resending…'
                    : resendSecondsLeft > 0
                      ? `Resend code in ${resendSecondsLeft}s`
                      : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtp(''); setOtpSent(false); setError(null) }}
                  className="w-full text-[13px] text-black/60 hover:text-black inline-flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Use a different number
                </button>
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
                <Field label="City">
                  <select
                    className={inputCls + ' appearance-none'}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
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
                sub="These are YOUR rates. Kita2u displays them as-is — we never set or modify driver prices."
              />
              <ComplianceNote>
                Kita2u is a software directory. Customers select drivers and agree fares directly. We never set, compute, or modify driver prices.
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
                sub="Tell customers how you accept payment. Kita2u never handles funds — payments go directly between you and the customer."
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
                  Kita2u does not verify driving licences.
                  I am an independent driver business — not an employee or contractor of Kita2u.
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
