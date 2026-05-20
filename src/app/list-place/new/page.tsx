'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, X as XIcon, MapPin, CheckCircle2, Loader2, User, Store, Camera, Tag } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import PlaceCard from '@/components/places/PlaceCard'
import { CATEGORIES, GROUPS } from '@/lib/places/categories'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { Place, PlaceCategory } from '@/lib/places/types'

// Vocabulary of tags the form can apply. Mirrors the seeded set so admin
// + UI logic stay consistent.
const TAGS = [
  { id: 'halal',         label: 'Halal' },
  { id: 'vegetarian',    label: 'Vegetarian' },
  { id: 'open_24h',      label: 'Open 24 jam' },
  { id: 'open_late',     label: 'Buka larut' },
  { id: 'family',        label: 'Family-friendly' },
  { id: 'english_spoken',label: 'English spoken' },
  { id: 'nightlife',     label: 'Nightlife' },
  { id: 'tourist',       label: 'Tourist' },
] as const

const SUPPORTED_CITIES = [
  'yogyakarta','jakarta','bandung','surabaya','denpasar','medan','semarang',
  'makassar','malang','solo','bogor','depok','bekasi','tangerang','palembang',
  'padang','manado','balikpapan','pontianak','banjarmasin',
]

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function normaliseWhatsApp(input: string): string {
  let v = input.replace(/[^\d+]/g, '')
  if (v.startsWith('08')) v = '+62' + v.slice(1)
  else if (v.startsWith('62')) v = '+' + v
  else if (!v.startsWith('+')) v = '+' + v
  return v
}

