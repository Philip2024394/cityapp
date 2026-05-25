'use client'
import { useState } from 'react'
import { Upload, Check, X, ImageIcon } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// ============================================================================
// Profile image uploader — sister to KtpUploader but writes to the PUBLIC
// `profile-images` bucket (mig 0071) and stores the full public URL.
//
// Replaces the paste-URL pattern across all 5 provider signup + dashboard
// edit forms. Profile photos appear on the marketplace so the bucket is
// public-read; uploads/replaces are RLS-restricted to the user's own
// uid folder.
//
// onChange receives the full public URL (https://<project>.supabase.co/
// storage/v1/object/public/profile-images/<uid>/<file>) so existing
// <img src={profile_image_url}> render code keeps working unchanged.
// ============================================================================

const MAX_BYTES = 5 * 1024 * 1024  // 5MB — same as KTP
const MIME_RE   = /^image\/(jpeg|jpg|png|webp)$/

export default function ProfileImageUploader({
  value,
  onChange,
  userId,
  label = 'Foto profile',
  helpText = 'JPG / PNG / WEBP · max 5MB. Akan ditampilkan di marketplace.',
  previewShape = 'square',
}: {
  /** Current public URL (or null/empty for no photo). */
  value: string | null
  onChange: (publicUrl: string | null) => void
  userId: string
  label?: string
  helpText?: string
  /** Preview thumbnail shape. 'circle' mirrors the floating-card
   *  avatar on the public profile page so beauticians see the exact
   *  look their photo will have when published. */
  previewShape?: 'square' | 'circle'
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState<string | null>(null)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_BYTES)    { setErr('File terlalu besar (max 5MB).'); return }
    if (!MIME_RE.test(f.type)) { setErr('Format harus JPG / PNG / WEBP.'); return }

    setUploading(true); setErr(null)
    try {
      const supabase = getBrowserSupabase()
      if (!supabase) { setErr('Tidak terhubung ke server.'); return }
      const ext  = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase
        .storage
        .from('profile-images')
        .upload(path, f, { upsert: false, contentType: f.type })
      if (error) { setErr(`Upload gagal: ${error.message}`); return }

      // Resolve to the full public URL so existing <img src> renderers work.
      const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path)
      if (!pub?.publicUrl) { setErr('Could not derive public URL.'); return }
      onChange(pub.publicUrl)
    } finally {
      setUploading(false)
    }
  }

  async function clear() {
    if (!value) return
    // Best-effort delete of the stored object. We only attempt this if
    // the URL looks like one of ours (contains the bucket path); legacy
    // pasted URLs from before mig 0071 just get the form-value cleared.
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
        <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/40 px-3 py-2.5">
          {previewShape === 'circle' ? (
            <img
              src={value}
              alt=""
              className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-white shadow"
              style={{ background: '#0A0A0A' }}
            />
          ) : (
            <img
              src={value}
              alt=""
              className="w-12 h-12 rounded-lg object-cover bg-black/30 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-green-300 text-[13px] font-bold">
              <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
              Photo uploaded
            </div>
            <div className="text-[10px] text-ink/45 mt-0.5 truncate">{value.split('/').pop()}</div>
          </div>
          <button
            type="button"
            onClick={clear}
            aria-label="Hapus foto"
            className="text-ink/55 hover:text-ink p-1.5 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 px-4 py-6 text-[13px] font-bold text-ink/75 cursor-pointer hover:bg-white/5 hover:border-brand/60 transition">
          <Upload className="w-4 h-4" strokeWidth={2.5} />
          {uploading ? 'Uploading…' : 'Pilih foto'}
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
