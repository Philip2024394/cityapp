'use client'
import { useState } from 'react'
import { MessageCircle, Star } from 'lucide-react'
import { idr } from '@/lib/format/idr'
import HourlyBookingPopup from '@/components/profile/HourlyBookingPopup'
import type { TourPackage } from '@/lib/tours/types'
import type { DriverPublic } from '../DriverProfileShell'

const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'
const TEXT_SECOND  = '#52525B'
const BORDER       = '#E4E4E7'

function formatDurationHours(hours: number): string {
  // Trim trailing .0 so integer durations don't render as "12.0 hours".
  const rounded = Math.round(hours * 10) / 10
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${str} ${rounded === 1 ? 'hour' : 'hours'}`
}

/** Image cascade for a tour card. Order:
 *    1. driver_tour_packages.photo_url (driver upload — wins if set)
 *    2. places[place_slugs[0]].image_url (curated platform thumbnail)
 *    3. null (card renders content-only, no image)
 */
function resolveThumbnail(
  tour: TourPackage,
  placeImages: Record<string, string | null>,
): string | null {
  if (tour.photo_url && tour.photo_url.trim().length > 0) return tour.photo_url
  for (const slug of tour.place_slugs) {
    const img = placeImages[slug]
    if (img && img.trim().length > 0) return img
  }
  return null
}

// Vertical stack of published tour packages. Each card opens the shared
// HourlyBookingPopup in tour mode (no tier, just label + amount). Reuses
// the same date/time → WhatsApp handoff pattern as the hourly tab.
export default function ToursTabContent({
  driver, tours, placeImages,
}: {
  driver:      DriverPublic
  tours:       TourPackage[]
  /** slug → image_url map for places referenced by these tours. Resolver
   *  falls back to null when a slug isn't in the map. */
  placeImages?: Record<string, string | null>
}) {
  const [popupTour, setPopupTour] = useState<TourPackage | null>(null)
  const imageMap = placeImages ?? {}

  return (
    <>
      <section
        className="mt-4 rounded-2xl p-3 space-y-3"
        style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
      >
        {tours.map((t) => {
          const thumb = resolveThumbnail(t, imageMap)
          return (
            <article
              key={t.id}
              className="rounded-2xl overflow-hidden bg-white"
              style={{
                border: `1px solid ${BORDER}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}
            >
              {/* Full-bleed cover image (16:9) sits at the top of the card.
                  Title overlays the bottom of the image with a dark scrim
                  so it always reads, regardless of photo brightness. */}
              {thumb && (
                <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)',
                    }}
                  />
                  {/* Star rating pill — top-right of the image. Only renders
                      when the tour carries a rating (mocks always do; real
                      tours only when reviews are aggregated). */}
                  {typeof t.rating === 'number' && t.rating > 0 && (
                    <div
                      className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold"
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        color: TEXT_INK,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <Star
                        className="w-3 h-3"
                        strokeWidth={0}
                        fill={BRAND_YELLOW}
                        style={{ color: BRAND_YELLOW }}
                      />
                      <span>{t.rating.toFixed(1)}</span>
                      {typeof t.rating_count === 'number' && t.rating_count > 0 && (
                        <span className="text-[10px] font-semibold" style={{ color: TEXT_SECOND }}>
                          ({t.rating_count})
                        </span>
                      )}
                    </div>
                  )}
                  <div className="absolute left-3 right-3 bottom-2.5">
                    <h3
                      className="text-[17px] sm:text-[18px] font-black leading-tight text-white"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.65)' }}
                    >
                      {t.title}
                    </h3>
                    <div
                      className="text-[11.5px] mt-0.5 font-semibold text-white/90"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
                    >
                      {formatDurationHours(t.duration_hours)}
                      {t.max_pax != null && t.max_pax > 0 && <> · up to {t.max_pax} pax</>}
                    </div>
                  </div>
                </div>
              )}

              {/* Image-less fallback: title block at the top of the card
                  body so the layout stays balanced. */}
              {!thumb && (
                <div className="px-4 pt-4">
                  <h3 className="text-[17px] sm:text-[18px] font-black leading-tight" style={{ color: TEXT_INK }}>
                    {t.title}
                  </h3>
                  <div className="text-[12px] mt-1" style={{ color: TEXT_SECOND }}>
                    {formatDurationHours(t.duration_hours)}
                    {t.max_pax != null && t.max_pax > 0 && <> · up to {t.max_pax} pax</>}
                  </div>
                </div>
              )}

              {/* Description block — sits BELOW the image (not under it).
                  3-line clamp keeps card height predictable across the list. */}
              <div className="px-4 pt-3 pb-1">
                {t.description && (
                  <p
                    className="text-[13px] leading-snug"
                    style={{
                      color: TEXT_SECOND,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {t.description}
                  </p>
                )}
              </div>

              {/* Price row — prominent, sits directly under the description. */}
              <div className="px-4 pt-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_SECOND }}>
                    From
                  </div>
                  <div className="text-[22px] sm:text-[24px] font-black leading-none mt-0.5" style={{ color: TEXT_INK }}>
                    {idr(t.price_idr)}
                  </div>
                </div>
                <div
                  className="text-[10.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: '#FEF3C7', color: '#854D0E', border: '1px solid #FDE68A' }}
                >
                  Driver + fuel included
                </div>
              </div>

              {/* Fee-policy + CTA at the bottom — separated visually from
                  the price by a thin divider line so each block reads
                  clearly. */}
              <div className="px-4 pt-3 pb-4 space-y-2">
                <div
                  className="rounded-lg px-2.5 py-2 text-[11.5px] leading-snug"
                  style={{ background: '#F8FAFC', border: `1px solid ${BORDER}`, color: TEXT_SECOND }}
                >
                  Entrance tickets, parking, toll roads, bridge fees, meals and any
                  personal expenses are the passenger&apos;s responsibility.
                </div>

                <button
                  type="button"
                  onClick={() => setPopupTour(t)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl font-extrabold text-[13px] active:scale-[0.98] transition"
                  style={{
                    minHeight: 46,
                    background: BRAND_YELLOW,
                    color: TEXT_INK,
                    border: `1px solid ${BRAND_YELLOW}`,
                    boxShadow: '0 6px 16px rgba(250,204,21,0.40)',
                  }}
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                  Book this tour
                </button>
              </div>
            </article>
          )
        })}
      </section>

      {popupTour && (
        <HourlyBookingPopup
          driver={driver}
          amount={popupTour.price_idr}
          label={popupTour.title}
          onClose={() => setPopupTour(null)}
        />
      )}
    </>
  )
}
