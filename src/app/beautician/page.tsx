'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Menu, Plus, Home, Hotel, Building2 } from 'lucide-react'
import UniversalProviderCard, { type UniversalProviderCardBottomItem } from '@/components/marketplace/UniversalProviderCard'
import {
  BEAUTICIAN_SERVICES_OFFERED,
  type BeauticianProviderPublic,
  type BeauticianServiceOffered,
} from '@/lib/beautician/types'

// Auto-busy logic: if a beautician has set operating_hours and the
// current local time is outside today's window, the green "online"
// dot displays as busy on the card. Customers can still contact them
// from the profile page (no change to contact behavior).
const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'] as const

function isWithinOperatingHours(hours: Record<string, string> | null | undefined): boolean {
  if (!hours) return true
  const today = DAY_KEYS[new Date().getDay()]
  const range = hours[today]
  if (!range) return false
  const [start, end] = range.split('-').map((s) => s.trim())
  if (!start || !end) return true
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if (!Number.isFinite(sh) || !Number.isFinite(eh)) return true
  const now = new Date()
  const nowMin   = now.getHours() * 60 + now.getMinutes()
  const startMin = sh * 60 + (sm || 0)
  const endMin   = eh * 60 + (em || 0)
  return nowMin >= startMin && nowMin < endMin
}

function effectiveAvailability(p: BeauticianProviderPublic): 'online' | 'busy' | 'offline' {
  if (p.availability !== 'online') return p.availability
  return isWithinOperatingHours(p.operating_hours) ? 'online' : 'busy'
}

function format12h(time: string): string {
  const h = parseInt((time.split(':')[0] || '0'), 10)
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  if (h < 12)   return `${h}am`
  return `${h - 12}pm`
}

function todayHoursLabel(hours: Record<string, string> | null | undefined): string | null {
  if (!hours) return null
  const today = DAY_KEYS[new Date().getDay()]
  const range = hours[today]
  if (!range) return null
  const [start, end] = range.split('-').map((s) => s.trim())
  if (!start || !end) return null
  return `${format12h(start)} – ${format12h(end)}`
}

// Card-level thumbnail per service category. Add a URL here as soon
// as the founder provides one — categories without an image just fall
// back to a labeled pill so the row never looks empty.
const CATEGORY_IMAGES: Partial<Record<BeauticianServiceOffered, string>> = {
  makeup: 'https://ik.imagekit.io/nepgaxllc/Untitledsasdasdasd-removebg-preview.png',
  hair:   'https://ik.imagekit.io/nepgaxllc/Untitledsadasdasdasdaaaa-removebg-preview.png',
  nails:  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdasdasdasd-removebg-preview.png',
}

// First-tier categories shown inline on the filter row. The rest live
// behind the burger toggle so the filter row never scrolls horizontally.
const PRIMARY_CATEGORIES: Array<{ id: 'all' | BeauticianServiceOffered; label: string }> = [
  { id: 'all',    label: 'All'    },
  { id: 'nails',  label: 'Nails'  },
  { id: 'hair',   label: 'Hair'   },
  { id: 'makeup', label: 'Make Up'},
]
const SECONDARY_IDS: BeauticianServiceOffered[] = [
  'skin','lashes','brows','waxing','facial','massage','henna','bridal','spa',
  'whitening','microblading','smoothing','permanent_makeup',
]

// Per-card background image — same massage scene per design ask.
const BEAUTY_CARD_BG = 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png'

export default function BeauticianMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-black/50 text-[13px]">Loading…</div></Shell>}>
      <MarketplaceInner />
    </Suspense>
  )
}

