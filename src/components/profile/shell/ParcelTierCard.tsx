'use client'
import { idr } from '@/lib/format/idr'
import { parseRateTiers, PARCEL_TIER_DEFINITIONS, type ParcelVehicleKind } from '@/lib/parcel/defaults'
import type { DriverPublic } from '../DriverProfileShell'

const TEXT_INK    = '#0A0A0A'
const TEXT_SECOND = '#52525B'
const BORDER      = '#E4E4E7'

// Read-only 5-tier ladder shown under the booking widget on the Parcel
// B2B tab. Falls back to vehicle defaults when the driver hasn't saved
// their own tiers yet.
export default function ParcelTierCard({ driver }: { driver: DriverPublic }) {
  const vehicleKind: ParcelVehicleKind = driver.vehicle_type === 'bike' ? 'bike' : 'car'
  const tiers = parseRateTiers(driver.parcel_rate_tiers ?? null, vehicleKind)
  return (
    <section
      className="mt-3 rounded-2xl p-3"
      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
    >
      <div className="text-[13px] font-extrabold uppercase tracking-wider mb-2" style={{ color: TEXT_INK }}>
        Per-parcel rates
      </div>
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
