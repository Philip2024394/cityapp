'use client'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Plus, Search, Star, X } from 'lucide-react'
import { useHaptic } from '@/hooks/useHaptic'
import type { HomeCleanProviderPublic } from '@/lib/home-clean/types'

// ============================================================================
// /home-clean — Marketplace ported to the /beautician shell (2026-05-28).
// White wordmark header → centered rounded card → title + List pill, search
// input, scrollable chip filter row, landscape row cards.
//
// Compliance posture: IndoCity is a software directory (PM 12/2019). Owner-
// published rates & hours. Customers book direct via WhatsApp.
// ============================================================================

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

function effectiveAvailability(p: HomeCleanProviderPublic): 'online' | 'busy' | 'offline' {
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

// Deterministic placeholder rating per provider (4.3 – 4.9). Used only when
// the row has no real rating yet.
function placeholderRating(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i)
    h |= 0
  }
  return 4.3 + ((Math.abs(h) % 70) / 100)
}

// Chip categories — derived from the data we actually have: pricing tiers
// + free-text service_area_notes keywords (house / apartment / office).
type ChipId = 'all' | 'hourly' | 'daily' | 'house' | 'apartment' | 'office'
type ChipDef = { id: ChipId; label: string }
const CHIPS: ChipDef[] = [
  { id: 'all',       label: 'All'       },
  { id: 'hourly',    label: 'Per-jam'   },
  { id: 'daily',     label: 'Per-hari'  },
  { id: 'house',     label: 'House'     },
  { id: 'apartment', label: 'Apartment' },
  { id: 'office',    label: 'Office'    },
]

// Best-effort service-mode detection from free-text notes + bio. The schema
// has no structured service-mode flag, so we sniff keywords.
function detectServiceModes(p: HomeCleanProviderPublic): Array<'house' | 'apartment' | 'office'> {
  const hay = `${p.service_area_notes ?? ''} ${p.bio ?? ''}`.toLowerCase()
  const modes: Array<'house' | 'apartment' | 'office'> = []
  if (/\b(house|rumah|villa)\b/.test(hay))            modes.push('house')
  if (/\b(apartment|apartemen|apt|kos|kost)\b/.test(hay)) modes.push('apartment')
  if (/\b(office|kantor|workspace)\b/.test(hay))      modes.push('office')
  // If nothing matched, default to House — by far the most common case.
  if (modes.length === 0) modes.push('house')
  return modes
}

export default function HomeCleanMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-[#71717A] text-[13px]">Loading…</div></Shell>}>
      <MarketplaceInner />
    </Suspense>
  )
}