export default function ListPlaceNewPage() {
  const router = useRouter()
  const supabase = getBrowserSupabase()
  const geo = useGeolocation(false)

  // Form state — flat for simplicity. A real product would split into
  // sub-objects, but a single state object reads cleanly here.
  const [name, setName]               = useState('')
  const [category, setCategory]       = useState<PlaceCategory>('restaurant')
  const [description, setDescription] = useState('')
  const [address, setAddress]         = useState('')
  const [city, setCity]               = useState('yogyakarta')
  const [lat, setLat]                 = useState('')
  const [lng, setLng]                 = useState('')
  const [ownerName, setOwnerName]     = useState('')
  const [whatsapp, setWhatsApp]       = useState('')
  const [email, setEmail]             = useState('')
  const [tags, setTags]               = useState<string[]>([])
  const [photos, setPhotos]           = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError]   = useState<string | null>(null)
  const submissionIdRef = useRef<string>(crypto.randomUUID())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Auth gate — listings are now tied to the submitter via owner_user_id so
  // they can self-manage on /dashboard/places. If signed out, bounce to
  // /login with a returnTo back to this page so the flow is one round-trip.
  const [authedUserId, setAuthedUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) {
        router.replace('/login?next=/list-place/new')
        return
      }
      setAuthedUserId(u.id)
      // Prefill contact fields from the user's metadata for convenience.
      const meta = u.user_metadata ?? {}
      if (meta.full_name && !ownerName) setOwnerName(String(meta.full_name))
      if (u.email && !email) setEmail(u.email)
      if (u.phone && !whatsapp) setWhatsApp('+' + u.phone)
      setAuthLoading(false)
    })
  // ownerName/email/whatsapp intentionally excluded — prefill runs once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleTag(id: string) {
    setTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  // Build a Place-shaped object from the current form state so the live
  // preview at the top renders the exact card the user will publish.
  const previewPlace: Place = useMemo(() => {
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    return {
      id: submissionIdRef.current,
      slug: slugify(name) || 'preview',
      name: name || 'Nama tempat',
      category,
      description: description || null,
      imageUrls: photos,
      lat: Number.isFinite(latN) ? latN : 0,
      lng: Number.isFinite(lngN) ? lngN : 0,
      city,
      address: address || null,
      tags,
      isOutOfZone: false,
      returnKm: 0,
    }
  }, [name, category, description, photos, lat, lng, city, address, tags])

  async function useMyGps() {
    const coords = await geo.request()
    if (!coords) return
    setLat(coords.lat.toFixed(6))
    setLng(coords.lng.toFixed(6))
  }

  async function handlePhotoPick(files: FileList | null) {
    if (!files || !files.length) return
    if (!supabase) { setPhotoError('Supabase not configured'); return }
    setPhotoError(null)
    setPhotoUploading(true)
    const uploaded: string[] = []
    try {
      for (const file of Array.from(files)) {
        if (photos.length + uploaded.length >= 5) break
        if (file.size > 5 * 1024 * 1024) {
          setPhotoError(`${file.name} is too large (max 5MB)`)
          continue
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const safeExt = ['jpg','jpeg','png','webp'].includes(ext) ? ext : 'jpg'
        const path = `submissions/${submissionIdRef.current}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`
        const { error } = await supabase.storage
          .from('place-images')
          .upload(path, file, { contentType: file.type, upsert: false })
        if (error) {
          setPhotoError(error.message)
          continue
        }
        const { data: pub } = supabase.storage.from('place-images').getPublicUrl(path)
        uploaded.push(pub.publicUrl)
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 5))
    } finally {
      setPhotoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!supabase) {
      setSubmitError('Supabase not configured.')
      return
    }
    if (!name.trim() || !ownerName.trim() || !email.trim() || !whatsapp.trim()) {
      setSubmitError('Lengkapi nama tempat, nama pemilik, email, dan WhatsApp.')
      return
    }
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      setSubmitError('Atur titik lokasi (latitude + longitude).')
      return
    }
    if (!SUPPORTED_CITIES.includes(city)) {
      setSubmitError(`Kota "${city}" belum didukung.`)
      return
    }

    if (!authedUserId) {
      setSubmitError('Sesi habis — silakan login ulang.')
      router.replace('/login?next=/list-place/new')
      return
    }

    setSubmitting(true)
    try {
      const slug = `${slugify(name)}-${submissionIdRef.current.slice(0, 8)}`
      const wkb = `SRID=4326;POINT(${lngN} ${latN})`
      const { error } = await supabase.from('places').insert({
        slug,
        name: name.trim(),
        category,
        description: description.trim() || null,
        image_urls: photos,
        location: wkb,
        lat: latN,
        lng: lngN,
        city,
        address: address.trim() || null,
        whatsapp_e164: normaliseWhatsApp(whatsapp),
        tags,
        status: 'pending',
        owner_user_id: authedUserId,
        submitted_name: ownerName.trim(),
        submitted_email: email.trim(),
        submitted_whatsapp: normaliseWhatsApp(whatsapp),
      })
      if (error) {
        // 23505 = unique_violation — dedup index from migration 0011 caught
        // a second pending listing for the same (owner, city).
        if (error.code === '23505') {
          setSubmitError('Kamu sudah punya listing pending di kota ini. Tunggu admin review atau edit yang ada di /dashboard/places.')
        } else {
          throw error
        }
        setSubmitting(false)
        return
      }
      router.push('/list-place/submitted')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat submit.'
      setSubmitError(msg)
      setSubmitting(false)
    }
  }

  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 pt-3 pb-24">
        <Link
          href="/list-place"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* LIVE PREVIEW — pinned to the top so owners see the exact card
            shape as they fill in fields below. The PlaceCard re-renders
            on every state change via previewPlace; the detail panel
            below it surfaces fields that don't appear on the public card
            (description, address, owner contact) so EVERY input has a
            visible echo in the preview area. */}
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand">
              Live Preview
            </span>
            <span className="text-[12px] text-muted font-bold">
              Updates as you type · ini tampilan kartumu di /places
            </span>
          </div>
          <PlaceCard
            place={previewPlace}
            quote={null}
            onVisit={() => {}}
            currentCity={city}
          />

          {/* Detail panel — mirrors fields that aren't on the public
              card so the user can verify everything they've typed. */}
          <div className="mt-2 p-3 rounded-xl bg-black/55 border border-white/10 text-[13px] space-y-1.5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-dim">
              Submission summary
            </div>
            {description && (
              <div><span className="text-muted font-bold">Description:</span> <span className="text-ink">{description}</span></div>
            )}
            {address && (
              <div><span className="text-muted font-bold">Address:</span> <span className="text-ink">{address}</span></div>
            )}
            {(lat || lng) && (
              <div><span className="text-muted font-bold">Coords:</span> <span className="text-ink font-mono">{lat || '—'}, {lng || '—'}</span></div>
            )}
            {ownerName && (
              <div><span className="text-muted font-bold">Owner:</span> <span className="text-ink">{ownerName}</span></div>
            )}
            {whatsapp && (
              <div><span className="text-muted font-bold">WhatsApp:</span> <span className="text-ink font-mono">{normaliseWhatsApp(whatsapp)}</span></div>
            )}
            {email && (
              <div><span className="text-muted font-bold">Email:</span> <span className="text-ink">{email}</span></div>
            )}
            {!description && !address && !lat && !lng && !ownerName && !whatsapp && !email && (
              <div className="text-muted text-[12px] italic">
                Start filling fields below — your data will appear here in real time.
              </div>
            )}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* OWNER */}
          <SectionCard Icon={User} title="Owner">
            <Field label="Nama pemilik *">
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="WhatsApp * (08… atau +62…)">
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsApp(e.target.value)}
                placeholder="081234567890"
                className={inputClass}
                required
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
          </SectionCard>

          {/* PLACE */}
          <SectionCard Icon={Store} title="Tempat">
            <Field label="Nama tempat *">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                required
                maxLength={80}
              />
            </Field>
            <Field label="Kategori *">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PlaceCategory)}
                className={inputClass}
              >
                {GROUPS.map((g) => (
                  <optgroup key={g.id} label={g.labelEn}>
                    {g.categories.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORIES[c].label} · {CATEGORIES[c].labelEn}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Deskripsi singkat">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={200}
                className={inputClass}
              />
            </Field>
          </SectionCard>

          {/* LOCATION */}
          <SectionCard Icon={MapPin} title="Lokasi">
            <Field label="Kota *">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              >
                {SUPPORTED_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c[0]!.toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Alamat">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude *">
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="-7.7956"
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Longitude *">
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="110.3695"
                  className={inputClass}
                  required
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={useMyGps}
              className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-bg bg-bg/0 hover:bg-bg/10 px-2 py-1 rounded-md border border-bg/30"
            >
              <MapPin className="w-3.5 h-3.5" />
              {geo.status === 'requesting' ? 'Mencari lokasi…' : 'Pakai lokasi GPS saya'}
            </button>
          </SectionCard>

          {/* PHOTOS */}
          <SectionCard Icon={Camera} title="Foto (1–5)">
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url) => (
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    aria-label="Remove photo"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/85 text-white flex items-center justify-center hover:bg-black"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-brand/40 bg-black/40 hover:bg-black/55 flex flex-col items-center justify-center gap-1 text-brand text-[11px] font-extrabold uppercase tracking-wider disabled:opacity-60"
                >
                  {photoUploading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Upload className="w-5 h-5" />}
                  <span>{photoUploading ? 'Upload…' : 'Tambah'}</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => handlePhotoPick(e.target.files)}
            />
            {photoError && <p className="text-[12px] text-red-900 font-extrabold">{photoError}</p>}
          </SectionCard>

          {/* TAGS */}
          <SectionCard Icon={Tag} title="Tag">
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => {
                const active = tags.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-extrabold transition border ${
                      active
                        ? 'bg-bg text-brand border-black/85'
                        : 'bg-bg/15 text-bg/75 border-bg/40 hover:bg-bg/30 hover:text-bg'
                    }`}
                    style={{ minHeight: 36 }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </SectionCard>

          {/* SUBMIT */}
          {submitError && (
            <div className="rounded-xl p-3 bg-red-900/30 border border-red-500/40 text-[13px] text-red-200 font-bold">
              {submitError}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              : <><CheckCircle2 className="w-4 h-4" /> Submit listing</>}
          </button>
          <p className="text-[12px] text-muted leading-snug text-center">
            Submission akan ditinjau oleh admin dalam 24–48 jam.
            Setelah disetujui kamu mendapat <strong className="text-ink">GRATIS 7 hari</strong>, lalu
            <strong className="text-ink"> Rp 38.000/bulan</strong> atau <strong className="text-ink">Rp 350.000/tahun</strong> untuk tetap tayang.
          </p>
        </form>
      </main>
    </>
  )
}

// Dark input on the yellow section card. Background is near-black with
// a thin black rim to read against the brand-yellow container.
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

// Each form section renders as a yellow gradient card with an icon-led
// header — visually scopes the fields and makes section boundaries clear.
function SectionCard({
  Icon, title, children,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl p-3 bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_14px_rgba(250,204,21,0.30)]">
      <header className="flex items-center gap-2 mb-2">
        <span
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-bg/85"
          aria-hidden
        >
          <Icon className="w-4 h-4 text-brand" strokeWidth={2.75} />
        </span>
        <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-bg">{title}</h3>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
