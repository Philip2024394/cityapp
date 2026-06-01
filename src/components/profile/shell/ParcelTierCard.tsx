'use client'
import { idr } from '@/lib/format/idr'
import { parseRateTiers, PARCEL_TIER_DEFINITIONS, type ParcelVehicleKind } from '@/lib/parcel/defaults'
import type { DriverPublic } from '../DriverProfileShell'

const TEXT_INK    = '#0A0A0A'
const TEXT_SECOND = '#52525B'
const BORDER      = '#E4E4E7'

// Driver-published 5-tier rate ladder shown on the Parcel B2B tab.
// Renders ONLY when the driver has saved their own tiers on the
// dashboard — vehicle defaults are intentionally NOT used as a fallback
// here so the customer never sees prices the driver didn't publish.
export default function ParcelTierCard({ driver }: { driver: DriverPublic }) {
  const firstName = (driver.business_name || 'Driver').split(' ')[0]!
  const raw = driver.parcel_rate_tiers
  const hasDriverRates =
    raw !== null && raw !== undefined &&
    (typeof raw === 'object' && Object.keys(raw as Record<string, unknown>).length > 0)
  if (!hasDriverRates) {
    return (
      <section
        className="mt-3 rounded-2xl p-3"
        style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
      >
        <h3 className="text-[15px] font-black leading-tight" style={{ color: TEXT_INK }}>
          B2B Parcel Contracts
        </h3>
        <p className="text-[12px] leading-snug mt-1" style={{ color: TEXT_SECOND }}>
          {firstName} hasn&apos;t published parcel contract rates yet.
          Send a WhatsApp message to agree the rate directly.
        </p>
      </section>
    )
  }
  const vehicleKind: ParcelVehicleKind = driver.vehicle_type === 'bike' ? 'bike' : 'car'
  const tiers = parseRateTiers(raw, vehicleKind)
  return (
    <section
      className="mt-3 rounded-2xl p-3"
      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
    >
      <h3 className="text-[15px] font-black leading-tight" style={{ color: TEXT_INK }}>
        B2B Parcel Contract Rates
      </h3>
      <p className="text-[12px] leading-snug mt-1 mb-3" style={{ color: TEXT_SECOND }}>
        {firstName} is available for B2B parcel contracts at the rates below.
        Final pricing can be discussed on WhatsApp once you share daily
        quantity and pickup / drop-off area.
      </p>
      <ul className="space-y-1.5">
        {PARCEL_TIER_DEFINITIONS.map((def) => (
          <li key={def.key} className="flex items-center justify-between gap-2 text-[13px]">
            <span style={{ color: TEXT_SECOND }}>
              <span className="font-extrabold" style={{ color: TEXT_INK }}>{def.label}</span>
              {' · '}{def.range}
            </span>
            <span className="font-extrabold" style={{ color: TEXT_INK }}>
              {idr(tiers[def.key])}
            </span>
          </li>
        ))}
        {tiers.tier_100_plus_negotiate && (
          <li className="flex items-center justify-between gap-2 text-[13px]">
            <span style={{ color: TEXT_SECOND }}>
              <span className="font-extrabold" style={{ color: TEXT_INK }}>Bulk</span>
              {' · '}100+ parcels/day
            </span>
            <span className="font-extrabold" style={{ color: TEXT_INK }}>
              Negotiated on WhatsApp
            </span>
          </li>
        )}
      </ul>
    </section>
  )
}
