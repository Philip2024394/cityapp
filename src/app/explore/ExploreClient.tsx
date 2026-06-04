'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, Bus, Briefcase, ChevronLeft, Search as SearchIcon, Truck,
  User, Package, UtensilsCrossed, KeyRound, MapPinned,
  Flower2, Scissors, Shirt, Wrench, SprayCan, Home, X,
  type LucideIcon,
} from 'lucide-react'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import { logNav } from '@/lib/perf/navTiming'
import { rankIntents } from '@/lib/search/intentMap'

// ============================================================================
// /explore — Two-tier service hub (May 2026 redesign).
// Re-styled to the app-wide white-card pattern (May 28 unify): white tiles
// with gold accents, dark body text. Matches the landing page, profile
// shells, and dashboard cards so the visual language is consistent.
// ============================================================================

const GOLD = '#FACC15'
const INK  = '#0A0A0A'

const CARD_SHADOW = '0 2px 14px rgba(0,0,0,0.06)'
const GOLD_TINT   = 'rgba(250,204,21,0.15)'
const GOLD_LINE   = 'rgba(250,204,21,0.35)'

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
  searchPlaceholder: string
  searchSuggestionsLabel: string
  searchNoMatch: string
  searchTryAnyway: string
}> = {
  id: {
    back: 'Kembali',
    hero: 'Apa yang bisa kami bantu hari ini?',
    rideSub: 'Penumpang',
    parcelSub: 'Kurir',
    lifestyleLabel: 'Gaya Hidup',
    signIn: 'Masuk',
    searchPlaceholder: 'Apa yang kamu butuhkan? — potong rambut, pijat, tukang…',
    searchSuggestionsLabel: 'Saran',
    searchNoMatch: 'Tidak ada yang persis cocok.',
    searchTryAnyway: 'Cari lintas kategori →',
  },
  en: {
    back: 'Back',
    hero: 'How can we help today?',
    rideSub: 'Passenger',
    parcelSub: 'Courier',
    lifestyleLabel: 'Lifestyle',
    signIn: 'Sign in',
    searchPlaceholder: 'What do you need? — haircut, massage, repair…',
    searchSuggestionsLabel: 'Suggestions',
    searchNoMatch: 'No exact match.',
    searchTryAnyway: 'Search across all categories →',
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
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('id')
  useEffect(() => { setLocale(getStoredLocale()) }, [])
  const t = STRINGS[locale]

  function setLocaleAndStore(lang: Locale) {
    try { localStorage.setItem('cr_locale', lang) } catch { /* ignore */ }
    setLocale(lang)
  }

  // ── Phase 1: intent search ─────────────────────────────────────────────
  // Live fuzzy match against the 11-intent table in lib/search/intentMap.
  // The dropdown reveals up to 4 ranked suggestions; tapping one navigates
  // to that vertical. Empty matches show a "search anyway" CTA that hands
  // off to /search?q= (Phase 2 results page).
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    return rankIntents(searchQuery).slice(0, 4)
  }, [searchQuery])

  const showDropdown = searchFocused && searchQuery.trim().length > 0

  function gotoIntent(href: string) {
    logNav(`explore-search:goto`)
    setSearchQuery('')
    setSearchFocused(false)
    router.push(href)
  }

  function gotoCrossSearch() {
    if (!searchQuery.trim()) return
    logNav(`explore-search:crossvertical`)
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions[0]) gotoIntent(suggestions[0].intent.href)
      else gotoCrossSearch()
    }
    if (e.key === 'Escape') {
      setSearchQuery('')
      setSearchFocused(false)
      searchInputRef.current?.blur()
    }
  }

  return (
    <main className="min-h-[100dvh] relative flex flex-col bg-white text-black">

      {/* Header */}
      <div className="relative z-20 px-4 pt-4 pb-1 max-w-xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          aria-label={t.back}
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[#0A0A0A] hover:bg-gray-100 active:scale-95 transition"
          onClick={() => logNav('explore:back-to-landing')}
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
        </Link>

        <div className="font-black text-[22px] leading-none tracking-tight">
          <span style={{ color: INK }}>Kita</span>
          <span style={{ color: GOLD }}>2u</span>
        </div>

        <div aria-hidden className="w-11 h-11" />
      </div>

      <section className="relative z-20 px-4 pt-3 pb-6 flex-1 max-w-xl mx-auto w-full">
        {/* Hero question */}
        <h1
          className="text-center text-[20px] sm:text-[22px] font-extrabold leading-tight mb-4"
          style={{ color: INK }}
        >
          {t.hero}
        </h1>

        {/* INTENT SEARCH (Phase 1) — fuzzy-match the visitor's free text
            against the 11-intent table and surface ranked suggestions. The
            input is the primary above-the-fold action for visitors who
            already know what they want and don't feel like scanning 10
            tiles. Live suggestions render below; Enter routes to the top
            match (or /search?q= when no intent matches). */}
        <div className="relative mb-5">
          <div
            className="relative flex items-center bg-white rounded-2xl"
            style={{ border: '1px solid #E5E7EB', boxShadow: CARD_SHADOW }}
          >
            <SearchIcon className="absolute left-3.5 w-5 h-5 text-gray-400" strokeWidth={2.25} aria-hidden />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                // Delay so a tap on a suggestion still registers.
                setTimeout(() => setSearchFocused(false), 150)
              }}
              onKeyDown={handleSearchKey}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              autoComplete="off"
              className="w-full pl-11 pr-11 py-3 rounded-2xl bg-transparent text-[14px] font-bold text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none"
              style={{ minHeight: 48 }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}
                aria-label="Clear search"
                className="absolute right-2 w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-500 hover:text-[#0A0A0A] hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Suggestions dropdown — only when input is focused AND has text */}
          {showDropdown && (
            <div
              className="absolute left-0 right-0 mt-2 rounded-2xl bg-white overflow-hidden z-30"
              style={{ border: '1px solid #E5E7EB', boxShadow: '0 14px 36px rgba(0,0,0,0.12)' }}
              role="listbox"
            >
              {suggestions.length > 0 ? (
                <>
                  <div
                    className="px-3 pt-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-500"
                  >
                    {t.searchSuggestionsLabel}
                  </div>
                  {suggestions.map((m) => (
                    <button
                      key={m.intent.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); gotoIntent(m.intent.href) }}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition"
                      role="option"
                    >
                      <span className="font-extrabold text-[14px] text-[#0A0A0A] truncate">
                        {m.intent.label[locale]}
                      </span>
                      <span className="font-bold text-[12px] text-gray-500 shrink-0">
                        {m.intent.href}
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="px-3.5 py-3">
                  <div className="text-[13px] font-bold text-gray-600 mb-2">{t.searchNoMatch}</div>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); gotoCrossSearch() }}
                    className="text-[13px] font-extrabold text-[#0A0A0A] hover:underline"
                  >
                    {t.searchTryAnyway}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TIER 1 — Two big transport cards (white pattern, solid-yellow
            icon badges). Image removed from Book Ride per latest spec —
            both tiles now share the same centered layout; only the label
            of the Ride tile gets the brand split-colour treatment. */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {TRANSPORT_TILES.map((tile, i) => {
            const Icon = tile.Icon
            const sub = tile.id === 'person' ? t.rideSub : t.parcelSub
            return (
              <Link
                key={tile.id}
                href={tile.href}
                prefetch
                onClick={() => logNav(`explore-tile:${tile.id}`)}
                aria-label={`${tile.label} — ${sub}`}
                className="group relative aspect-square rounded-3xl overflow-hidden transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-2 p-4"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #F1F1F1',
                  boxShadow: CARD_SHADOW,
                  animation: `fadeUp 0.55s ease-out ${i * 0.08}s both`,
                }}
              >
                <span
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: GOLD, border: `1px solid ${GOLD}` }}
                  aria-hidden
                >
                  <Icon className="w-9 h-9" strokeWidth={2} style={{ color: INK }} />
                </span>
                <span className="font-extrabold text-[20px] leading-tight tracking-wide uppercase">
                  <span style={{ color: INK }}>Book </span>
                  <span style={{ color: GOLD }}>{tile.label}</span>
                </span>
                <span className="text-[12px] font-bold text-gray-600 leading-tight">
                  {sub}
                </span>
              </Link>
            )
          })}
        </div>

        {/* TIER 2 — Lifestyle 4×2 (white tiles) */}
        <div className="mb-6">
          <p
            className="text-[12px] font-extrabold uppercase tracking-[0.18em] mb-2.5 pl-1"
            style={{ color: INK }}
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
                  className="aspect-square flex flex-col items-center justify-center gap-1 p-1.5 rounded-2xl transition-all active:scale-[0.95] hover:brightness-95"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #F1F1F1',
                    boxShadow: CARD_SHADOW,
                    animation: `fadeUp 0.45s ease-out ${0.15 + i * 0.04}s both`,
                  }}
                >
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: GOLD, border: `1px solid ${GOLD}` }}
                    aria-hidden
                  >
                    <Icon className="w-5 h-5" strokeWidth={2.25} style={{ color: INK }} />
                  </span>
                  <span className="text-[12px] font-bold text-[#0A0A0A] leading-tight">
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
          <BrowseRow
            href="/property"
            telemetry="explore-cta:property"
            Icon={Home}
            title="Property · Sales · Rentals · Builders"
            sub="Houses, villas, apartments, land — for sale, rent, or pre-launch"
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
                background: locale === 'id' ? GOLD_TINT : 'transparent',
                color: locale === 'id' ? INK : '#6B7280',
              }}
            >ID</button>
            <span className="text-gray-300">·</span>
            <button
              onClick={() => setLocaleAndStore('en')}
              className="px-2.5 py-1 rounded-full transition min-h-[44px] min-w-[44px]"
              aria-pressed={locale === 'en'}
              style={{
                background: locale === 'en' ? GOLD_TINT : 'transparent',
                color: locale === 'en' ? INK : '#6B7280',
              }}
            >EN</button>
          </div>

          <Link
            href="/login"
            className="font-extrabold hover:underline min-h-[44px] flex items-center"
            style={{ color: INK }}
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
      className="w-full min-h-[52px] flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all active:scale-[0.99] hover:brightness-95"
      style={{
        background: '#FFFFFF',
        border: '1px solid #F1F1F1',
        boxShadow: CARD_SHADOW,
      }}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: GOLD, border: `1px solid ${GOLD}` }}
        aria-hidden
      >
        <Icon className="w-5 h-5" strokeWidth={2.5} style={{ color: INK }} />
      </span>
      <span className="flex-1 text-left min-w-0">
        <span className="block font-extrabold text-[13px] leading-tight" style={{ color: INK }}>
          {title}
        </span>
        <span className="block text-[12px] font-bold text-gray-600 leading-tight mt-0.5">
          {sub}
        </span>
      </span>
      <span className="shrink-0 font-black text-[16px]" aria-hidden style={{ color: GOLD }}>→</span>
    </Link>
  )
}
