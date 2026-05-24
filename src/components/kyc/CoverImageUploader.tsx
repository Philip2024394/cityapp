'use client'
import { useState } from 'react'
import { Upload, Check, X, Image as ImageIcon } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Wide 16:9 hero image for the profile page. Shares the same public
// `profile-images` bucket as ProfileImageUploader (mig 0071) — just a
// different storage subfolder so cover photos are catalogued separately
// from avatars. Same RLS (owner-folder scoped via storage policy).

const MAX_BYTES = 8 * 1024 * 1024  // 8MB — slightly higher than avatar
const MIME_RE   = /^image\/(jpeg|jpg|png|webp)$/

export default function CoverImageUploader({
  value, onChange, userId,
  label = 'Cover photo',
  helpText = 'Wide image · JPG / PNG / WEBP · max 8MB. Best at 1200×630 (16:9).',
}: {
  value: string | null
  onChange: (publicUrl: string | null) => void
  userId: string
  label?: string
  helpText?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState<string | null>(null)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_BYTES)    { setErr('File terlalu besar (max 8MB).'); return }
    if (!MIME_RE.test(f.type)) { setErr('Format harus JPG / PNG / WEBP.'); return }

    setUploading(true); setErr(null)
    try {
      const supabase = getBrowserSupabase()
      if (!supabase) { setErr('Tidak terhubung ke server.'); return }
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
      // Same bucket; nested `covers/` subfolder under the uid keeps avatars
      // and covers visually separate when browsing Supabase Storage UI.
      const path = `${userId}/covers/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('profile-images')
        .upload(path, f, { upsert: false, contentType: f.type })
      if (error) { setErr(`Upload gagal: ${error.message}`); return }
      const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path)
      if (!pub?.publicUrl) { setErr('Could not derive public URL.'); return }
      onChange(pub.publicUrl)
    } finally { setUploading(false) }
  }

  async function clear() {
    if (!value) return
    const supabase = getBrowserSupabase()
    if (supabase && value.includes('/storage/v1/object/public/profile-images/')) {
      const idx = value.indexOf('/profile-images/')
      if (idx !== -1) {
        const objectPath = value.slice(idx + '/profile-images/'.length)
        await supabase.storage.from('profile-images').remove([objectPath]).catch(() => {})
      }
    }
    onChange(null)
  }

  return (
    <div className="rounded-xl bg-black/85 border border-white/15 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <ImageIcon className="w-4 h-4 mt-0.5 text-brand shrink-0" strokeWidth={2.5} />
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold uppercase tracking-wider text-ink">{label}</div>
          <p className="text-[11px] text-ink/55 mt-0.5 leading-snug">{helpText}</p>
        </div>
      </div>

      {value ? (
        <div className="space-y-2">
          <div
            className="relative w-full overflow-hidden rounded-lg border border-green-500/40"
            style={{ aspectRatio: '16 / 9' }}
          >
            <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <div className="flex items-center gap-1.5 text-green-300 font-bold">
              <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
              Cover uploaded
            </div>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 text-ink/55 hover:text-ink px-2 py-1"
            >
              <X className="w-3.5 h-3.5" /> Replace
            </button>
          </div>
        </div>
      ) : (
        <label
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 text-[13px] font-bold text-ink/75 cursor-pointer hover:bg-white/5 hover:border-brand/60 transition"
          style={{ aspectRatio: '16 / 9' }}
        >
          <Upload className="w-4 h-4" strokeWidth={2.5} />
          {uploading ? 'Uploading…' : 'Pilih cover'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
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
