'use client'
import { useMemo, useState } from 'react'
import { MessageCircle, Clock } from 'lucide-react'
import { formatIDR, type HourlyTier } from '@/lib/pricing/hourlyHire'
import HourlyBookingPopup from '@/components/profile/HourlyBookingPopup'
import type { DriverPublic } from '../DriverProfileShell'

const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'
const BORDER       = '#E4E4E7'

// Three stacked rate cards (3h / 6h / 8h). Each card opens an inline
// date+time popup; when submitted the customer is bounced to WhatsApp
// with the booking template body pre-filled. We don't POST to a /book
// endpoint here — drivers don't have one yet and the existing widget on
// this page also opens WhatsApp directly.
export default function HourlyTabContent({
  driver, hourlyDefaults,
}: {
  driver:         DriverPublic
  hourlyDefaults: { tier_3h: number; tier_6h: number; tier_8h: number }
}) {
  const [popupTier, setPopupTier] = useState<HourlyTier | null>(null)

  const rates: Record<HourlyTier, number> = {
    '3h': driver.hourly_3h_rate_idr || hourlyDefaults.tier_3h,
    '6h': driver.hourly_6h_rate_idr || hourlyDefaults.tier_6h,
    '8h': driver.hourly_8h_rate_idr || hourlyDefaults.tier_8h,
  }
  const labels: Record<HourlyTier, string> = {
    '3h': '3-hour block',
    '6h': '6-hour block',
    '8h': '8-hour block',
  }

  // Service-window badge — bucket to 24h/16h/8h so customer sees the
  // broad availability story without needing to mental-math start/end.
  const serviceWindow = useMemo(() => {
    const s = driver.working_hours_start
    const e = driver.working_hours_end
    if (!s || !e) return null
    const sm = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(s)
    const em = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(e)
    if (!sm || !em) return null
    let diff = (parseInt(em[1]!, 10) * 60 + parseInt(em[2]!, 10))
             - (parseInt(sm[1]!, 10) * 60 + parseInt(sm[2]!, 10))
    if (diff <= 0) diff += 24 * 60
    const hours = diff / 60
    if (hours >= 20) return '24-hour service'
    if (hours >= 12) return '16-hour service'
    return '8-hour service'
  }, [driver.working_hours_start, driver.working_hours_end])

  return (
    <>
      <section
        className="mt-4 rounded-2xl p-3 space-y-3"
        style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_INK }}>
            Hourly hire
          </h3>
          {serviceWindow && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-extrabold rounded-full px-2.5 py-1"
              style={{
                background: TEXT_INK,
                color: BRAND_YELLOW,
                boxShadow: '0 2px 8px rgba(10,10,10,0.18)',
              }}
            >
              <Clock className="w-3 h-3" strokeWidth={2.75} />
              {serviceWindow}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {(['3h', '6h', '8h'] as HourlyTier[]).map((tier) => (
            <div
              key={tier}
              className="rounded-xl p-3 flex flex-col gap-2"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <div className="text-[12px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
                {labels[tier]}
              </div>
              <div className="text-[18px] font-black" style={{ color: TEXT_INK }}>
                {formatIDR(rates[tier])}
              </div>
              <button
                type="button"
                onClick={() => setPopupTier(tier)}
                className="mt-auto w-full inline-flex items-center justify-center gap-1.5 rounded-lg font-extrabold text-[13px] active:scale-[0.98] transition"
                style={{
                  minHeight: 44,
                  background: BRAND_YELLOW,
                  color: TEXT_INK,
                  border: `1px solid ${BRAND_YELLOW}`,
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                Book this block
              </button>
            </div>
          ))}
        </div>

        {/* Fee policy — hourly hire is fuel-NOT-included (customer pays
            petrol at the pump). */}
        <div
          className="rounded-lg px-2.5 py-2 text-[12px] leading-snug"
          style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#854D0E' }}
        >
          <span className="font-extrabold">Fuel not included.</span>{' '}
          Customer pays for petrol at the pump. Entrance tickets, parking,
          toll roads, bridge fees, meals and any personal expenses are also the
          passenger&apos;s responsibility.
        </div>
      </section>

      {popupTier && (
        <HourlyBookingPopup
          driver={driver}
          tier={popupTier}
          amount={rates[popupTier]}
          label={labels[popupTier]}
          onClose={() => setPopupTier(null)}
        />
      )}
    </>
  )
}
