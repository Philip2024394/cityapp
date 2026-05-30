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

// Vertical stack of published tour packages. Each card opens the shared
// HourlyBookingPopup in tour mode (no tier, just label + amount). Reuses
// the same date/time → WhatsApp handoff pattern as the hourly tab.
export default function ToursTabContent({
  driver, tours,
}: {
  driver: DriverPublic
  tours:  TourPackage[]
}) {
  const [popupTour, setPopupTour] = useState<TourPackage | null>(null)

  return (
    <>
      <section
        className="mt-4 rounded-2xl p-3 space-y-3"
        style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
      >
        {tours.map((t) => (
          <article
            key={t.id}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
          >
            {t.photo_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={t.photo_url}
                alt=""
                className="w-full object-cover"
                style={{ aspectRatio: '16 / 9' }}
              />
            )}
            <div className="p-3 space-y-2">
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
                <div className="text-[18px] font-black shrink-0 leading-none" style={{ color: TEXT_INK }}>
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
        ))}
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
