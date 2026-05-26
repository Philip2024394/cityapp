'use client'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Wrench, Search, Menu, X, DollarSign, Clock } from 'lucide-react'
import UniversalProviderCard, { type UniversalProviderCardBottomItem } from '@/components/marketplace/UniversalProviderCard'
import {
  SPECIALTY_LABELS, ALL_SPECIALTIES,
  type HandymanProviderPublic, type HandymanSpecialty,
} from '@/lib/handyman/types'

const HANDYMAN_CARD_BG = 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png'

export default function HandymanMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const search = useSearchParams()
  const cityLabel = (search?.get('city')?.trim() || 'Yogyakarta')
  const [providers, setProviders] = useState<HandymanProviderPublic[]>([])
  const [specialty, setSpecialty] = useState<'all' | HandymanSpecialty>('all')
  const [searchText, setSearchText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (specialty !== 'all') qs.set('specialty', specialty)
    const r = await fetch(`/api/handyman/marketplace${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' })
    const j = await r.json() as { providers: HandymanProviderPublic[] }
    setProviders(j.providers || [])
    setLoading(false)
  }, [specialty])
  useEffect(() => { load() }, [load])

  // Close burger menu on outside-click / Escape
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Client-side text search over the server-filtered set.
  const visible = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return providers
    return providers.filter((p) => {
      const hay = [
        p.display_name,
        p.bio,
        p.city ?? '',
        p.service_area_notes ?? '',
        ...p.specialties.map((s) => SPECIALTY_LABELS[s]),
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [providers, searchText])

  return (
    <Shell>
      <div className="px-4 pt-4 pb-24 max-w-4xl mx-auto">
        <div className="mb-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-black/55">
            Tukang in
          </div>
          <div className="text-[20px] font-black text-black mt-0.5">
            {cityLabel} City
          </div>
          <div className="inline-flex items-center gap-1 text-[12px] text-black/70 mt-1">
            <Wrench className="w-3.5 h-3.5" />
            Listrik · Plumbing · AC · Tukang · 20+ trades
          </div>
        </div>

        {/* Search bar + burger button */}
        <div className="flex items-center gap-2 mb-3" ref={menuRef}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 pointer-events-none" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cari tukang — nama, area, jenis layanan…"
              className="w-full rounded-full bg-gray-100 border border-gray-200 pl-10 pr-3 py-2.5 text-[13px] text-black placeholder:text-black/45 focus:outline-none focus:border-brand"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-bg bg-brand hover:bg-brand2 active:scale-95 transition border border-black/40 shadow-[0_4px_12px_rgba(250,204,21,0.30)]"
              aria-label="Filter by specialty"
              title="Filter by specialty"
            >
              <Menu className="w-5 h-5" strokeWidth={2.75} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 z-50 w-[280px] max-h-[70vh] overflow-y-auto rounded-2xl p-2"
                style={{
                  background: '#0A0A0A',
                  border: '1px solid rgba(250,204,21,0.25)',
                  boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
                }}
              >
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-ink/55">Filter trade</span>
                  <button onClick={() => setMenuOpen(false)} className="text-ink/50 hover:text-ink"><X className="w-4 h-4" /></button>
                </div>
                <button
                  onClick={() => { setSpecialty('all'); setMenuOpen(false) }}
                  className={`flex items-center w-full px-2 py-2 rounded-lg text-[13px] font-bold transition ${
                    specialty === 'all' ? 'bg-brand text-bg' : 'text-ink hover:bg-brand/15 hover:text-brand'
                  }`}
                >
                  All trades
                </button>
                {ALL_SPECIALTIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSpecialty(s); setMenuOpen(false) }}
                    className={`flex items-center w-full px-2 py-2 rounded-lg text-[13px] font-bold transition ${
                      specialty === s ? 'bg-brand text-bg' : 'text-ink hover:bg-brand/15 hover:text-brand'
                    }`}
                  >
                    {SPECIALTY_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {specialty !== 'all' && (
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/15 border border-brand/40 text-[12px] font-extrabold text-brand">
            <Wrench className="w-3.5 h-3.5" />
            {SPECIALTY_LABELS[specialty]}
            <button onClick={() => setSpecialty('all')} className="hover:text-ink"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0,1,2,3].map((i) => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-black/85 border border-white/10 p-8 text-center text-ink/65 text-[13px]">
            {searchText ? `No tukang match "${searchText}".` : 'No tukang listed in this trade yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visible.map((p) => (
              <ProviderCard key={p.slug} provider={p} demo={p.is_mock === true} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-black/85 border border-white/10 p-5 text-center">
          <div className="text-[13px] font-bold text-ink/80 mb-3">Are you a tukang?</div>
          <Link href="/handyman/signup" className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider hover:brightness-105">
            List your profile · Rp 38.000/month
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ProviderCard({ provider: p }: { provider: HandymanProviderPublic; demo?: boolean }) {
  // Adapter — folds the handyman shape into the shared
  // UniversalProviderCard. Marketplace cards use the brand-yellow
  // accent uniformly across verticals; per-provider theme_color
  // lives on the public profile page only.
  const primary = p.specialties?.[0] ?? null
  const specialtyLabel = primary ? SPECIALTY_LABELS[primary] : null
  const portfolioThumbs = (p.gallery_image_urls ?? []).slice(0, 3)

  // Subline summarises the credibility signals in one line — years
  // of experience + city + "own tools" badge when applicable.
  const sublineBits: string[] = []
  if (p.years_experience > 0) sublineBits.push(`${p.years_experience} yrs`)
  if (p.has_own_tools) sublineBits.push('Own tools')

  const bottomItems: UniversalProviderCardBottomItem[] = []
  if (p.hourly_rate_idr != null) {
    bottomItems.push({
      key: 'hour', icon: 'clock',
      label: `Rp ${p.hourly_rate_idr.toLocaleString('id-ID')}/h`,
    })
  }
  if (p.day_rate_idr != null && bottomItems.length < 2) {
    // No icon — the "Rp X/day" label is self-explanatory and the
    // DollarSign icon read as a USD symbol on an IDR card.
    bottomItems.push({
      key: 'day',
      label: `Rp ${p.day_rate_idr.toLocaleString('id-ID')}/day`,
    })
  }

  return (
    <UniversalProviderCard
      href={`/handyman/${p.slug}`}
      displayName={p.display_name}
      city={p.city ?? null}
      subline={sublineBits.length ? sublineBits.join(' · ') : null}
      bio={p.bio?.replace(/\s*\n\s*/g, ' ') ?? null}
      coverImageUrl={p.cover_image_url ?? null}
      profileImageUrl={p.profile_image_url ?? null}
      availabilityDot={(p.availability === 'busy' || p.availability === 'offline') ? p.availability : 'online'}
      rating={p.rating ?? null}
      specialtyLabel={specialtyLabel}
      portfolioThumbs={portfolioThumbs}
      bottomItems={bottomItems}
      ctaLabel="Profile"
      variant="light"
    />
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  // Paint over the global PageBackground with solid white so the
  // marketplace reads as a clean directory page. Text colour switches
  // to dark inks (ink → black via the surface). AppNav (the dark
  // sticky glass header) is intentionally omitted here per founder
  // request — the rest of the app still gets it. A minimal header
  // with the founder wordmark sits at the top-left as the only
  // brand anchor on this surface.
  return (
    <main className="relative min-h-screen bg-white text-black">
      <header className="px-4 pt-safe pt-[35px] pb-2 max-w-4xl mx-auto">
        <Link href="/" aria-label="Home" className="inline-block">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdadasdas-removebg-preview.png?updatedAt=1779782176718"
            alt="City Riders"
            className="h-8 sm:h-10 w-auto"
          />
        </Link>
      </header>
      {children}
    </main>
  )
}
