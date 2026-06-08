'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronLeft, ArrowRight, Upload, Link2, Share2,
  TrendingUp, Globe2, Shield, Users,
} from 'lucide-react'

// ============================================================================
// /how-it-works — Kita2u marketing walkthrough
// ----------------------------------------------------------------------------
// Founder direction 2026-06-08: lead with the SEO compound-growth pitch
// ("your link grows while Google crawls; customers find you over time
// without effort") rather than a generic feature list. Six scrollable
// sections, dark goodbye-platforms cut-out in the middle for contrast,
// reveal-on-scroll mirrors the landing's pattern at src/app/page.tsx.
// All UI strings are i18n'd via the `howItWorks` namespace.
// ============================================================================

export const dynamic = 'force-dynamic'

const KILLED_PLATFORMS = [
  'eBay', 'Amazon', 'TikTok Shop', 'Shopee', 'Lazada', 'Etsy',
]

// Week labels intentionally use translation keys; the pct numbers are
// universal and stay inline.
const SEO_GROWTH = [
  { key: 'week1', pct: 25 },
  { key: 'week4', pct: 55 },
  { key: 'week12', pct: 88 },
] as const

// Constants only hold icon + numbering; copy lives in the howItWorks
// namespace and is pulled at render time so id/en both work.
const SETUP_STEPS = [
  { n: 1, Icon: Upload, key: 'step1' },
  { n: 2, Icon: Link2, key: 'step2' },
  { n: 3, Icon: Share2, key: 'step3' },
] as const

const TRUST_PILLARS = [
  { Icon: Globe2, key: 'global' },
  { Icon: Shield, key: 'seo' },
  { Icon: Users, key: 'team' },
] as const

