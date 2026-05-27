'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LocationPermissionPrompt from '@/components/onboarding/LocationPermissionPrompt'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import { logNav } from '@/lib/perf/navTiming'

// ============================================================================
// / — Slim welcome page (May 2026 restructure)
// ----------------------------------------------------------------------------
// Founder direction: the landing should NOT dump all 10 service tiles + the
// three browse CTAs onto a first-time visitor. Instead:
//   1. /  shows the IndoCity wordmark, the existing hero copy + tagline,
//      and ONE big "Enter App" CTA + a small footer row (language + sign in).
//   2. Tapping "Enter App" opens a location-permission warm-up modal that
//      explains WHY we want GPS before the browser-native prompt fires.
//   3. Whichever path the customer picks (GPS or Skip), they land on
//      /explore which hosts the full category grid + browse CTAs.
//
// Hero copy ("At Your Finger Tips" + the wordmark + the "Indonesia." line)
// is preserved verbatim from the previous landing per founder direction.
// ============================================================================

type Locale = 'id' | 'en'

const STRINGS: Record<Locale, {
  h1Line1: string
  h1Line2: string
  lede: string
  enter: string
  signIn: string
}> = {
  id: {
    h1Line1: 'IndoCity,',
    h1Line2: 'Indonesia.',
    lede: 'At Your Finger Tips',
    enter: 'Masuk Aplikasi',
    signIn: 'Masuk',
  },
  en: {
    h1Line1: 'IndoCity,',
    h1Line2: 'Indonesia.',
    lede: 'At Your Finger Tips',
    enter: 'Enter App',
    signIn: 'Sign in',
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
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('id')
  const [promptOpen, setPromptOpen] = useState(false)

  useEffect(() => { setLocale(getStoredLocale()) }, [])

  // Capture ?ref=AGENTCODE / ?b=BANNERID on first paint — same affiliate
  // hook the old landing had. Customers who arrive via an affiliate link
  // and later sign up still credit the agent.
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

  function handleEnterApp() {
    logNav('landing:enter-app')
    setPromptOpen(true)
  }

  function handlePromptComplete() {
    setPromptOpen(false)
    router.push('/explore')
  }

  return (
    <main className="h-[100dvh] relative flex flex-col overflow-hidden">
      {/* Landing-only background image. Same image the old landing used —
          fixed-attachment so the welcome screen feels grounded. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage: `url('https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2011_47_55%20PM.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Hero — fills the viewport between the (empty) header band and the
          bottom footer row. Content centered both ways so the wordmark
          + CTA feel like one balanced composition. */}
      <section className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 min-h-0 overflow-hidden">
        <div className="max-w-md mx-auto text-center space-y-6 w-full">
          <h1 className="text-[36px] sm:text-[48px] md:text-[56px] font-extrabold leading-[1.05] tracking-tight">
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddfsdfsdfs-removebg-preview.png"
              alt={t.h1Line1}
              className="block mx-auto h-14 sm:h-20 md:h-24 w-auto"
            />
            <span className="gradient-text">{t.h1Line2}</span>
          </h1>

          <p className="text-black text-[15px] font-bold leading-relaxed max-w-md mx-auto">
            {t.lede}
          </p>

          {/* PRIMARY CTA — single brand-yellow button. Opens the location
              warm-up modal, which routes onward to /explore. */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleEnterApp}
              className="w-full min-h-[52px] rounded-2xl px-6 bg-gradient-to-r from-brand to-brand2 text-[#0F172A] font-extrabold text-[15px] hover:from-brand2 hover:to-brand active:scale-[0.99] transition shadow-[0_8px_22px_rgba(250,204,21,0.35)]"
              aria-label={t.enter}
            >
              {t.enter}
            </button>
          </div>
        </div>
      </section>

      {/* Footer row — language toggle + sign in link. Kept tiny per spec. */}
      <div className="relative z-30 shrink-0 px-4 pb-5 pt-3">
        <div className="max-w-md mx-auto flex items-center justify-between text-[12px] font-bold">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLocaleAndStore('id')}
              className={`px-2.5 py-1 rounded-full transition ${locale === 'id' ? 'bg-brand/15 text-brand' : 'text-dim hover:text-muted'}`}
              aria-pressed={locale === 'id'}
            >ID</button>
            <span className="text-line">·</span>
            <button
              onClick={() => setLocaleAndStore('en')}
              className={`px-2.5 py-1 rounded-full transition ${locale === 'en' ? 'bg-brand/15 text-brand' : 'text-dim hover:text-muted'}`}
              aria-pressed={locale === 'en'}
            >EN</button>
          </div>

          <Link
            href="/login"
            className="text-brand hover:underline font-extrabold"
          >
            {t.signIn} →
          </Link>
        </div>
      </div>

      <PlatformDisclaimer variant="links" />

      <LocationPermissionPrompt open={promptOpen} onComplete={handlePromptComplete} />
    </main>
  )
}
