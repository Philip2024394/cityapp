'use client'
import { useState } from 'react'
import { Upload, X, Plus } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Multi-file portfolio uploader. Hard-capped at 12 images per provider
// (matches the DB CHECK constraint added in mig 0072). Same public
// `profile-images` bucket as the avatar + cover uploaders; nested
// `gallery/` subfolder under the user's uid.
//
// onChange receives the FULL list each time, not a diff — caller persists
// the array as-is to the provider row's gallery_image_urls column.

const MAX_BYTES = 6 * 1024 * 1024
const MIME_RE   = /^image\/(jpeg|jpg|png|webp)$/
const MAX_PHOTOS = 12

export default function GalleryUploader({
  value, onChange, userId,
  label = 'Photo gallery',
  helpText = `Up to ${MAX_PHOTOS} photos · JPG / PNG / WEBP · max 6MB each.`,
}: {
  value: string[]
  onChange: (urls: string[]) => void
  userId: string
  label?: string
  helpText?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState<string | null>(null)

  const photos = Array.isArray(value) ? value : []
  const remaining = Math.max(0, MAX_PHOTOS - photos.length)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    if (files.length > remaining) {
      setErr(`Bisa upload max ${remaining} foto lagi (limit ${MAX_PHOTOS}).`)
      return
    }
    for (const f of files) {
      if (f.size > MAX_BYTES) { setErr(`"${f.name}" terlalu besar (max 6MB).`); return }
      if (!MIME_RE.test(f.type)) { setErr(`"${f.name}" — format harus JPG / PNG / WEBP.`); return }
    }

    setUploading(true); setErr(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setErr('Tidak terhubung ke server.'); setUploading(false); return }

    const uploaded: string[] = []
    for (const f of files) {
      const ext  = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/gallery/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('profile-images')
        .upload(path, f, { upsert: false, contentType: f.type })
      if (error) {
        setErr(`Upload "${f.name}" gagal: ${error.message}`)
        // Continue with what succeeded — don't abort the whole batch.
        continue
      }
      const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path)
      if (pub?.publicUrl) uploaded.push(pub.publicUrl)
    }
    setUploading(false)
    if (uploaded.length > 0) onChange([...photos, ...uploaded])
    // Reset the input so the same file can be re-picked after delete.
    e.target.value = ''
  }

  async function removeAt(idx: number) {
    const url = photos[idx]
    if (!url) return
    const supabase = getBrowserSupabase()
    if (supabase && url.includes('/storage/v1/object/public/profile-images/')) {
      const i = url.indexOf('/profile-images/')
      if (i !== -1) {
        const objectPath = url.slice(i + '/profile-images/'.length)
        await supabase.storage.from('profile-images').remove([objectPath]).catch(() => {})
      }
    }
    onChange(photos.filter((_, j) => j !== idx))
  }

  return (
    <div className="rounded-xl bg-black/85 border border-white/15 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold uppercase tracking-wider text-ink">{label}</div>
          <p className="text-[11px] text-ink/55 mt-0.5 leading-snug">{helpText}</p>
        </div>
        <div className="text-[11px] font-extrabold text-ink/60 shrink-0">{photos.length}/{MAX_PHOTOS}</div>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((url, i) => (
            <div
              key={url + i}
              className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group"
            >
              <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Hapus foto"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 text-white flex items-center justify-center opacity-90 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 px-4 py-5 text-[13px] font-bold text-ink/75 cursor-pointer hover:bg-white/5 hover:border-brand/60 transition">
          {uploading ? <Upload className="w-4 h-4 animate-pulse" /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
          {uploading ? 'Uploading…' : `Tambah foto (${remaining} sisa)`}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={pick}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}

      {err && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[12px] px-3 py-2">
          {err}
        </div>
      )}
    </div>
  )
}
