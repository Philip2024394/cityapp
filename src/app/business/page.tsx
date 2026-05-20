'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Briefcase, FileText, ShoppingBasket, Layers, MapPin, MessageCircle, Star, Search, Trophy, Eye, X as XIcon } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { fetchActiveDriversBrowser } from '@/lib/drivers/queries'
import { presenceLabel } from '@/lib/drivers/presence'
import { getBikeImageUrl } from '@/data/bikeImages'
import { MOCK_RIDERS } from '@/data/mockRiders'
import type { Rider } from '@/types/rider'

// ============================================================================
// /business — public directory of drivers available for B2B contracts.
// ----------------------------------------------------------------------------
// Audience: small business owners — Shopee/TikTok sellers needing daily
// parcel runs, restaurants wanting a captain driver, warungs/grocery
// shops, document couriers for clinics + offices.
//
// Same legal posture as /cari/rider:
//   - Drivers self-listed (opted in via dashboard toggle)
//   - Business contacts driver directly on WhatsApp
//   - No contract storage, no payment routing, no commission
//   - City Rider is a directory + facilitator
//
// Honest density at launch — if only 3 drivers in Yogya are opted in,
// the page says "3 drivers available". Don't fake the supply.
// ============================================================================

// Service tags shown as filter chips + on each driver card. Parcels +
// Restaurant tags were removed — every driver on /business is implicitly
// a parcel courier, so the chip was noise; restaurant captain work is
// folded into "batched" + "groceries" + custom notes instead.
type ServiceTag = 'documents' | 'groceries' | 'batched'

const SERVICE_META: Record<ServiceTag, { label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; color: string }> = {
  documents:  { label: 'Documents',       icon: FileText,       color: '#60A5FA' },
  groceries:  { label: 'Groceries',       icon: ShoppingBasket, color: '#22C55E' },
  batched:    { label: 'Batched routes',  icon: Layers,         color: '#A855F7' },
}

const ALL_SERVICES: ReadonlyArray<ServiceTag> = ['documents', 'groceries', 'batched']

// Week-1 safety gate — when the env var is 'false' (or unset), every
// opted-in driver appears as Standard regardless of computed tier. Lets
// you watch scoring land on real data before any driver gets demoted.
const TIER_ENFORCEMENT_ACTIVE = process.env.NEXT_PUBLIC_B2B_TIER_ENFORCEMENT === 'true'

// Dev gate — when running locally we merge the demo B2B drivers from
// MOCK_RIDERS so the page has content even before any real driver has
// opted in. Production builds strip this so business owners only ever
// see real contactable drivers.
const IS_DEV = process.env.NODE_ENV !== 'production'

