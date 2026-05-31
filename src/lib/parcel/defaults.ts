// ============================================================================
// Parcel B2B suggested defaults
// ----------------------------------------------------------------------------
// CityDrivers is a SOFTWARE DIRECTORY — drivers self-publish their own
// rates. The values below are SUGGESTIONS, surfaced as defaults in the
// driver dashboard with a one-click "Reset to defaults" button and on
// the public /cityriders/parcel hub as "typical driver rates".
//
// Bike + car drivers store their per-parcel 5-tier card in
// `drivers.parcel_rate_tiers` (jsonb). Truck drivers use their existing
// `rental_daily_rate_idr` / `rental_weekly_rate_idr` /
// `rental_monthly_rate_idr` fields (daily-rate model — different
// transaction shape from per-parcel).
//
// Rationale for the per-parcel tiers (Yogyakarta market, May 2026):
//   • 1–5/day  → Rp 9k  — casual ad-hoc rate
//   • 6–20/day → Rp 7k  — clustered route, small-business discount
//   • 21–50    → Rp 5.5k — driver dedicates ~5h, mid-volume discount
//   • 51–100   → Rp 4.5k — full-day driver commit, bulk discount
//   • 100+     → Negotiated direct on WhatsApp
// Customer-paid prices are 1:1 with what the driver receives — platform
// takes 0% commission (subscription model on the driver side instead).
// Driver hourly target Rp 30k–55k (= Rp 5–10M/month) at clustered speed.
// ============================================================================

export type ParcelRateTierKey =
  | 'tier_1_5'
  | 'tier_6_20'
  | 'tier_21_50'
  | 'tier_51_100'

export type ParcelRateTiers = Record<ParcelRateTierKey, number> & {
  /** 100+ parcels/day — direct WhatsApp negotiation, no fixed rate. */
  tier_100_plus_negotiate: boolean
}

/** Bike-driver suggested defaults — same as the recommended rates published
 *  on /cityriders/parcel. Drivers may override; "Reset to defaults" writes
 *  these back over their saved values. */
export const PARCEL_RATE_TIER_DEFAULTS_BIKE: ParcelRateTiers = {
  tier_1_5:       9000,
  tier_6_20:      7000,
  tier_21_50:     5500,
  tier_51_100:    4500,
  tier_100_plus_negotiate: true,
}

/** Car-driver suggested defaults — slightly higher because cargo capacity
 *  is bigger and the trip pace is slower than a motorbike. */
export const PARCEL_RATE_TIER_DEFAULTS_CAR: ParcelRateTiers = {
  tier_1_5:       12000,
  tier_6_20:      9000,
  tier_21_50:     7000,
  tier_51_100:    5500,
  tier_100_plus_negotiate: true,
}

/** Outer-zone surcharge default (IDR per parcel for deliveries outside
 *  the driver's primary service zone). */
export const PARCEL_OUTER_ZONE_SURCHARGE_DEFAULT_IDR = 3000

/** Daily capacity default — how many parcels a driver commits to handling
 *  per day. Bike default is conservative; drivers raise it as they prove
 *  out the rate. */
export const PARCEL_DAILY_CAPACITY_DEFAULT_BIKE = 40
export const PARCEL_DAILY_CAPACITY_DEFAULT_CAR  = 25

export type ParcelVehicleKind = 'bike' | 'car'

export function defaultsFor(vehicle: ParcelVehicleKind): {
  tiers:    ParcelRateTiers
  capacity: number
  surcharge: number
} {
  if (vehicle === 'car') {
    return {
      tiers:     PARCEL_RATE_TIER_DEFAULTS_CAR,
      capacity:  PARCEL_DAILY_CAPACITY_DEFAULT_CAR,
      surcharge: PARCEL_OUTER_ZONE_SURCHARGE_DEFAULT_IDR,
    }
  }
  return {
    tiers:     PARCEL_RATE_TIER_DEFAULTS_BIKE,
    capacity:  PARCEL_DAILY_CAPACITY_DEFAULT_BIKE,
    surcharge: PARCEL_OUTER_ZONE_SURCHARGE_DEFAULT_IDR,
  }
}

/** Label + range string for each tier — used in dashboard inputs +
 *  public rate-card table. Single source of truth. */
export const PARCEL_TIER_DEFINITIONS: ReadonlyArray<{
  key:   ParcelRateTierKey
  label: string
  range: string
}> = [
  { key: 'tier_1_5',    label: 'Casual',    range: '1–5 parcels/day' },
  { key: 'tier_6_20',   label: 'Light biz', range: '6–20 parcels/day' },
  { key: 'tier_21_50',  label: 'Active biz', range: '21–50 parcels/day' },
  { key: 'tier_51_100', label: 'Heavy biz',  range: '51–100 parcels/day' },
]

/** Format helper — IDR thousands separator, no decimals. */
export function fmtIdr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return 'Rp ' + Math.round(n).toLocaleString('id-ID')
}

/** Coerce an arbitrary JSON value (read from drivers.parcel_rate_tiers)
 *  into a typed ParcelRateTiers, filling missing keys with the vehicle
 *  default. Defensive — the column may contain partial data from a
 *  previous schema or a manual DB edit. */
export function parseRateTiers(
  raw:     unknown,
  vehicle: ParcelVehicleKind,
): ParcelRateTiers {
  const d = defaultsFor(vehicle).tiers
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Record<string, unknown>
  const pick = (k: ParcelRateTierKey): number => {
    const v = r[k]
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : d[k]
  }
  return {
    tier_1_5:    pick('tier_1_5'),
    tier_6_20:   pick('tier_6_20'),
    tier_21_50:  pick('tier_21_50'),
    tier_51_100: pick('tier_51_100'),
    tier_100_plus_negotiate:
      typeof r.tier_100_plus_negotiate === 'boolean' ? r.tier_100_plus_negotiate : true,
  }
}
