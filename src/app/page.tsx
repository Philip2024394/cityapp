'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Star, ChevronDown, Briefcase, Store, Wrench,
  Scissors, Shirt, Sparkles as Spark, UtensilsCrossed, MapPin, Bike, Car, Hammer, Hand, Stethoscope, Check, X,
} from 'lucide-react'
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
    h1Line1: 'Dibuat untuk',
    h1Line2: 'kreator.',
    lede: 'Pertumbuhan dari media sosial — tanpa platform raksasa mengambil keuntunganmu. Audiens, harga, dan pelanggan tetap milikmu, 24 jam sehari.',
    enter: 'Masuk Aplikasi',
    signIn: 'Masuk',
  },
  en: {
    h1Line1: 'Built for',
    h1Line2: 'creators.',
    lede: 'Social media growth without the giants taking your profit. Your audience, your prices, your customers — kept forever, growing 24 hours a day.',
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

// Read the `kita-country` cookie set by middleware (from
// x-vercel-ip-country / cf-ipcountry). Returns 'ID' when the visitor is
// in Indonesia, otherwise the foreign country code. Empty string when
// the cookie isn't present (first request before middleware ran, edge
// case during SSR hand-off).
function getCountryFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(/(?:^|;\s*)kita-country=([A-Z]{2})/)
  return m?.[1] ?? ''
}

