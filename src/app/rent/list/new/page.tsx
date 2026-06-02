'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, CheckCircle2, Loader2,
  User, Bike, Banknote, Backpack, Settings2,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import RentalCard from '@/components/rent/RentalCard'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { useGeolocation } from '@/hooks/useGeolocation'
import { BIKE_CATALOG, type CatalogBike } from '@/lib/rentals/catalog'
import type { BikeRental, RentalMode, Transmission } from '@/lib/rentals/types'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import type { PlaceSuggestion } from '@/hooks/usePlaceSearch'

// Inclusion icons (mirror the ones used on RentalCard so the form
// previews exactly what the customer will see on /rent).
const HELMET_ICON   = 'https://ik.imagekit.io/nepgaxllc/Untitledasdaaaaaaa-removebg-preview.png?updatedAt=1779053735062'
const RAINCOAT_ICON = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2012_29_10%20AM.png'
const PICKUP_ICON   = 'https://ik.imagekit.io/nepgaxllc/Untitleddasdaaa-removebg-preview.png'

// Major Indonesian cities + tourist hubs. Alphabetised so owners can
// scan quickly. The "other" option reveals a free-text override input
// for areas not in this list (small towns, kabupaten, kelurahan, etc).
const SUPPORTED_CITIES = [
  { slug: 'ambon',       label: 'Ambon' },
  { slug: 'balikpapan',  label: 'Balikpapan' },
  { slug: 'banda-aceh',  label: 'Banda Aceh' },
  { slug: 'bandar-lampung', label: 'Bandar Lampung' },
  { slug: 'bandung',     label: 'Bandung' },
  { slug: 'banjarmasin', label: 'Banjarmasin' },
  { slug: 'banyuwangi',  label: 'Banyuwangi' },
  { slug: 'batam',       label: 'Batam' },
  { slug: 'batu',        label: 'Batu (Malang)' },
  { slug: 'bekasi',      label: 'Bekasi' },
  { slug: 'bengkulu',    label: 'Bengkulu' },
  { slug: 'bintan',      label: 'Bintan' },
  { slug: 'bogor',       label: 'Bogor' },
  { slug: 'bukittinggi', label: 'Bukittinggi' },
  { slug: 'cilegon',     label: 'Cilegon' },
  { slug: 'cirebon',     label: 'Cirebon' },
  { slug: 'denpasar',    label: 'Bali — Denpasar' },
  { slug: 'depok',       label: 'Depok' },
  { slug: 'ende',        label: 'Ende (Flores)' },
  { slug: 'gili-air',    label: 'Gili Air' },
  { slug: 'gili-meno',   label: 'Gili Meno' },
  { slug: 'gili-trawangan', label: 'Gili Trawangan' },
  { slug: 'gorontalo',   label: 'Gorontalo' },
  { slug: 'jakarta',     label: 'Jakarta' },
  { slug: 'jambi',       label: 'Jambi' },
  { slug: 'jayapura',    label: 'Jayapura' },
  { slug: 'jepara',      label: 'Jepara' },
  { slug: 'kediri',      label: 'Kediri' },
  { slug: 'kendari',     label: 'Kendari' },
  { slug: 'kuta-bali',   label: 'Bali — Kuta' },
  { slug: 'kuta-lombok', label: 'Lombok — Kuta' },
  { slug: 'labuan-bajo', label: 'Labuan Bajo' },
  { slug: 'lampung',     label: 'Lampung' },
  { slug: 'lombok',      label: 'Lombok' },
  { slug: 'mabar-flores', label: 'Manggarai Barat (Flores)' },
  { slug: 'madiun',      label: 'Madiun' },
  { slug: 'magelang',    label: 'Magelang' },
  { slug: 'makassar',    label: 'Makassar' },
  { slug: 'malang',      label: 'Malang' },
  { slug: 'manado',      label: 'Manado' },
  { slug: 'mataram',     label: 'Mataram (Lombok)' },
  { slug: 'medan',       label: 'Medan' },
  { slug: 'merauke',     label: 'Merauke' },
  { slug: 'nusa-penida', label: 'Nusa Penida' },
  { slug: 'padang',      label: 'Padang' },
  { slug: 'palangka-raya', label: 'Palangka Raya' },
  { slug: 'palembang',   label: 'Palembang' },
  { slug: 'palu',        label: 'Palu' },
  { slug: 'pangkal-pinang', label: 'Pangkal Pinang' },
  { slug: 'pekanbaru',   label: 'Pekanbaru' },
  { slug: 'pontianak',   label: 'Pontianak' },
  { slug: 'probolinggo', label: 'Probolinggo' },
  { slug: 'salatiga',    label: 'Salatiga' },
  { slug: 'samarinda',   label: 'Samarinda' },
  { slug: 'sanur',       label: 'Bali — Sanur' },
  { slug: 'semarang',    label: 'Semarang' },
  { slug: 'seminyak',    label: 'Bali — Seminyak' },
  { slug: 'senggigi',    label: 'Lombok — Senggigi' },
  { slug: 'serang',      label: 'Serang' },
  { slug: 'sidoarjo',    label: 'Sidoarjo' },
  { slug: 'solo',        label: 'Solo (Surakarta)' },
  { slug: 'sorong',      label: 'Sorong' },
  { slug: 'sukabumi',    label: 'Sukabumi' },
  { slug: 'sumbawa',     label: 'Sumbawa' },
  { slug: 'surabaya',    label: 'Surabaya' },
  { slug: 'tangerang',   label: 'Tangerang' },
  { slug: 'tarakan',     label: 'Tarakan' },
  { slug: 'tegal',       label: 'Tegal' },
  { slug: 'ternate',     label: 'Ternate' },
  { slug: 'tuban',       label: 'Tuban' },
  { slug: 'ubud',        label: 'Bali — Ubud' },
  { slug: 'uluwatu',     label: 'Bali — Uluwatu' },
  { slug: 'yogyakarta',  label: 'Yogyakarta' },
  { slug: '__other__',   label: 'Lain (tulis sendiri)' },
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

  // Owner
  const [ownerName, setOwnerName] = useState('')
  const [ownerCompany, setOwnerCompany] = useState('')
  const [whatsapp, setWhatsApp] = useState('')

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
  const [driverRate, setDriverRate] = useState('')

  // Inclusions — helmet/raincoat counts + a single combined delivery
  // toggle (Hotel / Villa). The toggle drives hotel + villa + pickup-
  // dropoff DB columns simultaneously so the rental card's gear stack
  // shows the "+ Vill/Hotel" pickup row when enabled.
  const [helmetCount, setHelmetCount] = useState('2')
  const [raincoatCount, setRaincoatCount] = useState('1')
  const [deliveryHotelVilla, setDeliveryHotelVilla] = useState(false)

  // Mode + location
  const [rentalMode, setRentalMode] = useState<RentalMode>('self_ride')
  const [city, setCity] = useState('yogyakarta')
  const [customCity, setCustomCity] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  // Photos

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

  // Bike hero — single-bike viewer index. Left/right arrows step through
  // BIKE_CATALOG one bike at a time and auto-select the current one.
  const [heroIndex, setHeroIndex] = useState(0)
  const heroBike = BIKE_CATALOG[heroIndex]
  function prevBike() {
    const next = (heroIndex - 1 + BIKE_CATALOG.length) % BIKE_CATALOG.length
    setHeroIndex(next)
    pickCatalogBike(BIKE_CATALOG[next])
  }
  function nextBike() {
    const next = (heroIndex + 1) % BIKE_CATALOG.length
    setHeroIndex(next)
    pickCatalogBike(BIKE_CATALOG[next])
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
      if (u.phone && !whatsapp) setWhatsApp('+' + u.phone)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      ownerLanguages: [],
      ownerResponseTimeMin: null,
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
      securityDepositIdr: null,
      driverRatePerDayIdr: rentalMode !== 'self_ride' && driverRate ? num(driverRate) : null,
      helmetCount: num(helmetCount),
      raincoatCount: num(raincoatCount),
      hasPhoneHolder: false,
      hasPhoneCharger: false,
      hasDeliveryBox: false,
      readyToWork: false,
      deliversToHotel: deliveryHotelVilla,
      deliversToVilla: deliveryHotelVilla,
      pickupDropoff: deliveryHotelVilla,
      rentalMode,
      city: city === '__other__' ? (slugify(customCity) || 'lainnya') : city,
      address: address || null,
      lat: Number.isFinite(latN) ? latN : 0,
      lng: Number.isFinite(lngN) ? lngN : 0,
      imageUrls: selectedCatalog ? [selectedCatalog.imageUrl] : [],
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
    ownerName, ownerCompany, whatsapp,
    brand, model, year, cc, transmission, color,
    dailyPrice, weeklyPrice, monthlyPrice, driverRate,
    helmetCount, raincoatCount, deliveryHotelVilla,
    rentalMode, city, customCity, address, lat, lng, selectedCatalog,
  ])

  async function useMyGps() {
    const coords = await geo.request()
    if (!coords) return
    setLat(coords.lat.toFixed(6))
    setLng(coords.lng.toFixed(6))
    // Reverse-geocode so the address text auto-fills from the GPS fix.
    // Best-effort: if the lookup fails we keep the coords and let the
    // user type the address by hand.
    try {
      const res = await fetch(`/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`, { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json() as { display_name?: string | null }
        if (j.display_name) setAddress(j.display_name)
      }
    } catch { /* offline / network blip — silent fallback */ }
  }

  function onAddressPick(s: PlaceSuggestion) {
    setAddress(s.label && s.detail ? `${s.label}, ${s.detail}` : s.detail || s.label)
    setLat(s.lat.toFixed(6))
    setLng(s.lng.toFixed(6))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!supabase) { setSubmitError('Supabase not configured.'); return }
    if (!ownerName.trim() || !whatsapp.trim() || !brand.trim() || !model.trim() || !dailyPrice) {
      setSubmitError('Lengkapi nama, WhatsApp, brand, model, dan harga harian.')
      return
    }
    if (city === '__other__' && !customCity.trim()) {
      setSubmitError('Tulis nama kota / area kamu.')
      return
    }
    const latN = parseFloat(lat); const lngN = parseFloat(lng)
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) { setSubmitError('Set lokasi GPS atau pilih alamat dari saran.'); return }
    if (!authedUserId) {
      setSubmitError('Sesi habis — silakan login ulang.')
      router.replace('/login?next=/rent/list/new')
      return
    }

    // ── Quota gate ────────────────────────────────────────────────────
    // Personal accounts can hold 1 rental at a time. Lapsed rental_company
    // accounts can't add new listings until they renew.
    setSubmitting(true)
    try {
      const { data: acct } = await supabase
        .from('user_accounts')
        .select('account_type, subscription_status, subscription_expires_at')
        .eq('user_id', authedUserId)
        .maybeSingle()
      const accountType = (acct?.account_type as string | undefined) ?? 'personal'
      const subExpired = !acct?.subscription_expires_at
        || new Date(acct.subscription_expires_at as string).getTime() <= Date.now()
      const subActive  = acct?.subscription_status === 'active' && !subExpired

      const { count: ownedCount } = await supabase
        .from('bike_rentals')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', authedUserId)
        .in('status', ['pending', 'approved', 'paused'])

      if (accountType === 'personal' && (ownedCount ?? 0) >= 1) {
        setSubmitting(false)
        setSubmitError('QUOTA_PERSONAL')
        return
      }
      if (accountType === 'rental_company' && !subActive) {
        setSubmitting(false)
        setSubmitError('SUBSCRIPTION_LAPSED')
        return
      }
    } catch { /* fail-open: don't block submit on a quota-read error */ }

    try {
      const num = (s: string) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0
      const slug = `${slugify(`${brand}-${model}`)}-${submissionIdRef.current.slice(0, 8)}`
      const { error } = await supabase.from('bike_rentals').insert({
        slug,
        owner_user_id: authedUserId,
        owner_name: ownerName.trim(),
        owner_company: ownerCompany.trim() || null,
        owner_whatsapp_e164: normaliseWhatsApp(whatsapp),
        owner_languages: [],
        owner_response_time_min: null,
        brand: brand.trim(),
        model: model.trim(),
        year: num(year),
        cc: num(cc),
        transmission,
        color: color.trim() || null,
        daily_price_idr: num(dailyPrice),
        weekly_price_idr: weeklyPrice ? num(weeklyPrice) : null,
        monthly_price_idr: monthlyPrice ? num(monthlyPrice) : null,
        security_deposit_idr: null,
        driver_rate_per_day_idr: rentalMode !== 'self_ride' && driverRate ? num(driverRate) : null,
        helmet_count: num(helmetCount),
        raincoat_count: num(raincoatCount),
        has_phone_holder: false,
        has_phone_charger: false,
        has_delivery_box: false,
        ready_to_work: false,
        delivers_to_hotel: deliveryHotelVilla,
        delivers_to_villa: deliveryHotelVilla,
        pickup_dropoff: deliveryHotelVilla,
        rental_mode: rentalMode,
        city: city === '__other__' ? (slugify(customCity) || 'lainnya') : city,
        address: address.trim() || null,
        location: `SRID=4326;POINT(${lngN} ${latN})`,
        lat: latN, lng: lngN,
        image_urls: selectedCatalog ? [selectedCatalog.imageUrl] : [],
        status: 'pending',
        submitted_name: ownerName.trim(),
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

        {/* BIKE HERO — single-bike viewer with yellow left/right arrow
            navigation. Arrows auto-select the current bike (also
            auto-fills brand / model / cc / transmission). Tapping the
            bike re-confirms the selection. No card chrome — image
            sits on the page background. */}
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand">
              Pick your bike
            </span>
            <span className="text-[12px] text-muted font-bold">
              {heroIndex + 1} / {BIKE_CATALOG.length}
            </span>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={prevBike}
              aria-label="Previous bike"
              className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-bg active:scale-95 transition"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                border: '1px solid rgba(0,0,0,0.85)',
                minHeight: 44,
              }}
            >
              <ChevronLeft className="w-6 h-6" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => pickCatalogBike(heroBike)}
              className="flex-1 min-w-0 flex flex-col items-center text-center"
              aria-label={`Pick ${heroBike.brand} ${heroBike.model}`}
            >
              <img
                src={heroBike.imageUrl}
                alt={`${heroBike.brand} ${heroBike.model}`}
                className="w-full h-[180px] sm:h-[220px] object-contain"
              />
              <div className={`mt-2 text-[18px] font-extrabold leading-tight ${selectedCatalogId === heroBike.id ? 'text-brand' : 'text-ink'}`}>
                {heroBike.brand} {heroBike.model}
              </div>
              <div className="mt-0.5 text-[12px] text-muted font-bold">
                {heroBike.bikeType === 'electric'
                  ? 'Electric'
                  : `${heroBike.cc}cc · ${heroBike.transmission === 'manual' ? 'Manual' : heroBike.transmission === 'automatic' ? 'Auto' : 'Semi'}`} · {heroBike.bikeType}
              </div>
            </button>
            <button
              type="button"
              onClick={nextBike}
              aria-label="Next bike"
              className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-bg active:scale-95 transition"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                border: '1px solid rgba(0,0,0,0.85)',
                minHeight: 44,
              }}
            >
              <ChevronRight className="w-6 h-6" strokeWidth={3} />
            </button>
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
            <Field label="WhatsApp *">
              <div className="flex items-stretch">
                <span
                  aria-hidden
                  className="inline-flex items-center px-3 text-bg font-extrabold text-[14px] border border-r-0 border-black/85 rounded-l-xl"
                  style={{ background: 'rgba(250,204,21,0.18)' }}
                >
                  +62
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={whatsapp.replace(/^\+?62/, '').replace(/^0+/, '')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, '').replace(/^0+/, '')
                    setWhatsApp(digits ? `+62${digits}` : '')
                  }}
                  placeholder="81234567890"
                  className="flex-1 bg-bg text-ink placeholder:text-white/40 border border-black/85 rounded-r-xl px-3 py-2.5 text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-bg/40 transition"
                  required
                />
              </div>
            </Field>
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
            <div className="grid grid-cols-2 gap-2">
              {(['self_ride','with_driver'] as RentalMode[]).map((m) => (
                <button key={m} type="button" onClick={() => setRentalMode(m)}
                  className={`px-2 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition border ${rentalMode === m ? 'bg-bg text-brand border-black/85' : 'bg-bg/15 text-bg/75 border-bg/40 hover:bg-bg/30 hover:text-bg'}`}
                  style={{ minHeight: 44 }}>
                  {m === 'self_ride' ? 'Bike only' : 'Bike + Driver'}
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
            {rentalMode !== 'self_ride' && (
              <Field label="Driver rate / hari (jika dengan driver) *"><input type="number" min="0" value={driverRate} onChange={(e) => setDriverRate(e.target.value)} className={inputClass} /></Field>
            )}
          </SectionCard>

          {/* INCLUSIONS — helmet/raincoat counts (each with its brand icon)
              and a single combined delivery toggle for Hotel/Villa pickup. */}
          <SectionCard Icon={Backpack} title="Kelengkapan">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Helmet ×">
                <div className="flex items-center gap-2">
                  <img src={HELMET_ICON} alt="" aria-hidden className="w-6 h-6 object-contain shrink-0" />
                  <input type="number" min="0" max="5" value={helmetCount} onChange={(e) => setHelmetCount(e.target.value)} className={inputClass} />
                </div>
              </Field>
              <Field label="Raincoat ×">
                <div className="flex items-center gap-2">
                  <img src={RAINCOAT_ICON} alt="" aria-hidden className="w-8 h-8 object-contain shrink-0" />
                  <input type="number" min="0" max="5" value={raincoatCount} onChange={(e) => setRaincoatCount(e.target.value)} className={inputClass} />
                </div>
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <img src={PICKUP_ICON} alt="" aria-hidden className="w-8 h-8 object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <Toggle checked={deliveryHotelVilla} onChange={setDeliveryHotelVilla} label="Hotel / Villa" />
              </div>
            </div>
          </SectionCard>

          {/* LOCATION — GPS button sets coords + auto-fills address via
              reverse geocode. Address input also accepts typed text with
              up to 3 OSM auto-suggest results; picking one re-syncs coords. */}
          <SectionCard Icon={MapPin} title="Lokasi">
            <Field label="Kota *">
              <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
                {SUPPORTED_CITIES.map((c) => (<option key={c.slug} value={c.slug}>{c.label}</option>))}
              </select>
            </Field>
            {city === '__other__' && (
              <Field label="Tulis kota / area *">
                <input
                  type="text"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="Mis: Karimunjawa, Pulau Weh, Sumba Barat…"
                  className={inputClass}
                  required
                />
              </Field>
            )}

            <button
              type="button"
              onClick={useMyGps}
              disabled={geo.status === 'requesting'}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)', minHeight: 48 }}
            >
              {geo.status === 'requesting'
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Mencari lokasi…</>
                : <><MapPin className="w-5 h-5" /> Set lokasi dari GPS</>}
            </button>

            <Field label="Alamat pickup">
              <PlaceAutocomplete
                value={address}
                onChange={setAddress}
                onSelect={onAddressPick}
                placeholder="Ketik alamat / area — pilih dari saran"
                className={inputClass}
                countryCodes={['id']}
                maxResults={3}
                ariaLabel="Alamat pickup"
              />
            </Field>

            {(lat || lng) && (
              <div className="text-[11px] text-bg/70 font-bold leading-tight">
                Koordinat: {lat || '—'}, {lng || '—'}
              </div>
            )}
          </SectionCard>

          {submitError === 'QUOTA_PERSONAL' && (
            <div className="rounded-xl p-4 bg-yellow-900/20 border border-yellow-500/50 space-y-2">
              <div className="text-[14px] font-extrabold text-brand">Listing kamu sudah penuh (1 motor untuk akun personal)</div>
              <p className="text-[12px] text-bg/80 leading-snug">
                Upgrade ke akun <strong>Rental Bike Company</strong> untuk listing tanpa batas. Mulai dari Rp 38.000/bulan atau Rp 350.000/tahun.
              </p>
              <Link href="/rent/upgrade" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[13px] uppercase tracking-wider border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99]">
                Upgrade akun
              </Link>
            </div>
          )}
          {submitError === 'SUBSCRIPTION_LAPSED' && (
            <div className="rounded-xl p-4 bg-yellow-900/20 border border-yellow-500/50 space-y-2">
              <div className="text-[14px] font-extrabold text-brand">Subscription Rental Company kamu sudah lewat</div>
              <p className="text-[12px] text-bg/80 leading-snug">
                Renew untuk lanjut listing motor baru dan menghidupkan kembali listing yang dipause.
              </p>
              <Link href="/rent/upgrade" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[13px] uppercase tracking-wider border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99]">
                Renew sekarang
              </Link>
            </div>
          )}
          {submitError && submitError !== 'QUOTA_PERSONAL' && submitError !== 'SUBSCRIPTION_LAPSED' && (
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
