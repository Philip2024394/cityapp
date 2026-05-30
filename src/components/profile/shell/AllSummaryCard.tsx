'use client'
import { MessageCircle } from 'lucide-react'
import { normaliseE164ForWaMe } from '@/lib/whatsapp/buildLink'
import { idr } from '@/lib/format/idr'
import { formatIDR, AVAILABILITY_SLOTS } from '@/lib/pricing/hourlyHire'
import type { DriverPublic } from '../DriverProfileShell'

const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'
const TEXT_SECOND  = '#52525B'
const BORDER       = '#E4E4E7'

// Originally the "All" tab default summary card. The shell now defaults
// the All tab to the booking widget instead, so this component is kept
// for future reuse but is NOT rendered by DriverProfileShell.
export default function AllSummaryCard({
  driver, offersRide, offersParcel, hourlyAvailable, hourlyDefaults, cheapestParcel,
}: {
  driver:          DriverPublic
  offersRide:      boolean
  offersParcel:    boolean
  hourlyAvailable: boolean
  hourlyDefaults:  { tier_3h: number; tier_6h: number; tier_8h: number }
  cheapestParcel:  number | null
}) {
  const slotChips = AVAILABILITY_SLOTS
    .filter((s) => Boolean((driver as unknown as Record<string, boolean | null | undefined>)[s.column]))
    .map((s) => ({ id: s.id, label: s.label, emoji: s.emoji }))

  const wh = (driver.working_hours_start && driver.working_hours_end)
    ? `${driver.working_hours_start} – ${driver.working_hours_end}`
    : null

  const hourly3h = driver.hourly_3h_rate_idr || hourlyDefaults.tier_3h

  const waNumber = normaliseE164ForWaMe(driver.whatsapp_e164 ?? '')
  const customCtaHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
        `Halo ${driver.business_name}, saya ingin tanya tentang layanan tambahan / harga khusus. Terima kasih.`,
      )}`
    : null

  return (
    <section
      className="mt-4 rounded-2xl p-3 space-y-3"
      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
    >
      <div>
        <div className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_INK }}>
          Available {[offersRide, offersParcel, hourlyAvailable].filter(Boolean).length} way{[offersRide, offersParcel, hourlyAvailable].filter(Boolean).length === 1 ? '' : 's'}
        </div>
        <ul className="mt-2 space-y-1.5">
          {offersRide && (
            <li className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-extrabold" style={{ color: TEXT_INK }}>🧍 Passenger</span>
              <span style={{ color: TEXT_SECOND }}>
                {driver.price_per_km != null && driver.price_per_km > 0
                  ? <>from {idr(driver.price_per_km)}/km</>
                  : <>rate on request</>}
              </span>
            </li>
          )}
          {offersParcel && (
            <li className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-extrabold" style={{ color: TEXT_INK }}>📋 Parcel B2B</span>
              <span style={{ color: TEXT_SECOND }}>
                {cheapestParcel != null
                  ? <>from {idr(cheapestParcel)}/parcel</>
                  : <>rate on request</>}
              </span>
            </li>
          )}
          {hourlyAvailable && (
            <li className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-extrabold" style={{ color: TEXT_INK }}>⏰ Hourly hire</span>
              <span style={{ color: TEXT_SECOND }}>
                from {formatIDR(hourly3h)}/3-hour block
              </span>
            </li>
          )}
        </ul>
      </div>

      {slotChips.length > 0 && (
        <div className="text-[13px]" style={{ color: TEXT_SECOND }}>
          <span className="font-extrabold" style={{ color: TEXT_INK }}>Available:</span>{' '}
          {slotChips.map((c, i) => (
            <span key={c.id}>
              {i > 0 ? ' · ' : ''}
              {c.emoji} {c.label}
            </span>
          ))}
        </div>
      )}

      {wh && (
        <div className="text-[13px]" style={{ color: TEXT_SECOND }}>
          <span className="font-extrabold" style={{ color: TEXT_INK }}>Working hours:</span> {wh}
        </div>
      )}

      {customCtaHref && (
        <a
          href={customCtaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[14px] active:scale-[0.99] transition"
          style={{
            minHeight: 48,
            background: BRAND_YELLOW,
            color: TEXT_INK,
            border: `1px solid ${BRAND_YELLOW}`,
            boxShadow: '0 8px 18px rgba(250,204,21,0.35)',
          }}
        >
          <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
          Contact for additional services or custom quote
        </a>
      )}
    </section>
  )
}
