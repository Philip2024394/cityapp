'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Star, ChevronDown, Briefcase, Store, Wrench } from 'lucide-react'
import LocationPermissionPrompt from '@/components/onboarding/LocationPermissionPrompt'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import { logNav } from '@/lib/perf/navTiming'

// ============================================================================
// / — Slim welcome page (May 2026 restructure)
// ----------------------------------------------------------------------------
// Founder direction: the landing should NOT dump all 10 service tiles + the
// three browse CTAs onto a first-time visitor. Instead:
//   1. /  shows the CityDrivers wordmark, the existing hero copy + tagline,
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
    h1Line1: 'Kita2u,',
    h1Line2: 'Indonesia.',
    lede: 'Pasar harian Indonesia — pesan kendaraan, sewa jasa, atau daftarkan bisnismu.',
    enter: 'Masuk Aplikasi',
    signIn: 'Masuk',
  },
  en: {
    h1Line1: 'Kita2u,',
    h1Line2: 'Indonesia.',
    lede: "Indonesia's everyday marketplace — find a ride, hire a service, or list your own.",
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

  // On-scroll fade-up reveal — every element tagged `reveal-on-scroll`
  // fades + slides up the first time it crosses 10% into the viewport.
  // CSS handles the visual; IntersectionObserver just flips the class.
  // Respects prefers-reduced-motion (CSS overrides below).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const targets = document.querySelectorAll('.reveal-on-scroll')
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('revealed'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
    )
    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  function handleEnterApp() {
    logNav('landing:enter-app')
    setPromptOpen(true)
  }

  function handlePromptComplete() {
    setPromptOpen(false)
    router.push('/explore')
  }

  return (
    <main className="min-h-[100dvh] relative flex flex-col">
      {/* Header — brand on the left, nav links on the right. Nav is
          visible inline on sm+ screens; on mobile it lives in the footer
          to keep the header light + the landing single-viewport. */}
      <header className="relative z-30 shrink-0 px-5 sm:px-6 pt-4 pb-2">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3">
          <Link href="/" className="font-black text-[22px] sm:text-[26px] leading-none tracking-tight shrink-0">
            <span style={{ color: '#0A0A0A' }}>Kita</span>
            <span style={{ color: '#FACC15' }}>2u</span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-5">
            <nav className="hidden sm:flex items-center gap-5 text-[14px] font-extrabold text-[#0A0A0A]">
              <Link href="/how-it-works"   className="hover:text-brand transition">How it works</Link>
              <Link href="/pricing"        className="hover:text-brand transition">Pricing</Link>
              <Link href="/custom-domains" className="hover:text-brand transition">Custom domains</Link>
            </nav>
            <Link
              href="/login"
              className="text-brand hover:underline font-extrabold text-[14px] shrink-0"
            >
              {t.signIn} →
            </Link>
          </div>
        </div>
      </header>

      {/* HERO — fills the first viewport, then the page scrolls into
          the marketing sections below. Replaces the previous flex-1
          fully-centered-no-scroll layout per the cold-traffic redesign. */}
      <section className="relative z-20 flex flex-col justify-center px-6 pb-6 min-h-[calc(100dvh-200px)]">
        <div className="max-w-md sm:max-w-lg mx-auto w-full space-y-3">

          {/* Hero illustration — claims the viewport. Full width on
              mobile, capped on wider screens so it stays balanced. */}
          <img
            src="https://ik.imagekit.io/9mrgsv2rp/ChatGPT%20Image%20May%2028,%202026,%2012_03_21%20PM.png"
            alt=""
            aria-hidden
            className="block w-full max-w-2xl mx-auto h-auto"
          />

          {/* Tagline — centered hook under the hero. */}
          <div className="font-black leading-[1.02] tracking-tight text-[34px] sm:text-[44px] md:text-[52px] text-center">
            <span style={{ color: '#0A0A0A' }}>Everything In </span>
            <span style={{ color: '#FACC15' }}>One Link</span>
          </div>

          {/* Small supporting sentence. */}
          <p className="text-gray-600 text-[14px] font-medium leading-snug text-center">
            {t.lede}
          </p>

          {/* CTA — full-width gold button drops users into the location
              warm-up modal which routes to /explore. */}
          <button
            type="button"
            onClick={handleEnterApp}
            className="w-full min-h-[52px] rounded-2xl px-6 bg-gradient-to-r from-brand to-brand2 text-[#0A0A0A] font-extrabold text-[15px] hover:from-brand2 hover:to-brand active:scale-[0.99] transition shadow-[0_8px_22px_rgba(250,204,21,0.35)]"
            aria-label={t.enter}
          >
            {t.enter}
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          MARKETING SECTIONS — below the fold. Cold-traffic conversion
          path: social proof → feature cards → personas → pricing
          teaser → FAQ → final CTA. Replace placeholder copy with real
          user counts / testimonials / examples once available.
          ════════════════════════════════════════════════════════════════ */}

      {/* SOCIAL PROOF strip — placeholder copy until real numbers exist. */}
      <section className="reveal-on-scroll relative z-10 px-6 py-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <div className="flex items-center justify-center gap-1 text-[#FACC15]">
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
            <Star className="w-4 h-4 fill-current" />
          </div>
          <p className="text-[14px] font-extrabold text-[#0A0A0A]">
            Built for Indonesia&apos;s growing creator economy
          </p>
          <p className="text-[12px] text-gray-600 leading-snug">
            Early access · Join the first wave of creators &amp; businesses going direct on social.
          </p>
        </div>
      </section>

      {/* FEATURE CARDS — restored from earlier removal. 3 white tiles
          covering the value pillars. */}
      <section className="reveal-on-scroll relative z-10 px-6 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-center font-black text-[24px] sm:text-[30px] tracking-tight leading-tight">
            <span style={{ color: '#0A0A0A' }}>What you get with </span>
            <span style={{ color: '#0A0A0A' }}>Kita</span>
            <span style={{ color: '#FACC15' }}>2u</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="rounded-2xl bg-white p-5 border border-gray-100 text-center flex flex-col items-center gap-3"
              style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}
            >
              <img
                src="https://ik.imagekit.io/9mrgsv2rp/Untitledsadasdaaa.png"
                alt=""
                aria-hidden
                className="block w-14 h-14 object-contain"
              />
              <div className="font-extrabold text-[15px] text-[#0A0A0A] leading-tight">One smart page</div>
              <div className="text-[12px] text-gray-600 leading-snug">Content, products &amp; bookings · all on one share link</div>
            </div>
            <div
              className="rounded-2xl bg-white p-5 border border-gray-100 text-center flex flex-col items-center gap-3"
              style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}
            >
              <img
                src="https://ik.imagekit.io/9mrgsv2rp/Untitledsadasdaaadasda.png"
                alt=""
                aria-hidden
                className="block w-14 h-14 object-contain"
              />
              <div className="font-extrabold text-[15px] text-[#0A0A0A] leading-tight">Online social selling</div>
              <div className="text-[12px] text-gray-600 leading-snug">Convert TikTok, Instagram, Facebook &amp; WhatsApp traffic into direct customers</div>
            </div>
            <div
              className="rounded-2xl bg-white p-5 border border-gray-100 text-center flex flex-col items-center gap-3"
              style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}
            >
              <img
                src="https://ik.imagekit.io/9mrgsv2rp/Untitledsadasdaaadasdadasd.png"
                alt=""
                aria-hidden
                className="block w-14 h-14 object-contain"
              />
              <div className="font-extrabold text-[15px] text-[#0A0A0A] leading-tight">Local &amp; Global</div>
              <div className="text-[12px] text-gray-600 leading-snug">Sell products worldwide or offer local delivery &amp; bookings</div>
            </div>
          </div>
        </div>
      </section>

      {/* PERSONAS — three target audiences with relevant pitches. */}
      <section className="reveal-on-scroll relative z-10 px-6 py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-center font-black text-[24px] sm:text-[30px] tracking-tight leading-tight text-[#0A0A0A]">
            Who Kita2u is for
          </h2>
          <div className="space-y-3">
            <div
              className="rounded-2xl bg-white p-5 border border-gray-100 flex items-start gap-4"
              style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}
            >
              <div
                className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.35)' }}
              >
                <Briefcase className="w-6 h-6" strokeWidth={2.25} style={{ color: '#0A0A0A' }} />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-[15px] text-[#0A0A0A] leading-tight">For creators</div>
                <div className="text-[13px] text-gray-600 leading-snug mt-1">Turn TikTok &amp; Instagram followers into paying customers without giving 30% to a marketplace.</div>
              </div>
            </div>
            <div
              className="rounded-2xl bg-white p-5 border border-gray-100 flex items-start gap-4"
              style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}
            >
              <div
                className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.35)' }}
              >
                <Store className="w-6 h-6" strokeWidth={2.25} style={{ color: '#0A0A0A' }} />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-[15px] text-[#0A0A0A] leading-tight">For small businesses</div>
                <div className="text-[13px] text-gray-600 leading-snug mt-1">One shareable page that handles product listings, menus, bookings, and direct WhatsApp orders.</div>
              </div>
            </div>
            <div
              className="rounded-2xl bg-white p-5 border border-gray-100 flex items-start gap-4"
              style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}
            >
              <div
                className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.35)' }}
              >
                <Wrench className="w-6 h-6" strokeWidth={2.25} style={{ color: '#0A0A0A' }} />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-[15px] text-[#0A0A0A] leading-tight">For service providers</div>
                <div className="text-[13px] text-gray-600 leading-snug mt-1">Drivers, beauticians, tukang, tour guides — get a profile that earns while you sleep.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING TEASER — quick "free to start" callout that links into
          the full /pricing page for details. */}
      <section className="reveal-on-scroll relative z-10 px-6 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="font-black text-[24px] sm:text-[30px] tracking-tight leading-tight text-[#0A0A0A]">
            Free to start
          </h2>
          <p className="text-[14px] text-gray-600 leading-relaxed max-w-md mx-auto">
            Get your Kita2u page, profile, and direct WhatsApp bookings at no cost. Custom domains and template tweaks are paid add-ons.
          </p>
          <Link
            href="/pricing"
            className="inline-block text-brand hover:underline font-extrabold text-[14px]"
          >
            See pricing →
          </Link>
        </div>
      </section>

      {/* FAQ — placeholder questions answering the most common
          objections. Native <details> for the disclosure pattern. */}
      <section className="reveal-on-scroll relative z-10 px-6 py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-center font-black text-[24px] sm:text-[30px] tracking-tight leading-tight text-[#0A0A0A]">
            Common questions
          </h2>
          <div className="divide-y divide-gray-200 bg-white rounded-2xl border border-gray-100"
               style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}>
            {[
              {
                q: 'What is Kita2u?',
                a: 'Kita2u is your one shareable page for everything — content, products, bookings, and contact. Built for creators, small businesses, and service providers going direct with their social audience.',
              },
              {
                q: 'Does Kita2u take a commission on my sales?',
                a: 'No platform fee on transactions. You keep what your customers pay you. Custom domain and template add-ons are the only paid features.',
              },
              {
                q: 'How do I pay for Kita2u?',
                a: 'Our primary payment is QRIS — transaction costs stay minimal at 0.07%, which keeps your subscription price low. Your account activates instantly after payment. Prefer bank transfer or another method? We accept those too — the transaction fee is added to the total.',
              },
              {
                q: 'Can I use my own domain name?',
                a: 'Yes — connect yourbusiness.com to your Kita2u page so visitors never see "kita2u" in the URL. See the Custom domains page for setup steps.',
              },
              {
                q: 'Do I need a website to use Kita2u?',
                a: 'No. Your Kita2u page replaces a website for most creators and small businesses — and it works on phones first.',
              },
              {
                q: 'Is there a mobile app?',
                a: 'Kita2u runs as a web app on any phone today, and a native Android app is coming soon.',
              },
            ].map((item, i) => (
              <details key={i} className="group p-4">
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                  <span className="font-extrabold text-[14px] text-[#0A0A0A] leading-snug">{item.q}</span>
                  <ChevronDown className="w-4 h-4 shrink-0 text-gray-500 transition group-open:rotate-180" />
                </summary>
                <p className="text-[13px] text-gray-600 leading-relaxed mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA — repeat the buying moment at the bottom for visitors
          who scrolled. Same button action as the hero CTA. */}
      <section className="reveal-on-scroll relative z-10 px-6 py-14">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h2 className="font-black text-[26px] sm:text-[32px] tracking-tight leading-tight">
            <span style={{ color: '#0A0A0A' }}>Ready to grow with </span>
            <span style={{ color: '#0A0A0A' }}>Kita</span>
            <span style={{ color: '#FACC15' }}>2u?</span>
          </h2>
          <p className="text-[14px] text-gray-600 leading-snug">
            Get your Kita2u page in minutes. No platform fee. No card required.
          </p>
          <button
            type="button"
            onClick={handleEnterApp}
            className="w-full min-h-[52px] rounded-2xl px-6 bg-gradient-to-r from-brand to-brand2 text-[#0A0A0A] font-extrabold text-[15px] active:scale-[0.99] transition shadow-[0_8px_22px_rgba(250,204,21,0.35)]"
          >
            {t.enter}
          </button>
        </div>
      </section>

      {/* Footer — language picker + nav links (especially needed on
          mobile where the header drops them) + legal links + sign in.
          Stacks on phones, single row on sm+. */}
      <div className="relative z-30 shrink-0 px-5 sm:px-6 pb-4 pt-3 border-t border-gray-100">
        <div className="max-w-2xl mx-auto w-full space-y-2 text-[12px] font-bold">
          {/* Row 1 — nav links (mirrors header nav, primary mobile entry point) */}
          <nav className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap text-[#0A0A0A]">
            <Link href="/how-it-works"  className="hover:text-brand transition">How it works</Link>
            <span className="text-gray-300">·</span>
            <Link href="/pricing"       className="hover:text-brand transition">Pricing</Link>
            <span className="text-gray-300">·</span>
            <Link href="/custom-domains" className="hover:text-brand transition">Custom domains</Link>
          </nav>

          {/* Row 2 — legal links */}
          <nav className="flex items-center justify-center gap-3 flex-wrap text-gray-500">
            <Link href="/privacy"  className="hover:text-[#0A0A0A] transition">Privacy</Link>
            <span className="text-gray-300">·</span>
            <Link href="/terms"    className="hover:text-[#0A0A0A] transition">Terms</Link>
            <span className="text-gray-300">·</span>
            <Link href="/contact"  className="hover:text-[#0A0A0A] transition">Contact</Link>
          </nav>

          {/* Row 3 — language picker only (sign in moved to header) */}
          <div className="flex items-center justify-center pt-1">
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
          </div>
        </div>
      </div>

      <PlatformDisclaimer variant="links" />

      <LocationPermissionPrompt open={promptOpen} onComplete={handlePromptComplete} />

      {/* Reveal-on-scroll animations — applied to every section tagged
          `reveal-on-scroll`. The class is added by the IntersectionObserver
          effect above when the section first crosses into the viewport.
          Honours prefers-reduced-motion (no animation for users who opt out). */}
      <style jsx global>{`
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
          will-change: opacity, transform;
        }
        .reveal-on-scroll.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-on-scroll {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>
    </main>
  )
}
