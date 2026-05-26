'use client'
import { useRef, useState } from 'react'
import { Upload, ChevronDown, Lock, X, Check } from 'lucide-react'
import {
  bannerNumber,
  resolveBanner,
  type BannerCategory,
  type BannerLibrary,
  type BannerLibraryEntry,
} from '@/lib/banners/library'
import { getBrowserSupabase } from '@/lib/supabase/client'

// QRIS placeholder — replace with the founder's actual static QRIS
// image URL when supplied. Stored centrally so swapping it is a
// one-line change.
const QRIS_IMAGE_URL = 'https://ik.imagekit.io/nepgaxllc/Untitleddaaaaad-removebg-preview.png?updatedAt=1779107454479'

// Vertical-agnostic banner picker.
//
// Renders the curated banner library for whichever vertical passes its
// own data in (beautician, handyman, …). Provider taps a thumbnail to
// set their cover_image_url to that URL; can also upload a custom
// banner via the "Upload my own" tile.
//
// Premium banners require a `purchaseEndpoint` (per-vertical API path)
// to be configured — if omitted, premium banners render as locked but
// cannot be purchased.

export default function BannerLibraryPicker({
  themeHex,
  selected,
  onChange,
  userId,
  library,
  categories,
  defaultThemeHex,
  purchaseEndpoint,
  selectedAccentHex = '#EC4899',
}: {
  themeHex: string | null
  selected: string | null
  onChange: (url: string | null) => void
  /** If supplied, the picker renders an "Upload my own" tile that uploads
   *  to Supabase Storage and calls onChange with the public URL. */
  userId?: string | null
  /** Theme-hex → category-id → ordered banner entries. */
  library: BannerLibrary
  /** Ordered list of category definitions for label display + iteration. */
  categories: BannerCategory[]
  /** Theme used as fallback when the provider hasn't picked one yet. */
  defaultThemeHex: string
  /** Per-vertical premium-purchase API path, e.g. `/api/beautician/me/buy-banner`.
   *  When omitted the premium purchase modal is suppressed. */
  purchaseEndpoint?: string
  /** Selected-thumbnail border + check-circle background. Defaults to pink
   *  (beautician brand); handyman should pass `#FACC15`. */
  selectedAccentHex?: string
}) {
  // Fall back to the default theme so the library always has something visible.
  // Note: library entries for empty themes are `{}` (truthy), so `??` doesn't
  // fall back automatically — we explicitly check for an empty category map.
  const key = ((themeHex || defaultThemeHex)).toUpperCase()
  const themeLib  = library[key] ?? {}
  const themeHasBanners = Object.values(themeLib).some((arr) => Array.isArray(arr) && arr.length > 0)
  const lib = themeHasBanners ? themeLib : (library[defaultThemeHex] ?? {})

  // Show every category that has banners — don't gate on services_offered;
  // founder asked for all banners to be visible so users can discover ones
  // outside their current category picks.
  const visibleCategories = categories
    .map((c) => c.id)
    .filter((cid) => (lib[cid] ?? []).length > 0)

  const totalBanners = visibleCategories.reduce(
    (sum, cid) => sum + (lib[cid] ?? []).length, 0,
  )

  const labelFor = (cid: string): string =>
    categories.find((c) => c.id === cid)?.label ?? cid

  // Accordion state — only one category fully expanded at a time so the
  // picker stays scannable. Each category collapsed shows first 2 banners.
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const PREVIEW_COUNT = 2

  // Premium banner purchase modal — null = closed.
  const [premiumModal, setPremiumModal] = useState<{ url: string } | null>(null)

  return (
    <div className="rounded-xl bg-black/85 border border-white/15 p-4 space-y-3">
      <div>
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-ink">
          Banner library
        </div>
        <p className="text-[11px] text-ink/55 leading-snug mt-0.5">
          Pilih banner dari koleksi yang sudah kami kurasi (grouped by kategori), atau upload banner sendiri.
        </p>
      </div>

      {/* Upload my own banner — always visible, even when library has no
          banners for this theme. When the current selection is a
          custom-uploaded URL (i.e. not in any library bucket), the
          button fills its container with the preview so the beautician
          can see their banner without scrolling. */}
      {userId && (
        <UploadOwnButton
          userId={userId}
          onUploaded={onChange}
          previewUrl={selected && !isLibraryUrl(selected, lib) ? selected : null}
          onClear={() => onChange(null)}
        />
      )}

      {totalBanners === 0 && (
        <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-ink/55">
          Belum ada banner pre-set untuk theme ini. Upload banner sendiri di atas.
        </div>
      )}

      {visibleCategories.map((sid) => {
        const urls       = lib[sid] ?? []
        const isOpen     = openCategory === sid
        const showAll    = isOpen || urls.length <= PREVIEW_COUNT
        const visibleUrls = showAll ? urls : urls.slice(0, PREVIEW_COUNT)
        const hiddenCount = urls.length - PREVIEW_COUNT
        return (
          <div key={sid} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink/70">
                {labelFor(sid)}
              </div>
              <div className="text-[10px] text-ink/45">{urls.length} banner{urls.length === 1 ? '' : 's'}</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {visibleUrls.map((entry) => {
                const b  = resolveBanner(entry)
                const on = selected === b.url
                return (
                  <button
                    key={b.url}
                    type="button"
                    onClick={() => {
                      if (b.premium && !on) {
                        // Premium banners open the purchase popup instead of
                        // auto-applying. Without a configured purchase
                        // endpoint we treat them as locked: skip the modal
                        // so the user isn't sent into a broken flow.
                        if (purchaseEndpoint) setPremiumModal({ url: b.url })
                      } else {
                        onChange(on ? null : b.url)
                      }
                    }}
                    aria-pressed={on}
                    className="relative rounded-lg overflow-hidden border-2 transition active:scale-[0.98]"
                    style={{
                      aspectRatio: '16 / 9',
                      borderColor: on ? selectedAccentHex : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <img
                      src={b.url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {b.premium && (
                      <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white shadow"
                        style={{ background: 'linear-gradient(135deg, #FACC15, #F59E0B)', color: '#0A0A0A' }}
                      >
                        <Lock className="w-2.5 h-2.5" strokeWidth={3} />
                        Premium
                      </div>
                    )}
                    {on && (
                      <div
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[12px] font-black"
                        style={{ background: selectedAccentHex }}
                        aria-hidden
                      >
                        ✓
                      </div>
                    )}
                    {/* Stable per-banner ID — admin uses this to tell us
                        which banners to mark premium (e.g. "make #452
                        premium"). bannerNumber() is a deterministic djb2
                        hash of the URL so the same banner always has the
                        same number across reloads. */}
                    <div
                      className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold text-white bg-black/70 shadow-sm select-text"
                      aria-label={`Banner number ${bannerNumber(b.url)}`}
                    >
                      #{bannerNumber(b.url)}
                    </div>
                  </button>
                )
              })}
            </div>
            {/* Show all / Show less toggle — only one category fully
                expanded at a time so the picker stays scannable. */}
            {urls.length > PREVIEW_COUNT && (
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : sid)}
                className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-ink/80 text-[11px] font-extrabold uppercase tracking-wider hover:bg-white/10 transition"
              >
                {isOpen ? 'Show less' : `Show all ${urls.length} banners`}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                {!isOpen && hiddenCount > 0 && (
                  <span className="text-ink/45 normal-case">+{hiddenCount} more</span>
                )}
              </button>
            )}
          </div>
        )
      })}

      {selected && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[11px] text-ink/55 hover:text-ink/80 underline"
        >
          Hapus pilihan banner
        </button>
      )}

      {/* Premium banner purchase popup — opens when a Premium-tagged
          banner is tapped. 2-step: preview & price → QRIS + upload.
          Only mounted when the vertical configured a purchaseEndpoint. */}
      {premiumModal && userId && purchaseEndpoint && (
        <PremiumBannerModal
          bannerUrl={premiumModal.url}
          userId={userId}
          purchaseEndpoint={purchaseEndpoint}
          onClose={() => setPremiumModal(null)}
          onPurchased={(url) => {
            // Provisional activation: API also writes cover_image_url
            // server-side. Reflect locally so the live preview updates.
            onChange(url)
            setPremiumModal(null)
          }}
        />
      )}
    </div>
  )
}

