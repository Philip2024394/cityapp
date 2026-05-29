'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
  MapPin,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react'
import { useHaptic } from '@/hooks/useHaptic'

// ============================================================================
// PropertyBrowser — white-card client island for /property.
// Mirrors PlacesBrowser visually (mig 2026-05-27): rounded-3xl white card,
// title row + List CTA, search input, chip rail (Sales / Rental / Builder),
// landscape row cards. Tap a card → /property/[slug].
// ============================================================================

export type PropertyListingType = 'all' | 'for_sale' | 'for_rent' | 'new_construction'

export type PropertyRow = {
  id:             string
  slug:           string
  display_name:   string | null
  business_name:  string | null
  listing_type:   'for_sale' | 'for_rent' | 'new_construction'
  property_type:  string
  city:           string
  cover_image_url:     string | null
  image_urls:          string[] | null
  gallery_image_urls:  string[] | null
  price_idr:           number | null
  monthly_rent_idr:    number | null
  starting_price_idr:  number | null
  bedrooms:            number | null
  building_size_sqm:   number | null
}

export type PropertyChipDef = { id: PropertyListingType; label: string }

const CHIPS: ReadonlyArray<PropertyChipDef> = [
  { id: 'all',              label: 'All' },
  { id: 'for_sale',         label: 'Sales' },
  { id: 'for_rent',         label: 'Rental' },
  { id: 'new_construction', label: 'Builder' },
]

function placeholderRating(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h) + id.charCodeAt(i)
    h |= 0
  }
  return 4.3 + ((Math.abs(h) % 70) / 100)
}

function idr(n: number | null | undefined): string {
  if (n == null) return '—'
  return 'Rp ' + n.toLocaleString('id-ID')
}

function priceLabel(r: PropertyRow): string {
  switch (r.listing_type) {
    case 'for_sale':         return `${idr(r.price_idr)} · Sale`
    case 'for_rent':         return `${idr(r.monthly_rent_idr)} / mo`
    case 'new_construction': return `From ${idr(r.starting_price_idr)}`
  }
}

function typeLabel(r: PropertyRow): string {
  const cap = r.property_type.charAt(0).toUpperCase() + r.property_type.slice(1)
  return cap
}

function listingBadge(t: PropertyRow['listing_type']): string {
  switch (t) {
    case 'for_sale':         return 'Sale'
    case 'for_rent':         return 'Rent'
    case 'new_construction': return 'Builder'
  }
}

