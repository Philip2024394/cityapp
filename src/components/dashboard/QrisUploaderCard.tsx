'use client'
// mig 0228 — Generic QRIS uploader card. Posts `qr_payment_url` to the
// vertical's `/api/<v>/me/profile` endpoint. Stored in the existing
// public `profile-images` bucket under `<userId>/qris-…` so existing
// RLS already covers it. The public profile renders the "Pay deposit
// via QRIS" block (QrisCheckoutBlock) only when `qr_payment_url` is
// non-null. Vertical accent color is themed via `accentHex`.

import { useEffect, useState } from 'react'
import { Loader2, QrCode, Upload, Trash2, Check } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

const QRIS_MAX_BYTES = 5 * 1024 * 1024 // 5MB
const QRIS_MIME_RE   = /^image\/(jpeg|jpg|png|webp)$/

type Props = {
  /** API base path WITHOUT trailing slash, e.g. `/api/handyman`. The
   *  uploader will POST to `${apiBase}/me/profile` and GET the current
   *  value from `${apiBase}/me`. */
  apiBase:   string
  /** Vertical accent hex used for the Upload button background. Falls
   *  back to a neutral pink/yellow if not supplied. */
  accentHex?: string
}

export default function QrisUploaderCard({ apiBase, accentHex = '#EC4899' }: Props) {
  const [loading,   setLoading]   = useState(true)
  const [userId,    setUserId]    = useState<string | null>(null)
  const [url,       setUrl]       = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [savingUrl, setSavingUrl] = useState(false)
  const [err,       setErr]       = useState<string | null>(null)
  const [flash,     setFlash]     = useState(false)
  const [urlDraft,  setUrlDraft]  = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = getBrowserSupabase()
      if (!supabase) { setLoading(false); return }
      const { data: sess } = await supabase.auth.getSession()
      const uid = sess?.session?.user?.id ?? null
      if (!cancelled) setUserId(uid)
      try {
        const r = await fetch(`${apiBase}/me`, { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as { provider: { qr_payment_url?: string | null } | null }
          const v = j?.provider?.qr_payment_url ?? null
          if (!cancelled) {
            setUrl(v)
            setUrlDraft(v ?? '')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [apiBase])

  async function persist(newUrl: string | null) {
    setSavingUrl(true); setErr(null)
    try {
      const r = await fetch(`${apiBase}/me/profile`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ qr_payment_url: newUrl }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setErr(j?.error || 'Could not save QRIS.')
        return false
      }
      setUrl(newUrl)
      setUrlDraft(newUrl ?? '')
      setFlash(true)
      setTimeout(() => setFlash(false), 1500)
      return true
    } finally {
      setSavingUrl(false)
    }
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !userId) return
    if (f.size > QRIS_MAX_BYTES)   { setErr('File too large (max 5MB).'); return }
    if (!QRIS_MIME_RE.test(f.type)) { setErr('Image must be JPG / PNG / WEBP.'); return }
    setUploading(true); setErr(null)
    try {
      const supabase = getBrowserSupabase()
      if (!supabase) { setErr('Not connected to server.'); return }
      const ext  = (f.name.split('.').pop() || 'png').toLowerCase()
      const path = `${userId}/qris-${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase
        .storage
        .from('profile-images')
        .upload(path, f, { upsert: false, contentType: f.type })
      if (upErr) { setErr(`Upload failed: ${upErr.message}`); return }
      const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path)
      if (!pub?.publicUrl) { setErr('Could not derive public URL.'); return }
      await persist(pub.publicUrl)
    } finally {
      setUploading(false)
    }
  }

  async function clear() {
    if (!url) return
    await persist(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={18} className="animate-spin" style={{ color: accentHex }} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-black/70 leading-snug">
        Upload your QRIS image so customers can pay deposits or digital products directly.
        Kita2u never touches the money — every payment goes straight to your linked account.
      </p>

      {/* Preview + actions */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex items-center gap-4">
        <div className="shrink-0 w-24 h-24 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
          {url ? (
            <img src={url} alt="QRIS preview" className="w-full h-full object-contain p-1.5" />
          ) : (
            <QrCode size={32} strokeWidth={1.5} className="text-gray-300" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="text-[13px] font-extrabold text-black flex items-center gap-1.5">
            {url ? 'QRIS live' : 'No QRIS yet'}
            {flash && (
              <span className="inline-flex items-center gap-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-1.5 py-0.5">
                <Check size={10} strokeWidth={3} /> Saved
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <label
              className={`inline-flex items-center gap-1.5 rounded-lg text-white px-3 py-2 text-[12px] font-extrabold uppercase tracking-wider shadow-sm cursor-pointer transition min-h-[40px] ${uploading ? 'opacity-60 cursor-wait' : ''}`}
              style={{ background: accentHex }}
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} strokeWidth={2.5} />}
              {uploading ? 'Uploading…' : url ? 'Replace' : 'Upload'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={pick}
                disabled={uploading || savingUrl || !userId}
                className="hidden"
              />
            </label>
            {url && (
              <button
                type="button"
                onClick={clear}
                disabled={savingUrl}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 text-black/70 hover:bg-gray-50 px-3 py-2 text-[12px] font-extrabold uppercase tracking-wider transition min-h-[40px] disabled:opacity-50"
              >
                <Trash2 size={13} strokeWidth={2.5} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* URL paste fallback */}
      <div className="space-y-1">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-black/55">
          Or paste an image URL (ImageKit / Supabase)
        </label>
        <input
          type="url"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={() => {
            const trimmed = urlDraft.trim()
            if ((trimmed || null) === (url || null)) return
            void persist(trimmed || null)
          }}
          placeholder="https://ik.imagekit.io/…/my-qris.png"
          autoComplete="off"
          className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 text-[12.5px] font-mono text-black placeholder:text-black/40 focus:outline-none min-h-[44px]"
        />
      </div>

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[12px] px-3 py-2">
          {err}
        </div>
      )}
    </div>
  )
}
