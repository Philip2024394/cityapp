'use client'
import { useState } from 'react'
import { Upload, Check, X, ShieldCheck } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Browser-direct upload to the private `ktp-images` bucket. Stores the
// resulting storage PATH (e.g. "<uid>/<uuid>.jpg") via onChange — the
// caller persists that path into the provider table's ktp_image_url
// column. RLS on storage.objects (mig 0065) restricts uploads to the
// user's own uid-named folder, so each user can only ever write under
// `<their-uid>/`.

const MAX_BYTES = 5 * 1024 * 1024
const MIME_RE   = /^image\/(jpeg|jpg|png|webp)$/

export default function KtpUploader({
  value,
  onChange,
  userId,
}: {
  value: string | null
  onChange: (path: string | null) => void
  userId: string
}) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState<string | null>(null)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_BYTES)   { setErr('File terlalu besar (max 5MB).'); return }
    if (!MIME_RE.test(f.type)) { setErr('Format harus JPG / PNG / WEBP.'); return }

    setUploading(true); setErr(null)
    try {
      const supabase = getBrowserSupabase()
      if (!supabase) { setErr('Tidak terhubung ke server.'); return }
      const ext  = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase
        .storage
        .from('ktp-images')
        .upload(path, f, { upsert: false, contentType: f.type })
      if (error) { setErr(`Upload gagal: ${error.message}`); return }
      onChange(path)
    } finally {
      setUploading(false)
    }
  }

  async function clear() {
    if (!value) return
    const supabase = getBrowserSupabase()
    if (supabase) {
      // Best-effort delete — if it fails we still clear the form value
      // so the user isn't blocked.
      await supabase.storage.from('ktp-images').remove([value]).catch(() => {})
    }
    onChange(null)
  }

  return (
    <div className="rounded-xl bg-black/85 border border-white/15 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 mt-0.5 text-brand shrink-0" strokeWidth={2.5} />
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold uppercase tracking-wider text-ink">
            KTP (private)
          </div>
          <p className="text-[11px] text-ink/55 mt-0.5 leading-snug">
            Hanya tim verifikasi yang bisa melihat. Disimpan terenkripsi di
            bucket private. Foto KTP tidak pernah ditampilkan di marketplace.
          </p>
        </div>
      </div>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-green-500/10 border border-green-500/40 px-3 py-2.5">
          <div className="flex items-center gap-2 text-green-300 text-[13px] font-bold min-w-0">
            <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            <span className="truncate font-mono text-[11px]">{value.split('/').pop()}</span>
          </div>
          <button
            type="button"
            onClick={clear}
            aria-label="Hapus KTP"
            className="text-ink/55 hover:text-ink p-1 -mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 px-4 py-6 text-[13px] font-bold text-ink/75 cursor-pointer hover:bg-white/5 hover:border-brand/60 transition">
          <Upload className="w-4 h-4" strokeWidth={2.5} />
          {uploading ? 'Uploading…' : 'Pilih foto KTP'}
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
