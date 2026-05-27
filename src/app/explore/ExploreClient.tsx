'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Bus, Briefcase, ChevronLeft, Truck } from 'lucide-react'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import { logNav } from '@/lib/perf/navTiming'

// ----------------------------------------------------------------------------
// Service tiles — moved verbatim from the old / landing. Same routes, same
// imagery; only the telemetry keys flip from 'landing-tile:*' → 'explore-tile:*'.
// ----------------------------------------------------------------------------
type TileId =
  | 'person' | 'parcel' | 'food' | 'rental' | 'tour'
  | 'massage' | 'beautician' | 'laundry' | 'handyman' | 'home-clean'

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

type Locale = 'id' | 'en'
const STRINGS: Record<Locale, {
  back: string
  intro: string
  cariCta: string
  signIn: string
}> = {
  id: {
    back: 'Kembali',
    intro: 'Pilih kategori untuk dijelajahi',
    cariCta: 'Cari Driver',
    signIn: 'Masuk',
  },
  en: {
    back: 'Back',
    intro: 'Pick a category to explore',
    cariCta: 'Find a Driver',
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

export default function ExploreClient() {
  const [locale, setLocale] = useState<Locale>('id')
  useEffect(() => { setLocale(getStoredLocale()) }, [])
  const t = STRINGS[locale]

  function setLocaleAndStore(lang: Locale) {
    try { localStorage.setItem('cr_locale', lang) } catch { /* ignore */ }
    setLocale(lang)
  }

  return (
    <main className="min-h-[100dvh] relative flex flex-col">
      {/* Same backdrop image as /. Keeps brand continuity between the
          welcome screen and the explore hub. */}
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

      {/* Local header — small wordmark + back arrow to /. AppNav already
          renders the global header above us; this gives the page its own
          visual anchor without removing the customer's escape hatch. */}
      <div className="relative z-20 px-4 pt-4 pb-1 max-w-xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          aria-label={t.back}
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-black hover:bg-white/40 active:scale-95 transition"
          onClick={() => logNav('explore:back-to-landing')}
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
        </Link>

        <img
          src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdadasdas-removebg-preview.png?updatedAt=1779782176718"
          alt="IndoCity"
          className="h-8 w-auto"
        />

        {/* Spacer to balance the back arrow column. */}
        <div aria-hidden className="w-11 h-11" />
      </div>

      <section className="relative z-20 px-4 pt-2 pb-6 flex-1 max-w-xl mx-auto w-full">
        <p className="text-center text-black text-[13px] font-bold mb-4">
          {t.intro}
        </p>

        {/* PRIMARY CTA — "Find a Driver" routes to /cari. Sits above the
            category grid so customers who came here to book a ride don't
            have to scan 10 tiles first. */}
        <Link
          href="/cari"
          prefetch
          onClick={() => logNav('explore-cta:cari')}
          aria-label={t.cariCta}
          className="
            w-full min-h-[52px] flex items-center justify-center gap-2 mb-5
            rounded-2xl px-5 bg-gradient-to-r from-brand to-brand2
            text-[#0F172A] font-extrabold text-[15px]
            hover:from-brand2 hover:to-brand active:scale-[0.99]
            transition shadow-[0_8px_22px_rgba(250,204,21,0.35)]
          "
        >
          <span>{t.cariCta}</span>
          <ArrowRight className="w-5 h-5" strokeWidth={2.75} />
        </Link>

        {/* Category grid — same 2-column treatment as the old landing. */}
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-3 mb-5">
          {SERVICE_TILES.map((tile, i) => (
            <Link
              key={tile.id}
              href={tile.href}
              prefetch
              onClick={() => logNav(`explore-tile:${tile.id}`)}
              className="w-full flex items-center gap-2 p-1.5 rounded-2xl text-bg bg-gradient-to-r from-brand to-brand2 hover:from-brand2 hover:to-brand active:scale-[0.99] transition-all shadow-[0_6px_18px_rgba(250,204,21,0.30)]"
              style={{ animation: `fadeUp 0.55s ease-out ${i * 0.05}s both` }}
              aria-label={`Enter — ${tile.label}`}
            >
              <span
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: '#172554' }}
                aria-hidden
              >
                <img
                  src={tile.img}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-auto object-contain"
                  loading={i < 4 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </span>
              <span className="flex-1 text-left min-w-0">
                <span className="block font-extrabold text-[13px] leading-tight truncate">{tile.label}</span>
                <span className="block text-[10px] font-bold opacity-75 leading-tight mt-0.5 truncate">{tile.sub}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Browse-flow CTAs — Rentals / Minibus / B2B. Same treatment as
            the old landing; just re-keyed telemetry. */}
        <div className="space-y-2.5">
          <Link
            href="/rentals"
            prefetch
            onClick={() => logNav('explore-cta:rentals')}
            aria-label="Browse driver-published rentals"
            className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#172554] text-white border-2 border-brand hover:bg-[#1e3a8a] active:scale-[0.99] transition-all shadow-[0_6px_18px_rgba(23,37,84,0.30)]"
          >
            <span
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-brand"
              aria-hidden
            >
              <Truck className="w-5 h-5 text-[#172554]" strokeWidth={2.5} />
            </span>
            <span className="flex-1 text-left min-w-0">
              <span className="block font-extrabold text-[13px] leading-tight">
                Rentals · Bike, Car, Bus, Truck by-day
              </span>
              <span className="block text-[11px] font-bold opacity-80 leading-tight mt-0.5">
                Browse driver-published listings — from Rp 250K/day
              </span>
            </span>
            <span className="shrink-0 text-brand font-black text-[16px]" aria-hidden>→</span>
          </Link>

          <Link
            href="/bus"
            prefetch
            onClick={() => logNav('explore-cta:bus')}
            aria-label="Browse minibus charter listings"
            className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#172554] text-white border-2 border-brand hover:bg-[#1e3a8a] active:scale-[0.99] transition-all shadow-[0_6px_18px_rgba(23,37,84,0.30)]"
          >
            <span
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-brand"
              aria-hidden
            >
              <Bus className="w-5 h-5 text-[#172554]" strokeWidth={2.5} />
            </span>
            <span className="flex-1 text-left min-w-0">
              <span className="block font-extrabold text-[13px] leading-tight">
                Minibus charter · Hiace, Innova, Avanza
              </span>
              <span className="block text-[11px] font-bold opacity-80 leading-tight mt-0.5">
                Group transport · tourism · airport — with driver
              </span>
            </span>
            <span className="shrink-0 text-brand font-black text-[16px]" aria-hidden>→</span>
          </Link>

          <Link
            href="/business"
            prefetch
            onClick={() => logNav('explore-cta:business')}
            aria-label="Business contracts — find a driver for regular deliveries"
            className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#172554] text-white border-2 border-brand hover:bg-[#1e3a8a] active:scale-[0.99] transition-all shadow-[0_6px_18px_rgba(23,37,84,0.30)]"
          >
            <span
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-brand"
              aria-hidden
            >
              <Briefcase className="w-5 h-5 text-[#172554]" strokeWidth={2.5} />
            </span>
            <span className="flex-1 text-left min-w-0">
              <span className="block font-extrabold text-[13px] leading-tight">
                Business contracts · Regular delivery drivers
              </span>
              <span className="block text-[11px] font-bold opacity-80 leading-tight mt-0.5">
                Shopee / TikTok / restaurants — recurring courier hire
              </span>
            </span>
            <span className="shrink-0 text-brand font-black text-[16px]" aria-hidden>→</span>
          </Link>
        </div>

        {/* Language toggle + sign-in link — keep them reachable from /explore
            for customers who pushed past the landing without flipping locale. */}
        <div className="mt-6 flex items-center justify-between text-[12px] font-bold">
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
      </section>

      <PlatformDisclaimer variant="links" />
    </main>
  )
}
