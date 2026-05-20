'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, Check, Briefcase, Bike,
  MapPin, Coins, Loader2, Edit3, Sparkles, Package,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import LocationPicker, { type LocationPickerValue } from '@/components/rider/LocationPicker'
import BikePicker from '@/components/rider/BikePicker'
import BikeColorPicker from '@/components/rider/BikeColorPicker'
import HelpTip from '@/components/common/HelpTip'
import { getBikeImageUrl, isExactBikeImage } from '@/data/bikeImages'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { legalMinPerKm, legalMinFare } from '@/lib/tariffs/zones'

// Convert a Nominatim city_label like "Kota Yogyakarta" or "Kabupaten Sleman"
// to the slug form used by CITY_TO_ZONE in src/lib/tariffs/zones.ts.
function cityNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^kota\s+/, '')
    .replace(/^kabupaten\s+/, '')
    .replace(/^kab\.\s*/, '')
    .trim()
    .replace(/\s+/g, '-')
}
import { slugify, slugReason } from '@/lib/slug'
import {
  getTariffForCity,
  lawRatePerKm,
  lawMinFare,
  isPerKmWithinLaw,
} from '@/lib/tariffs/zones'
import type { ServiceType, BikeType } from '@/types/database'

const STEPS = ['Bisnis', 'Motor', 'Lokasi & Layanan', 'Harga'] as const

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted" /></main>}>
      <OnboardingInner />
    </Suspense>
  )
}

function OnboardingInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const isEditMode = sp.get('mode') === 'edit'
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

  // Edit-mode prefill — when ?mode=edit, fetch the existing driver row
  // and populate state. Onboarding's submit handler already calls
  // `upsert` keyed on user_id so the same flow doubles as the edit
  // surface, which keeps us from maintaining two parallel forms.
  const [prefillLoading, setPrefillLoading] = useState(false)
  useEffect(() => {
    if (!isEditMode || !me?.id) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    setPrefillLoading(true)
    supabase
      .from('drivers')
      .select('*')
      .eq('user_id', me.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setPrefillLoading(false); return }
        const d = data as Record<string, unknown>
        if (typeof d.business_name === 'string') setBusinessName(d.business_name)
        if (typeof d.bio === 'string') setBio(d.bio)
        if (typeof d.slug === 'string') { setSlug(d.slug); setSlugTouched(true) }
        if (typeof d.bike_make === 'string') setBikeMake(d.bike_make)
        if (typeof d.bike_model === 'string') setBikeModel(d.bike_model)
        if (typeof d.bike_year === 'number') setBikeYear(d.bike_year)
        if (typeof d.bike_color === 'string') setBikeColor(d.bike_color)
        if (typeof d.bike_plate === 'string') setBikePlate(d.bike_plate)
        if (typeof d.bike_type === 'string') setBikeType(d.bike_type as BikeType)
        if (typeof d.bike_cc === 'number') setBikeCc(d.bike_cc)
        if (typeof d.has_box === 'boolean') setHasBox(d.has_box)
        if (Array.isArray(d.services)) setServices(d.services as ServiceType[])
        if (typeof d.price_per_km === 'number') setPricePerKm(d.price_per_km)
        if (typeof d.min_fee === 'number') setMinFee(d.min_fee)
        if (typeof d.pitstop_fee === 'number') setPitstopFee(d.pitstop_fee)
        if (typeof d.accepts_cash === 'boolean') setAcceptsCash(d.accepts_cash)
        if (typeof d.accepts_qr === 'boolean') setAcceptsQR(d.accepts_qr)
        if (typeof d.accepts_transfer === 'boolean') setAcceptsTransfer(d.accepts_transfer)
        if (typeof d.qr_payment_url === 'string') setQrPaymentUrl(d.qr_payment_url)
        if (typeof d.transfer_details === 'string') setTransferDetails(d.transfer_details)
        if (typeof d.city === 'string') setCity(d.city)
        if (typeof d.area === 'string') setArea(d.area)
        if (typeof d.service_zone_center_lat === 'number') setZoneLat(d.service_zone_center_lat)
        if (typeof d.service_zone_center_lng === 'number') setZoneLng(d.service_zone_center_lng)
        if (typeof d.service_zone_radius_km === 'number') {
          // Snap legacy free-float radius values to the nearest tier bucket
          // (10 / 35 / 9999) so the picker shows one as active.
          const r = d.service_zone_radius_km
          if (r >= 100) setZoneRadius(9999)
          else if (r > 20) setZoneRadius(35)
          else setZoneRadius(10)
        }
        setPrefillLoading(false)
      })
  }, [isEditMode, me?.id])

  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [location, setLocation] = useState<LocationPickerValue | null>(null)
  const [zoneLat, setZoneLat] = useState<number | null>(null)
  const [zoneLng, setZoneLng] = useState<number | null>(null)
  // Service area tier — default "City" (10 km radius). When customer's
  // trip exceeds this radius the fare auto-switches to round-trip.
  // "All Indonesia" stores a sentinel 9999 km so the round-trip rule
  // never triggers (driver doesn't mind staying out, charges one-way).
  const [zoneRadius, setZoneRadius] = useState<number>(10)

  // ── Draft persistence (audit 2026-05) ────────────────────────────────
  // Onboarding state used to live entirely in React. Indonesian Chrome
  // on a 2GB phone aggressively kills backgrounded tabs — switching to
  // WhatsApp to copy a slug would wipe steps 1-3. Now we serialise to
  // localStorage on every state change and hydrate on mount if the draft
  // is < 24h old. Cleared on successful submit. Skipped in edit-mode
  // (server prefill wins there).
  const DRAFT_KEY = 'cr.onboard.draft.v1'
  const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000
  const [draftHydrated, setDraftHydrated] = useState(false)

  useEffect(() => {
    if (draftHydrated) return
    if (isEditMode) { setDraftHydrated(true); return }
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw) as { savedAt?: number } & Record<string, unknown>
        if (d.savedAt && Date.now() - d.savedAt < DRAFT_MAX_AGE_MS) {
          if (typeof d.businessName === 'string') setBusinessName(d.businessName)
          if (typeof d.bio === 'string') setBio(d.bio)
          if (typeof d.slug === 'string') { setSlug(d.slug); setSlugTouched(true) }
          if (typeof d.bikeMake === 'string') setBikeMake(d.bikeMake)
          if (typeof d.bikeModel === 'string') setBikeModel(d.bikeModel)
          if (typeof d.bikeYear === 'number' || d.bikeYear === '') setBikeYear(d.bikeYear as number | '')
          if (typeof d.bikeColor === 'string') setBikeColor(d.bikeColor)
          if (typeof d.bikePlate === 'string') setBikePlate(d.bikePlate)
          if (typeof d.bikeType === 'string') setBikeType(d.bikeType as BikeType)
          if (typeof d.bikeCc === 'number' || d.bikeCc === '') setBikeCc(d.bikeCc as number | '')
          if (typeof d.hasBox === 'boolean') setHasBox(d.hasBox)
          if (Array.isArray(d.services)) setServices(d.services as ServiceType[])
          if (typeof d.pricePerKm === 'number') setPricePerKm(d.pricePerKm)
          if (typeof d.minFee === 'number') setMinFee(d.minFee)
          if (typeof d.pitstopFee === 'number') setPitstopFee(d.pitstopFee)
          if (typeof d.city === 'string') setCity(d.city)
          if (typeof d.area === 'string') setArea(d.area)
          if (typeof d.zoneLat === 'number') setZoneLat(d.zoneLat)
          if (typeof d.zoneLng === 'number') setZoneLng(d.zoneLng)
          if (typeof d.zoneRadius === 'number') setZoneRadius(d.zoneRadius)
          if (typeof d.stepIdx === 'number' && d.stepIdx >= 0 && d.stepIdx < 5) setStepIdx(d.stepIdx)
        } else {
          // Expired draft — clean it up
          window.localStorage.removeItem(DRAFT_KEY)
        }
      }
    } catch { /* corrupt JSON or quota — ignore */ }
    setDraftHydrated(true)
  }, [isEditMode, draftHydrated])

  // Persist on every change (debounced via React batching — fine to write
  // on each setter since onboarding interactions are slow human inputs).
  useEffect(() => {
    if (!draftHydrated || isEditMode) return
    if (typeof window === 'undefined') return
    try {
      const payload = {
        savedAt: Date.now(),
        businessName, bio, slug,
        bikeMake, bikeModel, bikeYear, bikeColor, bikePlate, bikeType, bikeCc, hasBox,
        services, pricePerKm, minFee, pitstopFee,
        city, area, zoneLat, zoneLng,
        stepIdx,
      }
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
    } catch { /* quota exceeded — silently skip */ }
  })
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

  // 4-step flow: Bisnis (0) → Motor (1) → Lokasi+Layanan (2) → Harga (3).
  // Each screen has a single outcome. Lokasi happens before Harga so the
  // tariff auto-snap fires before the rider hits the pricing screen.
  // Payment methods default to "cash" and can be expanded later from the
  // dashboard — keeps activation fast.
  const stepValid = useMemo(() => {
    switch (stepIdx) {
      case 0:
        // Business name AND slug both must be valid. Slug auto-generates from
        // business name; rider can override via the inline edit toggle.
        return (
          businessName.trim().length >= 2 &&
          slug.length > 0 &&
          slugCheck.available === true &&
          !slugCheck.checking
        )
      case 1:
        return true // Motor optional — riders can fill from dashboard later
      case 2:
        return city.trim().length > 0 && services.length > 0
      case 3:
        return pricePerKm >= 1000 && minFee >= 0
      default:
        return false
    }
  }, [stepIdx, businessName, slug, slugCheck, services, pricePerKm, minFee, city])

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
          province_id: location?.province_id ?? undefined,
          regency_id:  location?.regency_id  ?? undefined,
          district_id: location?.district_id ?? undefined,
          village_id:  location?.village_id  ?? undefined,
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
          // Optional referral attribution — code captured by
          // captureReferrerFromUrl() on landing visit, expires after 30
          // days, ignored server-side if unknown/inactive. We send both
          // forms: the uppercase variant for the external-agent system
          // (existing) and the raw variant for the driver-to-driver
          // system (added in migration 0021). API resolves each
          // independently — at most one will match.
          referrer_agent_code:
            (await import('@/lib/affiliate/referrer')).getStoredReferrer() ?? undefined,
          referrer_driver_code:
            (await import('@/lib/affiliate/referrer')).getStoredReferrerRaw() ?? undefined,
        }),
      })
      if (!r.ok) {
        const json = await r.json().catch(() => ({}))
        setError(json.error || `Setup failed (${r.status})`)
        setSubmitting(false)
        return
      }
      // Clear the referrer cookie — attribution is locked at the trigger.
      ;(await import('@/lib/affiliate/referrer')).clearStoredReferrer()
      // Draft persistence cleanup — onboarding is done, don't restore.
      try { window.localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      router.push('/dashboard')
      router.refresh()
    } catch (e: unknown) {
      setError((e as Error).message || 'Network error')
      setSubmitting(false)
    }
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
          {isEditMode && (
            <div
              className="card p-3 flex items-center gap-3"
              style={{ background: 'rgba(250,204,21,0.10)', borderColor: 'rgba(250,204,21,0.40)' }}
            >
              <Edit3 className="w-4 h-4 text-brand shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-extrabold text-ink">Edit profilmu</div>
                <div className="text-[12px] text-muted">
                  {prefillLoading ? 'Memuat data sekarang…' : 'Perubahan disimpan setelah semua langkah selesai.'}
                </div>
              </div>
              <Link href="/dashboard" className="text-[12px] text-muted hover:text-ink font-bold shrink-0">
                Batal
              </Link>
            </div>
          )}
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
            Langkah {stepIdx + 1} dari {STEPS.length} · {STEPS[stepIdx]}
          </div>

          <div className="card p-5 space-y-4">
            {stepIdx === 0 && (
              <>
                <Header
                  icon={<Briefcase className="w-6 h-6" />}
                  title="Nama bisnis kamu"
                  sub="Nama ini yang customer lihat di halaman booking dan hasil pencarian."
                  helpTitle="Tips nama bisnis"
                  helpBody={
                    <>
                      <p>Pakai nama yang <strong>singkat dan mudah diingat</strong> — biasanya nama panggilanmu + kota atau jenis layanan.</p>
                      <p>Contoh bagus: "Wayan Bike", "Andi Express Yogya", "Sari Parcel". <strong>Hindari nomor</strong> di nama bisnis — sulit di-share.</p>
                    </>
                  }
                />
                <Field label="Nama bisnis">
                  <input
                    className="input"
                    placeholder="Wayan Bike"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoFocus
                  />
                </Field>
                {/* Bio is collapsed behind a disclosure (activation cut A).
                    Most riders skip this anyway; surfacing the textarea
                    inline invited 12-15s of typing without value. */}
                <CollapsibleField
                  label="Tambah intro singkat (opsional)"
                  open={bio.length > 0}
                >
                  <textarea
                    className="input min-h-[80px] py-3"
                    placeholder="Driver ojek Yogya kota. Antar parcel + booking event. Punya box besar."
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                  />
                  <p className="text-[12px] text-dim mt-1.5">Max 200 huruf.</p>
                </CollapsibleField>

                {/* Inline slug — auto-generated from business name with edit toggle */}
                <Field label="Link booking-mu">
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
                        <Check className="w-3.5 h-3.5" /> Tersedia — siap di-share
                      </span>
                    )}
                    {!slugCheck.checking && slugCheck.available === false && (
                      <span className="text-red-400">{slugCheck.reason}</span>
                    )}
                  </div>

                  {/* Slug-collision auto-suggest — when the picked slug is
                      taken, surface 3 deterministic alternatives so the
                      rider doesn't have to invent variations themselves. */}
                  {!slugCheck.checking && slugCheck.available === false && (
                    <SlugSuggestions
                      base={slug || slugify(businessName)}
                      city={city}
                      onPick={(s) => { setSlugTouched(true); setSlug(s) }}
                    />
                  )}
                </Field>
              </>
            )}

            {stepIdx === 1 && (
              <>
                <Header
                  icon={<Bike className="w-6 h-6" />}
                  title="Motor kamu"
                  sub="Bisa di-skip dan diisi nanti — tapi motor dengan foto dapat 3× lebih banyak booking."
                  helpTitle="Kenapa info motor penting?"
                  helpBody={
                    <>
                      <p>Customer di Indonesia <strong>sangat percaya</strong> driver yang transparan soal motornya. Tahun, warna, dan plat membuat customer merasa aman sebelum booking.</p>
                      <p>Tidak punya semua info sekarang? Boleh skip — tapi lengkapi <strong>secepatnya</strong> dari dashboard agar booking-mu maksimal.</p>
                    </>
                  }
                />
                <BikePicker
                  make={bikeMake}
                  model={bikeModel}
                  onChange={({ make, model }) => {
                    setBikeMake(make)
                    setBikeModel(model)
                  }}
                />
                {/* Live preview — driver sees what customers will see. */}
                {(bikeMake || bikeModel) && (
                  <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <img
                      src={getBikeImageUrl(bikeMake, bikeModel)}
                      alt=""
                      className="w-14 h-14 rounded-xl object-contain shrink-0"
                      style={{ background: 'rgba(0,0,0,0.25)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
                        {isExactBikeImage(bikeMake, bikeModel) ? 'Stock photo on file' : 'Generic preview'}
                      </div>
                      <div className="font-extrabold text-[14px] mt-0.5 truncate">
                        {bikeMake} {bikeModel}
                      </div>
                    </div>
                  </div>
                )}
                {/* Motor sub-fields collapsed behind a single disclosure
                    (activation cut B). Riders can lock in make+model fast
                    and fill the rest from /dashboard/profile later. Cuts
                    18-22s off realistic activation time. */}
                <CollapsibleField
                  label="Tambah detail motor (tahun, plat, warna, dll)"
                  open={!!(bikeYear || bikePlate || bikeCc || bikeColor || hasBox)}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tahun">
                      <input
                        className="input font-mono"
                        type="number"
                        inputMode="numeric"
                        placeholder="2022"
                        value={bikeYear}
                        onChange={(e) => setBikeYear(e.target.value ? parseInt(e.target.value, 10) : '')}
                      />
                    </Field>
                    <div>
                      <BikeColorPicker
                        label="Warna"
                        value={bikeColor}
                        onChange={setBikeColor}
                      />
                    </div>
                    <Field label="Plat">
                      <input className="input font-mono uppercase" placeholder="AB 1234 XX" value={bikePlate} onChange={(e) => setBikePlate(e.target.value.toUpperCase())} />
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
                  <Field label="Tipe">
                    <div className="grid grid-cols-3 gap-2">
                      {(['matic', 'sport', 'manual'] as BikeType[]).map((t) => (
                        <ToggleChip key={t} active={bikeType === t} onClick={() => setBikeType(t)} label={cap(t)} />
                      ))}
                    </div>
                  </Field>
                  <ToggleRow
                    label="Punya box parcel"
                    hint="Centang kalau kamu bisa bawa parcel/makanan di box belakang."
                    checked={hasBox}
                    onChange={setHasBox}
                  />
                </CollapsibleField>
              </>
            )}

            {stepIdx === 2 && (
              <>
                <Header
                  icon={<MapPin className="w-6 h-6" />}
                  title="Lokasi & layanan"
                  sub="Di mana kamu kerja dan apa yang kamu tawarkan."
                  helpTitle="Tentang lokasi & layanan"
                  helpBody={
                    <>
                      <p>Tap "Pakai lokasi sekarang" untuk auto-detect kota. Sistem otomatis pakai <strong>tarif resmi pemerintah</strong> kotamu di langkah berikutnya.</p>
                      <p>Default layanan = Penumpang. Aktifkan Parcel + Makanan untuk visibilitas maksimal — kebanyakan driver pilih semuanya.</p>
                    </>
                  }
                />
                {/* Lokasi first — sets city so the tariff auto-snap fires
                    before the rider hits Harga step. */}
                <LocationPicker
                  value={location}
                  onChange={(v) => {
                    setLocation(v)
                    setCity(v.city_label)
                    setArea(v.area_label)
                    setZoneLat(v.lat)
                    setZoneLng(v.lng)
                    const citySlug = cityNameToSlug(v.city_label)
                    const lawPerKm  = legalMinPerKm(citySlug)
                    const lawMinFee = legalMinFare(citySlug)
                    if (lawPerKm  && pricePerKm === 2500) setPricePerKm(lawPerKm)
                    if (lawMinFee && minFee     === 10000) setMinFee(lawMinFee)
                  }}
                />
                <Field label="Jangkauan layanan">
                  <ServiceTierPicker value={zoneRadius} onChange={setZoneRadius} />
                </Field>
                <Field label="Layanan yang kamu tawarkan">
                  <div className="grid grid-cols-3 gap-2">
                    <ToggleChip active={services.includes('person')} onClick={() => toggleService('person')} label="🧍 Penumpang" />
                    <ToggleChip active={services.includes('parcel')} onClick={() => toggleService('parcel')} label="📦 Parcel" />
                    <ToggleChip active={services.includes('food')} onClick={() => toggleService('food')} label="🍔 Makanan" />
                  </div>
                </Field>
              </>
            )}

            {stepIdx === 3 && (
              <>
                <Header
                  icon={<Coins className="w-6 h-6" />}
                  title="Atur hargamu"
                  sub="Kamu yang setting harga sendiri. Customer lihat sebelum booking."
                  helpTitle="Strategi harga untuk driver baru"
                  helpBody={
                    <>
                      <p><strong>Mulai dari tarif paling rendah</strong> dulu. Kenapa? Customer baru tidak kenal kamu — mereka pilih berdasarkan harga.</p>
                      <p>Setelah dapat <strong>10+ review positif</strong> dan customer loyal, baru naikkan tarif sedikit demi sedikit. Driver yang punya rating bagus + service ramah <strong>boleh charge lebih</strong>, customer mau bayar.</p>
                      <p>Pakai tombol <strong>"Reset → batas bawah"</strong> di bawah slider untuk langsung pakai tarif minimum legal.</p>
                    </>
                  }
                />

                {/* Auto-applied tariff banner — replaces the 3 sliders + 4
                    paragraphs of strategy copy that consumed ~15-20s of
                    activation time (cut C). The actual sliders live behind
                    "Atur sendiri" for power users + are fully editable later
                    from /pricing. Default = legal minimum auto-snapped
                    when the rider picks Lokasi (next step). */}
                <div
                  className="rounded-2xl p-3.5 flex items-start gap-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(34,197,94,0.04))',
                    border: '1px solid rgba(34,197,94,0.30)',
                  }}
                >
                  <div
                    className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(34,197,94,0.20)' }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: '#22C55E' }} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold leading-snug" style={{ color: '#22C55E' }}>
                      Tarif standar pemerintah akan dipakai otomatis
                    </div>
                    <p className="text-[12px] text-muted leading-snug mt-1">
                      Setelah kamu pilih lokasi, kami pakai tarif minimum legal kota kamu
                      sebagai default. <strong>Strategi: mulai dari sini, naikkan setelah dapat
                      10+ review bagus.</strong> Bisa diubah kapan saja di Dashboard → Harga.
                    </p>
                  </div>
                </div>

                <CollapsibleField
                  label="Atur sendiri tarif (opsional)"
                  open={pricePerKm !== 2500 || minFee !== 10000 || pitstopFee !== 0}
                >
                  <Field label={`Tarif per km · Rp ${pricePerKm.toLocaleString('id-ID')}`}>
                    <input
                      type="range" min={1500} max={10000} step={250}
                      value={pricePerKm}
                      onChange={(e) => setPricePerKm(parseInt(e.target.value, 10))}
                      className="w-full accent-[#FACC15]"
                    />
                    <TariffHint
                      city={city}
                      kind="perKm"
                      currentValue={pricePerKm}
                      onResetToLaw={(v) => setPricePerKm(v)}
                    />
                  </Field>
                  <Field label={`Tarif minimum · Rp ${minFee.toLocaleString('id-ID')}`} hint="Dipakai untuk trip yang sangat pendek.">
                    <input
                      type="range" min={0} max={50000} step={1000}
                      value={minFee}
                      onChange={(e) => setMinFee(parseInt(e.target.value, 10))}
                      className="w-full accent-[#FACC15]"
                    />
                    <TariffHint
                      city={city}
                      kind="minFare"
                      currentValue={minFee}
                      onResetToLaw={(v) => setMinFee(v)}
                    />
                  </Field>
                  <Field label={`Biaya pit-stop · Rp ${pitstopFee.toLocaleString('id-ID')}`} hint="0 = pit stop gratis. Charge kalau customer minta mampir di tengah trip.">
                    <input
                      type="range" min={0} max={20000} step={500}
                      value={pitstopFee}
                      onChange={(e) => setPitstopFee(parseInt(e.target.value, 10))}
                      className="w-full accent-[#FACC15]"
                    />
                  </Field>
                </CollapsibleField>

                {/* Cash-default note (was on the old Lokasi step) */}
                <div
                  className="rounded-2xl p-3 text-[12px] text-muted leading-snug"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Default pembayaran: <strong className="text-ink">Cash</strong>. Tambah QRIS / transfer bank kapan saja dari dashboard.
                </div>
              </>
            )}

