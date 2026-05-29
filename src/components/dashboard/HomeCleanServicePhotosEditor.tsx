'use client'
import { useState } from 'react'
import { Upload, X, Plus } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  HOME_CLEAN_SERVICES_OFFERED,
  type HomeCleanService,
  type HomeCleanServicePhoto,
} from '@/lib/home-clean/types'

// Per-service portfolio uploader. Mirrors BeauticianServicePhotosEditor
// 1:1 — only difference is the service catalogue (home-clean instead of
// beautician). Each photo carries a name, 350-char description and
// optional start price (IDR). The public /[slug] page renders these as
// carousel cards with a "View Details" popup.

const MAX_BYTES_PER_FILE = 6 * 1024 * 1024
const MIME_RE            = /^image\/(jpeg|jpg|png|webp)$/
const SLOTS_PER_SERVICE  = 4
const MAX_DESCRIPTION    = 500
const MAX_NAME           = 60

export default function HomeCleanServicePhotosEditor({
  userId,
  servicesOffered,
  value,
  onChange,
}: {
  userId: string
  servicesOffered: HomeCleanService[]
  value: Partial<Record<HomeCleanService, HomeCleanServicePhoto[]>>
  onChange: (next: Partial<Record<HomeCleanService, HomeCleanServicePhoto[]>>) => void
}) {
  if (servicesOffered.length === 0) {
    return (
      <div className="rounded-xl bg-pink-500/10 border border-pink-400/30 p-4 text-[13px] text-white/80 leading-snug">
        Pick services in the "Services I offer" section above first — each selected service gets 4 photo slots here.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {servicesOffered.map((sid) => (
        <ServiceSlotRow
          key={sid}
          sid={sid}
          userId={userId}
          photos={normalisePhotos(value[sid])}
          onChange={(photos) => onChange({ ...value, [sid]: photos })}
        />
      ))}
    </div>
  )
}

function normalisePhotos(raw: unknown): HomeCleanServicePhoto[] {
  if (!Array.isArray(raw)) return []
  const out: HomeCleanServicePhoto[] = []
  for (const item of raw) {
    if (typeof item === 'string') out.push({ url: item })
    else if (item && typeof item === 'object' && typeof (item as { url?: unknown }).url === 'string') {
      out.push(item as HomeCleanServicePhoto)
    }
  }
  return out
}

function ServiceSlotRow({
  sid, userId, photos, onChange,
}: {
  sid: HomeCleanService
  userId: string
  photos: HomeCleanServicePhoto[]
  onChange: (photos: HomeCleanServicePhoto[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState<string | null>(null)
  const remaining = Math.max(0, SLOTS_PER_SERVICE - photos.length)
  const label = HOME_CLEAN_SERVICES_OFFERED.find((s) => s.id === sid)?.label ?? sid

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

    const uploaded: HomeCleanServicePhoto[] = []
    for (const f of files) {
      const ext  = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/services/${sid}/${crypto.randomUUID()}.${ext}`
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

  function updateMeta(idx: number, patch: Partial<HomeCleanServicePhoto>) {
    onChange(photos.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-black text-white">{label}</div>
        <div className="text-[12px] font-bold text-white/55 tabular-nums">{photos.length}/{SLOTS_PER_SERVICE}</div>
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
                  placeholder="Name (e.g. Deep Clean)"
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
                placeholder="Description (max 500 chars)"
                className={inputCls + ' resize-none'}
              />
              <div className="text-[11px] text-white/40 text-right tabular-nums">
                {(photo.description ?? '').length}/{MAX_DESCRIPTION}
              </div>
            </div>
          </div>
        ))}

        {remaining > 0 && (
          <label className="block rounded-xl border-2 border-dashed border-pink-400/50 bg-pink-500/10 px-4 py-5 text-center text-pink-200 hover:bg-pink-500/15 hover:border-pink-400 transition cursor-pointer">
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

const inputCls = 'w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30'