export default function BusinessDirectoryPage() {
  const [drivers, setDrivers] = useState<Rider[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<ServiceTag | 'all'>('all')
  const [cityFilter, setCityFilter] = useState<string | null>(null)
  const [showAllTiers, setShowAllTiers] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchActiveDriversBrowser().then((list) => {
      if (cancelled) return
      // Dev-only: merge mock B2B drivers from MOCK_RIDERS so the page
      // has visible content before any real driver opts in. Dedupe on
      // id so we don't double-render anything that exists in both.
      let combined = list
      if (IS_DEV) {
        const mockB2b = MOCK_RIDERS.filter((d) => d.businessContractEnabled === true)
        const existing = new Set(list.map((d) => d.id))
        const additions = mockB2b.filter((d) => !existing.has(d.id))
        combined = [...list, ...additions]
      }
      setDrivers(combined)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  // Only show drivers who explicitly opted in.
  const businessDrivers = useMemo(() => {
    return drivers.filter((d) => d.businessContractEnabled === true)
  }, [drivers])

  const cities = useMemo(() => {
    const s = new Set<string>()
    for (const d of businessDrivers) if (d.city) s.add(d.city)
    return Array.from(s).sort()
  }, [businessDrivers])

  const filtered = useMemo(() => {
    return businessDrivers
      .filter((d) => {
        if (cityFilter && d.city !== cityFilter) return false
        if (filter !== 'all' && !(d.businessServices ?? []).includes(filter)) return false
        if (TIER_ENFORCEMENT_ACTIVE) {
          const tier = d.b2bTier ?? 'standard'
          if (tier === 'removed') return false
          if (tier === 'hidden' && !showAllTiers) return false
        }
        return true
      })
      // Order: top tier first, then by score desc within each tier.
      .sort((a, b) => {
        const tierRank = (t: string | null | undefined) =>
          t === 'top' ? 0 : t === 'standard' ? 1 : t === 'hidden' ? 2 : 3
        const tDelta = tierRank(a.b2bTier) - tierRank(b.b2bTier)
        if (tDelta !== 0) return tDelta
        return (b.b2bScore ?? 0) - (a.b2bScore ?? 0)
      })
  }, [businessDrivers, filter, cityFilter, showAllTiers])

  const hiddenCount = useMemo(() => {
    if (!TIER_ENFORCEMENT_ACTIVE) return 0
    return businessDrivers.filter((d) => {
      if (cityFilter && d.city !== cityFilter) return false
      if (filter !== 'all' && !(d.businessServices ?? []).includes(filter)) return false
      return (d.b2bTier ?? 'standard') === 'hidden'
    }).length
  }, [businessDrivers, filter, cityFilter])

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-20">
        <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">

          {/* Hero — frames the value clearly for a business owner */}
          <header className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(250,204,21,0.10)', border: '1px solid rgba(250,204,21,0.25)' }}>
              <Briefcase className="w-3.5 h-3.5 text-brand" />
              <span className="text-[12px] font-extrabold uppercase tracking-wider text-brand">
                Business directory
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[32px] font-extrabold leading-tight">
              Find a driver for <span className="gradient-text">regular contracts</span>
            </h1>
            <p className="text-[14px] text-muted leading-relaxed max-w-xl">
              Shopee / TikTok sellers, restaurants, warungs, document couriers — message
              independent drivers directly on WhatsApp to negotiate daily parcel runs,
              restaurant captain partnerships, or batched delivery routes. No commission,
              no platform fee.
            </p>
          </header>

          {/* Honest density chip + city search */}
          <div className="card-dark p-3 space-y-3">
            <div className="text-[13px] font-bold">
              <span className="text-brand">{filtered.length}</span> {filtered.length === 1 ? 'driver' : 'drivers'} available for contracts
              {cityFilter && <> in <span className="text-ink">{cityFilter}</span></>}
            </div>

            {/* City search — typeahead with autocomplete from the cities
                we actually have drivers in. Scales as Indonesia coverage
                grows; no horizontal-scroll chip overflow. */}
            {cities.length > 1 && (
              <CitySearch
                cities={cities}
                value={cityFilter}
                onChange={setCityFilter}
              />
            )}
          </div>

          {/* Empty / loading / results */}
          {!loaded && (
            <div className="card-dark h-32 shimmer" />
          )}

          {loaded && filtered.length === 0 && (
            <div className="card-dark p-8 text-center space-y-3">
              <Search className="w-8 h-8 text-muted mx-auto" />
              <div className="font-extrabold text-[15px]">No drivers match yet</div>
              <p className="text-[13px] text-muted leading-relaxed max-w-xs mx-auto">
                {businessDrivers.length === 0
                  ? 'Drivers are opting in. Check back soon — or share the link with any rider you know.'
                  : 'Try removing the city or service filter.'}
              </p>
            </div>
          )}

          {loaded && filtered.length > 0 && (
            <div className="space-y-3">
              {/* City header — appears above the first card whenever a
                  city filter is active. Keeps the search context visible
                  while the buyer scrolls a long list. */}
              {cityFilter && (
                <div className="flex items-baseline gap-2 px-1 pt-1">
                  <h2 className="text-[18px] font-extrabold leading-tight">
                    Drivers <span className="gradient-text">{cityFilter}</span>
                  </h2>
                  <span className="text-[12px] text-muted font-bold">
                    · {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}
                  </span>
                </div>
              )}
              {filtered.map((d) => (
                <BusinessDriverCard key={d.id} driver={d} />
              ))}
            </div>
          )}

          {/* Show-all toggle — only renders when there are hidden drivers
              to reveal AND tier enforcement is on. Honest count. */}
          {TIER_ENFORCEMENT_ACTIVE && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllTiers((v) => !v)}
              className="w-full card-dark p-3 flex items-center justify-center gap-2 text-[13px] font-bold active:scale-[0.99] transition"
              style={{ minHeight: 44 }}
            >
              <Eye className="w-4 h-4 text-muted" strokeWidth={2.25} />
              {showAllTiers
                ? `Hide ${hiddenCount} lower-tier driver${hiddenCount === 1 ? '' : 's'}`
                : `Show ${hiddenCount} more driver${hiddenCount === 1 ? '' : 's'} (lower tier)`}
            </button>
          )}

          {/* Honest legal footer */}
          <p className="text-[12px] text-dim leading-relaxed pt-2">
            City Rider is a directory. Drivers are independent operators — terms,
            pricing, and reliability are negotiated directly between you and the
            driver on WhatsApp. We don&apos;t store contracts, broker payments, or
            take commission.{' '}
            <Link href="/legal" className="text-brand hover:underline">Learn how this works</Link>.
          </p>
        </div>
      </main>
    </>
  )
}

