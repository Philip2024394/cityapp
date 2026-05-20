'use client'
import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, Upload, X as XIcon, Camera, Banknote, Bike, Settings2, Clock, RotateCcw, Fuel, AlertTriangle } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import type { RentalMode, Transmission } from '@/lib/rentals/types'
import {
  suggestedDailyRate,
  deriveWeeklyMonthly,
  isMultiDayDiscountOff,
  ABSOLUTE_DAILY_FLOOR_IDR,
} from '@/data/bikeRentalDefaults'
import BikeColorPicker from '@/components/rider/BikeColorPicker'

// Owner-facing edit page for bike_rentals. PATCHes /api/rentals/[id] which
// runs through owner-scoped RLS (migration 0011). Status / paid_until /
// listing_tier are NEVER touched here — admin-only via /api/admin/*.

type RentalRow = {
  id: string
  brand: string
  model: string
  year: number | null
  cc: number | null
  transmission: Transmission
  color: string | null
  description: string | null
  image_urls: string[] | null
  daily_price_idr: number | null
  weekly_price_idr: number | null
  monthly_price_idr: number | null
  security_deposit_idr: number | null
  driver_rate_per_day_idr: number | null
  tour_3h_idr: number | null
  tour_6h_idr: number | null
  tour_8h_idr: number | null
  fuel_included: boolean | null
  helmet_count: number | null
  raincoat_count: number | null
  has_phone_holder: boolean
  has_phone_charger: boolean
  has_delivery_box: boolean
  delivers_to_hotel: boolean
  delivers_to_villa: boolean
  pickup_dropoff: boolean
  rental_mode: RentalMode
  address: string | null
  city: string
  owner_name: string
  owner_company: string | null
  owner_whatsapp_e164: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
}

function num(s: string): number {
  return parseInt(s.replace(/[^\d]/g, ''), 10) || 0
}
function normaliseWhatsApp(input: string): string {
  let v = input.replace(/[^\d+]/g, '')
  if (v.startsWith('08')) v = '+62' + v.slice(1)
  else if (v.startsWith('62')) v = '+' + v
  else if (!v.startsWith('+')) v = '+' + v
  return v
}

