'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, Check, AlertCircle, Loader2, Share2,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import {
  SOCIAL_BANNERS, SOCIAL_QUOTA_MONTHLY,
  SOCIAL_BANNER_CATEGORY_LABELS,
  type SocialBanner, type SocialBannerCategoryId,
} from '@/lib/social/banners'
import SharePreviewModal, { type SharePromo } from '@/components/dashboard/SharePreviewModal'

// =============================================================================
// SocialComposer — shared by /dashboard/car/social and /dashboard/rider/social.
//
// Driver picks a pre-composed CityDrivers banner → opens the SAME
// SharePreviewModal that the beautician promo flow uses. Pixel-parity
// with /dashboard/beautician/promos was a founder directive (2026-05-30):
// drivers see exactly the same share UI beauticians do, just with the
// CityDrivers yellow accent (#FACC15) instead of pink.
//
// Quota: each share counts toward the driver's 20/month cap. Because the
// SharePreviewModal's buttons are simple anchor tags (wa.me, fb sharer,
// download, copy) that bypass any onClick of ours when the user taps
// them on mobile, we wrap the whole modal in a `<div onClickCapture>` so
// every tap on a share-target button decrements the quota exactly once
// per banner-open. This keeps the share UI unmodified while still
// honouring the cap.
// =============================================================================

type Quota = {
  month:     string
  used:      number
  cap:       number
  remaining: number
}

type Driver = {
  business_name:  string
  slug:           string
  brand_logo_url: string | null
  city:           string | null
}

type SocialApiResponse = Quota & { driver?: Driver | null }