export default function LandingPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('id')
  // Country code from the middleware-issued `kita-country` cookie. Used to
  // hide the ID flag for non-Indonesian IPs per founder direction. Empty
  // until we hydrate, at which point we trust the value.
  const [country, setCountry] = useState<string>('')

  useEffect(() => { setLocale(getStoredLocale()) }, [])
  useEffect(() => { setCountry(getCountryFromCookie()) }, [])

  // Show ID button only when the visitor is in Indonesia (or when we
  // don't yet know — first paint, dev without geo headers). Foreign IPs
  // see EN-only.
  const showIdButton = !country || country === 'ID'

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
    // Keep the landing's own state in sync (this page reads STRINGS[locale]
    // directly rather than next-intl, since it lives outside the message
    // catalog system).
    try { localStorage.setItem('cr_locale', lang) } catch { /* ignore */ }
    setLocale(lang)
    // Mirror to the NEXT_LOCALE cookie so every other page (which DOES
    // use next-intl via getTranslations / useTranslations) picks up the
    // same language on the next navigation. Without this, picking EN on
    // the landing only swapped the landing's hardcoded strings — every
    // downstream profile / dashboard / category page stayed in ID.
    try {
      document.cookie =
        `NEXT_LOCALE=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    } catch { /* ignore */ }
    // Refresh server components so currently-mounted next-intl content
    // (header copy, etc.) re-renders against the new catalog. We DON'T
    // need to wait — the user's next tap into the app gets the fresh
    // language regardless.
    try { router.refresh() } catch { /* ignore */ }
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

          {/* Tagline — centered hook under the hero. Creator-first,
              world-audience pitch (replaces the previous Indonesia-
              centric "Everything In One Link" line). */}
          <div className="font-black leading-[1.02] tracking-tight text-[34px] sm:text-[44px] md:text-[52px] text-center">
            <span style={{ color: '#0A0A0A' }}>{t.h1Line1} </span>
            <span style={{ color: '#FACC15' }}>{t.h1Line2}</span>
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

          {/* Language picker — directly under the hero Enter button so
              the choice is visible before the user taps in. ID button
              hidden for non-Indonesian IPs (showIdButton). */}
          <div
            role="group"
            aria-label="Language"
            className="flex items-center justify-center gap-2 pt-2"
          >
            <button
              type="button"
              onClick={() => setLocaleAndStore('en')}
              aria-pressed={locale === 'en'}
              className={`min-h-[36px] min-w-[64px] px-3 rounded-full text-[12px] font-extrabold uppercase tracking-wider transition active:scale-95 ${
                locale === 'en'
                  ? 'bg-brand text-[#0A0A0A] border border-[#EAB308] shadow-[0_4px_10px_rgba(250,204,21,0.45)]'
                  : 'bg-white text-[#0A0A0A] border border-gray-200 hover:border-gray-400'
              }`}
            >
              <span aria-hidden className="mr-1">🇬🇧</span>EN
            </button>
            {showIdButton && (
              <button
                type="button"
                onClick={() => setLocaleAndStore('id')}
                aria-pressed={locale === 'id'}
                className={`min-h-[36px] min-w-[64px] px-3 rounded-full text-[12px] font-extrabold uppercase tracking-wider transition active:scale-95 ${
                  locale === 'id'
                    ? 'bg-brand text-[#0A0A0A] border border-[#EAB308] shadow-[0_4px_10px_rgba(250,204,21,0.45)]'
                    : 'bg-white text-[#0A0A0A] border border-gray-200 hover:border-gray-400'
                }`}
              >
                <span aria-hidden className="mr-1">🇮🇩</span>ID
              </button>
            )}
          </div>
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
            Traffic isn&apos;t the challenge anymore — the first move is.
          </p>
          <p className="text-[12px] text-gray-600 leading-snug">
            Built for creators worldwide who are done feeding mass-giant platforms and ready to own their own market.
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

      {/* APPS WE BUILD — 10-card grid showing every vertical Kita2u
          spins up for owners. Each card is a real shipping vertical
          backed by its own provider table + public page template +
          dashboard editor. */}
      <section className="reveal-on-scroll relative z-10 px-6 py-12 bg-white">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-black text-[24px] sm:text-[30px] tracking-tight leading-tight text-[#0A0A0A]">
              Apps we build for you
            </h2>
            <p className="text-[14px] text-gray-600 leading-relaxed max-w-xl mx-auto">
              Each vertical is a complete app — menu / portfolio / pricing / WhatsApp bookings — already shipping on Kita2u.
              Pick yours and your page is live the same day.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { icon: Scissors,         label: 'Salon / beautician',   sub: 'Cuts, colour, makeup' },
              { icon: Hand,             label: 'Massage / spa',         sub: 'Therapy bookings' },
              { icon: Spark,            label: 'Facial & skincare',     sub: 'Clinics & studios' },
              { icon: UtensilsCrossed,  label: 'Restaurant / café',     sub: 'Menu + delivery handoff' },
              { icon: Shirt,            label: 'Laundry',               sub: 'Pickup + drop-off' },
              { icon: Hammer,           label: 'Handyman',              sub: 'Per-job tukang' },
              { icon: Stethoscope,      label: 'Home cleaning',          sub: 'House + office' },
              { icon: MapPin,           label: 'Tour guides',           sub: 'Day trips, packages' },
              { icon: Bike,             label: 'Bike rentals',          sub: 'Scooters, mountain' },
              { icon: Car,              label: 'Drivers (Bike → Jeep)', sub: 'Self-published rates' },
            ].map((v) => {
              const Icon = v.icon
              return (
                <div
                  key={v.label}
                  className="rounded-2xl bg-white border border-gray-100 p-3.5 flex flex-col items-start gap-2"
                  style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(250,204,21,0.18)', border: '1px solid rgba(250,204,21,0.45)' }}
                  >
                    <Icon className="w-4.5 h-4.5" strokeWidth={2.25} style={{ color: '#0A0A0A' }} />
                  </div>
                  <div className="font-extrabold text-[12.5px] text-[#0A0A0A] leading-tight">{v.label}</div>
                  <div className="text-[11px] text-gray-500 leading-snug">{v.sub}</div>
                </div>
              )
            })}
          </div>
          <p className="text-center text-[12px] text-gray-500 italic">
            Don&apos;t see your category? Tell us — most verticals can be cloned from an existing template in 24 hours.
          </p>
        </div>
      </section>

      {/* STOP BUILDING SOMEONE ELSE'S BUSINESS — the anti-marketplace
          punch. Side-by-side comparison: high-fee marketplace model vs
          Kita2u's own-the-link / own-the-customer model. Numbers are
          published commission ranges from Tokopedia / Shopee / Lazada /
          Gojek-Food — defensible without specific citation. */}
      <section className="reveal-on-scroll relative z-10 px-6 py-14" style={{ background: 'linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)' }}>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-black text-[26px] sm:text-[32px] tracking-tight leading-[1.1] text-[#0A0A0A]">
              Stop letting mass giants run your business.
            </h2>
            <p className="text-[14px] sm:text-[15px] text-gray-700 leading-relaxed max-w-2xl mx-auto">
              Selling on someone else&apos;s platform never grows YOUR business —
              it grows theirs. Their commissions are sometimes higher than the item or service itself.
              The future is adapting your own market, getting found on your own link, and keeping every cent you earn.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Marketplace column */}
            <div
              className="rounded-2xl bg-white border p-5 space-y-3"
              style={{ borderColor: '#E4E4E7', boxShadow: '0 2px 14px rgba(0,0,0,0.05)' }}
            >
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-rose-700">
                Marketplaces / food platforms
              </div>
              <div className="text-[18px] sm:text-[20px] font-black text-[#0A0A0A] leading-tight">
                Pay 5 – 30 % every sale.<br />Never see the customer again.
              </div>
              <ul className="space-y-1.5 pt-1">
                {[
                  '5–13% commission on Tokopedia / Shopee / Lazada (by category)',
                  '18–30% commission on Gojek-Food / GrabFood',
                  'Pay-to-be-found ads on top — featured listing fees',
                  'Customer contact details kept by the platform',
                  'Algorithm changes overnight — your rank can vanish',
                  'You compete on price with thousands of identical listings',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-[12.5px] leading-snug text-gray-700">
                    <X className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={3} style={{ color: '#DC2626' }} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kita2u column — highlighted */}
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{
                background:  'linear-gradient(135deg, #FEF9C3 0%, #FFFFFF 100%)',
                border:      '2px solid #FACC15',
                boxShadow:   '0 6px 22px rgba(250,204,21,0.30)',
              }}
            >
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#854D0E]">
                Kita2u
              </div>
              <div className="text-[18px] sm:text-[20px] font-black text-[#0A0A0A] leading-tight">
                0 % commission.<br />Own the customer.
              </div>
              <ul className="space-y-1.5 pt-1">
                {[
                  '0% on every transaction — you keep 100% of what customers pay',
                  'Direct WhatsApp bookings — no platform middleman',
                  'Customer phone numbers are yours, in your inbox, forever',
                  'Your shareable link works on TikTok / Instagram / Status / SMS',
                  'No algorithm — your audience is the audience YOU built',
                  'Custom domain available so it reads as your own site',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-[12.5px] leading-snug text-[#0A0A0A]">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={3} style={{ color: '#0A0A0A' }} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-500 italic pt-1">
            Commission ranges are published rates from Tokopedia, Shopee, Lazada, Gojek-Food, and GrabFood seller documentation.
            Specific rate per merchant depends on category, tier, and promotional opt-ins.
          </p>
        </div>
      </section>

      {/* OWN YOUR CUSTOMER BASE — the building-an-audience-not-someone-
          else's punch. Short section, three concrete advantages. */}
      <section className="reveal-on-scroll relative z-10 px-6 py-12 bg-white">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="text-center space-y-2">
            <h2 className="font-black text-[24px] sm:text-[30px] tracking-tight leading-tight text-[#0A0A0A]">
              Build YOUR customer base.<br />Not theirs.
            </h2>
            <p className="text-[14px] text-gray-600 leading-relaxed max-w-xl mx-auto">
              Every booking, every order, every contact — yours from day one.
              The link you share grows YOUR audience.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { headline: 'Your link, your funnel',
                body: 'Every TikTok bio, Instagram link-tree, WhatsApp Status, printed flyer — they all feed your Kita2u page, not a marketplace.' },
              { headline: 'Your customer, your inbox',
                body: 'Direct WhatsApp from the moment they tap. Build a contact list you actually own and can message again.' },
              { headline: 'Your brand, your rules',
                body: 'Your logo, your photos, your prices, your hours. Optional custom domain so the URL reads as yours, not ours.' },
            ].map((b) => (
              <div
                key={b.headline}
                className="rounded-2xl bg-gray-50 border border-gray-100 p-4"
              >
                <div className="font-extrabold text-[13.5px] text-[#0A0A0A] leading-tight">
                  {b.headline}
                </div>
                <p className="text-[12.5px] text-gray-600 leading-snug mt-1.5">
                  {b.body}
                </p>
              </div>
            ))}
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
                <div className="font-extrabold text-[15px] text-[#0A0A0A] leading-tight">For the creator of social media growth</div>
                <div className="text-[13px] text-gray-600 leading-snug mt-1">Convert TikTok, Instagram, and YouTube audiences into your own customer base — no algorithm, no commission, no permission needed.</div>
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
            <span style={{ color: '#0A0A0A' }}>The first and last step to </span>
            <span style={{ color: '#FACC15' }}>full profit.</span>
          </h2>
          <p className="text-[14px] text-gray-600 leading-snug">
            One link. 24-hour storefront. Your customers, your prices, your rules — never the mass giants&apos;.
          </p>
          <button
            type="button"
            onClick={handleEnterApp}
            className="w-full min-h-[52px] rounded-2xl px-6 bg-gradient-to-r from-brand to-brand2 text-[#0A0A0A] font-extrabold text-[15px] active:scale-[0.99] transition shadow-[0_8px_22px_rgba(250,204,21,0.35)]"
          >
            {t.enter}
          </button>

          {/* Language picker — directly under the Enter button so the
              choice is visible BEFORE the user taps in. Writes both the
              landing's own state (localStorage) and the NEXT_LOCALE
              cookie so every downstream next-intl page picks up the
              chosen language without a second tap. */}
          <div
            role="group"
            aria-label="Language"
            className="flex items-center justify-center gap-2 pt-1"
          >
            <button
              type="button"
              onClick={() => setLocaleAndStore('en')}
              aria-pressed={locale === 'en'}
              className={`min-h-[36px] min-w-[64px] px-3 rounded-full text-[12px] font-extrabold uppercase tracking-wider transition active:scale-95 ${
                locale === 'en'
                  ? 'bg-brand text-[#0A0A0A] border border-[#EAB308] shadow-[0_4px_10px_rgba(250,204,21,0.45)]'
                  : 'bg-white text-[#0A0A0A] border border-gray-200 hover:border-gray-400'
              }`}
            >
              <span aria-hidden className="mr-1">🇬🇧</span>EN
            </button>
            {showIdButton && (
              <button
                type="button"
                onClick={() => setLocaleAndStore('id')}
                aria-pressed={locale === 'id'}
                className={`min-h-[36px] min-w-[64px] px-3 rounded-full text-[12px] font-extrabold uppercase tracking-wider transition active:scale-95 ${
                  locale === 'id'
                    ? 'bg-brand text-[#0A0A0A] border border-[#EAB308] shadow-[0_4px_10px_rgba(250,204,21,0.45)]'
                    : 'bg-white text-[#0A0A0A] border border-gray-200 hover:border-gray-400'
                }`}
              >
                <span aria-hidden className="mr-1">🇮🇩</span>ID
              </button>
            )}
          </div>
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

          {/* Row 3 — language picker only (sign in moved to header).
              ID hidden for non-Indonesian IPs per founder direction. */}
          <div className="flex items-center justify-center pt-1">
            <div className="flex items-center gap-1.5">
              {showIdButton && (
                <>
                  <button
                    onClick={() => setLocaleAndStore('id')}
                    className={`px-2.5 py-1 rounded-full transition ${locale === 'id' ? 'bg-brand/15 text-brand' : 'text-dim hover:text-muted'}`}
                    aria-pressed={locale === 'id'}
                  >ID</button>
                  <span className="text-line">·</span>
                </>
              )}
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
