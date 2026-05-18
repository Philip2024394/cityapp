'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, Check, Briefcase, Link2, Bike,
  Wallet, MapPin, Coins, Loader2, Banknote, QrCode, Send,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { slugify, slugReason } from '@/lib/slug'
import type { ServiceType, BikeType } from '@/types/database'

const STEPS = ['Business', 'Link', 'Bike', 'Services & price', 'Payment', 'Location'] as const

export default function OnboardingPage() {
  const router = useRouter()
  const [stepIdx, setStepIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Pre-fill from auth session when available
  const [me, setMe] = useState<{ id: string; phone: string; full_name?: string } | null>(null)
  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login?next=/onboarding')
        return
      }
      const meta = (data.user.user_metadata || {}) as Record<string, string>
      setMe({
        id: data.user.id,
        phone: data.user.phone || '',
        full_name: meta.full_name,
      })
    })
  }, [router])

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [bio, setBio] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugCheck, setSlugCheck] = useState<{ checking: boolean; available?: boolean; reason?: string }>({
    checking: false,
  })

  const [bikeMake, setBikeMake] = useState('')
  const [bikeModel, setBikeModel] = useState('')
  const [bikeYear, setBikeYear] = useState<number | ''>('')
  const [bikeColor, setBikeColor] = useState('')
  const [bikePlate, setBikePlate] = useState('')
  const [bikeType, setBikeType] = useState<BikeType>('matic')
  const [bikeCc, setBikeCc] = useState<number | ''>('')
  const [hasBox, setHasBox] = useState(false)

  const [services, setServices] = useState<ServiceType[]>(['person'])
  const [pricePerKm, setPricePerKm] = useState<number>(2500)
  const [minFee, setMinFee] = useState<number>(10000)
  const [pitstopFee, setPitstopFee] = useState<number>(0)

  const [acceptsCash, setAcceptsCash] = useState(true)
  const [acceptsQR, setAcceptsQR] = useState(false)
  const [acceptsTransfer, setAcceptsTransfer] = useState(false)
  const [qrPaymentUrl, setQrPaymentUrl] = useState('')
  const [transferDetails, setTransferDetails] = useState('')

  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [zoneLat, setZoneLat] = useState<number | null>(null)
  const [zoneLng, setZoneLng] = useState<number | null>(null)
  const [zoneRadius, setZoneRadius] = useState<number>(15)

  // Auto-derive slug from business name unless user manually edited it
  useEffect(() => {
    if (!slugTouched && businessName) setSlug(slugify(businessName))
  }, [businessName, slugTouched])

  // Live slug availability check (debounced)
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current)
    if (!slug) {
      setSlugCheck({ checking: false })
      return
    }
    const local = slugReason(slug)
    if (local) {
      setSlugCheck({ checking: false, available: false, reason: local })
      return
    }
    setSlugCheck({ checking: true })
    slugCheckTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/onboarding/slug-check?slug=${encodeURIComponent(slug)}`)
        const json = (await r.json()) as { available: boolean; reason?: string }
        setSlugCheck({ checking: false, available: json.available, reason: json.reason })
      } catch {
        setSlugCheck({ checking: false, available: false, reason: 'Could not verify — try again' })
      }
    }, 400)
    return () => {
      if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current)
    }
  }, [slug])

  function toggleService(s: ServiceType) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const stepValid = useMemo(() => {
    switch (stepIdx) {
      case 0:
        return businessName.trim().length >= 2
      case 1:
        return slug.length > 0 && slugCheck.available === true && !slugCheck.checking
      case 2:
        return true // bike is optional — riders can fill later
      case 3:
        return services.length > 0 && pricePerKm >= 1000 && minFee >= 0
      case 4:
        return acceptsCash || acceptsQR || acceptsTransfer
      case 5:
        return city.trim().length > 0
      default:
        return false
    }
  }, [stepIdx, businessName, slug, slugCheck, services, pricePerKm, minFee, acceptsCash, acceptsQR, acceptsTransfer, city])

  async function submit() {
    if (!me) return
    setError(null)
    setSubmitting(true)
    try {
      const r = await fetch('/api/onboarding/driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          business_name: businessName,
          bio,
          whatsapp_e164: me.phone,
          city,
          area,
          service_zone_center_lat: zoneLat,
          service_zone_center_lng: zoneLng,
          service_zone_radius_km: zoneRadius,
          bike_make: bikeMake,
          bike_model: bikeModel,
          bike_year: bikeYear || undefined,
          bike_color: bikeColor,
          bike_plate: bikePlate,
          bike_type: bikeType,
          bike_cc: bikeCc || undefined,
          has_box: hasBox,
          services,
          price_per_km: pricePerKm,
          min_fee: minFee,
          pitstop_fee: pitstopFee,
          accepts_cash: acceptsCash,
          accepts_qr: acceptsQR,
          accepts_transfer: acceptsTransfer,
          qr_payment_url: qrPaymentUrl,
          transfer_details: transferDetails,
        }),
      })
      if (!r.ok) {
        const json = await r.json().catch(() => ({}))
        setError(json.error || `Setup failed (${r.status})`)
        setSubmitting(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message || 'Network error')
      setSubmitting(false)
    }
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setZoneLat(pos.coords.latitude)
        setZoneLng(pos.coords.longitude)
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 },
    )
  }

  if (!me) {
    return (
      <>
        <AppNav />
        <main className="min-h-screen flex items-center justify-center text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </main>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen pt-6 pb-20 px-4 grid-bg">
        <div className="w-full max-w-md mx-auto space-y-4">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 px-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1 flex items-center gap-1.5">
                <span
                  className="block flex-1 h-1 rounded-full transition-colors"
                  style={{ background: i <= stepIdx ? '#FACC15' : 'rgba(255,255,255,0.08)' }}
                />
              </div>
            ))}
          </div>
          <div className="text-[12px] text-dim uppercase tracking-wider font-extrabold px-1">
            Step {stepIdx + 1} of {STEPS.length} · {STEPS[stepIdx]}
          </div>

          <div className="card p-5 space-y-4">
            {stepIdx === 0 && (
              <>
                <Header
                  icon={<Briefcase className="w-6 h-6" />}
                  title="Name your booking business"
                  sub="This is what customers see on your booking page and in search results."
                />
                <Field label="Business name">
                  <input
                    className="input"
                    placeholder="Wayan Bike"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label="Short intro (optional)" hint="Max 200 characters. Tell customers what you do.">
                  <textarea
                    className="input min-h-[80px] py-3"
                    placeholder="Reliable Ubud rider. Daily airport runs. Box for parcels."
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                  />
                </Field>
              </>
            )}

            {stepIdx === 1 && (
              <>
                <Header
                  icon={<Link2 className="w-6 h-6" />}
                  title="Pick your short link"
                  sub="Customers can book you directly with one tap. Share on WhatsApp, business card, sticker."
                />
                <Field label="Your booking link">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] text-muted shrink-0">cityrider.app/r/</span>
                    <input
                      className="input flex-1 font-mono"
                      placeholder="wayan-bike"
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true)
                        setSlug(slugify(e.target.value))
                      }}
                    />
                  </div>
                  <div className="text-[12px] mt-2 flex items-center gap-1.5">
                    {slugCheck.checking && <Loader2 className="w-3.5 h-3.5 animate-spin text-dim" />}
                    {!slugCheck.checking && slugCheck.available === true && (
                      <span className="text-online inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Available
                      </span>
                    )}
                    {!slugCheck.checking && slugCheck.available === false && (
                      <span className="text-red-400">{slugCheck.reason}</span>
                    )}
                  </div>
                </Field>
              </>
            )}

            {stepIdx === 2 && (
              <>
                <Header
                  icon={<Bike className="w-6 h-6" />}
                  title="Your bike"
                  sub="Helps customers trust who shows up. You can skip and add later."
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Make">
                    <input className="input" placeholder="Honda" value={bikeMake} onChange={(e) => setBikeMake(e.target.value)} />
                  </Field>
                  <Field label="Model">
                    <input className="input" placeholder="BeAT" value={bikeModel} onChange={(e) => setBikeModel(e.target.value)} />
                  </Field>
                  <Field label="Year">
                    <input
                      className="input font-mono"
                      type="number"
                      inputMode="numeric"
                      placeholder="2022"
                      value={bikeYear}
                      onChange={(e) => setBikeYear(e.target.value ? parseInt(e.target.value, 10) : '')}
                    />
                  </Field>
                  <Field label="Color">
                    <input className="input" placeholder="Hitam" value={bikeColor} onChange={(e) => setBikeColor(e.target.value)} />
                  </Field>
                  <Field label="Plate">
                    <input className="input font-mono uppercase" placeholder="DK 1234 XX" value={bikePlate} onChange={(e) => setBikePlate(e.target.value.toUpperCase())} />
                  </Field>
                  <Field label="CC">
                    <input
                      className="input font-mono"
                      type="number"
                      inputMode="numeric"
                      placeholder="110"
                      value={bikeCc}
                      onChange={(e) => setBikeCc(e.target.value ? parseInt(e.target.value, 10) : '')}
                    />
                  </Field>
                </div>
                <Field label="Type">
                  <div className="grid grid-cols-3 gap-2">
                    {(['matic', 'sport', 'manual'] as BikeType[]).map((t) => (
                      <ToggleChip key={t} active={bikeType === t} onClick={() => setBikeType(t)} label={cap(t)} />
                    ))}
                  </div>
                </Field>
                <ToggleRow
                  label="Has parcel box"
                  hint="Tick if you can carry parcels/food in a rear box."
                  checked={hasBox}
                  onChange={setHasBox}
                />
              </>
            )}

            {stepIdx === 3 && (
              <>
                <Header
                  icon={<Coins className="w-6 h-6" />}
                  title="Services & pricing"
                  sub="You set your own rates. Customers see them before booking."
                />
                <Field label="What you offer">
                  <div className="grid grid-cols-3 gap-2">
                    <ToggleChip active={services.includes('person')} onClick={() => toggleService('person')} label="🧍 Ride" />
                    <ToggleChip active={services.includes('parcel')} onClick={() => toggleService('parcel')} label="📦 Parcel" />
                    <ToggleChip active={services.includes('food')} onClick={() => toggleService('food')} label="🍔 Food" />
                  </div>
                </Field>
                <Field label={`Price per km · Rp ${pricePerKm.toLocaleString('id-ID')}`}>
                  <input
                    type="range" min={1500} max={10000} step={250}
                    value={pricePerKm}
                    onChange={(e) => setPricePerKm(parseInt(e.target.value, 10))}
                    className="w-full accent-[#FACC15]"
                  />
                </Field>
                <Field label={`Minimum fee · Rp ${minFee.toLocaleString('id-ID')}`} hint="Charged for very short trips.">
                  <input
                    type="range" min={0} max={50000} step={1000}
                    value={minFee}
                    onChange={(e) => setMinFee(parseInt(e.target.value, 10))}
                    className="w-full accent-[#FACC15]"
                  />
                </Field>
                <Field label={`Pit-stop fee · Rp ${pitstopFee.toLocaleString('id-ID')}`} hint="0 = free pit stops. Charged when customer requests a stop along the way.">
                  <input
                    type="range" min={0} max={20000} step={500}
                    value={pitstopFee}
                    onChange={(e) => setPitstopFee(parseInt(e.target.value, 10))}
                    className="w-full accent-[#FACC15]"
                  />
                </Field>
              </>
            )}

            {stepIdx === 4 && (
              <>
                <Header
                  icon={<Wallet className="w-6 h-6" />}
                  title="How customers pay you"
                  sub="Payments go directly to you — City Rider never touches the money."
                />
                <PaymentToggle
                  icon={<Banknote className="w-5 h-5" />}
                  label="Cash"
                  sub="Most common. Customer pays you in cash on completion."
                  checked={acceptsCash}
                  onChange={setAcceptsCash}
                />
                <PaymentToggle
                  icon={<QrCode className="w-5 h-5" />}
                  label="QR (QRIS, GoPay, OVO, Dana)"
                  sub="Show your QR after the trip. Customer scans + pays."
                  checked={acceptsQR}
                  onChange={setAcceptsQR}
                />
                {acceptsQR && (
                  <Field label="QR image URL (optional, can add later)" hint="Paste a public image link. Or leave blank and add from your dashboard.">
                    <input className="input" placeholder="https://..." value={qrPaymentUrl} onChange={(e) => setQrPaymentUrl(e.target.value)} />
                  </Field>
                )}
                <PaymentToggle
                  icon={<Send className="w-5 h-5" />}
                  label="Bank transfer"
                  sub="Show your account number. Customer transfers + sends proof."
                  checked={acceptsTransfer}
                  onChange={setAcceptsTransfer}
                />
                {acceptsTransfer && (
                  <Field label="Transfer details" hint="Bank + account number + name on account.">
                    <textarea
                      className="input min-h-[60px] py-3"
                      placeholder="BCA 1234567890&#10;Wayan Kurniawan"
                      value={transferDetails}
                      onChange={(e) => setTransferDetails(e.target.value)}
                    />
                  </Field>
                )}
              </>
            )}

            {stepIdx === 5 && (
              <>
                <Header
                  icon={<MapPin className="w-6 h-6" />}
                  title="Where you work"
                  sub="Customers in this area will see you on discovery."
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City">
                    <input className="input" placeholder="Denpasar" value={city} onChange={(e) => setCity(e.target.value)} />
                  </Field>
                  <Field label="Area / neighborhood">
                    <input className="input" placeholder="Ubud" value={area} onChange={(e) => setArea(e.target.value)} />
                  </Field>
                </div>
                <Field label={`Service zone radius · ${zoneRadius} km`} hint="How far from your home base you'll accept trips.">
                  <input
                    type="range" min={3} max={50} step={1}
                    value={zoneRadius}
                    onChange={(e) => setZoneRadius(parseInt(e.target.value, 10))}
                    className="w-full accent-[#FACC15]"
                  />
                </Field>
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="btn-secondary w-full"
                >
                  <MapPin className="w-4 h-4" />
                  {zoneLat ? `Set: ${zoneLat.toFixed(4)}, ${zoneLng?.toFixed(4)}` : 'Use my current location as home base'}
                </button>
              </>
            )}

            {error && <p className="text-[13px] text-red-400">{error}</p>}

            <div className="flex items-center gap-2 pt-2">
              {stepIdx > 0 && (
                <button
                  type="button"
                  onClick={() => { setError(null); setStepIdx(stepIdx - 1) }}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              {stepIdx < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => { setError(null); setStepIdx(stepIdx + 1) }}
                  className="btn-primary flex-1"
                  disabled={!stepValid || submitting}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  className="btn-primary flex-1"
                  disabled={!stepValid || submitting}
                >
                  {submitting ? 'Setting up…' : 'Finish & start 14-day trial'}
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

function Header({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div>
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand to-brand2 flex items-center justify-center text-bg mb-3">
        {icon}
      </div>
      <h1 className="text-xl font-extrabold">{title}</h1>
      <p className="text-muted text-[13px] mt-1">{sub}</p>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[12px] text-dim mt-1.5">{hint}</p>}
    </div>
  )
}

function ToggleChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-2 rounded-full text-[13px] font-bold border transition"
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

function ToggleRow({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer pt-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-[#FACC15] shrink-0 cursor-pointer"
      />
      <span>
        <span className="text-[14px] font-bold block">{label}</span>
        {hint && <span className="text-[12px] text-muted block mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

function PaymentToggle({
  icon, label, sub, checked, onChange,
}: { icon: React.ReactNode; label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full text-left p-3 rounded-2xl border transition flex items-start gap-3"
      style={{
        background: checked ? 'rgba(250,204,21,0.10)' : 'rgba(255,255,255,0.03)',
        borderColor: checked ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
        style={{
          background: checked ? '#FACC15' : 'rgba(255,255,255,0.06)',
          color: checked ? '#000' : 'rgba(255,255,255,0.6)',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[14px]">{label}</div>
        <div className="text-[12px] text-muted mt-0.5">{sub}</div>
      </div>
      <div
        className="w-5 h-5 rounded shrink-0 flex items-center justify-center"
        style={{ background: checked ? '#FACC15' : 'rgba(255,255,255,0.06)' }}
      >
        {checked && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
      </div>
    </button>
  )
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
