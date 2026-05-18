'use client'
import { ArrowRight, MapPin, Clock } from 'lucide-react'
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
export default function PlaceCard({
  place,
  quote,
  onVisit,
}: {
  place: Place
  quote: PlaceQuote | null   // null while GPS pending / denied
  onVisit: (place: Place) => void
}) {
  const meta = categoryMeta(place.category)

  return (
    <button
      type="button"
      onClick={() => onVisit(place)}
      className="
        group relative w-full text-left
        flex items-stretch gap-3
        p-2.5
        rounded-2xl
        bg-black/72
        backdrop-blur-md
        border border-brand/30
        shadow-[0_18px_40px_rgba(250,204,21,0.10)]
        transition-all duration-200
        hover:border-brand/55
        hover:shadow-[0_22px_48px_rgba(250,204,21,0.18)]
        active:scale-[0.995]
      "
      aria-label={`Visit ${place.name} — ${meta.labelEn}`}
    >
      <PlaceImage
        place={place}
        className="shrink-0 w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-xl"
      />

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="min-w-0">
          <h3 className="text-[15px] sm:text-[16px] font-extrabold text-ink leading-tight truncate">
            {place.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-brand">{meta.label}</span>
            {place.isOutOfZone && (
              <>
                <span className="text-[13px] text-dim">·</span>
                <span className="text-[13px] font-bold text-muted">Luar kota</span>
              </>
            )}
          </div>

          {/* Stat strip. Renders dashes when GPS hasn't landed yet so the
              card layout never shifts after GPS resolves — only the
              numbers update via a soft cross-fade. */}
          <div className="mt-2 flex items-center gap-2 text-[13px] font-bold text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-brand/80" aria-hidden />
              <span className="font-mono">{quote ? formatDistanceKm(quote.distanceKm) : '—'}</span>
            </span>
            <span className="text-dim">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-brand/80" aria-hidden />
              <span className="font-mono">{quote ? formatEtaMin(quote.etaMin) : '—'}</span>
            </span>
          </div>

          {/* Price block + return-fare chip. The chip ALWAYS appears
              when isOutOfZone is true (Phase 1 server-confirmed) — it's
              the trust signal that riders are protected from empty-leg
              losses. Customer sees it before tapping Visit Now, so the
              higher fare is never a surprise. */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-lg font-extrabold text-[13px] tabular-nums"
              style={{
                background: 'rgba(250,204,21,0.12)',
                border: '1px solid rgba(250,204,21,0.32)',
                color: '#FACC15',
              }}
            >
              {quote ? idr(quote.fareIdr) : '— IDR'}
            </span>
            {place.isOutOfZone && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[13px] font-bold bg-brand/10 border border-brand/30 text-brand/95">
                incl. balik
              </span>
            )}
          </div>
        </div>

        <div
          className="
            mt-2.5 inline-flex items-center justify-center gap-2
            w-full
            rounded-xl
            px-3 py-2.5
            text-[13px] font-extrabold text-bg
            bg-gradient-to-r from-brand to-brand2
            shadow-[0_6px_18px_rgba(250,204,21,0.30)]
            group-hover:from-brand2 group-hover:to-brand
            transition-all
          "
          style={{ minHeight: 44 }}
        >
          <span>Visit Now</span>
          <ArrowRight className="w-4 h-4" aria-hidden />
        </div>
      </div>
    </button>
  )
}
