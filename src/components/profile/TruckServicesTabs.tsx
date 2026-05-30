'use client'
import { useMemo, useState } from 'react'
import {
  hourlyDefaultsForVehicle,
  formatIDR,
  HOURLY_PETROL_POLICY_EN,
  type HourlyTier,
} from '@/lib/pricing/hourlyHire'
import HourlyBookingPopup from '@/components/profile/HourlyBookingPopup'

// =============================================================================
// TruckServicesTabs — pill tab row for the /truck/[slug] profile.
// -----------------------------------------------------------------------------
// Trucks rent by the day (rental_daily_rate_idr / weekly / monthly) AND, when
// the driver opts in via /dashboard/truck/services, also offer Hourly hire
// (3h / 6h / 8h block — driver decides if it's useful, e.g. by-the-hour
// moving help). Tabs surface only modes the driver enabled. Tapping Hourly
// reveals the 3 tier cards inline and a "Book this block" popup that uses
// the shared HourlyBookingPopup.
// =============================================================================

const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'

type TabId = 'all' | 'passenger' | 'parcel' | 'hourly'

export default function TruckServicesTabs({
  driverId,
  driverBusinessName,
  driverWhatsappE164,
  vehicleMake,
  vehicleModel,
  hasPassenger,
  hasParcel,
  hourlyEnabled,
  hourly3hRateIdr,
  hourly6hRateIdr,
  hourly8hRateIdr,
  workingHoursStart,
  workingHoursEnd,
}: {
  driverId:             string
  driverBusinessName:   string
  driverWhatsappE164:   string | null
  vehicleMake:          string | null
  vehicleModel:         string | null
  hasPassenger:         boolean
  hasParcel:            boolean
  hourlyEnabled:        boolean | null
  hourly3hRateIdr:      number | null
  hourly6hRateIdr:      number | null
  hourly8hRateIdr:      number | null
  workingHoursStart:    string | null
  workingHoursEnd:      string | null
}) {
  const hourlyAvailable = hourlyEnabled === true
  const defaults = useMemo(
    () => hourlyDefaultsForVehicle(vehicleMake, vehicleModel),
    [vehicleMake, vehicleModel],
  )
  const rates: Record<HourlyTier, number> = {
    '3h': hourly3hRateIdr ?? defaults.tier_3h,
    '6h': hourly6hRateIdr ?? defaults.tier_6h,
    '8h': hourly8hRateIdr ?? defaults.tier_8h,
  }
  const labels: Record<HourlyTier, string> = {
    '3h': '3-hour block',
    '6h': '6-hour block',
    '8h': '8-hour block',
  }

  const tabs: { id: TabId; label: string; emoji?: string }[] = [{ id: 'all', label: 'All' }]
  if (hasPassenger)    tabs.push({ id: 'passenger', label: 'Passenger' })
  if (hasParcel)       tabs.push({ id: 'parcel',    label: 'Parcel B2B', emoji: '📋' })
  if (hourlyAvailable) tabs.push({ id: 'hourly',    label: 'Hourly Booking' })

  const [active, setActive]       = useState<TabId>('all')
  const [popupTier, setPopupTier] = useState<HourlyTier | null>(null)

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const selected = active === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              aria-pressed={selected}
              className="inline-flex items-center gap-1.5 text-[12px] font-extrabold px-3 py-1.5 rounded-full transition active:scale-[0.97]"
              style={
                selected
                  ? { background: BRAND_YELLOW, color: TEXT_INK }
                  : { background: 'rgba(229, 231, 235, 0.95)', color: TEXT_INK }
              }
            >
              {t.emoji ? <span aria-hidden>{t.emoji}</span> : null}
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {active === 'hourly' && hourlyAvailable && (
        <section
          className="mt-3 rounded-2xl p-3"
          style={{ background: '#FFFFFF', border: '1px solid #E4E4E7' }}
        >
          <div className="text-[13px] font-extrabold uppercase tracking-wider mb-2" style={{ color: TEXT_INK }}>
            Hourly hire
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(['3h', '6h', '8h'] as const).map((tier) => (
              <div
                key={tier}
                className="rounded-xl p-3 flex flex-col gap-2"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
              >
                <div className="text-[11px] font-extrabold uppercase tracking-[0.15em]" style={{ color: '#854D0E' }}>
                  {labels[tier]}
                </div>
                <div className="text-[16px] font-black" style={{ color: TEXT_INK }}>
                  {formatIDR(rates[tier])}
                </div>
                <button
                  type="button"
                  onClick={() => setPopupTier(tier)}
                  className="mt-auto w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-extrabold text-[13px] active:scale-[0.98] transition"
                  style={{ background: BRAND_YELLOW, color: TEXT_INK, minHeight: 40 }}
                >
                  Book this block
                </button>
              </div>
            ))}
          </div>
          <p className="text-[12px] leading-snug mt-2" style={{ color: '#52525B' }}>
            {HOURLY_PETROL_POLICY_EN}
          </p>
        </section>
      )}

      {popupTier && (
        <HourlyBookingPopup
          driver={{
            id:                 driverId,
            business_name:      driverBusinessName,
            whatsapp_e164:      driverWhatsappE164,
            vehicle_type:       'truck',
            working_hours_start: workingHoursStart,
            working_hours_end:   workingHoursEnd,
          }}
          tier={popupTier}
          amount={rates[popupTier]}
          label={labels[popupTier]}
          onClose={() => setPopupTier(null)}
        />
      )}
    </div>
  )
}
