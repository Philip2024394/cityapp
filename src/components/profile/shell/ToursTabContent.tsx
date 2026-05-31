'use client'
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
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
              className="rounded-2xl overflow-hidden"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              {/* Two-column layout: left thumbnail (when present) + content
                  on the right. Thumbnail is 96px square on mobile, sits
                  alongside the title/price for a quick-scan card. */}
              <div className="flex gap-3 p-3">
                {thumb && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={thumb}
                    alt=""
                    className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[16px] font-black leading-tight" style={{ color: TEXT_INK }}>
                        {t.title}
                      </h3>
                      <div className="text-[12px] mt-0.5" style={{ color: TEXT_SECOND }}>
                        {formatDurationHours(t.duration_hours)}
                        {t.max_pax != null && t.max_pax > 0 && <> · up to {t.max_pax} pax</>}
                      </div>
                    </div>
                    <div className="text-[16px] sm:text-[18px] font-black shrink-0 leading-none" style={{ color: TEXT_INK }}>
                      {idr(t.price_idr)}
                    </div>
                  </div>

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
              </div>

              <div className="px-3 pb-3 space-y-2">
                {/* Fee policy — short, clear, consistent across all tour
                    packages. Single price story (replaces older
                    include/exclude chip badges). */}
                <div
                  className="rounded-lg px-2.5 py-2 text-[12px] leading-snug"
                  style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#854D0E' }}
                >
                  <span className="font-extrabold">Fuel + driver included.</span>{' '}
                  Entrance tickets, parking, toll roads, bridge fees, meals and any
                  personal expenses are the passenger&apos;s responsibility.
                </div>

                <button
                  type="button"
                  onClick={() => setPopupTour(t)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg font-extrabold text-[13px] active:scale-[0.98] transition"
                  style={{
                    minHeight: 44,
                    background: BRAND_YELLOW,
                    color: TEXT_INK,
                    border: `1px solid ${BRAND_YELLOW}`,
                    boxShadow: '0 4px 12px rgba(250,204,21,0.30)',
                  }}
                >
                  <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
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