function MarketplaceInner() {
  const search = useSearchParams()
  const initialGender = (search?.get('gender') === 'man' ? 'man'
                       : search?.get('gender') === 'woman' ? 'woman'
                       : 'all') as 'all' | 'woman' | 'man'
  const cityLabel = (search?.get('city')?.trim() || 'Yogyakarta')

  const [providers, setProviders] = useState<BeauticianProviderPublic[]>([])
  // Gender filter UI was removed per founder; URL param still honored
  // for deep-links from older marketing assets.
  const [gender] = useState<'all' | 'woman' | 'man'>(initialGender)
  // Single category filter — null = All. Matches against
  // marketplace_categories (mig 0077).
  const [category, setCategory] = useState<BeauticianServiceOffered | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (gender !== 'all') qs.set('gender', gender)
    if (category) qs.set('category', category)
    if (cityLabel.trim()) qs.set('city', cityLabel.trim())
    const r = await fetch(`/api/beautician/marketplace${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' })
    const j = await r.json() as { providers: BeauticianProviderPublic[] }
    setProviders(j.providers || [])
    setLoading(false)
  }, [gender, category, cityLabel])

  useEffect(() => { load() }, [load])

  return (
    <Shell>
      <div className="px-4 pt-4 pb-24 max-w-4xl mx-auto">
        <div className="mb-3 text-center relative">
          {/* + List CTA — routes beauticians to signup (existing route
              decides between create-account vs sign-in flows). */}
          <Link
            href="/beautician/signup"
            className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-full bg-brand text-bg px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider hover:brightness-105 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            List
          </Link>
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-black/55">
            Beauticians in
          </div>
          <div className="text-[20px] font-black text-black mt-0.5">
            {cityLabel} City
          </div>
          <div className="text-[12px] text-black/70 mt-1 max-w-md mx-auto leading-snug">
            Makeup, nail art, hair — home visits and hotel-room calls across {cityLabel}.
          </div>
        </div>

        {/* Category filter — 4 primary toggles in one line + yellow burger
            on the right that reveals the rest. No horizontal scroll. */}
        <div className="mb-2">
          <div className="flex items-center gap-1.5">
            {PRIMARY_CATEGORIES.map((opt) => {
              const active = opt.id === 'all' ? category === null : category === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setCategory(opt.id === 'all' ? null : opt.id)}
                  className={`flex-1 px-2 py-2 rounded-full text-[11px] font-extrabold uppercase tracking-wider border transition truncate ${
                    active
                      ? 'bg-brand text-bg border-brand'
                      : 'bg-gray-100 text-black/80 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-label={moreOpen ? 'Hide other categories' : 'More categories'}
              aria-expanded={moreOpen}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-brand text-bg border border-brand active:scale-[0.96] transition"
            >
              <Menu className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
          {moreOpen && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SECONDARY_IDS.map((sid) => {
                const label = BEAUTICIAN_SERVICES_OFFERED.find((s) => s.id === sid)?.label ?? sid
                const active = category === sid
                return (
                  <button
                    key={sid}
                    onClick={() => { setCategory(active ? null : sid); setMoreOpen(false) }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border transition ${
                      active
                        ? 'bg-brand text-bg border-brand'
                        : 'bg-gray-100 text-black/80 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>


        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {[0,1,2,3].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : providers.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center text-white/85 text-[13px] mt-6"
            style={{
              background: '#1E3A8A',
              border: '1px solid rgba(250,204,21,0.45)',
            }}
          >
            No beauticians listed in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {providers.map((p) => (
              <ProviderCard key={p.slug} provider={p} />
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
          <div className="text-[13px] font-bold text-white/85 mb-3">Are you a beautician?</div>
          <Link href="/beautician/signup" className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider hover:brightness-105">
            List your profile · Rp 38.000/month
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ProviderCard({ provider: p }: { provider: BeauticianProviderPublic }) {
  // Marketplace cards use the CityRiders brand yellow uniformly for
  // every beautician — keeps the listing grid coherent under the
  // platform brand. Each beautician's personal theme_color still
  // drives their own /beautician/[slug] profile page so individual
  // identity colors live there, not on the marketplace listing.
  return <ProviderCardViaUniversal provider={p} />
}

// Adapter — folds the BeauticianProviderPublic shape into the generic
// UniversalProviderCard props. Keeps the per-vertical data prep here
// so the shared component stays "dumb" / vertical-agnostic.
function ProviderCardViaUniversal({ provider: p }: { provider: BeauticianProviderPublic }) {
  const theme = '#FACC15'

  const cats: BeauticianServiceOffered[] = (() => {
    if (p.marketplace_categories && p.marketplace_categories.length > 0) {
      return p.marketplace_categories as BeauticianServiceOffered[]
    }
    const fallback: BeauticianServiceOffered[] = []
    if (p.price_makeup_idr != null) fallback.push('makeup')
    if (p.price_nail_idr   != null) fallback.push('nails')
    if (p.price_hair_idr   != null) fallback.push('hair')
    return fallback
  })()
  const primary   = cats[0]
  const mainLabel = primary
    ? BEAUTICIAN_SERVICES_OFFERED.find((s) => s.id === primary)?.label ?? primary
    : null

  // Up to 3 thumbnails for the mini portfolio strip — prefer primary
  // category, fall back to whatever else has data.
  const sp = p.service_photos ?? {}
  const portfolioThumbs: string[] = (() => {
    const out: string[] = []
    if (primary && Array.isArray(sp[primary])) {
      for (const item of sp[primary] ?? []) {
        if (out.length >= 3) break
        const url = typeof item === 'string' ? item : (item as { url?: string })?.url
        if (url) out.push(url)
      }
    }
    if (out.length < 3) {
      for (const arr of Object.values(sp)) {
        if (!Array.isArray(arr)) continue
        for (const item of arr) {
          if (out.length >= 3) break
          const url = typeof item === 'string' ? item : (item as { url?: string })?.url
          if (url && !out.includes(url)) out.push(url)
        }
        if (out.length >= 3) break
      }
    }
    return out
  })()

  // Location icons — same filter rule as the profile hero.
  const locs = new Set(p.service_locations ?? [])
  const bottomItems: UniversalProviderCardBottomItem[] = []
  if (locs.has('home'))  bottomItems.push({ key: 'home',  icon: 'home',  label: 'Home' })
  if (locs.has('hotel')) bottomItems.push({ key: 'hotel', icon: 'hotel', label: 'Hotel' })
  if (locs.has('villa')) bottomItems.push({ key: 'villa', icon: 'villa', label: 'Villa' })

  const eff = effectiveAvailability(p)

  return (
    <UniversalProviderCard
      href={`/beautician/${p.slug}`}
      displayName={p.display_name}
      city={p.city ?? null}
      subline={`Time ${todayHoursLabel(p.operating_hours) ?? 'By appointment'}`}
      bio={p.bio?.replace(/\s*\n\s*/g, ' ') ?? null}
      coverImageUrl={p.cover_image_url ?? null}
      profileImageUrl={p.profile_image_url ?? null}
      availabilityDot={eff}
      rating={p.rating ?? null}
      specialtyLabel={mainLabel}
      portfolioThumbs={portfolioThumbs}
      themeColor={theme}
      bottomItems={bottomItems}
      ctaLabel="Profile"
      variant="light"
    />
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  // White marketplace surface — matches /handyman. Brand wordmark
  // pinned top-left as the only header chrome.
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
