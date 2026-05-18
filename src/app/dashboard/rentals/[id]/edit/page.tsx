'use client'
import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, Upload, X as XIcon, Camera, Banknote, Bike, Settings2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import type { RentalMode, Transmission } from '@/lib/rentals/types'

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
                <label className="label">Color</label>
                <input className="input" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[80px]" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </section>

          {/* Pricing */}
          <section className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-brand" />
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">Pricing (IDR)</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">Daily *</label><input className="input font-mono" value={dailyPrice} onChange={(e) => setDailyPrice(e.target.value)} required /></div>
              <div><label className="label">Weekly</label><input className="input font-mono" value={weeklyPrice} onChange={(e) => setWeeklyPrice(e.target.value)} /></div>
              <div><label className="label">Monthly</label><input className="input font-mono" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} /></div>
              <div><label className="label">Deposit</label><input className="input font-mono" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
            </div>
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