const MAX_BANNER_BYTES = 8 * 1024 * 1024
const BANNER_MIME = /^image\/(jpeg|jpg|png|webp)$/

function UploadOwnButton({
  userId, onUploaded, previewUrl, onClear,
}: {
  userId: string
  onUploaded: (url: string) => void
  /** When set, fills the yellow upload zone with this image so the
   *  beautician sees their own uploaded banner without scrolling. */
  previewUrl?: string | null
  onClear?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_BANNER_BYTES)    { alert('File too large (max 8MB).'); return }
    if (!BANNER_MIME.test(f.type))    { alert('Must be JPG / PNG / WEBP.'); return }
    const supabase = getBrowserSupabase()
    if (!supabase) { alert('Not connected to server.'); return }
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${userId}/covers/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('profile-images')
      .upload(path, f, { upsert: false, contentType: f.type })
    if (error) { alert(`Upload failed: ${error.message}`); return }
    const { data: pub } = supabase.storage.from('profile-images').getPublicUrl(path)
    if (pub?.publicUrl) onUploaded(pub.publicUrl)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Filled state — show the uploaded banner as the container background.
  if (previewUrl) {
    return (
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ aspectRatio: '16 / 9', border: '2px solid rgba(250,204,21,0.7)' }}
      >
        <img src={previewUrl} alt="Your uploaded banner" className="absolute inset-0 w-full h-full object-cover" />
        {/* Selected check + meta strip overlay */}
        <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-black shadow"
          style={{ background: 'linear-gradient(135deg, #FACC15, #F59E0B)' }}>
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
          Your banner
        </div>
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1.5">
          <label className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider text-black bg-white/95 hover:bg-white cursor-pointer shadow">
            <Upload className="w-3 h-3" strokeWidth={2.5} />
            Replace
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="hidden" />
          </label>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider text-white bg-black/70 hover:bg-black/85 shadow"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
              Clear
            </button>
          )}
        </div>
      </div>
    )
  }

  // Empty state — the original yellow dashed prompt.
  return (
    <label className="flex items-center gap-2 rounded-xl px-4 py-3 cursor-pointer transition active:scale-[0.98]"
      style={{ background: 'rgba(250,204,21,0.10)', border: '1px dashed rgba(250,204,21,0.55)' }}
    >
      <Upload className="w-4 h-4 text-brand shrink-0" strokeWidth={2.5} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-extrabold text-ink">Upload my own banner</div>
        <div className="text-[11px] text-ink/55 leading-snug">JPG · PNG · WEBP · max 8MB · best 1600×900 (16:9)</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={pick}
        className="hidden"
      />
    </label>
  )
}

