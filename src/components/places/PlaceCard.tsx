'use client'
import { ArrowRight, MapPin, Clock, Star } from 'lucide-react'
import PlaceImage from './PlaceImage'
import { categoryMeta } from '@/lib/places/categories'
import { formatDistanceKm, formatEtaMin, type PlaceQuote } from '@/lib/places/pricing'
import { idr } from '@/lib/format/idr'
import type { Place } from '@/lib/places/types'

// Yellow-accent landscape card. The brand yellow lives as the 1 px ring
// + outer glow + price block + Visit Now CTA — the rest of the surface
// stays dark glass so the global map background shows through.
//
// Layout: 120 px image on the left (mobile-first; bumps to 140 on sm+),
// title + category + stat strip on the right, CTA spans the full right
// column width. Whole card is a button so the entire area is the tap
// target (>= 88 px tall, well over the 44 px WCAG minimum).
// Deterministic placeholder rating per place — hashes the row's id into
// a stable number between 4.3 and 4.9 so every card shows a plausible
// star score and refreshes don't change it. Replace with place.rating
// once the column is selected by the places query.
function placeholderRating(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h) + id.charCodeAt(i)
    h |= 0
  }
  const r = 4.3 + ((Math.abs(h) % 70) / 100)
  return r.toFixed(1)
}

// Best-guess closing time for a place based on its category + operating
// tags. We don't have per-place hours_json populated yet, so this gives
// each card a concrete close time that's at least *typical* for the type
// of venue. When real hours arrive (Google Places backfill or owner
// claims), replace this with logic that reads place.hours_json.
function closingTime(category: string, tags: string[]): string {
  if (tags.includes('open_24h')) return '24 jam'
  if (tags.includes('open_late')) return '01:00'
  switch (category) {
    case 'hospital':
    case 'pharmacy':
    case 'airport':
    case 'train_station':
    case 'bus_station':
    case 'hotel':
      return '24 jam'
    case 'bar':
    case 'club':
      return '02:00'
    case 'restaurant':
    case 'cafe':
    case 'mall':
      return '22:00'
    case 'temple':
    case 'beach':
    case 'attraction':
    case 'doctor':
    case 'dentist':
    case 'government':
    case 'bike_repair':
      return '18:00'
    default:
      return '21:00'
  }
}

// Strips the current city's name (and known local aliases) from a
// place's display name so we never show e.g. "Stasiun Yogyakarta (Tugu)"
// when the page is already scoped to Yogyakarta. Uses a word-boundary
// match so the city is removed wherever it appears in the string —
// leading, trailing, or middle — and surrounding whitespace is
// collapsed. Falls back to the original name if stripping leaves
// nothing intelligible behind.
const CITY_ALIASES: Record<string, readonly string[]> = {
  yogyakarta: ['Yogyakarta', 'YOGYAKARTA', 'yogyakarta', 'Jogja', 'JOGJA', 'jogja', 'Yogya', 'YOGYA', 'yogya'],
  jakarta:    ['Jakarta', 'JAKARTA', 'jakarta', 'JKT', 'Jkt'],
  bandung:    ['Bandung', 'BANDUNG', 'bandung', 'Bdg'],
  surabaya:   ['Surabaya', 'SURABAYA', 'surabaya', 'Sby'],
  denpasar:   ['Denpasar', 'DENPASAR', 'denpasar', 'Bali', 'BALI'],
  medan:      ['Medan', 'MEDAN', 'medan'],
  semarang:   ['Semarang', 'SEMARANG', 'semarang'],
  makassar:   ['Makassar', 'MAKASSAR', 'makassar'],
  malang:     ['Malang', 'MALANG', 'malang'],
  solo:       ['Solo', 'SOLO', 'solo', 'Surakarta', 'SURAKARTA'],
}

function displayName(name: string, city: string): string {
  if (!city) return name
  const slug = city.toLowerCase()
  const cap = city[0]!.toUpperCase() + slug.slice(1)
  const variants = CITY_ALIASES[slug] ?? [cap, slug, city.toUpperCase()]
  let out = name
  for (const v of variants) {
    out = out.replace(new RegExp(`\\b${v}\\b`, 'g'), ' ')
  }
  out = out.replace(/\s+/g, ' ').replace(/\s*\(\s*\)\s*/g, ' ').trim()
  return out || name
}

