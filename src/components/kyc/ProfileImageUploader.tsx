'use client'
import { useRef, useState } from 'react'
import { Upload, ImageIcon } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// ============================================================================
// Profile image uploader — sister to KtpUploader but writes to the PUBLIC
// `profile-images` bucket (mig 0071) and stores the full public URL.
//
// Layout: a square dashed-line container. Inside the square: a circular
// avatar preview (image or placeholder) + an explicit "Upload file"
// button. Matches the light dashboard design system.
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
  // previewShape is now informational — the layout is always a square
  // dashed container with a circular preview inside. Kept on the props
  // surface so existing call sites compile without churn.
  previewShape: _previewShape = 'circle',
}: {
  /** Current public URL (or null/empty for no photo). */
  value: string | null
  onChange: (publicUrl: string | null) => void
  userId: string
  label?: string
  helpText?: string
  previewShape?: 'square' | 'circle'
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState<string | null>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

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
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function clear() {
    if (!value) return
    // Best-effort delete of the stored object. Only attempt if the URL
    // looks like one of ours; legacy pasted URLs (pre-mig 0071) just
    // get the form value cleared.
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
    <div className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      <div className="flex items-start gap-2">
        <ImageIcon className="w-4 h-4 mt-0.5 text-pink-500 shrink-0" strokeWidth={2.5} />
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">{label}</div>
          <p className="text-[12px] text-black/55 mt-0.5 leading-snug">{helpText}</p>
        </div>
      </div>

      {/* Square dashed container — circular preview + upload button inside. */}
      <div className="aspect-square w-full rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-4 p-6 transition hover:border-pink-300 hover:bg-pink-50/40">
        {/* Circular preview — image when set, placeholder icon when empty. */}
        <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white border-2 border-gray-200 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
          {value ? (
            <img
              src={value}
              alt="Profile preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-12 h-12 text-gray-300" strokeWidth={1.75} />
          )}
        </div>

        {/* Upload / change file button + hidden input. */}
        <label
          className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white px-5 py-2.5 text-[13px] font-extrabold uppercase tracking-wider shadow-md shadow-pink-500/25 cursor-pointer transition active:scale-[0.97] min-h-[44px] ${uploading ? 'opacity-60 cursor-wait' : ''}`}
        >
          <Upload className="w-4 h-4" strokeWidth={2.5} />
          {uploading ? 'Uploading…' : value ? 'Change file' : 'Upload file'}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={pick}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {value && (
          <button
            type="button"
            onClick={clear}
            className="text-[12px] font-bold text-black/55 hover:text-black/85 underline"
          >
            Remove photo
          </button>
        )}
      </div>

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[12px] px-3 py-2">
          {err}
        </div>
      )}
    </div>
  )
}