export default function HowItWorksPage() {
  const t = useTranslations('howItWorks')

  // Same IntersectionObserver pattern as the / landing — sections with
  // `.reveal-on-scroll` fade + slide up the first time they cross 10%
  // into the viewport. Respects prefers-reduced-motion via CSS below.
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

  return (
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A]">
      {/* HEADER — sticky, minimal, back + CTA */}
      <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-sm border-b border-gray-100 px-5 sm:px-6 pt-4 pb-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[14px] font-bold text-gray-700 hover:text-black transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-black text-[18px] tracking-tight">
              <span style={{ color: '#0A0A0A' }}>Kita</span>
              <span style={{ color: '#FACC15' }}>2u</span>
            </span>
          </Link>
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-extrabold text-[#0A0A0A] bg-gradient-to-r from-brand to-brand2 px-4 py-2 rounded-full shadow-[0_4px_12px_rgba(250,204,21,0.40)] hover:from-brand2 hover:to-brand active:scale-95 transition"
          >
            {t('header.startTrial')}
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.75} />
          </Link>
        </div>
      </header>

      {/* HERO — the killer line */}
      <section className="relative px-6 pt-14 pb-14 sm:pt-24 sm:pb-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Hero illustration — founder upload 2026-06-08. Sits above
              the eyebrow + headline so the page opens on a visual hook
              before the copy lands. Larger cap than the in-section
              illustrations (~320-360px) because this is the page's
              primary visual moment. */}
          <img
            src="https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2004_02_37%20PM.png"
            alt=""
            aria-hidden
            loading="eager"
            decoding="async"
            className="mx-auto block max-w-[280px] sm:max-w-[360px] h-auto"
          />
          <h1 className="font-black text-[34px] sm:text-[52px] md:text-[60px] leading-[1.02] tracking-tight">
            {t('hero.line1')}<br />
            {t('hero.line2a')}<span style={{ color: '#FACC15' }}>{t('hero.line2b')}</span>
          </h1>
          <p className="text-[14px] sm:text-[16px] text-gray-600 leading-relaxed max-w-xl mx-auto">
            {t('hero.body')}
          </p>
        </div>
      </section>

      {/* 5-MINUTE SETUP — 3 numbered cards */}
      <section className="reveal-on-scroll relative px-6 py-14 sm:py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            {/* Above-headline illustration — founder upload 2026-06-08.
                Centered, transparent PNG, max ~220px so it punctuates
                the section without crowding the headline below. */}
            <img
              src="https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2003_57_43%20PM.png"
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="mx-auto block max-w-[220px] sm:max-w-[260px] h-auto"
            />
            <h2 className="font-black text-[26px] sm:text-[36px] tracking-tight leading-tight">
              {t('setup.line1')} <span style={{ color: '#FACC15' }}>{t('setup.line2')}</span>
            </h2>
            <p className="text-[14px] text-gray-600 max-w-xl mx-auto leading-relaxed">
              {t('setup.intro')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SETUP_STEPS.map((step) => {
              const Icon = step.Icon
              return (
                <div
                  key={step.n}
                  className="relative rounded-2xl bg-white p-5 sm:p-6 border border-gray-100"
                  style={{ boxShadow: '0 4px 18px rgba(0,0,0,0.06)' }}
                >
                  <div
                    className="absolute -top-3 -left-3 w-9 h-9 rounded-xl flex items-center justify-center font-black text-[15px]"
                    style={{
                      background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                      color: '#0A0A0A',
                      boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
                    }}
                  >
                    {step.n}
                  </div>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                    style={{
                      background: '#0A0A0A',
                      border: '1px solid #0A0A0A',
                      boxShadow: '0 4px 10px rgba(10,10,10,0.25)',
                    }}
                  >
                    <Icon className="w-6 h-6" strokeWidth={2.25} style={{ color: '#FACC15' }} />
                  </div>
                  <h3 className="font-extrabold text-[16px] leading-tight mb-1.5">
                    {t(`setup.${step.key}.headline`)}
                  </h3>
                  <p className="text-[13px] text-gray-600 leading-snug">
                    {t(`setup.${step.key}.body`)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* GOOGLE SEO COMPOUND-GROWTH NARRATIVE */}
      <section className="reveal-on-scroll relative px-6 py-14 sm:py-20">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="space-y-4 order-2 md:order-1">
            {/* Section illustration — founder upload 2026-06-08. Lives at
                the head of the copy column so it pairs with the headline
                below, leaving the growth-chart card on the right column
                visually separate. Centered on mobile (stacked) and
                left-aligned next to the chart on md+. */}
            <img
              src="https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2004_13_57%20PM.png"
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="mx-auto md:mx-0 block max-w-[220px] sm:max-w-[260px] h-auto"
            />
            <h2 className="font-black text-[28px] sm:text-[36px] leading-[1.08] tracking-tight">
              {t('seo.line1')}<br />
              <span style={{ color: '#FACC15' }}>{t('seo.line2')}</span>
            </h2>
            <p className="text-[14px] sm:text-[15px] text-gray-700 leading-relaxed">
              {t('seo.body1')}
            </p>
            <p className="text-[14px] sm:text-[15px] text-gray-700 leading-relaxed">
              {t('seo.body2a')}<strong className="text-[#0A0A0A]">{t('seo.body2strong')}</strong>{t('seo.body2b')}
            </p>
          </div>

          {/* Growth visual */}
          <div className="order-1 md:order-2">
            <div
              className="rounded-3xl p-6 sm:p-7 border-2"
              style={{
                background: 'linear-gradient(135deg, #FEF9C3 0%, #FFFFFF 60%)',
                borderColor: '#FACC15',
                boxShadow: '0 12px 32px rgba(250,204,21,0.28)',
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: '#0A0A0A' }}
                >
                  <TrendingUp className="w-6 h-6" strokeWidth={2.5} style={{ color: '#FACC15' }} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.10em] text-[#854D0E]">
                    {t('seo.card.eyebrow')}
                  </div>
                  <div className="text-[22px] sm:text-[26px] font-black text-[#0A0A0A] leading-none mt-0.5">
                    {t('seo.card.title')}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {SEO_GROWTH.map((row) => (
                  <div key={row.key} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px] font-extrabold text-[#0A0A0A]">
                      <span>{t(`seo.card.${row.key}`)}</span>
                      <span>{row.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.7)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${row.pct}%`,
                          background: 'linear-gradient(90deg, #FACC15, #EAB308)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-600 italic mt-4 leading-snug">
                {t('seo.card.disclaimer')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GOODBYE PLATFORMS — dark cut-out for contrast */}
      <section
        className="reveal-on-scroll relative px-6 py-14 sm:py-20"
        style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #1F2937 100%)' }}
      >
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.35)' }}
          >
            <span className="text-[11px] font-extrabold uppercase tracking-[0.12em]" style={{ color: '#FACC15' }}>
              {t('goodbye.eyebrow')}
            </span>
          </div>
          <h2 className="font-black text-[28px] sm:text-[42px] leading-[1.05] tracking-tight text-white">
            {t('goodbye.line1')}<br />
            {t('goodbye.line2a')}<span style={{ color: '#FACC15' }}>{t('goodbye.line2b')}</span>
          </h2>
          <p className="text-[14px] sm:text-[16px] text-gray-300 leading-relaxed max-w-xl mx-auto">
            {t('goodbye.body')}
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {KILLED_PLATFORMS.map((name) => (
              <span
                key={name}
                className="relative inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] sm:text-[14px] font-extrabold"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.45)',
                  textDecoration: 'line-through',
                  textDecorationColor: '#FACC15',
                  textDecorationThickness: '2px',
                }}
              >
                {name}
              </span>
            ))}
          </div>
          <p className="text-[13px] text-gray-400 pt-2 italic">
            {t('goodbye.tagline')}
          </p>
        </div>
      </section>

      {/* TRUST PILLARS */}
      <section className="reveal-on-scroll relative px-6 py-14 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="font-black text-[26px] sm:text-[36px] tracking-tight leading-tight">
              {t('pillars.headlinePrefix')} <span style={{ color: '#0A0A0A' }}>Kita</span><span style={{ color: '#FACC15' }}>2u</span>
            </h2>
            <p className="text-[14px] text-gray-600 max-w-xl mx-auto leading-relaxed">
              {t('pillars.intro')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TRUST_PILLARS.map((p) => {
              const Icon = p.Icon
              return (
                <div
                  key={p.key}
                  className="rounded-2xl bg-white border border-gray-100 p-5 flex flex-col items-start gap-3"
                  style={{ boxShadow: '0 4px 18px rgba(0,0,0,0.06)' }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                      boxShadow: '0 4px 10px rgba(250,204,21,0.35)',
                    }}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2.5} style={{ color: '#0A0A0A' }} />
                  </div>
                  <h3 className="font-extrabold text-[15px] leading-tight">
                    {t(`pillars.${p.key}.headline`)}
                  </h3>
                  <p className="text-[13px] text-gray-600 leading-snug">
                    {t(`pillars.${p.key}.body`)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        className="reveal-on-scroll relative px-6 py-16 sm:py-24"
        style={{ background: 'linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)' }}
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="font-black text-[28px] sm:text-[44px] leading-[1.06] tracking-tight">
            {t('cta.line1')}<br />
            <span style={{ color: '#FACC15' }}>{t('cta.line2')}</span>
          </h2>
          <p className="text-[15px] sm:text-[16px] text-gray-700 leading-relaxed">
            {t('cta.bodyA')}<strong className="text-[#0A0A0A]">{t('cta.bodyStrong')}</strong>{t('cta.bodyB')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[52px] px-7 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-[#0A0A0A] font-extrabold text-[15px] hover:from-brand2 hover:to-brand active:scale-[0.99] transition shadow-[0_8px_22px_rgba(250,204,21,0.40)]"
            >
              {t('cta.startTrial')}
              <ArrowRight className="w-4 h-4" strokeWidth={2.75} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center w-full sm:w-auto min-h-[52px] px-7 rounded-2xl bg-white border border-gray-200 text-[#0A0A0A] font-extrabold text-[14px] hover:bg-gray-50 active:scale-[0.99] transition"
            >
              {t('cta.seePlans')}
            </Link>
          </div>
          <p className="text-[12px] text-gray-500 pt-2">
            {t('cta.disclaimer')}
          </p>
        </div>
      </section>

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