export default function PropertyBrowser({
  listings,
  currentCityLabel,
}: {
  listings: PropertyRow[]
  currentCityLabel: string
}) {
  const router = useRouter()
  const haptic = useHaptic()
  const [query,  setQuery]  = useState('')
  const [filter, setFilter] = useState<PropertyListingType>('all')

  const filtered = useMemo(() => {
    const base = filter === 'all' ? listings : listings.filter((r) => r.listing_type === filter)
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter((r) => {
      const name = (r.business_name ?? r.display_name ?? r.slug).toLowerCase()
      return (
        name.includes(q) ||
        r.property_type.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q)
      )
    })
  }, [listings, filter, query])

  function handleOpen(slug: string) {
    haptic.tap()
    router.push(`/property/${slug}`)
  }

  return (
    <div
      className="mx-auto bg-white rounded-3xl shadow-2xl w-full overflow-hidden"
      style={{
        maxWidth: 640,
        boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.04)',
      }}
    >
      <div className="flex flex-col p-4 sm:p-5">
        {/* ROW 1 — Header bar: title + small "List" yellow pill */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-black tracking-tight text-bg leading-tight">
              Property in {currentCityLabel}
            </h1>
            <p className="text-[12px] font-bold text-[#71717A] leading-tight mt-0.5 truncate">
              Sales · Rentals · New construction
            </p>
          </div>
          <Link
            href="/dashboard/property-sale"
            onClick={() => haptic.tap()}
            aria-label="List your property"
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
            placeholder="Search property — villa, apartment, area…"
            aria-label="Search property by name, type, or city"
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

        {/* ROW 3 — Chip filter (Sales / Rental / Builder) */}
        <div
          className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto overscroll-contain shrink-0"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          role="tablist"
          aria-label="Filter property by listing type"
        >
          {CHIPS.map((chip) => {
            const active = filter === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => { setFilter(chip.id); haptic.tap() }}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-extrabold tracking-tight transition active:scale-95"
                style={{
                  background: active ? '#FACC15' : '#F4F4F5',
                  color:      active ? '#0A0A0A' : '#52525B',
                  border:     active ? '1px solid #FACC15' : '1px solid #E4E4E7',
                  boxShadow:  active ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
                  minHeight: 34,
                  whiteSpace: 'nowrap',
                }}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* ROW 4 — Card list */}
        <div
          className="mt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 -mx-1 px-1"
          style={{ maxHeight: '62vh', scrollbarWidth: 'thin' }}
        >
          {filtered.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[13px] font-bold text-[#71717A] leading-snug">
                {query.trim()
                  ? `No results for "${query.trim()}". Try a different keyword.`
                  : 'No listings in this filter yet. Try All.'}
              </p>
            </div>
          )}
          {filtered.map((r) => (
            <PropertyRowCard
              key={r.id}
              row={r}
              onOpen={() => handleOpen(r.slug)}
            />
          ))}
        </div>

        {/* ROW 5 — Compliance disclaimer (matches /food, /places) */}
        <p className="mt-3 text-center text-[11px] text-[#52525B] font-bold leading-snug px-2 shrink-0">
          Self-listed property · Kita2u is a software directory. Verify SHM / HGB
          certificates independently at the local BPN office.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Landscape row card — same shape as PlaceRowCard.
// ─────────────────────────────────────────────────────────────────────────
function PropertyRowCard({
  row,
  onOpen,
}: {
  row: PropertyRow
  onOpen: () => void
}) {
  const rating = placeholderRating(row.id).toFixed(1)
  const cover  = row.cover_image_url
    || row.gallery_image_urls?.[0]
    || row.image_urls?.[0]
    || null
  const title  = row.business_name ?? row.display_name ?? row.slug
  const meta   = `${typeLabel(row)} · ${row.city}`
  const sizeLabel = row.building_size_sqm != null ? `${row.building_size_sqm} m²` : ''
  const bedLabel  = row.bedrooms != null ? `${row.bedrooms} BR` : ''
  const subBits = [sizeLabel, bedLabel].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${title}`}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#FACC15] active:scale-[0.99] transition"
      style={{
        minHeight: 92,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {/* Image — 72px square */}
      <div className="shrink-0 rounded-lg overflow-hidden bg-[#F4F4F5] relative" style={{ width: 72, height: 72 }}>
        {cover ? (
          <img src={cover} alt="" className="block w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#A1A1AA] text-[10px] font-bold">
            no photo
          </div>
        )}
        <span
          className="absolute bottom-0.5 left-0.5 px-1 py-[1px] rounded text-[8px] font-extrabold uppercase tracking-wider"
          style={{ background: '#FACC15', color: '#0A0A0A' }}
        >
          {listingBadge(row.listing_type)}
        </span>
      </div>

      {/* Middle column */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <span className="text-[14px] font-black text-bg truncate leading-tight flex-1">
            {title}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-[#52525B] leading-tight">
          <span className="truncate">{meta}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-extrabold text-[#0A0A0A]">
          <span className="truncate">{priceLabel(row)}</span>
          {subBits && (
            <>
              <span className="text-[#A1A1AA]">·</span>
              <span className="text-[#52525B] font-bold inline-flex items-center gap-0.5">
                <MapPin className="w-3 h-3" strokeWidth={2.5} aria-hidden />
                {subBits}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right column — rating + chevron */}
      <div className="shrink-0 flex flex-col items-end justify-between h-[72px] py-0.5">
        <span className="inline-flex items-center gap-0.5 text-[12px] font-extrabold text-bg">
          <Star className="w-3 h-3" strokeWidth={2.5} fill="#FACC15" style={{ color: '#FACC15' }} aria-hidden />
          {rating}
        </span>
        <ChevronRight className="w-4 h-4 text-[#A1A1AA]" strokeWidth={2.5} aria-hidden />
      </div>
    </button>
  )
}
