'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Home, Hotel, Building2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import AvailabilityDot from '@/components/massage/AvailabilityDot'
import UniversalProviderCard, { type UniversalProviderCardBottomItem } from '@/components/marketplace/UniversalProviderCard'
import { MASSAGE_TYPE_SHORT, type MassageProviderPublic } from '@/lib/massage/types'

// Per-card background image — themed massage scene, layered behind a
// dark scrim inside each ProviderCard. Distinct from the global
// PageBackground (which is the motorbike scene shared across the app).
const MASSAGE_CARD_BG =
  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png'

// Mock therapists now live in the massage_providers table with
// is_mock = true (see migration 0049). They're returned by the
// marketplace API alongside real profiles and auto-hidden one-by-one
// as real therapists sign up. Card UI renders mocks identically but
// the Book Now button is replaced with a "Sample listing" pill.

export default function MassageMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>}>
      <MarketplaceInner />
    </Suspense>
  )
}

function MarketplaceInner() {
  const search = useSearchParams()
  const initialGender = (search?.get('gender') === 'man' ? 'man'
                       : search?.get('gender') === 'woman' ? 'woman'
                       : 'all') as 'all' | 'woman' | 'man'
  // City heading. Pulled from ?city= URL param so partner-QR / landing
  // links can override; defaults to Yogyakarta (primary market). Pure
  // display for now — does not yet filter the marketplace API.
  const cityLabel = (search?.get('city')?.trim() || 'Yogyakarta')

  const [providers, setProviders] = useState<MassageProviderPublic[]>([])
  const [gender, setGender] = useState<'all' | 'woman' | 'man'>(initialGender)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (gender !== 'all') qs.set('gender', gender)
    const r = await fetch(`/api/massage/marketplace${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' })
    const j = await r.json() as { providers: MassageProviderPublic[] }
    setProviders(j.providers || [])
    setLoading(false)
  }, [gender])

  useEffect(() => { load() }, [load])

  return (
    <Shell>
      <div className="px-4 pt-4 pb-24 max-w-4xl mx-auto">
        {/* City heading — sits above the card grid so the visitor knows
            which city they're browsing. ?city= URL param overrides.
            Sub-line clarifies the service: home visits + hotel calls. */}
        <div className="mb-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-ink/55">
            Massage therapists in
          </div>
          <div className="text-[20px] font-black text-ink mt-0.5">
            {cityLabel} City
          </div>
          <div className="text-[12px] text-ink/70 mt-1 max-w-md mx-auto leading-snug">
            Independent therapists online now — home visits and hotel-room calls across {cityLabel}.
          </div>
        </div>

        {/* Gender filter */}
        <div className="flex gap-2 mb-4">
          {([
            { v: 'all',   label: 'All' },
            { v: 'woman', label: 'Wanita' },
            { v: 'man',   label: 'Pria' },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setGender(opt.v)}
              className={`px-4 py-2 rounded-full text-[12px] font-extrabold uppercase tracking-wider border transition ${
                gender === opt.v
                  ? 'bg-brand text-bg border-brand'
                  : 'bg-black/60 text-ink/80 border-white/15 hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0,1,2,3].map((i) => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : providers.length === 0 ? (
          <div className="rounded-2xl bg-black/85 border border-white/10 p-8 text-center text-ink/65 text-[13px]">
            No therapists listed in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {providers.map((p) => (
              <ProviderCard key={p.slug} provider={p} demo={p.is_mock === true} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-black/85 border border-white/10 p-5 text-center">
          <div className="text-[13px] font-bold text-ink/80 mb-3">Are you a therapist?</div>
          <Link href="/massage/signup" className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider hover:brightness-105">
            List your profile · Rp 38.000/month
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ProviderCard({ provider: p }: { provider: MassageProviderPublic; demo?: boolean }) {
  // Specialty pill = massage type. Subline summarises duration tiers
  // so customers can scan duration availability at a glance.
  const specialtyLabel = MASSAGE_TYPE_SHORT[p.massage_type] ?? p.massage_type
  const portfolioThumbs = (p.gallery_image_urls ?? []).slice(0, 3)

  // Subline: gender + years experience + cheapest tier.
  const sublineBits: string[] = []
  if (p.gender === 'woman' || p.gender === 'man') sublineBits.push(p.gender === 'woman' ? 'Wanita' : 'Pria')
  if (p.years_experience > 0) sublineBits.push(`${p.years_experience} yrs`)
  const cheapest = [p.price_60min_idr, p.price_90min_idr, p.price_120min_idr]
    .filter((n): n is number => typeof n === 'number' && n > 0)
    .reduce((min, n) => Math.min(min, n), Number.POSITIVE_INFINITY)
  if (Number.isFinite(cheapest)) sublineBits.push(`From Rp ${cheapest.toLocaleString('id-ID')}`)

  // Home / Hotel / Villa icons same as beautician.
  const locs = new Set(p.service_locations ?? [])
  const bottomItems: UniversalProviderCardBottomItem[] = []
  if (locs.has('home'))  bottomItems.push({ key: 'home',  icon: 'home',  label: 'Home' })
  if (locs.has('hotel')) bottomItems.push({ key: 'hotel', icon: 'hotel', label: 'Hotel' })
  if (locs.has('villa')) bottomItems.push({ key: 'villa', icon: 'villa', label: 'Villa' })

  return (
    <UniversalProviderCard
      href={`/massage/${p.slug}`}
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
    />
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  // No local background — inherits the global PageBackground from the
  // root layout, so /massage matches /cari and the rest of the app.
  return (
    <main className="relative min-h-screen text-ink">
      <AppNav />
      {children}
    </main>
  )
}
