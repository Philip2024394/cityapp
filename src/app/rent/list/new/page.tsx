'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Upload, X as XIcon, MapPin, CheckCircle2, Loader2,
  User, Bike, Banknote, Camera, Backpack, Settings2,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import RentalCard from '@/components/rent/RentalCard'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { useGeolocation } from '@/hooks/useGeolocation'
import { BIKE_CATALOG, type CatalogBike } from '@/lib/rentals/catalog'
import type { BikeRental, RentalMode, Transmission } from '@/lib/rentals/types'

const SUPPORTED_CITIES = [
  { slug: 'yogyakarta', label: 'Yogyakarta' },
  { slug: 'denpasar',   label: 'Bali (Denpasar)' },
] as const

const LANGUAGES = [
  { id: 'id', label: 'Bahasa' },
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' },
  { id: 'ja', label: '日本語' },
] as const

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}
function normaliseWhatsApp(input: string): string {
  let v = input.replace(/[^\d+]/g, '')
  if (v.startsWith('08')) v = '+62' + v.slice(1)
  else if (v.startsWith('62')) v = '+' + v
  else if (!v.startsWith('+')) v = '+' + v
  return v
}

export default function ListBikeFormPage() {
  const router = useRouter()
  const supabase = getBrowserSupabase()
  const geo = useGeolocation(false)
  const submissionIdRef = useRef<string>(crypto.randomUUID())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Owner
  const [ownerName, setOwnerName] = useState('')
  const [ownerCompany, setOwnerCompany] = useState('')
  const [whatsapp, setWhatsApp] = useState('')
  const [email, setEmail] = useState('')
  const [languages, setLanguages] = useState<string[]>(['id'])
  const [responseTimeMin, setResponseTimeMin] = useState('')

  // Bike
  const [brand, setBrand] = useState('Honda')
  const [model, setModel] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [cc, setCc] = useState('150')
  const [transmission, setTransmission] = useState<Transmission>('automatic')
  const [color, setColor] = useState('')

  // Pricing
  const [dailyPrice, setDailyPrice] = useState('')
  const [weeklyPrice, setWeeklyPrice] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [driverRate, setDriverRate] = useState('')

  // Inclusions
  const [helmetCount, setHelmetCount] = useState('2')
  const [raincoatCount, setRaincoatCount] = useState('1')
  const [hasPhoneHolder, setHasPhoneHolder] = useState(false)
  const [hasPhoneCharger, setHasPhoneCharger] = useState(false)
  const [hasDeliveryBox, setHasDeliveryBox] = useState(false)
  const [readyToWork, setReadyToWork] = useState(false)
  const [deliversToHotel, setDeliversToHotel] = useState(false)
  const [deliversToVilla, setDeliversToVilla] = useState(false)
  const [pickupDropoff, setPickupDropoff] = useState(false)

  // Mode + location
  const [rentalMode, setRentalMode] = useState<RentalMode>('self_ride')
  const [city, setCity] = useState('yogyakarta')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  // Photos
  const [photos, setPhotos] = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Selected catalog bike — when set, its imageUrl is used as the
  // preview card's photo until the owner uploads their own. Selecting
  // a catalog row also auto-fills brand/model/cc/transmission/type.
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null)
  const selectedCatalog = useMemo(
    () => BIKE_CATALOG.find((b) => b.id === selectedCatalogId) ?? null,
    [selectedCatalogId],
  )

  function pickCatalogBike(bike: CatalogBike) {
    setSelectedCatalogId(bike.id)
    setBrand(bike.brand)
    setModel(bike.model)
    setCc(String(bike.cc))
    setTransmission(bike.transmission)
  }

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Auth gate — rental listings are tied to the submitter via owner_user_id
  // so they can self-manage on /dashboard/rentals. If signed out, bounce to
  // /login with a returnTo back to this page.
  const [authedUserId, setAuthedUserId] = useState<string | null>(null)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) {
        router.replace('/login?next=/rent/list/new')
        return
      }
      setAuthedUserId(u.id)
      const meta = u.user_metadata ?? {}
      if (meta.full_name && !ownerName) setOwnerName(String(meta.full_name))
      if (u.email && !email) setEmail(u.email)
      if (u.phone && !whatsapp) setWhatsApp('+' + u.phone)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleLang(id: string) {
    setLanguages((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]))
  }

  // Live preview — builds a BikeRental object from the form state.
  const previewRental: BikeRental = useMemo(() => {
    const num = (s: string, fallback = 0) => {
      const n = parseInt(s.replace(/[^\d]/g, ''), 10)
      return Number.isFinite(n) ? n : fallback
    }
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    return {
      id: submissionIdRef.current,
      slug: slugify(`${brand} ${model}` || 'preview'),
      ownerName: ownerName || 'Owner name',
      ownerCompany: ownerCompany.trim() || null,
      ownerWhatsapp: whatsapp ? normaliseWhatsApp(whatsapp) : '+62',
      ownerLanguages: languages,
      ownerResponseTimeMin: responseTimeMin ? num(responseTimeMin) : null,
      brand: brand || 'Honda',
      model: model || 'Model',
      year: num(year, new Date().getFullYear()),
      cc: num(cc, 150),
      transmission,
      bikeType: null,
      color: color || null,
      dailyPriceIdr: num(dailyPrice),
      weeklyPriceIdr: weeklyPrice ? num(weeklyPrice) : null,
      monthlyPriceIdr: monthlyPrice ? num(monthlyPrice) : null,
      securityDepositIdr: deposit ? num(deposit) : null,
      driverRatePerDayIdr: rentalMode !== 'self_ride' && driverRate ? num(driverRate) : null,
      helmetCount: num(helmetCount),
      raincoatCount: num(raincoatCount),
      hasPhoneHolder,
      hasPhoneCharger,
      hasDeliveryBox,
      readyToWork,
      deliversToHotel,
      deliversToVilla,
      pickupDropoff,
      rentalMode,
      city,
      address: address || null,
      lat: Number.isFinite(latN) ? latN : 0,
      lng: Number.isFinite(lngN) ? lngN : 0,
      imageUrls: photos.length > 0
        ? photos
        : selectedCatalog ? [selectedCatalog.imageUrl] : [],
      description: null,
      tags: [],
      rating: null,
      reviewCount: 0,
      verified: false,
      availableNow: true,
      listingTier: 'free',
      tour3hIdr: null,
      tour6hIdr: null,
      tour8hIdr: null,
      fuelIncluded: false,
    }
  }, [
    ownerName, ownerCompany, whatsapp, languages, responseTimeMin,
    brand, model, year, cc, transmission, color,
    dailyPrice, weeklyPrice, monthlyPrice, deposit, driverRate,
    helmetCount, raincoatCount, hasPhoneHolder, hasPhoneCharger,
    hasDeliveryBox, readyToWork, deliversToHotel, deliversToVilla, pickupDropoff,
    rentalMode, city, address, lat, lng, photos, selectedCatalog,
  ])

  async function useMyGps() {
    const coords = await geo.request()
    if (!coords) return
    setLat(coords.lat.toFixed(6))
    setLng(coords.lng.toFixed(6))
  }

  async function handlePhotoPick(files: FileList | null) {
    if (!files || !files.length || !supabase) return
    setPhotoError(null)
    setPhotoUploading(true)
    const uploaded: string[] = []
    try {
      for (const file of Array.from(files)) {
        if (photos.length + uploaded.length >= 5) break
        if (file.size > 5 * 1024 * 1024) { setPhotoError(`${file.name} > 5MB`); continue }
        const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
        const safeExt = ['jpg','jpeg','png','webp'].includes(ext) ? ext : 'jpg'
        const path = `submissions/bike-rentals/${submissionIdRef.current}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!supabase) { setSubmitError('Supabase not configured.'); return }
    if (!ownerName.trim() || !whatsapp.trim() || !email.trim() || !brand.trim() || !model.trim() || !dailyPrice) {
      setSubmitError('Lengkapi nama, WhatsApp, email, brand, model, dan harga harian.')
      return
    }
    const latN = parseFloat(lat); const lngN = parseFloat(lng)
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) { setSubmitError('Atur titik lokasi (lat + lng).'); return }
    if (!authedUserId) {
      setSubmitError('Sesi habis — silakan login ulang.')
      router.replace('/login?next=/rent/list/new')
      return
    }
    setSubmitting(true)
    try {
      const num = (s: string) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0
      const slug = `${slugify(`${brand}-${model}`)}-${submissionIdRef.current.slice(0, 8)}`
      const { error } = await supabase.from('bike_rentals').insert({
        slug,
        owner_user_id: authedUserId,
        owner_name: ownerName.trim(),
        owner_company: ownerCompany.trim() || null,
        owner_whatsapp_e164: normaliseWhatsApp(whatsapp),
        owner_languages: languages,
        owner_response_time_min: responseTimeMin ? num(responseTimeMin) : null,
        brand: brand.trim(),
        model: model.trim(),
        year: num(year),
        cc: num(cc),
        transmission,
        color: color.trim() || null,
        daily_price_idr: num(dailyPrice),
        weekly_price_idr: weeklyPrice ? num(weeklyPrice) : null,
        monthly_price_idr: monthlyPrice ? num(monthlyPrice) : null,
        security_deposit_idr: deposit ? num(deposit) : null,
        driver_rate_per_day_idr: rentalMode !== 'self_ride' && driverRate ? num(driverRate) : null,
        helmet_count: num(helmetCount),
        raincoat_count: num(raincoatCount),
        has_phone_holder: hasPhoneHolder,
        has_phone_charger: hasPhoneCharger,
        has_delivery_box: hasDeliveryBox,
        ready_to_work: readyToWork,
        delivers_to_hotel: deliversToHotel,
        delivers_to_villa: deliversToVilla,
        pickup_dropoff: pickupDropoff,
        rental_mode: rentalMode,
        city,
        address: address.trim() || null,
        location: `SRID=4326;POINT(${lngN} ${latN})`,
        lat: latN, lng: lngN,
        image_urls: photos.length > 0
          ? photos
          : selectedCatalog ? [selectedCatalog.imageUrl] : [],
        status: 'pending',
        submitted_name: ownerName.trim(),
        submitted_email: email.trim(),
        submitted_whatsapp: normaliseWhatsApp(whatsapp),
      })
      if (error) {
        if (error.code === '23505') {
          setSubmitError('Kamu sudah punya rental pending di kota ini. Cek /dashboard/rentals untuk edit.')
        } else {
          throw error
        }
        setSubmitting(false)
        return
      }
      router.push('/rent/list/submitted')
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submit gagal.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 pt-3 pb-24">
        <Link href="/rent/list" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* BIKE CAROUSEL — swipeable strip of common Indonesian rental
            bikes. Tapping a card auto-fills brand / model / cc /
            transmission and pipes the catalog image into the preview
            below until the owner uploads their own photos. */}
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand">
              Pick your bike
            </span>
            <span className="text-[12px] text-muted font-bold">Geser kanan/kiri</span>
          </div>
          <div className="-mx-4 px-4 overflow-x-auto snap-x snap-mandatory scrollbar-none">
            <div className="inline-flex items-stretch gap-2 pb-1">
              {BIKE_CATALOG.map((bike) => {
                const active = selectedCatalogId === bike.id
                return (
                  <button
                    key={bike.id}
                    type="button"
                    onClick={() => pickCatalogBike(bike)}
                    className={`snap-start shrink-0 w-[200px] rounded-2xl border-2 transition overflow-hidden text-left ${
                      active
                        ? 'border-brand bg-brand/10 shadow-[0_8px_22px_rgba(250,204,21,0.30)]'
                        : 'border-white/10 bg-black/40 hover:border-brand/40'
                    }`}
                    aria-pressed={active}
                  >
                    <div className="aspect-[4/3] flex items-center justify-center bg-black/30">
                      <img
                        src={bike.imageUrl}
                        alt={`${bike.brand} ${bike.model}`}
                        className="w-full h-full object-contain p-2"
                        loading="lazy"
                      />
                    </div>
                    <div className="px-2 py-1.5">
                      <div className={`text-[12px] font-extrabold leading-tight truncate ${active ? 'text-brand' : 'text-ink'}`}>
                        {bike.brand} {bike.model}
                      </div>
                      <div className="text-[11px] text-muted leading-tight truncate">
                        {bike.bikeType === 'electric'
                          ? 'Electric'
                          : `${bike.cc}cc · ${bike.transmission === 'manual' ? 'Manual' : bike.transmission === 'automatic' ? 'Auto' : 'Semi'}`} · {bike.bikeType}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* LIVE PREVIEW pinned to top */}
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand">Live Preview</span>
            <span className="text-[12px] text-muted font-bold">Updates as you type · ini tampilan kartumu di /rent</span>
          </div>
          <RentalCard rental={previewRental} />
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* OWNER */}
          <SectionCard Icon={User} title="Owner">
            <Field label="Nama pemilik *"><input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} required /></Field>
            <Field label="Nama company (opsional, kosongkan jika individual)"><input type="text" value={ownerCompany} onChange={(e) => setOwnerCompany(e.target.value)} className={inputClass} /></Field>
            <Field label="WhatsApp * (08… atau +62…)"><input type="tel" value={whatsapp} onChange={(e) => setWhatsApp(e.target.value)} placeholder="081234567890" className={inputClass} required /></Field>
            <Field label="Email *"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required /></Field>
            <Field label="Bahasa yang dikuasai">
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button key={l.id} type="button" onClick={() => toggleLang(l.id)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-extrabold transition border ${languages.includes(l.id) ? 'bg-bg text-brand border-black/85' : 'bg-bg/15 text-bg/75 border-bg/40 hover:bg-bg/30 hover:text-bg'}`}
                    style={{ minHeight: 36 }}>{l.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Avg response time (menit, opsional)"><input type="number" min="1" value={responseTimeMin} onChange={(e) => setResponseTimeMin(e.target.value)} className={inputClass} placeholder="10" /></Field>
          </SectionCard>

          {/* BIKE */}
          <SectionCard Icon={Bike} title="Bike">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Brand *"><input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} required /></Field>
              <Field label="Model *"><input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="PCX 150" className={inputClass} required /></Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Tahun *"><input type="number" min="1990" max={new Date().getFullYear() + 1} value={year} onChange={(e) => setYear(e.target.value)} className={inputClass} required /></Field>
              <Field label="CC *"><input type="number" min="50" value={cc} onChange={(e) => setCc(e.target.value)} className={inputClass} required /></Field>
              <Field label="Transmisi *">
                <select value={transmission} onChange={(e) => setTransmission(e.target.value as Transmission)} className={inputClass}>
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                  <option value="semi_auto">Semi-auto</option>
                </select>
              </Field>
            </div>
            <Field label="Warna"><input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Hitam / Putih / Merah" className={inputClass} /></Field>
          </SectionCard>

          {/* MODE */}
          <SectionCard Icon={Settings2} title="Mode rental">
            <div className="grid grid-cols-3 gap-2">
              {(['self_ride','with_driver','both'] as RentalMode[]).map((m) => (
                <button key={m} type="button" onClick={() => setRentalMode(m)}
                  className={`px-2 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition border ${rentalMode === m ? 'bg-bg text-brand border-black/85' : 'bg-bg/15 text-bg/75 border-bg/40 hover:bg-bg/30 hover:text-bg'}`}
                  style={{ minHeight: 44 }}>
                  {m === 'self_ride' ? 'Self ride' : m === 'with_driver' ? 'With driver' : 'Both'}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* PRICING */}
          <SectionCard Icon={Banknote} title="Harga (IDR)">
            <Field label="Harian * (IDR)"><input type="number" min="0" value={dailyPrice} onChange={(e) => setDailyPrice(e.target.value)} placeholder="95000" className={inputClass} required /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Mingguan"><input type="number" min="0" value={weeklyPrice} onChange={(e) => setWeeklyPrice(e.target.value)} className={inputClass} /></Field>
              <Field label="Bulanan"><input type="number" min="0" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} className={inputClass} /></Field>
            </div>
            <Field label="Security deposit"><input type="number" min="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputClass} /></Field>
            {rentalMode !== 'self_ride' && (
              <Field label="Driver rate / hari (jika dengan driver) *"><input type="number" min="0" value={driverRate} onChange={(e) => setDriverRate(e.target.value)} className={inputClass} /></Field>
            )}
          </SectionCard>

          {/* INCLUSIONS */}
          <SectionCard Icon={Backpack} title="Kelengkapan">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Helmet ×"><input type="number" min="0" max="5" value={helmetCount} onChange={(e) => setHelmetCount(e.target.value)} className={inputClass} /></Field>
              <Field label="Raincoat ×"><input type="number" min="0" max="5" value={raincoatCount} onChange={(e) => setRaincoatCount(e.target.value)} className={inputClass} /></Field>
            </div>
            <Toggle checked={hasPhoneHolder} onChange={setHasPhoneHolder} label="Phone holder" />
            <Toggle checked={hasPhoneCharger} onChange={setHasPhoneCharger} label="Phone charger" />
            <Toggle checked={hasDeliveryBox} onChange={setHasDeliveryBox} label="Delivery box" />
            <Toggle checked={readyToWork} onChange={setReadyToWork} label="Ready to work (lengkap untuk delivery work)" />
            <Toggle checked={deliversToHotel} onChange={setDeliversToHotel} label="Pengantaran ke hotel" />
            <Toggle checked={deliversToVilla} onChange={setDeliversToVilla} label="Pengantaran ke villa" />
            <Toggle checked={pickupDropoff} onChange={setPickupDropoff} label="Pickup / drop-off support" />
          </SectionCard>

          {/* PHOTOS */}
          <SectionCard Icon={Camera} title="Foto (1–5)">
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url) => (
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-black/85 bg-bg">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(url)} aria-label="Remove photo"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/85 text-white flex items-center justify-center hover:bg-black"><XIcon className="w-3 h-3" /></button>
                </div>
              ))}
              {photos.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoUploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-bg/60 bg-bg/15 hover:bg-bg/25 flex flex-col items-center justify-center gap-1 text-bg text-[11px] font-extrabold uppercase tracking-wider disabled:opacity-60">
                  {photoUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span>{photoUploading ? 'Upload…' : 'Tambah'}</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => handlePhotoPick(e.target.files)} />
            {photoError && <p className="text-[12px] text-red-900 font-extrabold">{photoError}</p>}
          </SectionCard>

          {/* LOCATION */}
          <SectionCard Icon={MapPin} title="Lokasi">
            <Field label="Kota *">
              <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
                {SUPPORTED_CITIES.map((c) => (<option key={c.slug} value={c.slug}>{c.label}</option>))}
              </select>
            </Field>
            <Field label="Alamat pickup"><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude *"><input type="text" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-7.7956" className={inputClass} required /></Field>
              <Field label="Longitude *"><input type="text" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="110.3695" className={inputClass} required /></Field>
            </div>
            <button type="button" onClick={useMyGps} className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-bg bg-bg/0 hover:bg-bg/10 px-2 py-1 rounded-md border border-bg/30">
              <MapPin className="w-3.5 h-3.5" />
              {geo.status === 'requesting' ? 'Mencari lokasi…' : 'Pakai lokasi GPS saya'}
            </button>
          </SectionCard>

          {submitError && (
            <div className="rounded-xl p-3 bg-red-900/30 border border-red-500/40 text-[13px] text-red-200 font-bold">{submitError}</div>
          )}
          <button type="submit" disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><CheckCircle2 className="w-4 h-4" /> Submit listing</>}
          </button>
          <p className="text-[12px] text-muted leading-snug text-center">
            Submission akan ditinjau admin dalam 24–48 jam.
            Setelah disetujui kamu mendapat <strong className="text-ink">GRATIS 7 hari</strong>, lalu
            <strong className="text-ink"> Rp 38.000/bulan</strong> atau <strong className="text-ink">Rp 350.000/tahun</strong> untuk tetap tayang.
          </p>
        </form>
      </main>
    </>
  )
}

const inputClass =
  'w-full bg-bg text-ink placeholder:text-white/40 border border-black/85 rounded-xl px-3 py-2.5 text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-bg/40 transition'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-extrabold uppercase tracking-wider text-bg mb-1">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-[13px] font-extrabold transition ${
        checked ? 'bg-bg text-brand border-black/85' : 'bg-bg/15 text-bg/75 border-bg/40 hover:bg-bg/30 hover:text-bg'
      }`} style={{ minHeight: 40 }}>
      <span>{label}</span>
      <span className={`w-9 h-5 rounded-full relative transition ${checked ? 'bg-brand' : 'bg-bg/40'}`}>
        <span className={`absolute top-0.5 ${checked ? 'right-0.5' : 'left-0.5'} w-4 h-4 rounded-full bg-bg transition`} />
      </span>
    </button>
  )
}

function SectionCard({ Icon, title, children }: { Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-3 bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_14px_rgba(250,204,21,0.30)]">
      <header className="flex items-center gap-2 mb-2">
        <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-bg/85" aria-hidden>
          <Icon className="w-4 h-4 text-brand" strokeWidth={2.75} />
        </span>
        <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-bg">{title}</h3>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