{/* Old standalone Lokasi step removed (activation cut F) — folded into
    step 2 above so the tariff auto-snap fires before Harga renders. */}

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
                  Kembali
                </button>
              )}
              {stepIdx === 1 && !bikeMake && !bikeModel && (
                // Skip-Motor escape hatch — keep activation fast for riders
                // who don't have bike details handy yet.
                <button
                  type="button"
                  onClick={() => { setError(null); setStepIdx(stepIdx + 1) }}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Skip
                </button>
              )}
              {stepIdx < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => { setError(null); setStepIdx(stepIdx + 1) }}
                  className="btn-primary flex-1"
                  disabled={!stepValid || submitting}
                >
                  Lanjut
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  className="btn-primary flex-1"
                  disabled={!stepValid || submitting}
                >
                  {submitting ? 'Menyiapkan…' : 'Selesai & mulai 7 hari gratis'}
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

function Header({
  icon, title, sub, helpTitle, helpBody,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  helpTitle?: string
  helpBody?: React.ReactNode
}) {
  return (
    <div>
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand to-brand2 flex items-center justify-center text-bg mb-3">
        {icon}
      </div>
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-extrabold leading-tight">{title}</h1>
        {helpTitle && helpBody && (
          <div className="shrink-0 mt-1">
            <HelpTip title={helpTitle} body={helpBody} variant="lightbulb" />
          </div>
        )}
      </div>
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

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

// CollapsibleField — wraps optional onboarding fields so they don't
// invite filling unless the rider explicitly opens them. Activation
// audit (2026-05) showed visible "(optional)" fields still cost
// 12-22s per field because riders fill them anyway.
function CollapsibleField({
  label, open: defaultOpen = false, children,
}: {
  label: string
  open?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (open) {
    return <div>{children}</div>
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="w-full text-left px-3.5 py-3 rounded-xl text-[13px] font-extrabold text-muted hover:text-ink transition flex items-center justify-between"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px dashed rgba(255,255,255,0.12)',
      }}
    >
      <span>+ {label}</span>
      <span className="text-dim text-[11px]">tap untuk buka</span>
    </button>
  )
}

// Slug-collision auto-suggest — generates 3 deterministic alternatives
// from the base slug + (optionally) the rider's city. Tap-to-fill.
function SlugSuggestions({
  base, city, onPick,
}: {
  base: string
  city: string
  onPick: (slug: string) => void
}) {
  const candidates = useMemo(() => {
    const clean = slugify(base).slice(0, 24).replace(/-+$/, '')
    if (!clean) return [] as string[]
    const citySlug = city ? slugify(city).split('-')[0] : ''
    const list = [
      `${clean}-2`,
      citySlug ? `${clean}-${citySlug}` : `${clean}-id`,
      `${clean}-bike`,
    ]
    // Dedupe + trim length
    return Array.from(new Set(list)).map((s) => s.slice(0, 32))
  }, [base, city])

  if (candidates.length === 0) return null

  return (
    <div className="mt-2.5">
      <div className="text-[12px] text-dim font-bold mb-1.5">Coba alternatif:</div>
      <div className="flex flex-wrap gap-1.5">
        {candidates.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            className="px-2.5 py-1 rounded-full text-[12px] font-bold border transition active:scale-95"
            style={{
              background: 'rgba(250,204,21,0.08)',
              borderColor: 'rgba(250,204,21,0.35)',
              color: '#FACC15',
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

// Service-area tier picker — 3 fixed buckets. Stores into the existing
// service_zone_radius_km column so the round-trip pricing rule (km × 2
// when trip > radius) keeps working unchanged.
//
// City      → 10 km. Default for ~80% of drivers (daily ojek + in-town
//             parcels). Anything > 10 km auto-becomes round-trip.
// Tourist   → 35 km. Yogya → Borobudur / Prambanan / Parangtritis runs.
// Indonesia → 9999 km sentinel. Out-of-town parcel specialists who don't
//             mind being away; customer pays one-way km only.
const TIER_OPTIONS: ReadonlyArray<{
  value: number
  emoji: string
  label: string
  sub: string
}> = [
  { value:   10, emoji: '🏙️', label: 'Driver kota',     sub: 'Standar · 10 km · trip lebih jauh otomatis pulang-pergi' },
  { value:   35, emoji: '🏖️', label: 'Tujuan wisata',   sub: '35 km · Borobudur, Prambanan, Parangtritis · pulang-pergi setelah 35 km' },
  { value: 9999, emoji: '🗺️', label: 'Seluruh Indonesia', sub: 'Tanpa batas · customer bayar 1 arah · cocok untuk parcel luar kota' },
]

function ServiceTierPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      {TIER_OPTIONS.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="w-full text-left p-3.5 rounded-2xl border transition flex items-start gap-3"
            style={{
              background: active ? 'rgba(250,204,21,0.10)' : 'rgba(255,255,255,0.03)',
              borderColor: active ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.08)',
            }}
          >
            <span
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-[18px]"
              style={{ background: active ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)' }}
              aria-hidden
            >
              {opt.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-[14px]">{opt.label}</div>
              <div className="text-[12px] text-muted mt-0.5 leading-snug">{opt.sub}</div>
            </div>
            <div
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: active ? '#FACC15' : 'rgba(255,255,255,0.06)',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {active && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// TariffHint — advisory note under the per-km and min-fare sliders.
// Shows the government tariff floor (batas bawah) for the driver's
// selected city and a Reset button that snaps the slider to the
// LEGAL MINIMUM (the lowest rate the law allows). Drivers can save
// any value — the platform never enforces a floor.
//
// Important: only PASSENGER rides are price-regulated. Parcel and
// food delivery rates are not under government control (Permenkominfo
// 1/2012 leaves them to each operator). The price-per-km in the
// drivers schema applies platform-wide; in the UI we frame it as the
// regulated passenger floor since that's the legally meaningful one.
function TariffHint({
  city, kind, currentValue, onResetToLaw,
}: {
  city: string
  kind: 'perKm' | 'minFare'
  currentValue: number
  onResetToLaw: (v: number) => void
}) {
  const tariff = getTariffForCity(city)
  if (!tariff) {
    return (
      <div className="text-[11px] text-dim mt-1.5 leading-snug">
        Pilih kota dulu untuk melihat tarif resmi pemerintah.
      </div>
    )
  }

  const isPerKm = kind === 'perKm'
  const min = isPerKm ? tariff.perKmMin : tariff.minFareMin
  const max = isPerKm ? tariff.perKmMax : tariff.minFareMax
  // Reset → batas bawah (lowest legal rate). Drivers usually want the
  // lowest rate they can advertise; this gives them the legally-defensible
  // floor with one tap.
  const legalLowest = min

  const belowFloor   = currentValue < min
  const aboveCeiling = currentValue > max
  const inRange      = !belowFloor && !aboveCeiling

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] leading-snug flex-1 min-w-0">
          <div className="text-dim">
            <span className="text-ink font-extrabold">Zona {tariff.zone}</span>
            {' '}batas bawah <strong className="text-brand">Rp {min.toLocaleString('id-ID')}</strong>
            {' '}· batas atas Rp {max.toLocaleString('id-ID')}
            {isPerKm ? '/km' : ''}
          </div>
          <div
            className="text-[10px] mt-0.5 font-bold"
            style={{ color: inRange ? '#22C55E' : belowFloor ? '#EF4444' : '#F97316' }}
          >
            {inRange
              ? '✓ Sesuai tarif resmi'
              : belowFloor
                ? '⚠ Di bawah batas bawah resmi — kamu masih bisa simpan, tapi berisiko denda'
                : '⚠ Di atas batas atas resmi — boleh, tapi customer mungkin pindah ke driver lain'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onResetToLaw(legalLowest)}
          className="shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-brand px-2 py-1.5 rounded-lg border border-brand/40 hover:bg-brand/10 transition"
        >
          Reset → Rp {legalLowest.toLocaleString('id-ID')}
        </button>
      </div>
      {isPerKm && (
        <p className="text-[10px] text-dim leading-snug">
          Tarif ini berlaku untuk <strong className="text-ink">penumpang</strong>.
          Parcel + food <strong className="text-ink">tidak diatur pemerintah</strong> — kamu bebas atur sendiri.
        </p>
      )}
    </div>
  )
}