/** True when `url` is one of the curated entries in the active theme/category map. */
function isLibraryUrl(url: string, lib: Record<string, BannerLibraryEntry[]>): boolean {
  for (const arr of Object.values(lib)) {
    if (!Array.isArray(arr)) continue
    for (const entry of arr) {
      const resolved = typeof entry === 'string' ? entry : entry.url
      if (resolved === url) return true
    }
  }
  return false
}


function PremiumBannerModal({
  bannerUrl, userId, purchaseEndpoint, onClose, onPurchased,
}: {
  bannerUrl: string
  userId:    string
  purchaseEndpoint: string
  onClose:   () => void
  onPurchased: (url: string) => void
}) {
  const [step,        setStep]        = useState<"intro" | "pay">("intro")
  const [proofFile,   setProofFile]   = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  function pickProof(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_BANNER_BYTES)    { setErr("File terlalu besar (max 8MB)."); return }
    if (!BANNER_MIME.test(f.type))    { setErr("Format harus JPG / PNG / WEBP."); return }
    setErr(null)
    setProofFile(f)
    setProofPreview(URL.createObjectURL(f))
  }

  async function send() {
    if (!proofFile) { setErr("Upload bukti pembayaran dulu."); return }
    setSubmitting(true); setErr(null)
    try {
      const supabase = getBrowserSupabase()
      if (!supabase) { setErr("Tidak terhubung ke server."); return }

      // 1. Upload payment screenshot to profile-images/<uid>/payments/
      const ext  = (proofFile.name.split(".").pop() || "jpg").toLowerCase()
      const path = `${userId}/payments/${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage
        .from("profile-images")
        .upload(path, proofFile, { upsert: false, contentType: proofFile.type })
      if (up.error) { setErr(`Upload bukti gagal: ${up.error.message}`); return }
      const { data: pub } = supabase.storage.from("profile-images").getPublicUrl(path)
      const proofUrl = pub?.publicUrl
      if (!proofUrl) { setErr("Could not derive proof URL."); return }

      // 2. POST to API — creates pending purchase + provisionally
      //    activates the banner as cover_image_url. Endpoint is
      //    vertical-specific (passed in as `purchaseEndpoint` prop).
      const r = await fetch(purchaseEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banner_url: bannerUrl, payment_proof_url: proofUrl }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) { setErr(j?.error || "Failed to submit"); return }

      onPurchased(bannerUrl)
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}>
      <div
        className="bg-bg2 text-ink rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: "4px solid #FACC15" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-[15px] font-black inline-flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-yellow-400" strokeWidth={2.5} />
            Premium banner
          </h3>
          <button onClick={onClose} aria-label="Close"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Banner preview — always visible */}
          <div className="rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: "16 / 9" }}>
            <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <div className="text-[15px] font-black">Make this your very own profile banner</div>
            <div className="text-[12px] text-ink/65 mt-0.5">One-time payment · lifetime use</div>
            <div className="text-[26px] font-black mt-2" style={{ color: "#FACC15" }}>
              Rp 100.000
            </div>
          </div>

          {step === "intro" ? (
            <>
              <ul className="text-[12px] text-ink/75 space-y-1 leading-snug">
                <li>✓ Banner becomes yours — no one else on IndoCity gets it</li>
                <li>✓ Activates on your profile immediately after payment proof is sent</li>
                <li>✓ Admin verifies payment within 24h</li>
              </ul>
              <button
                type="button"
                onClick={() => setStep("pay")}
                className="w-full inline-flex items-center justify-center px-5 py-3.5 rounded-xl text-bg font-extrabold text-[14px] shadow-md active:scale-[0.98] transition"
                style={{ background: "#FACC15" }}
              >
                Purchase now
              </button>
            </>
          ) : (
            <>
              {/* QRIS */}
              <div className="rounded-xl bg-white p-3 flex flex-col items-center">
                <div className="text-[12px] font-extrabold text-black mb-1">Scan QRIS to pay Rp 100.000</div>
                <img src={QRIS_IMAGE_URL} alt="QRIS code" className="w-48 h-48 object-contain" />
                <div className="text-[10px] text-gray-500 mt-1">All Indonesian e-wallets supported</div>
              </div>

              {/* Upload screenshot */}
              <div className="space-y-1.5">
                <div className="text-[12px] font-extrabold uppercase tracking-wider text-ink">
                  Payment screenshot
                </div>
                {proofPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-green-500/40" style={{ aspectRatio: "4 / 3" }}>
                    <img src={proofPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setProofFile(null); setProofPreview(null) }}
                      aria-label="Remove"
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 px-4 py-6 text-[13px] font-bold text-ink/75 cursor-pointer hover:bg-white/5 hover:border-yellow-400/60 transition">
                    <Upload className="w-4 h-4" strokeWidth={2.5} />
                    Upload payment screenshot
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickProof} className="hidden" />
                  </label>
                )}
              </div>

              {err && (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 text-red-200 text-[12px] px-3 py-2">{err}</div>
              )}

              <button
                type="button"
                onClick={send}
                disabled={submitting || !proofFile}
                className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl text-bg font-extrabold text-[14px] shadow-md disabled:opacity-50 active:scale-[0.98] transition"
                style={{ background: "#FACC15" }}
              >
                {submitting ? "Sending…" : "Send"}
              </button>
              <p className="text-[10px] text-ink/45 text-center leading-snug">
                Banner activates immediately. Admin verifies within 24h.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

