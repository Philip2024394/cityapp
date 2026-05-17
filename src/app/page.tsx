'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, MessageCircle, Shield, Wallet } from 'lucide-react'
import type { Rider } from '@/types/rider'

// Landing-background map — dimmed Yogyakarta view so the hero pops.
const LandingMap = dynamic(() => import('@/components/map/RiderMapDynamic'), { ssr: false })

// 42 demo riders sprinkled across a Yogyakarta bounding box so the hero map
// has a constellation of pulsing dots. Deterministic positions (no randomness)
// so SSR + hydration are identical.
const YOGYA_CENTER = { lat: -7.7928, lng: 110.3657 }
function buildHeroRiders(count: number): Rider[] {
  const out: Rider[] = []
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996323
    const radius = 0.005 + (i / count) * 0.045
    out.push({
      id: `hero-${i}`,
      slug: `hero-${i}`,
      name: '',
      photoUrl: '',
      whatsappE164: '',
      bio: '',
      area: '',
      city: 'Yogyakarta',
      services: [],
      bike: { make: '', model: '', year: 0, color: '', type: 'matic', hasBox: false },
      pricePerKm: 0, minFee: 0,
      isOnline: true,
      lastSeenAt: '',
      lat: YOGYA_CENTER.lat + Math.sin(angle) * radius,
      lng: YOGYA_CENTER.lng + Math.cos(angle) * radius,
      subscriptionStatus: 'active',
    })
  }
  return out
}

