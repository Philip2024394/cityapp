'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'

// Service tiles — the primary CTA on landing. Each tile routes straight to
// /cari?service=<id> so the customer never has to make this choice twice.
// Parcel first (most common kurir use case), then Ride, then Food.
const SERVICE_TILES = [
  { id: 'parcel', label: 'Bike Parcel', sub: 'Package · Courier',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitledsddasd-removebg-preview.png?updatedAt=1779013880961' },
  { id: 'person', label: 'Bike Ride',   sub: 'Passenger',
    img: 'https://ik.imagekit.io/nepgaxllc/Untitleddasdas-removebg-preview.png' },
  { id: 'food',   label: 'Bike Food',   sub: 'Resto · Warung',
    img: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2017,%202026,%2005_29_25%20PM.png?updatedAt=1779013783890' },
] as const

// Background map (dark Yogyakarta + 42 pulsing rider pings + autoPan) now
// lives in the root layout as <MapBackground />, so every page shares it.
// The landing no longer renders its own — keeps a single source of truth.

// Inline strings — landing-only translations for Phase 1.
// Deeper pages (signup, dashboard, marketplace, etc.) stay Bahasa until
// we wire next-intl across the rest of the app in a Phase 2 task.
type Locale = 'id' | 'en'
const STRINGS: Record<Locale, {
  loginNav: string
  signupNav: string
  pill: string
  h1Line1: string
  h1Line2: string
  lede: string
  enter: string
  freeNote: string
  trust: { commission: string; whatsapp: string; verified: string }
}> = {
  id: {
    loginNav: 'Login',
    signupNav: 'Daftar',
    pill: '42 rider online di Yogyakarta',
    h1Line1: 'Komunitas motor,',
    h1Line2: 'Indonesia.',
    lede: 'Set jemput & antar. Lihat harga total tiap rider. Pesan langsung lewat WhatsApp. Tanpa komisi, tanpa dispatch.',
    enter: 'Masuk',
    freeNote: 'Gratis · langsung kontak rider',
    trust: { commission: '0% komisi', whatsapp: 'WhatsApp', verified: 'Rider terverifikasi' },
  },
  en: {
    loginNav: 'Login',
    signupNav: 'Sign up',
    pill: '42 riders online in Yogyakarta',
    h1Line1: 'Motorbike community,',
    h1Line2: 'Indonesia.',
    lede: 'Set pickup & dropoff. See each rider’s total price. Book directly on WhatsApp. No commission, no dispatch.',
    enter: 'Enter',
    freeNote: 'Free · direct rider contact',
    trust: { commission: '0% commission', whatsapp: 'WhatsApp', verified: 'Verified riders' },
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

  // Locale state. SSR uses 'id' (deterministic); client hydrates and then
  // reads localStorage. The brief flash from 'id' → stored locale on first
  // paint is acceptable for a landing page.
  const [locale, setLocale] = useState<Locale>('id')
  useEffect(() => { setLocale(getStoredLocale()) }, [])
  const t = STRINGS[locale]

  function pickService(id: 'parcel' | 'person' | 'food') {
    router.push(`/cari?service=${id}`)
  }

  function setLocaleAndStore(lang: Locale) {
    try { localStorage.setItem('cr_locale', lang) } catch { /* ignore */ }
    setLocale(lang)
  }

  return (
    <main className="min-h-[100dvh] relative flex flex-col">
      {/* Background map + readability overlay are mounted globally in the
          root layout (<MapBackground />). The hero just sits on top. */}

      {/* Top mini nav */}
      <header className="relative z-20 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition" aria-label="City Rider home">
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png"
              alt=""
              className="h-11 w-auto"
              loading="eager"
            />
            <div className="font-extrabold tracking-tight text-[16px]">
              City <span className="gradient-text">Rider</span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link href="/signup" className="text-[13px] font-extrabold text-bg bg-brand hover:bg-brand2 px-3 py-1.5 rounded-lg transition">
              {t.signupNav}
            </Link>
            <Link href="/login" className="text-[13px] font-bold text-muted hover:text-ink px-3 py-1.5 rounded-lg hover:bg-white/5">
              {t.loginNav}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — flex-1 so it fills the viewport between header and the
          bottom edge. Inner content vertically centered. */}
      <section className="relative z-20 px-4 py-8 flex-1 flex items-center">
        <div className="max-w-xl mx-auto text-center space-y-5 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/25">
            <span className="dot-online !w-2 !h-2" />
            <span className="text-[12px] font-extrabold text-brand uppercase tracking-wider">
              {t.pill}
            </span>
          </div>

          <h1 className="text-[36px] sm:text-[48px] md:text-[56px] font-extrabold leading-[1.05] tracking-tight">
            {t.h1Line1}
            <br />
            <span className="gradient-text">{t.h1Line2}</span>
          </h1>

          <p className="text-muted text-[15px] leading-relaxed max-w-md mx-auto">
            {t.lede}
          </p>

          {/* PRIMARY CTA — 3 landscape service tiles. Tapping a tile
              routes straight to /cari?service=<id> so the customer never
              has to pick the service type twice. Replaces the previous
              single "Enter" button with three direct entry points. */}
          <div className="pt-3 w-full max-w-sm mx-auto space-y-2.5">
            {SERVICE_TILES.map((tile, i) => (
              <button
                key={tile.id}
                onClick={() => pickService(tile.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-bg bg-gradient-to-r from-brand to-brand2 hover:from-brand2 hover:to-brand active:scale-[0.99] transition-all shadow-[0_8px_22px_rgba(250,204,21,0.32)]"
                style={{ animation: `fadeUp 0.55s ease-out ${i * 0.08}s both` }}
                aria-label={`Enter — ${tile.label}`}
              >
                <span
                  className="shrink-0 w-12 h-12 rounded-xl bg-bg/15 flex items-center justify-center"
                  aria-hidden
                >
                  <img src={tile.img} alt="" className="h-10 w-auto object-contain" loading="eager" />
                </span>
                <span className="flex-1 text-left">
                  <span className="block font-extrabold text-[16px] leading-tight">{tile.label}</span>
                  <span className="block text-[12px] font-bold opacity-75 leading-tight mt-0.5">{tile.sub}</span>
                </span>
                <ArrowRight className="w-5 h-5 shrink-0 opacity-80" />
              </button>
            ))}

            {/* Language toggle — small, below the tiles. Doesn't enter
                the app; just sets the landing locale for the H1 + pill. */}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-bold">
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

            <p className="text-[12px] text-dim text-center pt-0.5">{t.freeNote}</p>
          </div>
        </div>
      </section>

      <PlatformDisclaimer variant="links" />
    </main>
  )
}

