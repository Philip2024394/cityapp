'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import { logNav } from '@/lib/perf/navTiming'

// Service tiles — the primary CTA on landing. Routes:
//   person / parcel / food → /cari?service=<id>
//   rental                  → /rent (own marketplace, separate flow)
//   tour                    → /tour (tour-guide marketplace)
//   massage                 → /massage (massage marketplace)
// Order: Ride → Parcel → Food → Rental → Tour → Massage.
// All labels share the "Indo X" prefix — founder's brand convention for
// the directory-of-Indonesia positioning.
type TileId = 'person' | 'parcel' | 'food' | 'rental' | 'tour' | 'massage' | 'beautician' | 'laundry' | 'handyman' | 'home-clean'
const SERVICE_TILES: ReadonlyArray<{ id: TileId; label: string; sub: string; img: string; href: string }> = [
  { id: 'person', label: 'Indo Ride',   sub: 'Passenger',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitleddasdas-removebg-preview.png',
    href: '/cari?service=person' },
  { id: 'parcel', label: 'Indo Parcel', sub: 'Package · Courier',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitledsddasd-removebg-preview.png?updatedAt=1779013880961',
    href: '/cari?service=parcel' },
  { id: 'food',   label: 'Indo Food',   sub: 'Resto · Warung',
    img: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2017,%202026,%2005_29_25%20PM.png?updatedAt=1779013783890',
    href: '/cari?service=food' },
  { id: 'rental', label: 'Indo Rental', sub: 'Self-ride · With driver',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitledwrrssswdqw-removebg-preview.png?updatedAt=1778253308442',
    href: '/rent' },
  { id: 'tour', label: 'Indo Tour',     sub: 'Local guides · Day trips',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitledsssaaa-removebg-preview.png?updatedAt=1779390066960',
    href: '/tour' },
  { id: 'massage', label: 'Indo Massage', sub: 'Home & Hotel · 60/90/120 min',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitledsssaaa-removebg-preview.png?updatedAt=1779390066960',
    href: '/massage' },
  { id: 'beautician', label: 'Indo Beautician', sub: 'Makeup · Nail · Hair',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitledassss-removebg-preview.png',
    href: '/beautician' },
  { id: 'laundry', label: 'Indo Laundry', sub: 'Pickup & dropoff · per kg',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitledasdasaaaaa-removebg-preview.png',
    href: '/laundry' },
  { id: 'handyman', label: 'Indo Handyman', sub: 'Tukang · Listrik · AC · Pipa',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitledasdasaasdasd-removebg-preview.png',
    href: '/handyman' },
  { id: 'home-clean', label: 'Indo Home Clean', sub: 'Bersih rumah · per jam / hari',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdasd-removebg-preview%20(1).png',
    href: '/home-clean' },
]

// Background map (dark Yogyakarta + 42 pulsing rider pings + autoPan) now
// lives in the root layout as <MapBackground />, so every page shares it.
// The landing no longer renders its own — keeps a single source of truth.

// Inline strings — landing-only translations for Phase 1.
// Deeper pages (signup, dashboard, marketplace, etc.) stay Bahasa until
// we wire next-intl across the rest of the app in a Phase 2 task.
type Locale = 'id' | 'en'
const STRINGS: Record<Locale, {
  pill: string
  h1Line1: string
  h1Line2: string
  lede: string
  enter: string
  freeNote: string
  trust: { commission: string; whatsapp: string; verified: string }
}> = {
  id: {
    pill: 'Rider independen di kota kamu',
    h1Line1: 'Komunitas motor,',
    h1Line2: 'Indonesia.',
    lede: 'At Your Finger Tips',
    enter: 'Masuk',
    freeNote: 'Gratis · langsung kontak rider',
    trust: { commission: '0% komisi', whatsapp: 'WhatsApp', verified: 'Nomor WhatsApp ter-verifikasi' },
  },
  en: {
    pill: 'Independent riders in your city',
    h1Line1: 'Motorbike community,',
    h1Line2: 'Indonesia.',
    lede: 'At Your Finger Tips',
    enter: 'Enter',
    freeNote: 'Free · direct rider contact',
    trust: { commission: '0% commission', whatsapp: 'WhatsApp', verified: 'Phone-verified riders' },
  },
}

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'id'
  try {
    const ls = localStorage.getItem('cr_locale')
    if (ls === 'id' || ls === 'en') return ls
  } catch { /* ignore */ }
  return 'id'
}