export default function SocialComposer({ backHref, vertical }: {
  backHref:  string
  vertical: 'car' | 'bus' | 'jeep' | 'rider'
}) {
  const [quota, setQuota]     = useState<Quota | null>(null)
  const [driver, setDriver]   = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [shareBanner, setShareBanner] = useState<SocialBanner | null>(null)
  const [toast, setToast]     = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  // Prevents double-counting a single banner open. Each time we open the
  // modal we reset to false; the first share-target click inside the
  // modal flips it to true and decrements the quota.
  const sharedOnceRef = useRef(false)

  const grouped = useMemo(() => {
    const out: Record<SocialBannerCategoryId, SocialBanner[]> = {
      'ride-and-car-service-booking': [],
    }
    for (const b of SOCIAL_BANNERS) out[b.category].push(b)
    return out
  }, [])

  const loadQuota = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/social', { cache: 'no-store' })
      if (r.status === 401) { setError('not_signed_in'); return }
      if (!r.ok) { setError('fetch_failed'); return }
      const j = await r.json() as SocialApiResponse
      setQuota({ month: j.month, used: j.used, cap: j.cap, remaining: j.remaining })
      setDriver(j.driver ?? null)
    } catch { setError('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void loadQuota() }, [loadQuota])

  function showToast(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 1600)
  }

  // Increment quota — fire-and-forget. On 429 we surface the message
  // and close the modal so the driver sees the quota strip update.
  const trackShare = useCallback(async (banner: SocialBanner, platform: string): Promise<boolean> => {
    try {
      const r = await fetch('/api/dashboard/social', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ banner_id: banner.id, platform }),
      })
      if (r.status === 429) {
        showToast('err', 'Kuota bulan ini habis (20/20)')
        const j = await r.json().catch(() => null)
        if (j) setQuota({ month: j.month, used: j.used, cap: j.cap, remaining: j.remaining })
        return false
      }
      if (!r.ok) {
        showToast('err', 'Tidak bisa menyimpan share. Coba lagi.')
        return false
      }
      const j = await r.json() as Quota
      setQuota(j)
      showToast('ok', 'Share dicatat')
      return true
    } catch {
      showToast('err', 'Network error.')
      return false
    }
  }, [])

  // Capture-phase click handler on the modal wrapper. The SharePreviewModal
  // ships with anchor + button share targets that fire navigation
  // immediately; we intercept the first one per modal open so it counts
  // toward the quota without blocking the share itself.
  const onShareCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!shareBanner || sharedOnceRef.current) return
    const target = e.target as HTMLElement
    const btn = target.closest<HTMLElement>('[data-share-target], a, button')
    if (!btn) return

    // Skip the close button + collapsible preview toggle. The
    // SharePreviewModal uses `aria-label="Close"`/`"Close share preview"`
    // on its close affordances and `aria-expanded` on the preview
    // disclosure. Anything else inside the share-buttons block counts.
    const ariaLabel    = btn.getAttribute('aria-label') ?? ''
    const ariaExpanded = btn.getAttribute('aria-expanded')
    if (/close/i.test(ariaLabel)) return
    if (ariaExpanded !== null) return
    // Skip the platform-picker inside the mockup preview area.
    if (btn.closest('[role="listbox"]')) return
    if (btn.getAttribute('role') === 'option') return

    // Best-effort platform tag for analytics (lowercased button text).
    const platform = (btn.textContent ?? 'unknown').trim().toLowerCase().slice(0, 24)
    sharedOnceRef.current = true
    void trackShare(shareBanner, platform || 'unknown')
  }, [shareBanner, trackShare])

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
          <Link href="/signup" className="mt-4 inline-block px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[13px] font-extrabold" style={{ minHeight: 44 }}>
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

  // Project a SocialBanner into the SharePromo shape the beautician
  // promo modal consumes. This is the bridge that makes the two flows
  // pixel-identical: the modal doesn't know banners exist, it just sees
  // a promo with photo + headline + captions.
  const sharePromo: SharePromo | null = shareBanner ? {
    slug:                 shareBanner.id,
    headline:             shareBanner.label,
    photo_url:            shareBanner.url,
    ai_caption:           shareBanner.caption_id,
    ai_caption_short:     shareBanner.caption_en,
    hashtags_by_platform: null,
  } : null

  const providerName   = driver?.business_name?.trim() || 'CityDrivers Driver'
  const providerHandle = driver?.slug?.trim() || 'cityriders'
  const profileImage   = driver?.brand_logo_url ?? null
  const city           = driver?.city ?? null

  return (
    <Shell>
      <BackLink backHref={backHref} />

      {/* Brand header — structure mirrors /dashboard/beautician/promos
          (pink there, CityDrivers yellow here). Icon + title + status pill
          + short blurb. Pixel-parity goal: drivers + beauticians get
          visually identical share-flow chrome, just different accent. */}
      <div className="rounded-3xl border p-5 shadow-sm mb-4" style={{ borderColor: 'rgba(250,204,21,0.45)', background: 'linear-gradient(135deg, #FFFBEA 0%, #FFFFFF 100%)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl text-[#0A0A0A] flex items-center justify-center shadow-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)' }}
          >
            <Sparkles size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-[20px] font-black leading-tight text-black truncate">Social posts</h1>
              <span
                className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 border"
                style={{ color: '#854D0E', background: '#FEF3C7', borderColor: '#FACC15' }}
              >
                Active
              </span>
            </div>
            <p className="text-[12.5px] text-black/70 leading-snug">
              Pick a pre-made banner and share to Instagram, WhatsApp, Facebook.
            </p>
          </div>
        </div>
      </div>

      {/* Usage strip — mirrors the beautician quota card. No "New" button
          here because the banner grid below IS the create surface; tapping
          a banner card opens the share modal. */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[14px] font-black text-black">{used} / {cap} banners shared this month</div>
          <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/55 tabular-nums">{remaining} left</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full transition-[width]"
            style={{ width: `${Math.min(100, (used / cap) * 100)}%`, background: '#FACC15' }}
          />
        </div>
        {exhausted && (
          <p className="text-[12px] text-amber-700 mt-2">Monthly limit reached — resets on the 1st.</p>
        )}
      </div>

      {/* Toast — keep current pattern (top-center floating pill, 1.6s) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 rounded-full text-[12.5px] font-extrabold shadow-lg"
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
                  exhausted={exhausted}
                  onShare={() => {
                    sharedOnceRef.current = false
                    setShareBanner(b)
                  }}
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

      {sharePromo && (
        <div onClickCapture={onShareCapture}>
          <SharePreviewModal
            promo={sharePromo}
            providerName={providerName}
            providerHandle={providerHandle}
            profileImageUrl={profileImage}
            city={city}
            themeColor="#FACC15"
            onClose={() => setShareBanner(null)}
          />
        </div>
      )}
    </Shell>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

function BannerCard({
  banner, exhausted, onShare,
}: {
  banner:    SocialBanner
  exhausted: boolean
  onShare:   () => void
}) {
  const intentChip = banner.intent === 'customer'
    ? { bg: '#DCFCE7', fg: '#166534', label: 'Untuk pelanggan' }
    : banner.intent === 'driver_recruit'
    ? { bg: '#FEF3C7', fg: '#854D0E', label: 'Rekrut driver' }
    : { bg: '#E0E7FF', fg: '#3730A3', label: 'Komunitas' }

  return (
    <article className="rounded-3xl bg-white border border-black/10 overflow-hidden shadow-sm hover:shadow-md transition">
      <button
        type="button"
        onClick={onShare}
        aria-label={`Bagikan ${banner.label}`}
        className="block w-full text-left"
        style={{ aspectRatio: '16 / 9', background: '#F4F4F5' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={banner.url}
          alt={banner.label}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </button>

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[15px] sm:text-[16px] font-black text-[#0A0A0A] leading-tight min-w-0">
            {banner.label}
          </h3>
          <span
            className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ background: intentChip.bg, color: intentChip.fg }}
          >
            {intentChip.label}
          </span>
        </div>

        <p className="text-[13px] text-black/65 leading-snug line-clamp-2">
          {banner.caption_id}
        </p>

        <button
          type="button"
          onClick={onShare}
          disabled={exhausted}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[13.5px] font-extrabold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: exhausted ? '#F4F4F5' : '#FACC15',
            color:      '#0A0A0A',
            boxShadow:  exhausted ? 'none' : '0 6px 18px -4px rgba(250,204,21,0.55)',
            minHeight:  48,
          }}
        >
          <Share2 className="w-4 h-4" strokeWidth={2.5} />
          {exhausted ? 'Kuota habis' : 'Bagikan ke media sosial'}
        </button>
      </div>
    </article>
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
