// =============================================================================
// Yogya-market km-rate defaults — first-time-driver onboarding suggestions.
// -----------------------------------------------------------------------------
// **These are Yogya-market averages, NOT regulated rates.** Permenhub 12/2019
// explicitly says drivers self-publish — there is no nationally enforced km
// floor. Use these as a starting point only; drivers can adjust freely.
//
// CityDrivers is a software directory under PM 12/2019. We never set, compute,
// or modify fares — the values here are pre-fill placeholders + a one-tap
// "Reset to Yogya default" reference inside the dashboard services editor.
// Once a driver overrides the value, their published rate is what customers
// see.
//
// Sourced from informal Yogya market sampling (May 2026) — Avanza / Innova
// class cars, Hiace class minibus, Toyota Hilux / Mitsubishi Triton class
// pickup trucks, Suzuki Jimny / Toyota Land Cruiser class jeeps.
// =============================================================================

/** Pair of suggested minimum-fee + per-km values for a vehicle vertical. */
export type RateDefault = {
  /** Suggested floor fee for any trip (IDR, integer rupiah). */
  min_fee:      number
  /** Suggested per-kilometer charge above the floor (IDR, integer rupiah). */
  price_per_km: number
}

/**
 * Per-vehicle Yogya-market suggestions. Keys mirror the canonical
 * `drivers.vehicle_type` enum values used by the services dashboards:
 *   - 'bike'    → motorbike rider
 *   - 'car'     → passenger car driver (Avanza / Innova class)
 *   - 'minibus' → minibus charter (Hiace class)
 *   - 'truck'   → pickup-truck rental
 *   - 'jeep'    → jeep tour / offroad
 */
export const YOGYA_MARKET_DEFAULTS: Record<string, RateDefault> = {
  bike:    { min_fee:  15_000, price_per_km:  3_500 },
  car:     { min_fee:  30_000, price_per_km:  5_000 },
  minibus: { min_fee: 100_000, price_per_km:  7_500 },
  truck:   { min_fee: 200_000, price_per_km: 12_000 },
  jeep:    { min_fee: 250_000, price_per_km: 10_000 },
}

/**
 * Resolve the Yogya default for a given vehicle type. Returns null when the
 * value doesn't map to a known vertical so callers can opt out of rendering
 * the reset-to-default hint entirely.
 */
export function getMarketDefault(vehicleType: string): RateDefault | null {
  if (!vehicleType) return null
  const key = vehicleType.toLowerCase()
  return YOGYA_MARKET_DEFAULTS[key] ?? null
}