function MarketplaceInner() {
  const router    = useRouter()
  const haptic    = useHaptic()
  const search    = useSearchParams()
  const cityLabel = search?.get('city')?.trim() || 'Yogyakarta'

  const [providers, setProviders] = useState<HomeCleanProviderPublic[]>([])
  const [query, setQuery]         = useState('')
  const [category, setCategory]   = useState<Exclude<ChipId, 'all'> | null>(null)
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (cityLabel.trim()) qs.set('city', cityLabel.trim())
    const r = await fetch(`/api/home-clean/marketplace${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' })
    const j = await r.json() as { providers: HomeCleanProviderPublic[] }
    setProviders(j.providers || [])
    setLoading(false)
  }, [cityLabel])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return providers.filter((p) => {
      // Category filter — pricing tier or service mode.
      if (category) {
        if (category === 'hourly' && p.hourly_rate_idr == null) return false
        if (category === 'daily'  && p.day_rate_idr    == null) return false
        if (category === 'house' || category === 'apartment' || category === 'office') {
          const modes = detectServiceModes(p)
          if (!modes.includes(category)) return false
        }
      }
      if (!q) return true
      const name = p.display_name?.toLowerCase() ?? ''
      const city = p.city?.toLowerCase() ?? ''
      const bio  = p.bio?.toLowerCase() ?? ''
      const notes = p.service_area_notes?.toLowerCase() ?? ''
      return name.includes(q) || city.includes(q) || bio.includes(q) || notes.includes(q)
    })
  }, [providers, query, category])

  function handleOpen(slug: string) {
    haptic.tap()
    router.push(`/home-clean/${slug}`)
  }

  return (
    <Shell>
      <div className="px-[15px] pb-10">
        <div
          className="mx-auto bg-white rounded-3xl shadow-2xl w-full overflow-hidden"
          style={{
            maxWidth: 640,
            boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.04)',
          }}
        >
          <div className="flex flex-col p-4 sm:p-5">
            {/* ROW 1 — Header: title + small "List" yellow pill */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <h1 className="text-[18px] sm:text-[20px] font-black tracking-tight text-bg leading-tight">
                  Cleaners in {cityLabel}
                </h1>
                <p className="text-[12px] font-bold text-[#71717A] leading-tight mt-0.5 truncate">
                  Home cleaners in {cityLabel} · Per-jam · Per-hari · Deep clean
                </p>
              </div>
              <Link
                href="/home-clean/signup"
                onClick={() => haptic.tap()}
                aria-label="List your cleaning service"
                className="shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-bg font-extrabold text-[13px] active:scale-95 transition"
                style={{
                  background: '#FACC15',
                  boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
                  minHeight: 32,
                }}
              >
                <span
                  className="w-5 h-5 rounded-full inline-flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.10)' }}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                <span>List</span>
              </Link>
            </div>

            {/* ROW 2 — Search input */}
            <div className="mt-3 relative shrink-0">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cleaners — name, area, service…"
                aria-label="Search cleaners"
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-bg placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                style={{ minHeight: 44 }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => { setQuery(''); haptic.tap() }}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full inline-flex items-center justify-center text-[#71717A] hover:text-bg transition"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              ) : (
                <span
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center"
                  aria-hidden
                >
                  <Search className="w-[18px] h-[18px] text-[#52525B]" strokeWidth={2.4} />
                </span>
              )}
            </div>

            {/* ROW 3 — Horizontal scrollable category chip row */}
            <div
              className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto overscroll-contain shrink-0"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              role="tablist"
              aria-label="Filter cleaners by category"
            >
              {CHIPS.map((chip) => {
                const active = chip.id === 'all' ? category === null : category === chip.id
                return (
                  <ChipButton
                    key={chip.id}
                    label={chip.label}
                    active={active}
                    onClick={() => {
                      setCategory(chip.id === 'all' ? null : (chip.id as Exclude<ChipId, 'all'>))
                      haptic.tap()
                    }}
                  />
                )
              })}
            </div>

            {/* ROW 4 — Card list */}
            <div
              className="mt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 -mx-1 px-1"
              style={{ maxHeight: '62vh', scrollbarWidth: 'thin' }}
            >
              {loading && (
                <>
                  {[0,1,2,3].map((i) => (
                    <div key={i} className="h-[112px] bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </>
              )}
              {!loading && filtered.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-[13px] font-bold text-[#71717A] leading-snug">
                    {query.trim()
                      ? `No results for "${query.trim()}". Try a different keyword.`
                      : 'No cleaners in this category yet. Try a different filter.'}
                  </p>
                </div>
              )}
              {!loading && filtered.map((p) => (
                <HomeCleanRowCard
                  key={p.slug}
                  provider={p}
                  onOpen={() => handleOpen(p.slug)}
                />
              ))}
            </div>

            {/* ROW 5 — Positive footer copy */}
            <p className="mt-3 text-center text-[12px] text-[#52525B] font-bold leading-snug px-2 shrink-0">
              Book direct via WhatsApp · No commissions, no platform fees
              — you pay your cleaner directly.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function ChipButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-extrabold tracking-tight transition active:scale-95"
      style={{
        background: active ? '#FACC15' : '#F4F4F5',
        color: active ? '#0A0A0A' : '#52525B',
        border: active ? '1px solid #FACC15' : '1px solid #E4E4E7',
        boxShadow: active ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
        minHeight: 34,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeCleanRowCard — landscape card. 88px image left, name + primary
// pricing + hours middle, availability dot + service-mode pills below,
// rating + chevron right. Tracks /beautician's row at minHeight 112.
// ─────────────────────────────────────────────────────────────────────────────
function HomeCleanRowCard({
  provider: p,
  onOpen,
}: {
  provider: HomeCleanProviderPublic
  onOpen: () => void
}) {
  const eff    = effectiveAvailability(p)
  const rating = (p.rating ?? placeholderRating(p.slug)).toFixed(1)
  const hours  = todayHoursLabel(p.operating_hours) ?? 'By appointment'

  // Primary pricing label — surface hourly first (more discoverable), fall
  // back to day rate.
  const primaryPrice = (() => {
    if (p.hourly_rate_idr != null) {
      return `Rp ${p.hourly_rate_idr.toLocaleString('id-ID')}/jam`
    }
    if (p.day_rate_idr != null) {
      return `Rp ${p.day_rate_idr.toLocaleString('id-ID')}/hari`
    }
    return null
  })()

  // Service-mode pills — derived from free-text notes/bio. Max 3 visible.
  const modes = detectServiceModes(p)
  const modeLabel: Record<'house' | 'apartment' | 'office', string> = {
    house:     'House',
    apartment: 'Apartment',
    office:    'Office',
  }

  const profileImg = p.profile_image_url || p.cover_image_url || null
  const dotColor   = eff === 'online' ? '#22C55E' : eff === 'busy' ? '#F59E0B' : '#A1A1AA'
  const dotText    = eff === 'online' ? '#15803D' : eff === 'busy' ? '#A16207' : '#71717A'
  const dotLabel   = eff === 'online' ? 'Online'  : eff === 'busy' ? 'Busy'    : 'Offline'

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${p.display_name}`}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#FACC15] active:scale-[0.99] transition"
      style={{
        minHeight: 112,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {/* Image — 88px square */}
      <div className="shrink-0 rounded-lg overflow-hidden bg-[#F4F4F5]" style={{ width: 88, height: 88 }}>
        {profileImg ? (
          <img
            src={profileImg}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)' }}
            aria-hidden
          >
            <span className="text-bg font-black text-[24px]">
              {p.display_name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        )}
      </div>

      {/* Middle column */}
      <div className="min-w-0 flex-1">
        <span className="block text-[14px] font-black text-bg truncate leading-tight">
          {p.display_name}
        </span>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-[#52525B] leading-tight">
          {primaryPrice && <span className="truncate">{primaryPrice}</span>}
          {primaryPrice && <span className="text-[#A1A1AA]">·</span>}
          <span className="truncate">{hours}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1">
          <span
            className="inline-flex items-center gap-1 text-[12px] font-extrabold"
            style={{ color: dotText }}
          >
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: dotColor,
                boxShadow: eff === 'online' ? '0 0 4px rgba(34,197,94,0.65)' : 'none',
              }}
            />
            {dotLabel}
          </span>
        </div>
        {modes.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
            {modes.slice(0, 3).map((m) => (
              <span
                key={m}
                className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 bg-[#FEF9C3] border border-[#FDE68A] text-[#854D0E] text-[12px] font-extrabold leading-none whitespace-nowrap"
              >
                {modeLabel[m]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right column — rating top, chevron bottom */}
      <div className="shrink-0 flex flex-col items-end justify-between h-[88px] py-0.5">
        <span className="inline-flex items-center gap-0.5 text-[12px] font-extrabold text-bg">
          <Star className="w-3 h-3" strokeWidth={2.5} fill="#FACC15" style={{ color: '#FACC15' }} aria-hidden />
          {rating}
        </span>
        <ChevronRight className="w-5 h-5" strokeWidth={2.75} aria-hidden style={{ color: '#FACC15' }} />
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell — fixed backdrop + soft white top scrim + wordmark header. Mirrors
// /beautician for visual continuity across the directory.
// ─────────────────────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="relative min-h-[100dvh]"
      style={{ color: '#0A0A0A' }}
    >
      {/* Backdrop image — same one used on /beautician + /explore for brand continuity */}
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
      {/* Soft white scrim at the top so the dark wordmark stays readable on any image */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 h-32 -z-10 pointer-events-none bg-gradient-to-b from-white/65 to-transparent"
      />

      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" aria-label="IndoCity home" className="inline-block hover:opacity-85 transition">
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddfsdfsdfs-removebg-preview.png"
              alt="IndoCity"
              className="h-8 sm:h-10 w-auto"
            />
          </Link>
        </div>
      </header>

      {children}
    </main>
  )
}
