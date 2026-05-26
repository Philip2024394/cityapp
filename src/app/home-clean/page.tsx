'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Sparkles, Clock, DollarSign } from 'lucide-react'
import UniversalProviderCard, { type UniversalProviderCardBottomItem } from '@/components/marketplace/UniversalProviderCard'
import type { HomeCleanProviderPublic } from '@/lib/home-clean/types'

const HOME_CLEAN_CARD_BG = 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png?updatedAt=1779599833442'

export default function HomeCleanMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-black/50 text-[13px]">Loading…</div></Shell>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const search = useSearchParams()
  const cityLabel = (search?.get('city')?.trim() || 'Yogyakarta')
  const [providers, setProviders] = useState<HomeCleanProviderPublic[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/home-clean/marketplace', { cache: 'no-store' })
    const j = await r.json() as { providers: HomeCleanProviderPublic[] }
    setProviders(j.providers || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <Shell>
      <div className="px-4 pt-4 pb-24 max-w-4xl mx-auto">
        <div className="mb-4 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-black/55">
            Home Clean in
          </div>
          <div className="text-[20px] font-black text-black mt-0.5">
            {cityLabel} City
          </div>
          <div className="inline-flex items-center gap-1 text-[12px] text-black/70 mt-1">
            <Sparkles className="w-3.5 h-3.5" />
            Bersih-bersih rumah · per jam atau harian
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0,1,2,3].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : providers.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center text-white/85 text-[13px]"
            style={{
              background: '#1E3A8A',
              border: '1px solid rgba(250,204,21,0.45)',
            }}
          >
            No cleaners listed yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {providers.map((p) => (
              <ProviderCard key={p.slug} provider={p} demo={p.is_mock === true} />
            ))}
          </div>
        )}

        <div
          className="mt-10 rounded-2xl p-5 text-center"
          style={{
            background: '#1E3A8A',
            border: '1px solid rgba(250,204,21,0.45)',
          }}
        >
          <div className="text-[13px] font-bold text-white/85 mb-3">Are you a cleaner?</div>
          <Link href="/home-clean/signup" className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider hover:brightness-105">
            List your profile · Rp 38.000/month
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ProviderCard({ provider: p }: { provider: HomeCleanProviderPublic; demo?: boolean }) {
  // Specialty pill = cheapest tier label so the price-conscious customer
  // can tell hourly vs day-rate cleaners apart at a glance.
  const specialtyLabel = p.hourly_rate_idr != null ? 'Per Hour'
                       : p.day_rate_idr != null    ? 'Day Rate'
                       : null
  const portfolioThumbs = (p.gallery_image_urls ?? []).slice(0, 3)

  const sublineBits: string[] = []
  if (p.years_experience > 0) sublineBits.push(`${p.years_experience} yrs`)

  const bottomItems: UniversalProviderCardBottomItem[] = []
  if (p.hourly_rate_idr != null) {
    bottomItems.push({
      key: 'hour', icon: 'clock',
      label: `Rp ${p.hourly_rate_idr.toLocaleString('id-ID')}/h`,
    })
  }
  if (p.day_rate_idr != null && bottomItems.length < 2) {
    // No icon — DollarSign read as USD on an IDR card; the "Rp …/day"
    // label is enough.
    bottomItems.push({
      key: 'day',
      label: `Rp ${p.day_rate_idr.toLocaleString('id-ID')}/day`,
    })
  }
  // Visual cue that this category includes supplies — universal copy
  // most home-clean vendors agree to.
  bottomItems.push({ key: 'sup', icon: 'sparkles', label: 'Supplies inc.' })

  return (
    <UniversalProviderCard
      href={`/home-clean/${p.slug}`}
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
