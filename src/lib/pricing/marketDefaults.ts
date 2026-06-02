// =============================================================================
// Vehicle rate defaults — driver-onboarding suggestions, zone-aware.
// -----------------------------------------------------------------------------
// **These are REGULATED MINIMUMS used as SUGGESTED DEFAULTS, not enforced
// fares.** Permenhub PM 12/2019 explicitly says drivers self-publish — there
// is no platform-enforced km floor. Use these as pre-fill values only;
// drivers can adjust upward (recommended) or downward (warned in UI, only
// hard-blocked at the anti-spam floor in zones.ts).
//
// CityDrivers is a software directory under PM 12/2019. We never set,
// compute, or modify fares — the values here are pre-fill placeholders +
// a one-tap "Reset to default" reference inside the dashboard services
// editor. Once a driver overrides the value, their published rate is what
// customers see.
//
// 2026-06-02: replaced static Yogya-market sampling with per-zone Permenhub
// batas bawah lookup (KP 667/2022 for bikes, PM 118/2018 for cars). See
// src/lib/pricing/zones.ts and reference_indonesia_ride_tariffs (memory).
// =============================================================================

import {
  suggestedPricePerKm,
  suggestedMinFee,
  bikeZoneForCity,
  carZoneForCity,
} from './zones'

/** Pair of suggested minimum-fee + per-km values for a vehicle vertical. */
export type RateDefault = {
  /** Suggested floor fee for any trip (IDR, integer rupiah). */
  min_fee:      number
  /** Suggested per-kilometer charge above the floor (IDR, integer rupiah). */
  price_per_km: number
}

/**
 * Resolve the suggested default for a given vehicle type + city. When the
 * city is unknown / unmapped, falls back to Zone I (the lowest rates) so
 * drivers in new geographies always get a working default.
 *
 *   - 'bike'    → motorbike rider (KP 667/2022 three-zone schema)
 *   - 'car'     → passenger car driver (PM 118/2018 two-zone schema)
 *   - 'minibus' → minibus charter (uses car schema as baseline)
 *   - 'truck'   → pickup-truck rental (uses car schema as baseline)
 *   - 'jeep'    → jeep tour / offroad (uses car schema as baseline)
 *
 * The minibus/truck/jeep callers will override upward via the dashboard
 * since their per-km is typically 2-3× the regulated car floor.
 */
export function getMarketDefault(
  vehicleType: string,
  city?: string | null,
): RateDefault | null {
  if (!vehicleType) return null
  return {
    min_fee:      suggestedMinFee(vehicleType, city ?? null),
    price_per_km: suggestedPricePerKm(vehicleType, city ?? null),
  }
}

/**
 * Legacy export — kept so existing callers that destructure
 * `YOGYA_MARKET_DEFAULTS[vehicleType]` keep working until the dashboard
 * onboarding flows are migrated to use getMarketDefault(vehicleType, city).
 * These values are intentionally the Zone I (lowest) batas bawah —
 * matching the spirit of the old "Yogya market" naming since Yogya is
 * in Zone I, while now drawing on the regulated minimum rather than
 * informal market sampling.
 *
 * Truck / minibus / jeep keep their previous higher defaults because those
 * vehicles are charter-priced, not per-km-ojek-priced, and KP 667 / PM 118
 * don't set floors for them.
 */
export const YOGYA_MARKET_DEFAULTS: Record<string, RateDefault> = {
  bike:    { min_fee:  8_000, price_per_km:  2_000 },   // KP 667 Zone I batas bawah
  car:     { min_fee: 20_000, price_per_km:  3_500 },   // PM 118 Zone I batas bawah
  minibus: { min_fee: 100_000, price_per_km:  7_500 },  // charter — no regulated floor
  truck:   { min_fee: 200_000, price_per_km: 12_000 },  // charter — no regulated floor
  jeep:    { min_fee: 250_000, price_per_km: 10_000 },  // charter — no regulated floor
}

// Re-export the zone helpers for callers that want to render the zone
// badge in the dashboard ("You're in Zone I — Sumatra/Java-ex-Jabo/Bali").
export { bikeZoneForCity, carZoneForCity }
