'use client'
import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, CheckCircle2, Upload, X as XIcon, Camera } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { CATEGORIES, GROUPS } from '@/lib/places/categories'
import type { PlaceCategory } from '@/lib/places/types'

// Owner-facing edit page. PATCHes /api/places/[id] which enforces
// owner-scoped RLS at the DB level (migration 0011). Status, paid_until,
// listing_tier, verified, rejection_note are NEVER touched here.

type PlaceRow = {
  id: string
  name: string
  category: PlaceCategory
  description: string | null
  image_urls: string[] | null
  address: string | null
  city: string
  lat: number
  lng: number
  whatsapp_e164: string | null
  tags: string[] | null
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
}

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

function normaliseWhatsApp(input: string): string {
  let v = input.replace(/[^\d+]/g, '')
  if (v.startsWith('08')) v = '+62' + v.slice(1)
  else if (v.startsWith('62')) v = '+' + v
  else if (!v.startsWith('+')) v = '+' + v
  return v
}

export default function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = getBrowserSupabase()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [row, setRow] = useState<PlaceRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Editable state — initialised from fetched row.
  const [name, setName]               = useState('')
  const [category, setCategory]       = useState<PlaceCategory>('restaurant')
  const [description, setDescription] = useState('')
  const [address, setAddress]         = useState('')
  const [whatsapp, setWhatsApp]       = useState('')
  const [tags, setTags]               = useState<string[]>([])
  const [photos, setPhotos]           = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError]   = useState<string | null>(null)

  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  // Fetch row — RLS scopes to owner so a 404 means "not yours."
  useEffect(() => {
    if (!supabase) { setError('Supabase not configured.'); setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace(`/login?next=/dashboard/places/${id}/edit`)
        return
      }
      const { data, error } = await supabase
        .from('places')
        .select('id, name, category, description, image_urls, address, city, lat, lng, whatsapp_e164, tags, status')
        .eq('id', id)
        .maybeSingle()
      if (cancelled) return
      if (error)   { setError(error.message); setLoading(false); return }
      if (!data)   { setError('Listing not found, or not yours to edit.'); setLoading(false); return }
      const p = data as PlaceRow
      setRow(p)
      setName(p.name ?? '')
      setCategory(p.category)
      setDescription(p.description ?? '')
      setAddress(p.address ?? '')
      setWhatsApp(p.whatsapp_e164 ?? '')
      setTags(p.tags ?? [])
      setPhotos(p.image_urls ?? [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

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
        const path = `submissions/${row.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`
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
      const res = await fetch(`/api/places/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          image_urls: photos,
          address: address.trim() || null,
          whatsapp_e164: whatsapp ? normaliseWhatsApp(whatsapp) : null,
          tags,
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
          <Link href="/dashboard/places" className="text-brand font-bold">← Back to my places</Link>
        </main>
      </>
    )
  }

  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 pt-3 pb-32">
        <Link
          href="/dashboard/places"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          My places
        </Link>

        <header className="mb-5">
          <h1 className="text-[22px] sm:text-[26px] font-extrabold tracking-tight leading-tight">
            Edit <span className="gradient-text">{name || 'place'}</span>
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
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 border border-white/20 flex items-center justify-center"
                  >
                    <XIcon className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl bg-black/40 border border-dashed border-white/15 aspect-square flex flex-col items-center justify-center gap-1 text-muted hover:text-brand transition"
                  disabled={photoUploading}
                >
                  {photoUploading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Upload className="w-4 h-4" />}
                  <span className="text-[11px] font-bold">Add</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handlePhotoPick(e.target.files)}
              />
            </div>
            {photoError && <p className="text-[12px] text-red-400">{photoError}</p>}
            <p className="text-[11px] text-dim">Max 5 photos, 5MB each.</p>
          </section>

          {/* Basics */}
          <section className="card p-4 space-y-3">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">Details</h2>
            <div>
              <label className="label">Place name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as PlaceCategory)}>
                {GROUPS.map((g) => (
                  <optgroup key={g.id} label={g.label}>
                    {g.categories.map((cid) => (
                      <option key={cid} value={cid}>{CATEGORIES[cid].label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-[80px]"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Apa yang bikin tempatmu istimewa?"
              />
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input
                className="input font-mono"
                placeholder="6281234567890"
                value={whatsapp}
                onChange={(e) => setWhatsApp(e.target.value)}
              />
            </div>
          </section>

          {/* Tags */}
          <section className="card p-4 space-y-3">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-dim">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => {
                const active = tags.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-extrabold border transition"
                    style={{
                      background: active ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)',
                      borderColor: active ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.10)',
                      color: active ? '#FACC15' : 'rgba(255,255,255,0.70)',
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </section>

          {error && (
            <div className="rounded-xl p-3 bg-red-900/30 border border-red-500/40 text-[13px] text-red-200 font-bold">
              {error}
            </div>
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
