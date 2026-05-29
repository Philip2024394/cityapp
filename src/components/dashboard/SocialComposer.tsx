'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, Download, MessageCircle, Copy, Check,
  AlertCircle, Loader2, Share2, Instagram,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import {
  SOCIAL_BANNERS, SOCIAL_QUOTA_MONTHLY,
  SOCIAL_BANNER_CATEGORY_LABELS,
  type SocialBanner, type SocialBannerCategoryId,
} from '@/lib/social/banners'

// =============================================================================
// SocialComposer — shared by /dashboard/car/social and /dashboard/rider/social.
//
// Driver picks a pre-composed CityRiders banner → downloads it or shares
// it to WhatsApp / Instagram / Facebook → each commit hits POST
// /api/dashboard/social to decrement their 20/month quota.
//
// No canvas overlay engine in Phase A — banners ship with branding
// already baked in. When we want per-driver overlay (profile pic + city
// stitched onto a blank template), we'll add a second composer variant.
// =============================================================================

type Quota = {
  month:     string
  used:      number
  cap:       number
  remaining: number
}

export default function SocialComposer({ backHref, vertical }: {
  backHref:  string
  vertical: 'car' | 'rider'
}) {
  const [quota, setQuota]   = useState<Quota | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [selected, setSelected] = useState<SocialBanner | null>(null)
  const [busy, setBusy]     = useState(false)
  const [toast, setToast]   = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const grouped = useMemo(() => {
    const out: Record<SocialBannerCategoryId, SocialBanner[]> = {
      'ride-and-car-service-booking': [],
    }
    for (const b of SOCIAL_BANNERS) out[b.category].push(b)
    return out
  }, [])

  // Quota fetch on mount
  const loadQuota = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/social', { cache: 'no-store' })
      if (r.status === 401) { setError('not_signed_in'); return }
      if (!r.ok) { setError('fetch_failed'); return }
      const j = await r.json() as Quota
      setQuota(j)
    } catch { setError('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void loadQuota() }, [loadQuota])

  function showToast(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 2400)
  }

  // Increment quota — fire-and-forget. On 429 we surface the message.
  async function trackShare(banner: SocialBanner, platform: string): Promise<boolean> {
    try {
      const r = await fetch('/api/dashboard/social', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ banner_id: banner.id, platform }),
      })
      if (r.status === 429) {
        showToast('err', 'Kuota bulan ini habis (20/20)')
        const j = await r.json().catch(() => null)
        if (j) setQuota(j)
        return false
      }
      if (!r.ok) {
        showToast('err', 'Tidak bisa menyimpan share. Coba lagi.')
        return false
      }
      const j = await r.json() as Quota
      setQuota(j)
      return true
    } catch {
      showToast('err', 'Network error.')
      return false
    }
  }

  // Download — fetch the image as blob, offer as PNG download. Counts
  // toward quota as a share (the user explicitly committed to use it).
  async function handleDownload(banner: SocialBanner) {
    if (busy) return
    setBusy(true)
    try {
      const ok = await trackShare(banner, 'download')
      if (!ok) return
      const res = await fetch(banner.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cityriders-${banner.id}.png`
      a.click()
      URL.revokeObjectURL(url)
      showToast('ok', 'Tersimpan ke galeri')
    } finally { setBusy(false) }
  }

  async function handleShareWhatsApp(banner: SocialBanner) {
    if (busy) return
    setBusy(true)
    try {
      const ok = await trackShare(banner, 'whatsapp')
      if (!ok) return
      // wa.me doesn't accept image uploads — caption + URL only. The
      // banner image must be sent separately from the gallery.
      const text = `${banner.caption_id}\n${banner.url}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
      showToast('ok', 'WhatsApp dibuka')
    } finally { setBusy(false) }
  }

  async function handleCopyCaption(banner: SocialBanner) {
    if (busy) return
    setBusy(true)
    try {
      const ok = await trackShare(banner, 'copy_caption')
      if (!ok) return
      await navigator.clipboard.writeText(`${banner.caption_id}\n${banner.url}`)
      showToast('ok', 'Caption disalin')
    } catch { showToast('err', 'Tidak bisa menyalin') }
    finally { setBusy(false) }
  }

  async function handleNativeShare(banner: SocialBanner) {
    if (busy) return
    setBusy(true)
    try {
      const ok = await trackShare(banner, 'native')
      if (!ok) return
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({
          title: 'CityRiders',
          text:  banner.caption_id,
          url:   banner.url,
        })
        showToast('ok', 'Dibagikan')
      } else {
        showToast('err', 'Browser tidak mendukung Share')
      }
    } catch { /* user cancelled — silent */ }
    finally { setBusy(false) }
  }

  if (loading) {
    return (
      <Shell>
        <BackLink backHref={backHref} />
        <div className="flex items-center justify-center pt-24">
          <Loader2 className="w-7 h-7 text-[#EAB308] animate-spin" strokeWidth={2.5} />
        </div>
      </Shell>
    )
  }
  if (error === 'not_signed_in') {
    return (
      <Shell>
        <BackLink backHref={backHref} />
        <EmptyCard title="Sign in required" body="Sign in to access the social composer.">
          <Link href="/signup" className="mt-4 inline-block px-5 py-3 rounded-2xl bg-[#FACC15] text-black text-[13px] font-extrabold" style={{ minHeight: 44 }}>
            Sign in
          </Link>
        </EmptyCard>
      </Shell>
    )
  }
  if (error) {
    return (
      <Shell>
        <BackLink backHref={backHref} />
        <EmptyCard title="Could not load quota" body="Tap refresh or try again later." />
      </Shell>
    )
  }

  const remaining = quota?.remaining ?? SOCIAL_QUOTA_MONTHLY
  const used      = quota?.used      ?? 0
  const cap       = quota?.cap       ?? SOCIAL_QUOTA_MONTHLY
  const exhausted = remaining <= 0

  return (
    <Shell>
      <BackLink backHref={backHref} />

      {/* Hero strip — quota bar */}
      <section
        className="rounded-3xl p-5 sm:p-6 mb-4"
        style={{
          background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
          color: '#0A0A0A',
          boxShadow: '0 12px 32px rgba(250,204,21,0.30)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] opacity-70">
              Social posts
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-black leading-tight mt-0.5">
              Bagikan ke media sosial Anda
            </h1>
            <p className="text-[12.5px] font-bold opacity-80 mt-1">
              {vertical === 'car'
                ? 'Pilih banner siap-pakai, share ke WhatsApp / Instagram / Facebook.'
                : 'Pilih banner siap-pakai, share ke pelanggan via WhatsApp / IG / FB.'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">Kuota</div>
            <div className="text-[20px] font-black leading-none mt-0.5 tabular-nums">{remaining}<span className="text-[12px] opacity-65">/{cap}</span></div>
          </div>
        </div>

        {/* Used bar */}
        <div className="mt-4">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(10,10,10,0.18)' }}>
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${Math.min(100, (used / cap) * 100)}%`, background: '#0A0A0A' }}
            />
          </div>
          <div className="mt-2 text-[11px] font-bold opacity-75">
            {exhausted
              ? 'Kuota bulan ini habis — reset tanggal 1.'
              : `${used} dari ${cap} digunakan bulan ini. Reset tanggal 1.`}
          </div>
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-[12.5px] font-extrabold shadow-lg"
          style={{
            background: toast.kind === 'ok' ? '#0A0A0A' : '#7F1D1D',
            color:      '#FFFFFF',
          }}
        >
          {toast.kind === 'ok'
            ? <Check className="w-3.5 h-3.5 inline -mt-0.5 mr-1" strokeWidth={3} />
            : <AlertCircle className="w-3.5 h-3.5 inline -mt-0.5 mr-1" strokeWidth={2.5} />}
          {toast.msg}
        </div>
      )}

      {/* Banner gallery — grouped by category */}
      {Object.entries(grouped).map(([catId, banners]) => (
        <section key={catId} className="mb-6">
          <div className="flex items-center justify-between gap-2 px-1 mb-2">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-black/55">
              {SOCIAL_BANNER_CATEGORY_LABELS[catId as SocialBannerCategoryId]}
            </h2>
            <span className="text-[10.5px] font-bold text-black/45 tabular-nums">{banners.length}</span>
          </div>

          {banners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center">
              <Sparkles className="w-5 h-5 mx-auto text-[#EAB308] mb-2" strokeWidth={2.5} />
              <p className="text-[12.5px] text-black/55">More banners coming soon in this category.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {banners.map((b) => (
                <BannerCard
                  key={b.id}
                  banner={b}
                  active={selected?.id === b.id}
                  exhausted={exhausted}
                  busy={busy}
                  onSelect={() => setSelected(b)}
                  onDownload={() => handleDownload(b)}
                  onWhatsApp={() => handleShareWhatsApp(b)}
                  onCopy={() => handleCopyCaption(b)}
                  onNativeShare={() => handleNativeShare(b)}
                />
              ))}
            </div>
          )}
        </section>
      ))}

      {/* Footer note */}
      <section className="rounded-2xl bg-white border border-black/10 p-4 text-[12px] text-black/60 leading-relaxed">
        <p className="font-bold text-black/80 mb-1">Tips berbagi efektif:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Posting ke WhatsApp Status, Instagram Story, atau halaman Facebook Anda.</li>
          <li>Gunakan caption yang sudah disediakan, atau ubah sesuai gaya Anda.</li>
          <li>Konsistensi: bagikan 1-3× per minggu untuk hasil terbaik.</li>
          <li>Kuota reset otomatis pada tanggal 1 setiap bulan.</li>
        </ul>
      </section>
    </Shell>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

function BannerCard({
  banner, active, exhausted, busy, onSelect,
  onDownload, onWhatsApp, onCopy, onNativeShare,
}: {
  banner:        SocialBanner
  active:        boolean
  exhausted:     boolean
  busy:          boolean
  onSelect:      () => void
  onDownload:    () => void
  onWhatsApp:    () => void
  onCopy:        () => void
  onNativeShare: () => void
}) {
  return (
    <div
      className="rounded-2xl bg-white border border-black/10 overflow-hidden hover:border-[#FACC15] transition"
      style={active ? { borderColor: '#FACC15', boxShadow: '0 8px 24px rgba(250,204,21,0.22)' } : undefined}
    >
      {/* Banner image */}
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left"
        style={{ aspectRatio: '16 / 9', background: '#0A0A0A' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={banner.url}
          alt={banner.label}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </button>

      {/* Meta strip */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="text-[13px] font-black text-[#0A0A0A] leading-tight truncate">{banner.label}</h3>
            <span
              className="inline-block mt-0.5 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: banner.intent === 'customer'        ? '#DCFCE7'
                           : banner.intent === 'driver_recruit' ? '#FEF3C7'
                           :                                      '#E0E7FF',
                color:      banner.intent === 'customer'        ? '#166534'
                           : banner.intent === 'driver_recruit' ? '#854D0E'
                           :                                      '#3730A3',
              }}
            >
              {banner.intent === 'customer'        ? 'Untuk pelanggan'
              : banner.intent === 'driver_recruit' ? 'Rekrut driver'
              :                                      'Komunitas'}
            </span>
          </div>
        </div>

        <p className="text-[12px] text-black/65 leading-snug">{banner.caption_id}</p>

        {/* Action row */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <ActionBtn
            label="Download"
            icon={<Download className="w-3.5 h-3.5" strokeWidth={2.5} />}
            onClick={onDownload}
            disabled={busy || exhausted}
            primary
          />
          <ActionBtn
            label="WhatsApp"
            icon={<MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />}
            onClick={onWhatsApp}
            disabled={busy || exhausted}
          />
          <ActionBtn
            label="Share"
            icon={<Share2 className="w-3.5 h-3.5" strokeWidth={2.5} />}
            onClick={onNativeShare}
            disabled={busy || exhausted}
          />
          <ActionBtn
            label="Copy"
            icon={<Copy className="w-3.5 h-3.5" strokeWidth={2.5} />}
            onClick={onCopy}
            disabled={busy || exhausted}
          />
        </div>

        {/* Native instagram hint — IG can't accept URL shares; user must
            download + manually upload. We surface this so the driver
            isn't confused why there's no 1-tap IG button. */}
        <div className="mt-2 flex items-start gap-1.5 text-[10.5px] text-black/45 leading-snug">
          <Instagram className="w-3 h-3 mt-0.5 shrink-0" strokeWidth={2.5} />
          <span>Untuk Instagram / TikTok — tap Download, lalu posting dari galeri.</span>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({
  label, icon, onClick, disabled, primary,
}: {
  label:    string
  icon:     React.ReactNode
  onClick:  () => void
  disabled: boolean
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider transition active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: primary ? '#FACC15' : '#FFFBEA',
        color:      '#0A0A0A',
        border:     primary ? 'none' : '1px solid rgba(250,204,21,0.45)',
        minHeight:  44,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function BackLink({ backHref }: { backHref: string }) {
  return (
    <Link
      href={backHref}
      className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black mb-4"
    >
      <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
      Back to dashboard
    </Link>
  )
}

function EmptyCard({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white border-2 border-dashed border-[#FACC15] p-6 sm:p-8 text-center">
      <div
        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
        style={{ background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)', color: '#0A0A0A' }}
      >
        <Sparkles className="w-6 h-6" strokeWidth={2.5} />
      </div>
      <h1 className="text-[20px] font-black leading-tight">{title}</h1>
      <p className="mt-2 text-[13px] text-black/65 leading-relaxed">{body}</p>
      {children}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-24">
        {children}
      </div>
    </main>
  )
}