export default function PlaceCard({
  place,
  quote,
  onVisit,
  currentCity,
}: {
  place: Place
  quote: PlaceQuote | null   // null while GPS pending / denied
  onVisit: (place: Place) => void
  currentCity: string
}) {
  const meta = categoryMeta(place.category)

  return (
    <button
      type="button"
      onClick={() => onVisit(place)}
      className="
        group relative block w-full text-left
        rounded-2xl
        overflow-hidden
        transition-all duration-200
        active:scale-[0.995]
        aspect-[1847/852]
      "
      aria-label={`Visit ${place.name} — ${meta.labelEn}`}
    >
      {/* Full-bleed art layer — fills the card's full height and width.
          No scrim — image renders at full opacity per spec; text content
          on top relies on its own weight + tracking for legibility. */}
      <img
        src="https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2018,%202026,%2001_32_57%20AM.png?updatedAt=1779042794665"
        alt=""
        aria-hidden
        loading="lazy"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover"
      />

      <div className="relative flex justify-between items-stretch gap-3 pt-3 pb-3 px-3 h-full">
        {/* Left text column. Order:
            title → category → stats (the "terminal" stat line) → price.
            Price now lives BELOW the stats text, enlarged for emphasis.
            Nudged 6px right of the card's inner gutter via pl-1.5. */}
        <div className="min-w-0 flex-1 flex flex-col gap-1 pl-1.5">
          <h3 className="text-[15px] sm:text-[16px] font-extrabold text-black leading-tight truncate">
            {displayName(place.name, currentCity)}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-bold text-gray-700">{meta.label}</span>
            {place.isOutOfZone && (
              <>
                <span className="text-[13px] text-gray-500">·</span>
                <span className="text-[13px] font-bold text-gray-600">Luar kota</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-[13px] font-bold text-gray-700">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-700" aria-hidden />
              <span className="font-mono">{quote ? formatDistanceKm(quote.distanceKm) : '—'}</span>
            </span>
            <span className="text-gray-500">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-700" aria-hidden />
              <span className="font-mono">{quote ? formatEtaMin(quote.etaMin) : '—'}</span>
            </span>
          </div>
          <div className="mt-0.5">
            <span className="block font-extrabold text-[18px] tabular-nums text-black leading-tight">
              {quote ? idr(quote.fareIdr) : '— IDR'}
            </span>
            {place.isOutOfZone && (
              <span className="block text-[11px] font-bold text-gray-700 leading-tight">
                incl. balik
              </span>
            )}
            {/* Open / close time — derived from a category-based default
                until per-place hours_json is populated. Shows "Open · 24
                jam" for 24h venues, otherwise "Open · until HH:MM". */}
            {(() => {
              const close = closingTime(place.category, place.tags)
              return (
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold text-gray-800 leading-tight">
                  <span
                    aria-hidden
                    className="inline-block w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.85)]"
                  />
                  {close === '24 jam'
                    ? 'Open · 24 jam'
                    : `Open · until ${close}`}
                </span>
              )
            })()}
          </div>
        </div>

        {/* Right column — bare place thumbnail (no rim) centred vertically
            within the card, with the Visit Now button just below it.
            Star rating badge sits on the bottom-left corner of the
            thumbnail in Airbnb-style. */}
        <div className="shrink-0 flex flex-col items-center justify-center gap-1.5">
          <div className="relative">
            <PlaceImage
              place={place}
              className="w-[110px] h-20 rounded-xl shadow-md"
            />
            <span
              className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/85 text-[10px] font-extrabold text-brand"
              style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.45)' }}
            >
              <Star className="w-2.5 h-2.5 fill-brand stroke-brand" aria-hidden />
              {placeholderRating(place.id)}
            </span>
          </div>
          <div
            className="
              w-[110px] inline-flex items-center justify-center gap-1 whitespace-nowrap
              rounded-lg
              px-2 py-1
              text-[11px] font-extrabold uppercase tracking-wider text-ink
              bg-bg
              border border-brand/40
              shadow-[0_4px_12px_rgba(0,0,0,0.55)]
              group-hover:bg-black group-hover:border-brand/70
              transition-all
            "
            style={{ transform: 'translateY(2px)' }}
          >
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddaaaaad-removebg-preview.png"
              alt=""
              aria-hidden
              loading="lazy"
              className="h-4 w-auto shrink-0 -ml-0.5"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))' }}
            />
            <span className="whitespace-nowrap">Visit Now</span>
            <ArrowRight className="w-3 h-3 shrink-0" aria-hidden />
          </div>
        </div>
      </div>
    </button>
  )
}