// Inline strings — landing-only translations for Phase 1.
// Deeper pages (signup, dashboard, marketplace, etc.) stay Bahasa until
// we wire next-intl across the rest of the app in a Phase 2 task.
type Locale = 'id' | 'en'
const STRINGS: Record<Locale, {
  loginNav: string
  pill: string
  h1Line1: string
  h1Line2: string
  lede: string
  enter: string
  freeNote: string
  trust: { commission: string; whatsapp: string; verified: string }
  rider: {
    kicker: string
    title: string
    sub: string
    signupCta: string
    loginCta: string
  }
}> = {
  id: {
    loginNav: 'Login Rider',
    pill: '42 rider online di Yogyakarta',
    h1Line1: 'Kurir motor,',
    h1Line2: 'Indonesia.',
    lede: 'Set jemput & antar. Lihat harga total tiap rider. Pesan langsung lewat WhatsApp. Tanpa komisi, tanpa dispatch.',
    enter: 'Masuk',
    freeNote: 'Gratis · langsung kontak rider',
    trust: { commission: '0% komisi', whatsapp: 'WhatsApp', verified: 'Rider terverifikasi' },
    rider: {
      kicker: 'Untuk rider',
      title: 'Punya motor? Dapat customer lewat City Rider.',
      sub: 'Daftar gratis · setelah aktivasi Rp 30.000/bulan · keep 100% pendapatan.',
      signupCta: 'Daftar sebagai rider',
      loginCta: 'Login',
    },
  },
  en: {
    loginNav: 'Rider login',
    pill: '42 riders online in Yogyakarta',
    h1Line1: 'Motorbike couriers,',
    h1Line2: 'Indonesia.',
    lede: 'Set pickup & dropoff. See each rider’s total price. Book directly on WhatsApp. No commission, no dispatch.',
    enter: 'Enter',
    freeNote: 'Free · direct rider contact',
    trust: { commission: '0% commission', whatsapp: 'WhatsApp', verified: 'Verified riders' },
    rider: {
      kicker: 'For riders',
      title: 'Got a bike? Get customers through City Rider.',
      sub: 'Sign up free · activate for Rp 30,000/month · keep 100% of earnings.',
      signupCta: 'Sign up as a rider',
      loginCta: 'Login',
    },
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
  const [center] = useState(YOGYA_CENTER)
  const heroRiders = useMemo(() => buildHeroRiders(42), [])

  // Locale state. SSR uses 'id' (deterministic); client hydrates and then
  // reads localStorage. The brief flash from 'id' → stored locale on first
  // paint is acceptable for a landing page.
  const [locale, setLocale] = useState<Locale>('id')
  useEffect(() => { setLocale(getStoredLocale()) }, [])
  const t = STRINGS[locale]

  function enterAs(lang: Locale) {
    try { localStorage.setItem('cr_locale', lang) } catch { /* ignore */ }
    setLocale(lang)
    router.push('/cari')
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-bg">
      {/* Background map — dark, roads-only, label-free, slowly panning */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ opacity: 1 }}>
        <LandingMap
          center={center}
          zoom={13}
          height="100dvh"
          interactive={false}
          variant="dark"
          hideLabels
          roadsOnly
          autoPan
          riders={heroRiders}
          markerStyle="ping"
        />
      </div>

      {/* Soft yellow glow + gradient for hero legibility */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: [
            'radial-gradient(ellipse 80% 50% at 50% 35%, rgba(250,204,21,0.10) 0%, transparent 60%)',
            'linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.35) 40%, rgba(10,10,10,0.95) 100%)',
          ].join(', '),
        }}
      />

      {/* Top mini nav */}
      <header className="relative z-20 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-85 transition" aria-label="City Rider home">
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png"
              alt="City Rider"
              className="h-11 w-auto"
              loading="eager"
            />
          </Link>
          <Link href="/login" className="text-[13px] font-bold text-muted hover:text-ink px-3 py-1.5 rounded-lg hover:bg-white/5">
            {t.loginNav}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-20 px-4 pt-10 pb-16">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/25">
            <span className="dot-online !w-2 !h-2" />
            <span className="text-[12px] font-extrabold text-brand uppercase tracking-wider">
              {t.pill}
            </span>
          </div>

          <h1 className="text-[42px] sm:text-[56px] font-extrabold leading-[1.05] tracking-tight">
            {t.h1Line1}
            <br />
            <span className="gradient-text">{t.h1Line2}</span>
          </h1>

          <p className="text-muted text-[15px] leading-relaxed max-w-md mx-auto">
            {t.lede}
          </p>

          {/* SPLIT-FLAG CTA — left half: Bahasa enter · right half: English enter */}
          <div className="pt-3 space-y-3">
            <SplitFlagButton enterLabel={t.enter} onEnter={enterAs} activeLocale={locale} />
            <p className="text-[12px] text-dim">{t.freeNote}</p>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="relative z-20 px-4 pb-10">
        <div className="max-w-xl mx-auto grid grid-cols-3 gap-3">
          <TrustPill icon={<Wallet className="w-4 h-4" />}        label={t.trust.commission} />
          <TrustPill icon={<MessageCircle className="w-4 h-4" />} label={t.trust.whatsapp} />
          <TrustPill icon={<Shield className="w-4 h-4" />}        label={t.trust.verified} />
        </div>
      </section>

      {/* For riders CTA */}
      <section className="relative z-20 px-4 pb-12">
        <div className="max-w-xl mx-auto">
          <div className="card p-5 backdrop-blur-xl bg-bg2/70">
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">{t.rider.kicker}</div>
            <div className="text-[17px] font-extrabold mt-1">{t.rider.title}</div>
            <div className="text-muted text-[13px] mt-1.5">{t.rider.sub}</div>
            <div className="flex gap-2 mt-4">
              <Link href="/signup" className="btn-primary flex-1 !text-[14px] !py-3">
                {t.rider.signupCta}
              </Link>
              <Link href="/login" className="btn-secondary !text-[14px] !py-3 !px-4">
                {t.rider.loginCta}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function TrustPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="card p-3 text-center backdrop-blur-xl bg-bg2/60">
      <div className="text-brand inline-flex">{icon}</div>
      <div className="text-[13px] font-extrabold mt-1.5 text-ink/90">{label}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SplitFlagButton
   One pill, two halves. Tap the left half (🇮🇩 + label) → set locale=id,
   enter app. Tap the right half (label + 🇬🇧) → set locale=en, enter app.
   The currently-active language gets a slightly stronger highlight.
   ───────────────────────────────────────────────────────────────────── */
function SplitFlagButton({
  enterLabel, onEnter, activeLocale,
}: {
  enterLabel: string
  onEnter: (l: 'id' | 'en') => void
  activeLocale: 'id' | 'en'
}) {
  return (
    <div
      role="group"
      aria-label="Enter app and choose language"
      className="inline-flex items-stretch w-full max-w-sm mx-auto rounded-full overflow-hidden shadow-[0_8px_28px_rgba(250,204,21,0.32)] animate-[fadeUp_0.6s_ease-out_both] bg-gradient-to-r from-brand to-brand2"
    >
      {/* LEFT half — Indonesia */}
      <button
        onClick={() => onEnter('id')}
        aria-label="Enter in Bahasa Indonesia"
        className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 text-bg font-extrabold text-[15px] hover:bg-white/10 active:bg-white/15 transition min-h-[52px]"
        style={{ borderRight: '1px solid rgba(10,10,10,0.18)' }}
      >
        <FlagCircle code="id" active={activeLocale === 'id'} />
        <span>{activeLocale === 'id' ? enterLabel : 'Masuk'}</span>
      </button>

      {/* RIGHT half — English */}
      <button
        onClick={() => onEnter('en')}
        aria-label="Enter in English"
        className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 text-bg font-extrabold text-[15px] hover:bg-white/10 active:bg-white/15 transition min-h-[52px]"
      >
        <span>{activeLocale === 'en' ? enterLabel : 'Enter'}</span>
        <FlagCircle code="en" active={activeLocale === 'en'} />
      </button>
    </div>
  )
}

/* Round inline-SVG flag — reliable across OSes (emoji flags render as
   text "ID" / "GB" on Windows). 28px circle, brand-thick black ring. */
function FlagCircle({ code, active }: { code: 'id' | 'en'; active: boolean }) {
  const size = 28
  const ring = active ? '#0A0A0A' : 'rgba(10,10,10,0.55)'
  if (code === 'id') {
    // Bendera Indonesia — top red, bottom white, horizontal
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
        <defs>
          <clipPath id="flagClipId"><circle cx="14" cy="14" r="13" /></clipPath>
        </defs>
        <g clipPath="url(#flagClipId)">
          <rect x="0" y="0"  width="28" height="14" fill="#E11D48" />
          <rect x="0" y="14" width="28" height="14" fill="#FFFFFF" />
        </g>
        <circle cx="14" cy="14" r="13" fill="none" stroke={ring} strokeWidth="2" />
      </svg>
    )
  }
  // Simplified Union Jack — readable at small size
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <defs>
        <clipPath id="flagClipEn"><circle cx="14" cy="14" r="13" /></clipPath>
      </defs>
      <g clipPath="url(#flagClipEn)">
        <rect x="0" y="0" width="28" height="28" fill="#012169" />
        {/* White X diagonals */}
        <path d="M0 0 L28 28 M28 0 L0 28" stroke="#FFFFFF" strokeWidth="5" />
        {/* Red diagonals */}
        <path d="M0 0 L28 28 M28 0 L0 28" stroke="#C8102E" strokeWidth="2" />
        {/* White + cross */}
        <path d="M14 0 V28 M0 14 H28" stroke="#FFFFFF" strokeWidth="7" />
        {/* Red + cross */}
        <path d="M14 0 V28 M0 14 H28" stroke="#C8102E" strokeWidth="4" />
      </g>
      <circle cx="14" cy="14" r="13" fill="none" stroke={ring} strokeWidth="2" />
    </svg>
  )
}
