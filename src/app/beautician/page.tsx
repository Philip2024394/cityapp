'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Menu, Plus, User } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
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
          <div className="text-[11px] uppercase tracking-[0.18em] font-extrabold text-ink/55">
            Beauticians in
          </div>
          <div className="text-[20px] font-black text-ink mt-0.5">
            {cityLabel} City
          </div>
          <div className="text-[12px] text-ink/70 mt-1 max-w-md mx-auto leading-snug">
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
                      : 'bg-black/60 text-ink/80 border-white/15 hover:bg-white/5'
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
                        : 'bg-black/60 text-ink/80 border-white/15 hover:bg-white/5'
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
            {[0,1,2,3].map((i) => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : providers.length === 0 ? (
          <div className="rounded-2xl bg-black/85 border border-white/10 p-8 text-center text-ink/65 text-[13px] mt-6">
            No beauticians listed in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {providers.map((p) => (
              <ProviderCard key={p.slug} provider={p} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-black/85 border border-white/10 p-5 text-center">
          <div className="text-[13px] font-bold text-ink/80 mb-3">Are you a beautician?</div>
          <Link href="/beautician/signup" className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider hover:brightness-105">
            List your profile · Rp 38.000/month
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ProviderCard({ provider: p }: { provider: BeauticianProviderPublic }) {
  // Category badges replace the old black price tiles. Source order:
  // primary marketplace_categories (mig 0077) first; if empty fall back
  // to whatever legacy price columns are set.
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

  const body = (
    <div
      className="p-4 relative overflow-hidden rounded-2xl cursor-pointer hover:-translate-y-0.5 transition"
      style={{
        backgroundImage: `url('${BEAUTY_CARD_BG}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      }}
    >

      <div className="flex items-start gap-3 mb-3">
        <div className="relative shrink-0">
          {p.profile_image_url
            ? <img
                src={p.profile_image_url}
                alt={p.display_name}
                className="w-14 h-14 rounded-2xl object-cover bg-white/5"
                style={{
                  border: '2px solid #FACC15',
                  boxShadow: '0 0 0 2px rgba(250,204,21,0.25), 0 2px 8px rgba(0,0,0,0.35)',
                }}
              />
            : <div
                className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-[20px] font-black"
                style={{
                  color: '#0A0A0A',
                  border: '2px solid #FACC15',
                  boxShadow: '0 0 0 2px rgba(250,204,21,0.25), 0 2px 8px rgba(0,0,0,0.35)',
                }}
              >{p.display_name[0]}</div>}
          {/* Availability dot at lower-right of the avatar. Auto-busy
              when stored=online but current time is outside today's
              operating_hours. Two concentric green rings ping when truly
              online; busy/offline shows a solid orange dot. */}
          {(() => {
            const eff = effectiveAvailability(p)
            return (
              <span
                aria-label={eff === 'online' ? 'Online · available' : 'Busy / outside hours'}
                className="absolute -bottom-1 -right-1"
                style={{ width: 14, height: 14 }}
              >
                {eff === 'online' && (
                  <>
                    <span aria-hidden className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: 'rgba(34,197,94,0.55)', animationDuration: '1.6s' }} />
                    <span aria-hidden className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: 'rgba(34,197,94,0.75)', animationDuration: '1s' }} />
                  </>
                )}
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: eff === 'online' ? '#22C55E' : '#F97316',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  }}
                />
              </span>
            )
          })()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-extrabold truncate leading-tight" style={{ color: '#0A0A0A' }}>{p.display_name}</div>
          {p.city && (
            <div className="text-[13px] truncate mt-1" style={{ color: '#374151' }}>
              {p.city}
            </div>
          )}
          {/* Always render the time line — shows today's hours when set,
              otherwise an honest "By appointment" fallback. */}
          <div className="text-[12px] font-semibold truncate mt-0.5" style={{ color: '#6B7280' }}>
            Time {todayHoursLabel(p.operating_hours) ?? 'By appointment'}
          </div>
        </div>

        {/* Primary category image on the right of the name block.
            Renders the first item in marketplace_categories that has
            a brand image; falls back to nothing. */}
        {(() => {
          const primary = cats.find((c) => CATEGORY_IMAGES[c])
          if (!primary) return null
          const label = BEAUTICIAN_SERVICES_OFFERED.find((s) => s.id === primary)?.label ?? primary
          return (
            <img
              src={CATEGORY_IMAGES[primary]}
              alt={label}
              title={label}
              className="w-[56px] h-[56px] object-contain shrink-0 self-center"
            />
          )
        })()}
      </div>

      <p
        className="text-[13px] mb-3 leading-snug"
        style={{
          color: '#4B5563',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >{p.bio}</p>

      {/* Bottom row — rate text on the LEFT (no star icon), Profile
          button on the RIGHT. */}
      <div className="flex items-center justify-between gap-3">
        {p.rating != null && p.rating > 0 ? (
          <div className="text-[13px] font-extrabold text-black truncate">
            {p.rating.toFixed(1)}
            <span className="text-[12px] text-gray-500 font-semibold ml-1">
              ({p.rating_count ?? 0} {(p.rating_count ?? 0) === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        ) : <span /> }

        <Link
          href={`/beautician/${p.slug}`}
          aria-label={`View profile of ${p.display_name}`}
          className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shrink-0 hover:brightness-110 transition"
          style={{
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            border: '2px solid #FFFFFF',
            boxShadow: '0 4px 14px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <User className="w-3.5 h-3.5" strokeWidth={2.5} />
          Profile
        </Link>
      </div>
    </div>
  )

  // Card itself is NOT a Link (would nest <a> inside the inner Profile
  // <Link>, causing a hydration error). The explicit Profile button is
  // the only navigation affordance.
  return body
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen text-ink">
      <AppNav />
      {children}
    </main>
  )
}