export default function EditRentalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = getBrowserSupabase()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [row, setRow] = useState<RentalRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Editable state
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [cc, setCc] = useState('')
  const [transmission, setTransmission] = useState<Transmission>('automatic')
  const [color, setColor] = useState('')
  const [description, setDescription] = useState('')
  const [dailyPrice, setDailyPrice] = useState('')
  const [weeklyPrice, setWeeklyPrice] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [driverRate, setDriverRate] = useState('')
  // Hourly bike+driver tour rates — 3hr/6hr/8hr blocks. Defaults match
  // the legal lowest rates from the user's spec: 150k / 280k / 350k.
  // Reset button snaps back to these baseline values.
  const [tour3h, setTour3h] = useState('')
  const [tour6h, setTour6h] = useState('')
  const [tour8h, setTour8h] = useState('')
  const [fuelIncluded, setFuelIncluded] = useState(false)
  const [helmetCount, setHelmetCount] = useState('')
  const [raincoatCount, setRaincoatCount] = useState('')
  const [hasPhoneHolder, setHasPhoneHolder] = useState(false)
  const [hasPhoneCharger, setHasPhoneCharger] = useState(false)
  const [hasDeliveryBox, setHasDeliveryBox] = useState(false)
  const [deliversToHotel, setDeliversToHotel] = useState(false)
  const [deliversToVilla, setDeliversToVilla] = useState(false)
  const [pickupDropoff, setPickupDropoff] = useState(false)
  const [rentalMode, setRentalMode] = useState<RentalMode>('self_ride')
  const [address, setAddress] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerCompany, setOwnerCompany] = useState('')
  const [whatsapp, setWhatsApp] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!supabase) { setError('Supabase not configured.'); setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace(`/login?next=/dashboard/rentals/${id}/edit`)
        return
      }
      const { data, error } = await supabase
        .from('bike_rentals')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (cancelled) return
      if (error) { setError(error.message); setLoading(false); return }
      if (!data)  { setError('Rental not found, or not yours.'); setLoading(false); return }
      const r = data as RentalRow
      setRow(r)
      setBrand(r.brand ?? '')
      setModel(r.model ?? '')
      setYear(String(r.year ?? ''))
      setCc(String(r.cc ?? ''))
      setTransmission(r.transmission)
      setColor(r.color ?? '')
      setDescription(r.description ?? '')
      setDailyPrice(String(r.daily_price_idr ?? ''))
      setWeeklyPrice(String(r.weekly_price_idr ?? ''))
      setMonthlyPrice(String(r.monthly_price_idr ?? ''))
      setDeposit(String(r.security_deposit_idr ?? ''))
      setDriverRate(String(r.driver_rate_per_day_idr ?? ''))
      // Tour defaults bumped per May 2026 market research (was 150/280/350).
      setTour3h(String(r.tour_3h_idr ?? '175000'))
      setTour6h(String(r.tour_6h_idr ?? '325000'))
      setTour8h(String(r.tour_8h_idr ?? '425000'))
      setFuelIncluded(!!r.fuel_included)
      setHelmetCount(String(r.helmet_count ?? '2'))
      setRaincoatCount(String(r.raincoat_count ?? '1'))
      setHasPhoneHolder(!!r.has_phone_holder)
      setHasPhoneCharger(!!r.has_phone_charger)
      setHasDeliveryBox(!!r.has_delivery_box)
      setDeliversToHotel(!!r.delivers_to_hotel)
      setDeliversToVilla(!!r.delivers_to_villa)
      setPickupDropoff(!!r.pickup_dropoff)
      setRentalMode(r.rental_mode)
      setAddress(r.address ?? '')
      setOwnerName(r.owner_name ?? '')
      setOwnerCompany(r.owner_company ?? '')
      setWhatsApp(r.owner_whatsapp_e164 ?? '')
      setPhotos(r.image_urls ?? [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handlePhotoPick(files: FileList | null) {
    if (!files || !files.length || !supabase || !row) return
    setPhotoError(null)
    setPhotoUploading(true)
    const uploaded: string[] = []
    try {
      for (const file of Array.from(files)) {
        if (photos.length + uploaded.length >= 5) break
        if (file.size > 5 * 1024 * 1024) { setPhotoError(`${file.name} > 5MB`); continue }
        const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
        const safeExt = ['jpg','jpeg','png','webp'].includes(ext) ? ext : 'jpg'
        const path = `submissions/bike-rentals/${row.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`
        const { error } = await supabase.storage.from('place-images').upload(path, file, {
          contentType: file.type, upsert: false,
        })
        if (error) { setPhotoError(error.message); continue }
        const { data: pub } = supabase.storage.from('place-images').getPublicUrl(path)
        uploaded.push(pub.publicUrl)
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 5))
    } finally {
      setPhotoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  function removePhoto(url: string) { setPhotos((prev) => prev.filter((p) => p !== url)) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!row) return
    setError(null); setSaved(false); setSaving(true)
    try {
      const res = await fetch(`/api/rentals/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.trim(),
          model: model.trim(),
          year: num(year) || null,
          cc: num(cc) || null,
          transmission,
          color: color.trim() || null,
          description: description.trim() || null,
          image_urls: photos,
          daily_price_idr: num(dailyPrice) || null,
          weekly_price_idr: num(weeklyPrice) || null,
          monthly_price_idr: num(monthlyPrice) || null,
          security_deposit_idr: num(deposit) || null,
          driver_rate_per_day_idr: rentalMode !== 'self_ride' && driverRate ? num(driverRate) : null,
          tour_3h_idr: rentalMode !== 'self_ride' && tour3h ? num(tour3h) : null,
          tour_6h_idr: rentalMode !== 'self_ride' && tour6h ? num(tour6h) : null,
          tour_8h_idr: rentalMode !== 'self_ride' && tour8h ? num(tour8h) : null,
          fuel_included: fuelIncluded,
          helmet_count: num(helmetCount),
          raincoat_count: num(raincoatCount),
          has_phone_holder: hasPhoneHolder,
          has_phone_charger: hasPhoneCharger,
          has_delivery_box: hasDeliveryBox,
          delivers_to_hotel: deliversToHotel,
          delivers_to_villa: deliversToVilla,
          pickup_dropoff: pickupDropoff,
          rental_mode: rentalMode,
          address: address.trim() || null,
          owner_name: ownerName.trim(),
          owner_company: ownerCompany.trim() || null,
          owner_whatsapp_e164: whatsapp ? normaliseWhatsApp(whatsapp) : '',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error || 'Save failed.'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <AppNav />
        <main className="max-w-2xl mx-auto px-4 pt-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted" />
        </main>
      </>
    )
  }
  if (error && !row) {
    return (
      <>
        <AppNav />
        <main className="max-w-2xl mx-auto px-4 pt-12 text-center space-y-3">
          <p className="text-red-400">{error}</p>
          <Link href="/dashboard/rentals" className="text-brand font-bold">← Back to my rentals</Link>
        </main>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 pt-3 pb-32">
        <Link href="/dashboard/rentals" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink mb-4">
          <ArrowLeft className="w-4 h-4" />
          My rentals
        </Link>

        <header className="mb-5">
          <h1 className="text-[22px] sm:text-[26px] font-extrabold tracking-tight leading-tight">
            Edit <span className="gradient-text">{brand} {model}</span>
          </h1>
          <p className="text-[12px] text-muted mt-1">
            Status: <strong className="text-ink uppercase">{row?.status}</strong> ·
            City: <strong className="text-ink">{row?.city}</strong>
          </p>
        </header>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Photos */}
          <section className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand" />
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">Photos</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url) => (
                <div key={url} className="relative rounded-xl overflow-hidden bg-black/60 aspect-square border border-white/10">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(url)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 border border-white/20 flex items-center justify-center">
                    <XIcon className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoUploading} className="rounded-xl bg-black/40 border border-dashed border-white/15 aspect-square flex flex-col items-center justify-center gap-1 text-muted hover:text-brand">
                  {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span className="text-[11px] font-bold">Add</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handlePhotoPick(e.target.files)} />
            </div>
            {photoError && <p className="text-[12px] text-red-400">{photoError}</p>}
          </section>

          {/* Bike specs */}
          <section className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-brand" />
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">Bike</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Brand</label>
                <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} required />
              </div>
              <div>
                <label className="label">Model</label>
                <input className="input" value={model} onChange={(e) => setModel(e.target.value)} required />
              </div>
              <div>
                <label className="label">Year</label>
                <input className="input font-mono" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div>
                <label className="label">CC</label>
                <input className="input font-mono" value={cc} onChange={(e) => setCc(e.target.value)} />
              </div>
              <div>
                <label className="label">Transmission</label>
                <select className="input" value={transmission} onChange={(e) => setTransmission(e.target.value as Transmission)}>
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                  <option value="semi_automatic">Semi-automatic</option>
                </select>
              </div>
              <div>
                <BikeColorPicker
                  label="Color"
                  value={color}
                  onChange={setColor}
                />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[80px]" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </section>

          {/* Pricing — daily auto-suggests from city × model class; weekly +
              monthly auto-derive from daily × 6 / × 20 unless the owner
              customises. Warning surfaces if their discount is way off market. */}
          <section className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-brand" />
                <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">Pricing (IDR)</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  const cityForLookup = row?.city ?? ''
                  const d = suggestedDailyRate(brand, model, cityForLookup)
                  setDailyPrice(String(d))
                  const { weekly, monthly } = deriveWeeklyMonthly(d)
                  setWeeklyPrice(String(weekly))
                  setMonthlyPrice(String(monthly))
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-extrabold transition active:scale-95"
                style={{
                  background: 'rgba(34,197,94,0.10)',
                  border: '1px solid rgba(34,197,94,0.30)',
                  color: '#22C55E',
                  minHeight: 36,
                }}
              >
                <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
                Reset to market floor
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Daily *</label>
                <input
                  className="input font-mono"
                  value={dailyPrice}
                  onChange={(e) => {
                    const v = e.target.value
                    setDailyPrice(v)
                    // Auto-fill weekly/monthly from formula whenever the
                    // owner edits daily, IF weekly/monthly are still at
                    // their formula-derived value (preserve manual overrides).
                    const d = num(v)
                    if (!d) return
                    const { weekly, monthly } = deriveWeeklyMonthly(d)
                    const curDaily = num(dailyPrice) || 0
                    const formulaPrevWeekly  = deriveWeeklyMonthly(curDaily).weekly
                    const formulaPrevMonthly = deriveWeeklyMonthly(curDaily).monthly
                    if (!weeklyPrice  || num(weeklyPrice)  === formulaPrevWeekly)  setWeeklyPrice(String(weekly))
                    if (!monthlyPrice || num(monthlyPrice) === formulaPrevMonthly) setMonthlyPrice(String(monthly))
                  }}
                  required
                />
                {num(dailyPrice) > 0 && num(dailyPrice) < ABSOLUTE_DAILY_FLOOR_IDR && (
                  <p className="text-[12px] mt-1 leading-relaxed" style={{ color: '#EF4444' }}>
                    Below platform floor (Rp {ABSOLUTE_DAILY_FLOOR_IDR.toLocaleString('id-ID')}). Owners typically can&apos;t cover insurance + wear at this rate.
                  </p>
                )}
              </div>
              <div>
                <label className="label">Weekly</label>
                <input
                  className="input font-mono"
                  value={weeklyPrice}
                  onChange={(e) => setWeeklyPrice(e.target.value)}
                  placeholder={num(dailyPrice) ? String(deriveWeeklyMonthly(num(dailyPrice)).weekly) : ''}
                />
              </div>
              <div>
                <label className="label">Monthly</label>
                <input
                  className="input font-mono"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  placeholder={num(dailyPrice) ? String(deriveWeeklyMonthly(num(dailyPrice)).monthly) : ''}
                />
              </div>
              <div><label className="label">Deposit</label><input className="input font-mono" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
            </div>
            {(() => {
              const { weeklyOff, monthlyOff } = isMultiDayDiscountOff(
                num(dailyPrice),
                num(weeklyPrice) || null,
                num(monthlyPrice) || null,
              )
              if (!weeklyOff && !monthlyOff) return null
              return (
                <div
                  className="rounded-xl p-3 flex items-start gap-2 text-[12px] leading-relaxed"
                  style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                  <span className="text-ink/90">
                    Renters typically expect a 30–40% discount for {weeklyOff && 'weekly'}{weeklyOff && monthlyOff && ' + '}{monthlyOff && 'monthly'} bookings.
                    Standard formula: weekly = daily × 6, monthly = daily × 20.
                  </span>
                </div>
              )
            })()}
            <div>
              <label className="label">Rental mode</label>
              <select className="input" value={rentalMode} onChange={(e) => setRentalMode(e.target.value as RentalMode)}>
                <option value="self_ride">Self ride only</option>
                <option value="with_driver">With driver only</option>
                <option value="both">Both</option>
              </select>
            </div>
            {rentalMode !== 'self_ride' && (
              <div>
                <label className="label">Driver rate per day</label>
                <input className="input font-mono" value={driverRate} onChange={(e) => setDriverRate(e.target.value)} />
              </div>
            )}
          </section>

          {/* HOURLY BIKE + DRIVER TOUR RATES — only visible when rental
              mode includes with_driver. Lowest-rate baseline: 3h=150k,
              6h=280k, 8h=350k. Petrol charged separately unless fuel
              included. Reset button snaps back to the baseline. */}
          {rentalMode !== 'self_ride' && (
            <section className="card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand" />
                  <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">
                    Bike + Driver tour rates
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTour3h('175000')
                    setTour6h('325000')
                    setTour8h('425000')
                    setFuelIncluded(true)
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-extrabold transition active:scale-95"
                  style={{
                    background: 'rgba(34,197,94,0.10)',
                    border: '1px solid rgba(34,197,94,0.30)',
                    color: '#22C55E',
                    minHeight: 36,
                  }}
                >
                  <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
                  Reset to baseline
                </button>
              </div>
              <p className="text-[12px] text-muted leading-relaxed">
                Industry-baseline rates for Indonesian motor-tour services. Raise these if
                you offer premium routes, multi-language guiding, or longer distances. Petrol
                is charged separately unless you toggle &quot;Fuel included&quot; below.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label">3 hours</label>
                  <input
                    className="input font-mono"
                    value={tour3h}
                    onChange={(e) => setTour3h(e.target.value)}
                    placeholder="175000"
                  />
                  <p className="text-[12px] text-dim mt-1">baseline 175.000</p>
                </div>
                <div>
                  <label className="label">6 hours</label>
                  <input
                    className="input font-mono"
                    value={tour6h}
                    onChange={(e) => setTour6h(e.target.value)}
                    placeholder="325000"
                  />
                  <p className="text-[12px] text-dim mt-1">baseline 325.000</p>
                </div>
                <div>
                  <label className="label">8 hours</label>
                  <input
                    className="input font-mono"
                    value={tour8h}
                    onChange={(e) => setTour8h(e.target.value)}
                    placeholder="425000"
                  />
                  <p className="text-[12px] text-dim mt-1">baseline 425.000</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFuelIncluded(!fuelIncluded)}
                className="w-full p-3 rounded-2xl flex items-center justify-between transition active:scale-[0.99]"
                style={{
                  background: fuelIncluded ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${fuelIncluded ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  minHeight: 48,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: fuelIncluded ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Fuel className="w-4 h-4 text-brand" />
                  </div>
                  <div className="text-left">
                    <div className="text-[13px] font-extrabold">Petrol included in tour rate</div>
                    <div className="text-[12px] text-muted mt-0.5">
                      {fuelIncluded
                        ? "Customer doesn't pay extra for fuel"
                        : 'Customer pays petrol on top of the tour rate'}
                    </div>
                  </div>
                </div>
                <div
                  className="w-12 h-7 rounded-full p-0.5 transition shrink-0"
                  style={{ background: fuelIncluded ? '#22C55E' : 'rgba(255,255,255,0.12)' }}
                >
                  <div
                    className="w-6 h-6 rounded-full bg-white transition-transform"
                    style={{ transform: fuelIncluded ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </div>
              </button>
            </section>
          )}

          {/* Inclusions */}
          <section className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-brand" />
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">Included</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">Helmets</label><input className="input font-mono" value={helmetCount} onChange={(e) => setHelmetCount(e.target.value)} /></div>
              <div><label className="label">Raincoats</label><input className="input font-mono" value={raincoatCount} onChange={(e) => setRaincoatCount(e.target.value)} /></div>
            </div>
            <div className="flex flex-wrap gap-2 text-[12px]">
              {([
                ['hasPhoneHolder', hasPhoneHolder, setHasPhoneHolder, 'Phone holder'],
                ['hasPhoneCharger', hasPhoneCharger, setHasPhoneCharger, 'Phone charger'],
                ['hasDeliveryBox', hasDeliveryBox, setHasDeliveryBox, 'Delivery box'],
                ['deliversToHotel', deliversToHotel, setDeliversToHotel, 'Delivers to hotel'],
                ['deliversToVilla', deliversToVilla, setDeliversToVilla, 'Delivers to villa'],
                ['pickupDropoff', pickupDropoff, setPickupDropoff, 'Pickup/dropoff'],
              ] as const).map(([key, val, setter, label]) => (
                <label key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer"
                  style={{ background: val ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)', borderColor: val ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)' }}>
                  <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)} className="sr-only" />
                  <span style={{ color: val ? '#FACC15' : 'rgba(255,255,255,0.70)' }} className="font-extrabold">{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Owner */}
          <section className="card p-4 space-y-3">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">Contact</h2>
            <div>
              <label className="label">Owner / display name</label>
              <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Company / shop name (optional)</label>
              <input className="input" value={ownerCompany} onChange={(e) => setOwnerCompany(e.target.value)} />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input className="input font-mono" placeholder="6281234567890" value={whatsapp} onChange={(e) => setWhatsApp(e.target.value)} required />
            </div>
            <div>
              <label className="label">Pickup address</label>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </section>

          {error && (
            <div className="rounded-xl p-3 bg-red-900/30 border border-red-500/40 text-[13px] text-red-200 font-bold">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99] disabled:opacity-60"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : saved
                ? <><CheckCircle2 className="w-4 h-4" /> Saved</>
                : <><CheckCircle2 className="w-4 h-4" /> Save changes</>}
          </button>
        </form>
      </main>
    </>
  )
}
