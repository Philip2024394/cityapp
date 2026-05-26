'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Truck, Clock, Scale } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import UniversalProviderCard, { type UniversalProviderCardBottomItem } from '@/components/marketplace/UniversalProviderCard'
import type { LaundryProviderPublic } from '@/lib/laundry/types'

const LAUNDRY_CARD_BG = 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png'

export default function LaundryMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const search = useSearchParams()
  const cityLabel = (search?.get('city')?.trim() || 'Yogyakarta')
  const [providers, setProviders] = useState<LaundryProviderPublic[]>([])
  const [pkg, setPkg] = useState<'all' | 'wash' | 'wash_dry' | 'wash_iron'>('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (pkg !== 'all') qs.set('package', pkg)
    const r = await fetch(`/api/laundry/marketplace${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' })
    const j = await r.json() as { providers: LaundryProviderPublic[] }
    setProviders(j.providers || [])
    setLoading(false)
  }, [pkg])
  useEffect(() => { load() }, [load])

  return (
    <Shell>
      <div className="px-4 pt-4 pb-24 max-w-4xl mx-auto">
        <div className="mb-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-ink/55">
            Laundry shops in
          </div>
          <div className="text-[20px] font-black text-ink mt-0.5">
            {cityLabel} City
          </div>
          <div className="inline-flex items-center gap-1 text-[12px] text-ink/70 mt-1 leading-snug">
            <Truck className="w-3.5 h-3.5" />
            Pickup &amp; dropoff included · per-kg pricing
          </div>
        </div>

        {/* Package filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {([
            { v: 'all',       label: 'All packages' },
            { v: 'wash',      label: 'Wash' },
            { v: 'wash_dry',  label: 'Wash + Dry' },
            { v: 'wash_iron', label: 'Wash + Iron' },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setPkg(opt.v)}
              className={`px-4 py-2 rounded-full text-[12px] font-extrabold uppercase tracking-wider border transition shrink-0 ${
                pkg === opt.v
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
            No laundry shops listed in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {providers.map((p) => (
              <ProviderCard key={p.slug} provider={p} demo={p.is_mock === true} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-black/85 border border-white/10 p-5 text-center">
          <div className="text-[13px] font-bold text-ink/80 mb-3">Are you a laundry shop?</div>
          <Link href="/laundry/signup" className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider hover:brightness-105">
            List your shop · Rp 38.000/month
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ProviderCard({ provider: p }: { provider: LaundryProviderPublic; demo?: boolean }) {
  // Laundry's "specialty" pill = the cheapest/primary package label so
  // customers can scan the listing for the package they want fast.
  const pkgs = [
    p.price_wash_per_kg_idr      != null ? { label: 'Wash',        v: p.price_wash_per_kg_idr }      : null,
    p.price_wash_dry_per_kg_idr  != null ? { label: 'Wash + Dry',  v: p.price_wash_dry_per_kg_idr }  : null,
    p.price_wash_iron_per_kg_idr != null ? { label: 'Wash + Iron', v: p.price_wash_iron_per_kg_idr } : null,
  ].filter((s): s is { label: string; v: number } => s !== null)
  const primary = pkgs[0] ?? null
  const portfolioThumbs = (p.gallery_image_urls ?? []).slice(0, 3)

  // Subline mixes years of experience + per-kg headline price so the
  // card sells the credibility + price-per-kg ratio at a glance.
  const sublineBits: string[] = []
  if (p.years_experience > 0) sublineBits.push(`${p.years_experience} yrs`)
  if (primary) sublineBits.push(`Rp ${primary.v.toLocaleString('id-ID')}/kg`)

  // Bottom-row pills are laundry-specific UX: turnaround + min kg
  // matter much more than the location icons beautician shows.
  const bottomItems: UniversalProviderCardBottomItem[] = []
  if (p.turnaround_hours)
    bottomItems.push({ key: 'turn', icon: 'clock', label: `${p.turnaround_hours}h turnaround` })
  if (p.min_kg)
    bottomItems.push({ key: 'min', icon: 'scale', label: `Min ${p.min_kg}kg` })
  bottomItems.push({ key: 'pickup', icon: 'truck', label: 'Pickup & dropoff' })

  return (
    <UniversalProviderCard
      href={`/laundry/${p.slug}`}
      displayName={p.display_name}
      city={p.city ?? null}
      subline={sublineBits.length ? sublineBits.join(' · ') : null}
      bio={p.bio?.replace(/\s*\n\s*/g, ' ') ?? null}
      coverImageUrl={p.cover_image_url ?? null}
      profileImageUrl={p.profile_image_url ?? null}
      availabilityDot={(p.availability === 'busy' || p.availability === 'offline') ? p.availability : 'online'}
      rating={p.rating ?? null}
      specialtyLabel={primary?.label ?? null}
      portfolioThumbs={portfolioThumbs}
      bottomItems={bottomItems}
      ctaLabel="Profile"
    />
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen text-ink">
      <AppNav />
      {children}
    </main>
  )
}
