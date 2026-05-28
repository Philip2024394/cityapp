'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight, Bus, Briefcase, ChevronLeft, Truck,
  User, Package, UtensilsCrossed, KeyRound, MapPinned,
  Flower2, Scissors, Shirt, Wrench, SprayCan,
  type LucideIcon,
} from 'lucide-react'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import { logNav } from '@/lib/perf/navTiming'

// ============================================================================
// /explore — Two-tier service hub (May 2026 redesign).
// Palette: charcoal #3A3A3A + gold #F5C542. Two BIG transport cards at the
// top (Ride / Parcel — 80% of customer intent), 4×2 grid of lifestyle
// services below, then 3 cross-vertical browse CTAs.
// ============================================================================

const CHARCOAL      = '#3A3A3A'
const CHARCOAL_DEEP = '#2D2D2D'
const GOLD          = '#F5C542'

type TransportTile = { id: 'person' | 'parcel'; label: string; Icon: LucideIcon; href: string }
const TRANSPORT_TILES: ReadonlyArray<TransportTile> = [
  { id: 'person', label: 'Ride',   Icon: User,    href: '/cari?service=person' },
  { id: 'parcel', label: 'Parcel', Icon: Package, href: '/cari?service=parcel' },
]

type LifestyleId =
  | 'food' | 'rental' | 'tour' | 'massage'
  | 'beautician' | 'laundry' | 'handyman' | 'home-clean'
type LifestyleTile = { id: LifestyleId; label: string; Icon: LucideIcon; href: string }
const LIFESTYLE_TILES: ReadonlyArray<LifestyleTile> = [
  { id: 'food',       label: 'Food',    Icon: UtensilsCrossed, href: '/food' },
  { id: 'rental',     label: 'Rental',  Icon: KeyRound,        href: '/rent' },
  { id: 'tour',       label: 'Tour',    Icon: MapPinned,       href: '/tour' },
  { id: 'massage',    label: 'Massage', Icon: Flower2,         href: '/massage' },
  { id: 'beautician', label: 'Beauty',  Icon: Scissors,        href: '/beautician' },
  { id: 'laundry',    label: 'Laundry', Icon: Shirt,           href: '/laundry' },
  { id: 'handyman',   label: 'Tukang',  Icon: Wrench,          href: '/handyman' },
  { id: 'home-clean', label: 'Clean',   Icon: SprayCan,        href: '/home-clean' },
]

