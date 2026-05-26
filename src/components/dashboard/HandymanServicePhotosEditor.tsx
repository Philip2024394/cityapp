'use client'
import { useState } from 'react'
import { Upload, X, Plus } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Flat-list portfolio editor for the handyman dashboard. Mirrors the
// beautician version visually but stores photos as a single ordered
// array (no grouping by service) — matches handyman_providers.service_photos
// shape from mig 0089. Each photo carries:
//   url, name, description, price_idr, before/after_image_url, object_position.
//
// Photos go into the same `profile-images` storage bucket as the avatar
// / cover / gallery, under a per-user "services" subfolder.

export type HandymanServicePhoto = {
  url:                string
  name?:              string | null
  description?:       string | null
  price_idr?:         number | null
  before_image_url?:  string | null
  after_image_url?:   string | null
  object_position?:   string | null
}

const MAX_BYTES_PER_FILE = 6 * 1024 * 1024
const MIME_RE            = /^image\/(jpeg|jpg|png|webp)$/
const MAX_PHOTOS         = 12
const MAX_DESCRIPTION    = 500
const MAX_NAME           = 60

export default function HandymanServicePhotosEditor({
  userId, value, onChange,
}: {
  userId: string
  value: HandymanServicePhoto[]
  onChange: (next: HandymanServicePhoto[]) => void
}) {
  const photos = normalisePhotos(value)
  const remaining = Math.max(0, MAX_PHOTOS - photos.length)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    if (files.length > remaining) { setErr(`Can upload max ${remaining} more.`); return }
    for (const f of files) {
      if (f.size > MAX_BYTES_PER_FILE) { setErr(`"${f.name}" is too large (max 6MB).`); return }
      if (!MIME_RE.test(f.type))        { setErr(`"${f.name}" — JPG/PNG/WEBP only.`); return }
    }

    setUploading(true); setErr(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setErr('Not connected to server.'); setUploading(false); return }

    const uploaded: HandymanServicePhoto[] = []
    for (const f of files) {
      const ext  = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/services/handyman/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('profile-images')
        .upload(path, f, { upsert: false, contentType: f.type })
      if (error) { setErr(`Upload of "${f.name}" failed: ${error.message}`); continue }
      const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path)
      if (pub?.publicUrl) uploaded.push({ url: pub.publicUrl })
    }
    setUploading(false)
    if (uploaded.length > 0) onChange([...photos, ...uploaded])
    e.target.value = ''
  }

  async function removeAt(idx: number) {
    const photo = photos[idx]
    if (!photo) return
    const supabase = getBrowserSupabase()
    if (supabase && photo.url.includes('/storage/v1/object/public/profile-images/')) {
      const i = photo.url.indexOf('/profile-images/')
      if (i !== -1) {
        const objectPath = photo.url.slice(i + '/profile-images/'.length)
        await supabase.storage.from('profile-images').remove([objectPath]).catch(() => {})
      }
    }
    onChange(photos.filter((_, j) => j !== idx))
  }

  function updateMeta(idx: number, patch: Partial<HandymanServicePhoto>) {
    onChange(photos.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  // Inline beforeAfter uploader — invoked for both before_image_url and
  // after_image_url slots. Returns the public URL after upload.
  async function uploadCompareImage(idx: number, slot: 'before' | 'after', file: File) {
    if (file.size > MAX_BYTES_PER_FILE) { setErr('File too large (max 6MB).'); return }
    if (!MIME_RE.test(file.type))        { setErr('JPG/PNG/WEBP only.');        return }
    const supabase = getBrowserSupabase()
    if (!supabase) { setErr('Not connected.'); return }
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${userId}/services/handyman/compare/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('profile-images').upload(path, file, { contentType: file.type, upsert: false })
    if (error) { setErr(`Compare upload failed: ${error.message}`); return }
    const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path)
    if (!pub?.publicUrl) { setErr('Could not derive URL.'); return }
    if (slot === 'before') updateMeta(idx, { before_image_url: pub.publicUrl })
    else                   updateMeta(idx, { after_image_url:  pub.publicUrl })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-black text-white">Portfolio photos</div>
        <div className="text-[12px] font-bold text-white/55 tabular-nums">{photos.length}/{MAX_PHOTOS}</div>
      </div>

      <div className="space-y-3">
        {photos.map((photo, i) => (
          <div
            key={photo.url + i}
            className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
          >
            <div className="flex gap-3">
              <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-white/15 bg-black/30">
                <img src={photo.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Delete photo"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white/90 border border-white/20 hover:text-rose-300 hover:border-rose-400/60 flex items-center justify-center shadow-sm"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  type="text"
                  maxLength={MAX_NAME}
                  value={photo.name ?? ''}
                  onChange={(e) => updateMeta(i, { name: e.target.value })}
                  placeholder="Name (e.g. AC Service – kost)"
                  className={inputCls}
                />
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={photo.price_idr ? photo.price_idr / 1000 : ''}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '') { updateMeta(i, { price_idr: null }); return }
                      const n = Number(v)
                      if (Number.isFinite(n) && n >= 0 && n <= 9999) {
                        updateMeta(i, { price_idr: Math.round(n * 1000) })
                      }
                    }}
                    placeholder="Starting price (k)"
                    className={inputCls + ' pr-7'}
                  />
                  <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-white/50 pointer-events-none select-none">k</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <textarea
                maxLength={MAX_DESCRIPTION}
                rows={2}
                value={photo.description ?? ''}
                onChange={(e) => updateMeta(i, { description: e.target.value })}
                placeholder="Description (max 500 chars). Tip: include the specialty name so the chip filter on /handyman/[slug] highlights this photo."
                className={inputCls + ' resize-none'}
              />
              <div className="text-[11px] text-white/40 text-right tabular-nums">
                {(photo.description ?? '').length}/{MAX_DESCRIPTION}
              </div>
            </div>

            {/* Optional before / after pair — same UX as beautician's
                "Compare" section in the public View Details popup. */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <CompareSlot
                label="Before"
                url={photo.before_image_url ?? null}
                onUpload={(f) => uploadCompareImage(i, 'before', f)}
                onClear={() => updateMeta(i, { before_image_url: null })}
              />
              <CompareSlot
                label="After"
                url={photo.after_image_url ?? null}
                onUpload={(f) => uploadCompareImage(i, 'after', f)}
                onClear={() => updateMeta(i, { after_image_url: null })}
              />
            </div>
          </div>
        ))}

        {remaining > 0 && (
          <label className="block rounded-xl border-2 border-dashed border-yellow-400/50 bg-yellow-500/10 px-4 py-5 text-center text-yellow-200 hover:bg-yellow-500/15 hover:border-yellow-400 transition cursor-pointer">
            {uploading
              ? <Upload className="w-4 h-4 inline animate-pulse" />
              : <Plus className="w-4 h-4 inline" strokeWidth={2.5} />}
            <span className="ml-1.5 text-[13px] font-extrabold">
              {uploading ? 'Uploading…' : `Add photo (${remaining} left)`}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={remaining > 1}
              onChange={pick}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {err && (
        <div className="rounded-lg border border-rose-400/50 bg-rose-500/15 text-rose-100 text-[12px] px-2.5 py-1.5">
          {err}
        </div>
      )}
    </div>
  )
}

function CompareSlot({
  label, url, onUpload, onClear,
}: {
  label:    string
  url:      string | null
  onUpload: (file: File) => void
  onClear:  () => void
}) {
  return (
    <div className="relative aspect-square rounded-lg border border-white/15 bg-black/30 overflow-hidden">
      {url ? (
        <>
          <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute top-1 left-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-black bg-white/90">
            {label}
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label={`Remove ${label}`}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white/90 border border-white/20 flex items-center justify-center"
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </>
      ) : (
        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-[11px] font-extrabold text-white/70 hover:text-white">
          <Plus className="w-4 h-4 mb-0.5" strokeWidth={2.5} />
          {label}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
            className="hidden"
          />
        </label>
      )}
    </div>
  )
}

function normalisePhotos(raw: unknown): HandymanServicePhoto[] {
  if (!Array.isArray(raw)) return []
  const out: HandymanServicePhoto[] = []
  for (const item of raw) {
    if (typeof item === 'string') out.push({ url: item })
    else if (item && typeof item === 'object' && typeof (item as { url?: unknown }).url === 'string') {
      out.push(item as HandymanServicePhoto)
    }
  }
  return out
}

const inputCls = 'w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30'