// ─── Card ────────────────────────────────────────────────────────────
// Visual clone of FeaturedDriverCard from /cari/rider — same brand art,
// ribbon, avatar+rating overlay, bottom CTA — so the B2B page reads
// native to the rest of the marketplace. Differences vs the rider
// version:
//   - Bottom-left shows capacity instead of per-trip fare
//   - "Book driver" CTA → "Contact" opening B2B WhatsApp template
//   - Top tier gets a gold "Top driver" floating badge

function BusinessDriverCard({ driver }: { driver: Rider }) {
  const isTopTier = TIER_ENFORCEMENT_ACTIVE && driver.b2bTier === 'top'
  const waText = encodeURIComponent(
    `Halo ${driver.name}! Saya tertarik diskusi kontrak rutin lewat City Rider — bisa diskusi rate untuk pengiriman harian saya?`,
  )
  const waLink = driver.whatsappE164
    ? `https://wa.me/${driver.whatsappE164.replace(/[^\d]/g, '')}?text=${waText}`
    : null

  return (
    <article
      className={
        'card card-driver relative overflow-hidden animate-[fadeUp_0.4s_ease-out_both]' +
        (isTopTier ? ' card-driver-cheapest' : '')
      }
    >
      <img
        src="https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2018,%202026,%2001_32_57%20AM.png"
        alt=""
        className="block w-full h-auto"
        loading="lazy"
      />

      {/* Top-tier floating badge */}
      {isTopTier && (
        <div
          className="absolute -top-1 right-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-extrabold"
          style={{
            background: 'linear-gradient(135deg, #FACC15, #EAB308)',
            color: '#0A0A0A',
            border: '1px solid rgba(0,0,0,0.40)',
            boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
          }}
        >
          <Trophy className="w-3 h-3" strokeWidth={2.5} />
          Top driver
        </div>
      )}

      {/* Driver name ribbon — flush top-left edge */}
      <div className="absolute top-0 left-0 z-10 max-w-[60%]">
        <span className="ribbon-cheapest flex items-center min-w-0">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitledasdaaaaaaa-removebg-preview.png"
            alt=""
            className="h-5 w-auto shrink-0"
          />
          <span className="truncate min-w-0">{driver.name}</span>
        </span>
      </div>

      {/* Bike model — plain uppercase in the top-right corner. */}
      <div className="absolute top-3 right-[28px] z-10 text-right max-w-[42%]">
        <div className="text-[14px] font-extrabold text-black leading-tight truncate uppercase tracking-wide">
          {driver.bike.make} {driver.bike.model}
        </div>
        <div className="text-[12px] font-medium text-black/80 leading-tight mt-0.5">
          {driver.bike.year}
        </div>
      </div>

      {/* Avatar + rating chip with frosted scrim — same as customer card */}
      <Link
        href={`/r/${driver.slug}`}
        aria-label={`View ${driver.name}'s profile`}
        className="absolute left-4 top-10 flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-brand/60 rounded-2xl z-10"
      >
        <span className="relative shrink-0">
          <img
            src={driver.photoUrl}
            alt={driver.name}
            className="w-[58px] h-[58px] rounded-2xl object-cover ring-2 ring-white/80"
          />
          <span className="dot-online absolute bottom-1 right-1 ring-2 ring-white" aria-label="Online" />
        </span>
        {driver.rating != null && (
          <span
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[13px] font-bold leading-none"
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 shrink-0" aria-hidden />
            <span className="text-black">{driver.rating.toFixed(1)}</span>
            {driver.trips != null && (
              <span className="text-[12px] text-gray-700 ml-0.5 font-semibold">
                ({driver.trips.toLocaleString('en-US')} trips)
              </span>
            )}
          </span>
        )}
      </Link>

      {/* Bottom info panel — overlays the lower portion of the image.
          Activity time appears as the bold bottom-left headline below;
          the small redundant presence pill that the customer-side card
          uses is removed here since it duplicates the headline. */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none">
        <div className="relative px-3.5 pt-2.5 pb-3 pointer-events-auto">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col leading-none drop-shadow min-w-0">
              <span className="text-[17px] font-extrabold text-gray-700 whitespace-nowrap">
                {presenceLabel(driver.lastSeenAt)}
              </span>
              <span className="mt-1.5 text-[12px] font-bold text-gray-700 whitespace-nowrap">
                {driver.area ? `${driver.area}, ${driver.city}` : driver.city || 'Indonesia'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <img
                src="https://ik.imagekit.io/nepgaxllc/Untitleddaaaaad-removebg-preview.png"
                alt=""
                aria-hidden
                loading="lazy"
                className="h-9 w-auto"
                style={{
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))',
                  transform: 'translateY(-3px)',
                }}
              />
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Contact ${driver.name} for a B2B contract`}
                  className="h-[39px] min-w-[118px] pl-2.5 pr-1 rounded-full flex items-center justify-between gap-1 border border-black active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-brand/60"
                  style={{
                    background: 'linear-gradient(135deg, #0A0A0A 0%, #1F1F1F 100%)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.45)',
                  }}
                >
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                    Contact
                  </span>
                  <span
                    aria-hidden
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                      boxShadow: '0 0 8px rgba(250,204,21,0.55)',
                    }}
                  >
                    <MessageCircle className="w-3 h-3 text-black" strokeWidth={3} />
                  </span>
                </a>
              ) : (
                <button
                  disabled
                  className="h-[39px] min-w-[118px] px-3 rounded-full text-[12px] font-bold text-muted opacity-50 border border-black/30"
                  style={{ background: 'rgba(255,255,255,0.50)' }}
                >
                  No WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── City search ─────────────────────────────────────────────────────
// Typeahead with autocomplete + a "clear" pill when a city is selected.
// Suggestions come from the cities we ACTUALLY have drivers in — so
// the user never picks a city that returns zero results.

function CitySearch({
  cities, value, onChange,
}: {
  cities: string[]
  value: string | null
  onChange: (city: string | null) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close suggestions on outside click.
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // If a city is already picked, show it as a removable chip rather than
  // the search input — keeps the filter state visible and one-tap clearable.
  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-extrabold"
          style={{
            background: 'rgba(250,204,21,0.15)',
            border: '1px solid rgba(250,204,21,0.40)',
            color: '#FACC15',
            minHeight: 40,
          }}
        >
          <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
          {value}
          <button
            type="button"
            onClick={() => { onChange(null); setQuery('') }}
            aria-label="Clear city filter"
            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-brand/20 transition"
          >
            <XIcon className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </span>
        <span className="text-[12px] text-muted">tap × to see all cities</span>
      </div>
    )
  }

  const q = query.toLowerCase().trim()
  const suggestions = q
    ? cities.filter((c) => c.toLowerCase().includes(q)).slice(0, 8)
    : cities.slice(0, 8)

  return (
    <div ref={wrapRef} className="relative">
      <div
        className="flex items-center gap-2 px-3 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.10)'}`,
          minHeight: 44,
        }}
      >
        <Search className="w-4 h-4 text-muted shrink-0" strokeWidth={2.25} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search city — e.g. Yogyakarta, Denpasar, Jakarta"
          className="flex-1 min-w-0 bg-transparent text-[13px] font-bold text-ink placeholder:text-dim focus:outline-none"
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </div>

      {open && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-xl z-20"
          style={{
            background: 'rgba(15,15,20,0.97)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {suggestions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); setQuery(''); setOpen(false) }}
              role="option"
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] font-bold text-ink hover:bg-white/5 transition"
              style={{ minHeight: 44 }}
            >
              <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
              {c}
            </button>
          ))}
        </div>
      )}

      {open && q && suggestions.length === 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-xl p-3 text-[12px] text-muted z-20"
          style={{
            background: 'rgba(15,15,20,0.97)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          No drivers in cities matching &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}

// ─── Filter chip ─────────────────────────────────────────────────────

function FilterChip({
  active, onClick, label, icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-extrabold whitespace-nowrap transition active:scale-95"
      style={{
        background: active ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(250,204,21,0.40)' : 'rgba(255,255,255,0.10)'}`,
        color: active ? '#FACC15' : 'rgba(255,255,255,0.78)',
        minHeight: 36,
      }}
    >
      {icon}
      {label}
    </button>
  )
}