export default function LandingPage() {
  // Locale state. SSR uses 'id' (deterministic); client hydrates and then
  // reads localStorage. The brief flash from 'id' → stored locale on first
  // paint is acceptable for a landing page.
  const [locale, setLocale] = useState<Locale>('id')
  useEffect(() => { setLocale(getStoredLocale()) }, [])

  // Capture ?ref=AGENTCODE on first paint and stash it for 30 days. If
  // the customer signs up later (any tab, any time within the window),
  // the agent code rides along to the drivers row → trigger inserts the
  // affiliate_referrals entry. See src/lib/affiliate/referrer.ts.
  //
  // Also log a 'direct' row in affiliate_banner_shares when BOTH ?ref=
  // and ?b= (banner id) are present — that's an actual landed click on
  // an affiliate-distributed banner. Fire-and-forget; never blocks.
  useEffect(() => {
    import('@/lib/affiliate/referrer').then((m) => m.captureReferrerFromUrl())
    try {
      const params = new URLSearchParams(window.location.search)
      const ref = (params.get('ref') || '').trim()
      const banner = (params.get('b') || '').trim()
      if (ref && banner && /^[A-Za-z0-9_-]+$/.test(ref) && /^[A-Za-z0-9_-]+$/.test(banner)) {
        const payload = JSON.stringify({
          agent_code: ref.toUpperCase(),
          banner_id: banner,
          platform: 'direct',
          referrer: document.referrer || '',
        })
        const endpoint = '/api/affiliate/track-share'
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' })
          if (navigator.sendBeacon(endpoint, blob)) return
        }
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => { /* swallow */ })
      }
    } catch { /* swallow */ }
  }, [])
  const t = STRINGS[locale]

  function setLocaleAndStore(lang: Locale) {
    try { localStorage.setItem('cr_locale', lang) } catch { /* ignore */ }
    setLocale(lang)
  }

  return (
    <main className="h-[100dvh] relative flex flex-col overflow-hidden">
      {/* Landing-only background image. Sits above the global solid-white
          PageBackground (later in DOM at the same -z-10) so only this
          page picks up the scene. Fixed-attachment so it doesn't shift
          when the page flex-shrinks. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage: `url('https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2001_41_12%20AM.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Header intentionally minimal per founder request — no logo,
          no brand text, no sign-in/join CTAs. The "Join today" footer
          link at the bottom of the page replaces the header join menu. */}

      {/* Hero — flex-1 so it fills the viewport between header and the
          bottom edge. Content anchored to the TOP of the section
          (items-start + pt-4) so the headline + lede stay in the hero
          band on phones instead of being pushed off-screen by the 10
          tile buttons below. Tight paddings + min-h-0 so flex can
          shrink the section if content overflows. */}
      <section className="relative z-20 px-4 pt-4 pb-3 flex-1 flex items-start min-h-0 overflow-hidden">
        <div className="max-w-xl mx-auto text-center space-y-3 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/25">
            <span className="dot-online !w-2 !h-2" />
            <span className="text-[12px] font-extrabold text-brand uppercase tracking-wider">
              {t.pill}
            </span>
          </div>

          <h1 className="text-[36px] sm:text-[48px] md:text-[56px] font-extrabold leading-[1.05] tracking-tight">
            {/* Founder-supplied wordmark replaces the motorbike-community
                heading text. Locale-agnostic; the image sits where
                t.h1Line1 used to render. */}
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdadasdas-removebg-preview.png?updatedAt=1779782176718"
              alt={t.h1Line1}
              className="block mx-auto h-12 sm:h-16 md:h-20 w-auto"
            />
            <span className="gradient-text">{t.h1Line2}</span>
          </h1>

          <p className="text-muted text-[15px] leading-relaxed max-w-md mx-auto">
            {t.lede}
          </p>

          {/* PRIMARY CTA — service tiles. 2-column grid with generous
              gap so adjacent tiles can't be accidentally co-tapped on
              a mobile screen (8px → 14px between tiles + safe inner
              padding inside each Link). */}
          <div className="pt-1 w-full max-w-sm mx-auto grid grid-cols-2 gap-x-3.5 gap-y-3 mb-2">
            {SERVICE_TILES.map((tile, i) => (
              // 2 tiles per row — same Link prefetch + logNav timing
              // so tap-to-paint stays near-instant.
              <Link
                key={tile.id}
                href={tile.href}
                prefetch
                onClick={() => logNav(`landing-tile:${tile.id}`)}
                className="w-full flex items-center gap-2 p-1.5 rounded-2xl text-bg bg-gradient-to-r from-brand to-brand2 hover:from-brand2 hover:to-brand active:scale-[0.99] transition-all shadow-[0_6px_18px_rgba(250,204,21,0.30)]"
                style={{ animation: `fadeUp 0.55s ease-out ${i * 0.08}s both` }}
                aria-label={`Enter — ${tile.label}`}
              >
                <span
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: '#172554' }}
                  aria-hidden
                >
                  <img src={tile.img} alt="" className="h-7 w-auto object-contain" loading="eager" />
                </span>
                <span className="flex-1 text-left min-w-0">
                  <span className="block font-extrabold text-[13px] leading-tight truncate">{tile.label}</span>
                  <span className="block text-[10px] font-bold opacity-75 leading-tight mt-0.5 truncate">{tile.sub}</span>
                </span>
              </Link>
            ))}

          </div>

          {/* Language toggle — centered under the tile grid (was previously
              nested inside the grid, which forced it into one of the
              2-column cells). Sits on its own row below the tiles. */}
          <div className="w-full flex items-center justify-center gap-1.5 pt-2 text-[11px] font-bold">
            <button
              onClick={() => setLocaleAndStore('id')}
              className={`px-2.5 py-0.5 rounded-full transition ${locale === 'id' ? 'bg-brand/15 text-brand' : 'text-dim hover:text-muted'}`}
              aria-pressed={locale === 'id'}
            >ID</button>
            <span className="text-line">·</span>
            <button
              onClick={() => setLocaleAndStore('en')}
              className={`px-2.5 py-0.5 rounded-full transition ${locale === 'en' ? 'bg-brand/15 text-brand' : 'text-dim hover:text-muted'}`}
              aria-pressed={locale === 'en'}
            >EN</button>
          </div>
        </div>
      </section>

      {/* Footer join CTA — replaces the removed header sign-in/join.
          Routes to /join where the user picks which directory category
          to list under, then through to that vertical's signup. */}
      <div className="relative z-30 shrink-0 px-4 pb-3 text-center">
        <Link
          href="/join"
          className="inline-block text-[13px] sm:text-[14px] font-extrabold text-brand hover:underline"
        >
          Join today <span className="text-ink">indoscity.id →</span>
        </Link>
      </div>

      <PlatformDisclaimer variant="links" />
    </main>
  )
}

