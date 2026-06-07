'use client'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Plus, Search, Star, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useHaptic } from '@/hooks/useHaptic'
import {
  MASSAGE_TYPE_SHORT,
  type MassageProviderPublic,
  type MassageType,
} from '@/lib/massage/types'

// ============================================================================
// /massage — Marketplace ported to the shared /places + /beautician shell
// (2026-05-28). White wordmark header → centered rounded card → title +
// List pill, search input, scrollable chip filter row, landscape row
// cards. Custom MassageRowCard surfaces modality, duration tiers,
// service-location pills, today's hours, rating, availability dot.
//
// Compliance posture: CityDrivers is a software directory (PM 12/2019).
// Owner-published hours / pricing. No platform commissions.
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

function effectiveAvailability(p: MassageProviderPublic): 'online' | 'busy' | 'offline' {
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

// Deterministic placeholder rating per provider (4.3 – 4.9). Used only
// when the row has no real rating yet.
function placeholderRating(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i)
    h |= 0
  }
  return 4.3 + ((Math.abs(h) % 70) / 100)
}

// Duration tier summary — "60 / 90 / 120 min" if all three are priced,
// otherwise just the ones that exist. Returns null when no tiers.
function durationTiersLabel(p: MassageProviderPublic): string | null {
  const tiers: number[] = []
  if (typeof p.price_60min_idr  === 'number' && p.price_60min_idr  > 0) tiers.push(60)
  if (typeof p.price_90min_idr  === 'number' && p.price_90min_idr  > 0) tiers.push(90)
  if (typeof p.price_120min_idr === 'number' && p.price_120min_idr > 0) tiers.push(120)
  if (tiers.length === 0) return null
  return `${tiers.join(' / ')} min`
}

type ChipDef = { id: 'all' | MassageType; label: string }
const PRIMARY_CHIPS: ChipDef[] = [
  { id: 'all',         label: 'All'         },
  { id: 'balinese',    label: 'Pijat Bali'  },
  { id: 'deep_tissue', label: 'Deep Tissue' },
  { id: 'refleksi',    label: 'Refleksi'    },
]
const SECONDARY_IDS: MassageType[] = [
  'javanese','pijat_tradisional','lulur','thai','shiatsu','tui_na',
  'swedish','sports','aromatherapy','hot_stone','trigger_point',
  'lymphatic','prenatal','myofascial',
]

export default function MassageMarketplacePage() {
  return (
    <Suspense fallback={<Shell><div className="px-4 pt-6 text-[#71717A] text-[13px]">Loading…</div></Shell>}>
      <MarketplaceInner />
    </Suspense>
  )
}