type Locale = 'id' | 'en'
const STRINGS: Record<Locale, {
  back: string
  hero: string
  rideSub: string
  parcelSub: string
  lifestyleLabel: string
  signIn: string
}> = {
  id: {
    back: 'Kembali',
    hero: 'Apa yang bisa kami bantu hari ini?',
    rideSub: 'Penumpang',
    parcelSub: 'Kurir',
    lifestyleLabel: 'Gaya Hidup',
    signIn: 'Masuk',
  },
  en: {
    back: 'Back',
    hero: 'How can we help today?',
    rideSub: 'Passenger',
    parcelSub: 'Courier',
    lifestyleLabel: 'Lifestyle',
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
      {/* Backdrop image */}
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
      {/* Soft top/bottom scrims so header + footer text stay readable on any image */}
      <div aria-hidden className="fixed inset-x-0 top-0 h-32 -z-10 pointer-events-none bg-gradient-to-b from-black/40 to-transparent" />
      <div aria-hidden className="fixed inset-x-0 bottom-0 h-32 -z-10 pointer-events-none bg-gradient-to-t from-black/40 to-transparent" />

      {/* Header */}
      <div className="relative z-20 px-4 pt-4 pb-1 max-w-xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          aria-label={t.back}
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition"
          onClick={() => logNav('explore:back-to-landing')}
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
        </Link>

        <img
          src="https://ik.imagekit.io/nepgaxllc/Untitleddfsdfsdfs-removebg-preview.png"
          alt="IndoCity"
          className="h-8 w-auto"
        />

        <div aria-hidden className="w-11 h-11" />
      </div>

      <section className="relative z-20 px-4 pt-3 pb-6 flex-1 max-w-xl mx-auto w-full">
        {/* Hero question */}
        <h1
          className="text-center text-[20px] sm:text-[22px] font-extrabold leading-tight mb-5"
          style={{ color: GOLD, textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
        >
          {t.hero}
        </h1>

        {/* TIER 1 — Two big transport cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {TRANSPORT_TILES.map((tile, i) => {
            const Icon = tile.Icon
            const sub = tile.id === 'person' ? t.rideSub : t.parcelSub
            const isRide = tile.id === 'person'
            return (
              <Link
                key={tile.id}
                href={tile.href}
                prefetch
                onClick={() => logNav(`explore-tile:${tile.id}`)}
                aria-label={`${tile.label} — ${sub}`}
                className={`group relative aspect-square rounded-3xl overflow-hidden transition-all active:scale-[0.98] ${
                  isRide
                    ? 'block p-3'
                    : 'flex flex-col items-center justify-center gap-2 p-4'
                }`}
                style={{
                  background: `linear-gradient(155deg, ${CHARCOAL} 0%, ${CHARCOAL_DEEP} 100%)`,
                  border: `1.5px solid ${GOLD}`,
                  boxShadow: '0 14px 32px rgba(0,0,0,0.40), 0 0 0 1px rgba(245,197,66,0.12) inset',
                  animation: `fadeUp 0.55s ease-out ${i * 0.08}s both`,
                }}
              >
                {/* gold sheen on hover/active */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
                  style={{ background: 'radial-gradient(circle at 30% 0%, rgba(245,197,66,0.22), transparent 60%)' }}
                />
                {isRide ? (
                  <>
                    <img
                      src="https://ik.imagekit.io/9mrgsv2rp/Untitledsadasdasdasdasdaa.png"
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 flex flex-col items-start leading-[1.02]">
                      <span className="font-extrabold text-[22px] tracking-wide uppercase text-white">
                        Book
                      </span>
                      <span className="font-extrabold text-[22px] tracking-wide uppercase" style={{ color: GOLD }}>
                        Ride
                      </span>
                    </div>
                    <span
                      aria-hidden
                      className="absolute bottom-3 left-3 w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(245,197,66,0.18)', border: `1.5px solid ${GOLD}` }}
                    >
                      <ArrowRight className="w-5 h-5" strokeWidth={2.5} style={{ color: GOLD }} />
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(245,197,66,0.14)', border: '1px solid rgba(245,197,66,0.32)' }}
                      aria-hidden
                    >
                      <Icon className="w-9 h-9" strokeWidth={2} style={{ color: GOLD }} />
                    </span>
                    <span className="font-extrabold text-[20px] leading-tight tracking-wide uppercase" style={{ color: GOLD }}>
                      {tile.label}
                    </span>
                    <span className="text-[12px] font-bold text-white/85 leading-tight">
                      {sub}
                    </span>
                  </>
                )}
              </Link>
            )
          })}
        </div>

        {/* TIER 2 — Lifestyle 4×2 */}
        <div className="mb-6">
          <p
            className="text-[12px] font-extrabold uppercase tracking-[0.18em] mb-2.5 pl-1"
            style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}
          >
            {t.lifestyleLabel}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {LIFESTYLE_TILES.map((tile, i) => {
              const Icon = tile.Icon
              return (
                <Link
                  key={tile.id}
                  href={tile.href}
                  prefetch
                  onClick={() => logNav(`explore-tile:${tile.id}`)}
                  aria-label={`Enter — ${tile.label}`}
                  className="aspect-square flex flex-col items-center justify-center gap-1 p-1.5 rounded-2xl transition-all active:scale-[0.95] hover:brightness-110"
                  style={{
                    background: CHARCOAL,
                    border: '1px solid rgba(245,197,66,0.20)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.32)',
                    animation: `fadeUp 0.45s ease-out ${0.15 + i * 0.04}s both`,
                  }}
                >
                  <Icon className="w-6 h-6" strokeWidth={2.25} style={{ color: GOLD }} aria-hidden />
                  <span className="text-[12px] font-bold text-white/90 leading-tight">
                    {tile.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Browse-flow CTAs — Rentals / Minibus / B2B */}
        <div className="space-y-2.5">
          <BrowseRow
            href="/rentals"
            telemetry="explore-cta:rentals"
            Icon={Truck}
            title="Rentals · Bike, Car, Bus, Truck by-day"
            sub="Browse driver-published listings — from Rp 250K/day"
          />
          <BrowseRow
            href="/bus"
            telemetry="explore-cta:bus"
            Icon={Bus}
            title="Minibus charter · Hiace, Innova, Avanza"
            sub="Group transport · tourism · airport — with driver"
          />
          <BrowseRow
            href="/business"
            telemetry="explore-cta:business"
            Icon={Briefcase}
            title="Business contracts · Regular delivery drivers"
            sub="Shopee / TikTok / restaurants — recurring courier hire"
          />
        </div>

        {/* Footer — locale + sign in */}
        <div className="mt-6 flex items-center justify-between text-[12px] font-bold">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLocaleAndStore('id')}
              className="px-2.5 py-1 rounded-full transition min-h-[44px] min-w-[44px]"
              aria-pressed={locale === 'id'}
              style={{
                background: locale === 'id' ? 'rgba(245,197,66,0.18)' : 'transparent',
                color: locale === 'id' ? GOLD : 'rgba(255,255,255,0.80)',
              }}
            >ID</button>
            <span className="text-white/45">·</span>
            <button
              onClick={() => setLocaleAndStore('en')}
              className="px-2.5 py-1 rounded-full transition min-h-[44px] min-w-[44px]"
              aria-pressed={locale === 'en'}
              style={{
                background: locale === 'en' ? 'rgba(245,197,66,0.18)' : 'transparent',
                color: locale === 'en' ? GOLD : 'rgba(255,255,255,0.80)',
              }}
            >EN</button>
          </div>

          <Link
            href="/login"
            className="font-extrabold hover:underline min-h-[44px] flex items-center"
            style={{ color: GOLD }}
          >
            {t.signIn} →
          </Link>
        </div>
      </section>

      <PlatformDisclaimer variant="links" />
    </main>
  )
}

function BrowseRow({
  href, telemetry, Icon, title, sub,
}: {
  href: string
  telemetry: string
  Icon: LucideIcon
  title: string
  sub: string
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={() => logNav(telemetry)}
      aria-label={title}
      className="w-full min-h-[52px] flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all active:scale-[0.99] hover:brightness-110"
      style={{
        background: CHARCOAL,
        border: `1px solid ${GOLD}`,
        boxShadow: '0 8px 22px rgba(0,0,0,0.32)',
      }}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(245,197,66,0.18)', border: '1px solid rgba(245,197,66,0.32)' }}
        aria-hidden
      >
        <Icon className="w-5 h-5" strokeWidth={2.5} style={{ color: GOLD }} />
      </span>
      <span className="flex-1 text-left min-w-0">
        <span className="block font-extrabold text-[13px] leading-tight" style={{ color: GOLD }}>
          {title}
        </span>
        <span className="block text-[12px] font-bold text-white/80 leading-tight mt-0.5">
          {sub}
        </span>
      </span>
      <span className="shrink-0 font-black text-[16px]" aria-hidden style={{ color: GOLD }}>→</span>
    </Link>
  )
}
