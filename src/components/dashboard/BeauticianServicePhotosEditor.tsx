'use client'
import { useState } from 'react'
import { Upload, X, Plus } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  BEAUTICIAN_SERVICES_OFFERED,
  type BeauticianServiceOffered,
} from '@/lib/beautician/types'

// Per-service portfolio uploader. For each service the beautician
// currently has SELECTED in services_offered, this renders 4 image
// slots. Photos go into the same `profile-images` bucket as the
// avatar / cover / gallery — under a per-service subfolder so the
// Storage UI stays browsable.

const MAX_BYTES_PER_FILE = 6 * 1024 * 1024
const MIME_RE            = /^image\/(jpeg|jpg|png|webp)$/
const SLOTS_PER_SERVICE  = 4

export default function BeauticianServicePhotosEditor({
  userId,
  servicesOffered,
  value,
  onChange,
}: {
  userId: string
  servicesOffered: BeauticianServiceOffered[]
  value: Partial<Record<BeauticianServiceOffered, string[]>>
  onChange: (next: Partial<Record<BeauticianServiceOffered, string[]>>) => void
}) {
  if (servicesOffered.length === 0) {
    return (
      <div className="rounded-xl bg-black/85 border border-white/15 p-4 text-[12px] text-ink/60">
        Pilih layanan di section "Services Provided" dulu — tiap layanan yang Anda pilih akan punya 4 slot foto di sini.
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-black/85 border border-white/15 p-4 space-y-4">
      <div>
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-ink">
          Foto per layanan
        </div>
        <p className="text-[11px] text-ink/55 leading-snug mt-0.5">
          Upload sampai 4 foto per layanan. Foto ini muncul di carousel publik dan saat pengunjung memfilter ke layanan tertentu.
        </p>
      </div>

      {servicesOffered.map((sid) => (
        <ServiceSlotRow
          key={sid}
          sid={sid}
          userId={userId}
          urls={value[sid] ?? []}
          onChange={(urls) => onChange({ ...value, [sid]: urls })}
        />
      ))}
    </div>
  )
}

function ServiceSlotRow({
  sid, userId, urls, onChange,
}: {
  sid: BeauticianServiceOffered
  userId: string
  urls: string[]
  onChange: (urls: string[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState<string | null>(null)
  const remaining = Math.max(0, SLOTS_PER_SERVICE - urls.length)
  const label = BEAUTICIAN_SERVICES_OFFERED.find((s) => s.id === sid)?.label ?? sid

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    if (files.length > remaining) { setErr(`Bisa upload max ${remaining} lagi.`); return }
    for (const f of files) {
      if (f.size > MAX_BYTES_PER_FILE) { setErr(`"${f.name}" terlalu besar (max 6MB).`); return }
      if (!MIME_RE.test(f.type))        { setErr(`"${f.name}" — JPG/PNG/WEBP saja.`); return }
    }

    setUploading(true); setErr(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setErr('Tidak terhubung ke server.'); setUploading(false); return }

    const uploaded: string[] = []
    for (const f of files) {
      const ext  = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/services/${sid}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('profile-images')
        .upload(path, f, { upsert: false, contentType: f.type })
      if (error) { setErr(`Upload "${f.name}" gagal: ${error.message}`); continue }
      const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path)
      if (pub?.publicUrl) uploaded.push(pub.publicUrl)
    }
    setUploading(false)
    if (uploaded.length > 0) onChange([...urls, ...uploaded])
    e.target.value = ''
  }

  async function removeAt(idx: number) {
    const url = urls[idx]
    if (!url) return
    const supabase = getBrowserSupabase()
    if (supabase && url.includes('/storage/v1/object/public/profile-images/')) {
      const i = url.indexOf('/profile-images/')
      if (i !== -1) {
        const objectPath = url.slice(i + '/profile-images/'.length)
        await supabase.storage.from('profile-images').remove([objectPath]).catch(() => {})
      }
    }
    onChange(urls.filter((_, j) => j !== idx))
  }

  // Render 4 fixed slots — populated ones show the thumb, empty ones
  // share a single "+ upload" tile at the end so the row stays tidy.
  return (
    <div className="space-y-1.5 border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-extrabold text-ink">{label}</div>
        <div className="text-[11px] font-bold text-ink/55">{urls.length}/{SLOTS_PER_SERVICE}</div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {urls.map((url, i) => (
          <div
            key={url + i}
            className="relative aspect-square rounded-lg overflow-hidden border border-white/10"
          >
            <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Hapus foto"
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-ink/60 hover:bg-white/5 hover:border-pink-500/50 transition cursor-pointer">
            {uploading ? <Upload className="w-4 h-4 animate-pulse" /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
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
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[11px] px-2 py-1.5">
          {err}
        </div>
      )}
    </div>
  )
}