function MarketplaceInner() {
  const router  = useRouter()
  const t       = useTranslations('verticals.massage')
  const tCommon = useTranslations('verticals.common')
  const haptic  = useHaptic()
  const search  = useSearchParams()
  const cityLabel = search?.get('city')?.trim() || 'Yogyakarta'
  const initialGender = (search?.get('gender') === 'man' ? 'man'
                       : search?.get('gender') === 'woman' ? 'woman'
                       : 'all') as 'all' | 'woman' | 'man'

  const [providers, setProviders] = useState<MassageProviderPublic[]>([])
  const [gender] = useState<'all' | 'woman' | 'man'>(initialGender)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<MassageType | null>(null)
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return providers.filter((p) => {
      if (category && p.massage_type !== category) return false
      if (!q) return true
      const name = p.display_name?.toLowerCase() ?? ''
      const city = p.city?.toLowerCase() ?? ''
      const bio  = p.bio?.toLowerCase() ?? ''
      const type = (MASSAGE_TYPE_SHORT[p.massage_type] ?? p.massage_type).toLowerCase()
      return name.includes(q) || city.includes(q) || bio.includes(q) || type.includes(q)
    })
  }, [providers, query, category])

  function handleOpen(slug: string) {
    haptic.tap()
    router.push(`/massage/${slug}`)
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
                  {t('title', { city: cityLabel })}
                </h1>
                <p className="text-[12px] font-bold text-[#71717A] leading-tight mt-0.5 truncate">
                  {t('subtitle', { city: cityLabel })}
                </p>
              </div>
              <Link
                href="/signup?vertical=massage"
                onClick={() => haptic.tap()}
                aria-label={t('listAria')}
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
                <span>{tCommon('listCta')}</span>
              </Link>
            </div>

            {/* ROW 2 — Search input */}
            <div className="mt-3 relative shrink-0">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchAria')}
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

            {/* ROW 3 — Horizontal scrollable modality chip row */}
            <div
              className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto overscroll-contain shrink-0"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              role="tablist"
              aria-label="Filter therapists by modality"
            >
              {PRIMARY_CHIPS.map((chip) => {
                const active = chip.id === 'all' ? category === null : category === chip.id
                return (
                  <ChipButton
                    key={chip.id}
                    label={chip.label}
                    active={active}
                    onClick={() => { setCategory(chip.id === 'all' ? null : (chip.id as MassageType)); haptic.tap() }}
                  />
                )
              })}
              {SECONDARY_IDS.map((sid) => {
                const label = MASSAGE_TYPE_SHORT[sid] ?? sid
                const active = category === sid
                return (
                  <ChipButton
                    key={sid}
                    label={label}
                    active={active}
                    onClick={() => { setCategory(active ? null : sid); haptic.tap() }}
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
                      : 'No therapists in this modality yet. Try a different filter.'}
                  </p>
                </div>
              )}
              {!loading && filtered.map((p) => (
                <MassageRowCard
                  key={p.slug}
                  provider={p}
                  onOpen={() => handleOpen(p.slug)}
                />
              ))}
            </div>

            {/* ROW 5 — Positive footer */}
            <p className="mt-3 text-center text-[12px] text-[#52525B] font-bold leading-snug px-2 shrink-0">
              Book direct via WhatsApp · No commissions, no platform fees
              — you pay your therapist directly.
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
// MassageRowCard — landscape card matching /beautician (minHeight 112,
// 88px image). Middle column surfaces: name, primary modality + duration
// tiers, availability dot, service-location pills (Home / Hotel / Villa /
// Spa). Right column: star rating + yellow chevron.
// ─────────────────────────────────────────────────────────────────────────────
function MassageRowCard({
  provider: p,
  onOpen,
}: {
  provider: MassageProviderPublic
  onOpen: () => void
}) {
  const eff       = effectiveAvailability(p)
  const rating    = (p.rating ?? placeholderRating(p.slug)).toFixed(1)
  const hours     = todayHoursLabel(p.operating_hours)
  const modality  = MASSAGE_TYPE_SHORT[p.massage_type] ?? p.massage_type
  const tiers     = durationTiersLabel(p)

  // Service-location pills — Home / Hotel / Villa, plus Spa when the
  // therapist also runs a physical studio. Mirrors /beautician logic.
  const locs = new Set(p.service_locations ?? [])
  const pills: Array<{ key: string; label: string }> = []
  if (p.has_physical_location && locs.size === 0) {
    pills.push({ key: 'spa', label: 'Spa Center' })
  } else {
    if (locs.has('home'))  pills.push({ key: 'home',  label: 'Home'  })
    if (locs.has('hotel')) pills.push({ key: 'hotel', label: 'Hotel' })
    if (locs.has('villa')) pills.push({ key: 'villa', label: 'Villa' })
    if (p.has_physical_location) {
      pills.push({ key: 'spa', label: 'Spa' })
    }
  }

  const profileImg = p.profile_image_url || p.cover_image_url || null
  const dotColor   = eff === 'online' ? '#22C55E' : eff === 'busy' ? '#F59E0B' : '#A1A1AA'
  const dotText    = eff === 'online' ? '#15803D' : eff === 'busy' ? '#A16207' : '#71717A'
  const dotLabel   = eff === 'online' ? 'Online'  : eff === 'busy' ? 'Busy'    : 'Offline'

  // Subline: modality · duration tiers · today's hours (each optional).
  const sublineBits: string[] = []
  if (modality) sublineBits.push(modality)
  if (tiers)    sublineBits.push(tiers)
  if (hours)    sublineBits.push(hours)

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
        {sublineBits.length > 0 && (
          <div className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-[#52525B] leading-tight">
            {sublineBits.map((bit, idx) => (
              <span key={idx} className="flex items-center gap-1.5 min-w-0">
                {idx > 0 && <span className="text-[#A1A1AA] shrink-0">·</span>}
                <span className="truncate">{bit}</span>
              </span>
            ))}
          </div>
        )}
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
        {pills.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
            {pills.slice(0, 3).map((pill) => (
              <span
                key={pill.key}
                className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 bg-[#FEF9C3] border border-[#FDE68A] text-[#854D0E] text-[12px] font-extrabold leading-none whitespace-nowrap"
              >
                {pill.label}
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
// Shell — wordmark header matching /places + /beautician.
// ─────────────────────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="relative min-h-[100dvh]"
      style={{ color: '#0A0A0A' }}
    >
      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            aria-label="Kita2u home"
            className="inline-flex items-center hover:opacity-85 transition"
          >
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              Kita
            </span>
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#FACC15', letterSpacing: '-0.02em' }}
            >
              2u
            </span>
          </Link>
        </div>
      </header>

      {children}
    </main>
  )
}
