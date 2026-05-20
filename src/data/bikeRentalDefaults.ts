// ============================================================================
// Indonesian motorbike rental — city-tier daily defaults + weekly/monthly
// formula. Derived from May 2026 market research across Yogyakarta, Bali,
// Lombok, Jakarta listings (rental-shop websites, Klook, BikeHouse, etc.).
//
// Source: research/2026-05 bike rental survey. All-in daily rates, walk-in
// list prices (NOT post-negotiation, which typically drops 10-20%).
//
// Strategy: each model gets a city-tier floor. We pre-fill the cheapest
// price drivers can list — they can always raise. Weekly/monthly are
// auto-derived via the standard market formula:
//
//   weekly  = daily × 6   (≈14% discount vs 7×daily)
//   monthly = daily × 20  (≈33% discount vs 30×daily)
//
// Drivers can override; UI warns if they deviate >20% from the formula
// since renters strongly expect a multi-day discount.
// ============================================================================

import type { BikeMake } from './bikeCatalog'

/** Bike rental city tier. Mirrors the passenger ojol zones but the
 *  rental market splits more along Bali-tourist vs everything-else
 *  rather than the 3-zone Permenhub split. */
export type RentalCityTier = 'bali_tourist' | 'jogja_local' | 'jakarta_capital' | 'other'

/** Slug → tier mapping. Cities not listed fall back to 'other' (uses
 *  jogja_local rates as the baseline). */
export const CITY_TO_RENTAL_TIER: Record<string, RentalCityTier> = {
  // Bali tourist — premium tourist market
  denpasar: 'bali_tourist',
  kuta:     'bali_tourist',
  ubud:     'bali_tourist',
  canggu:   'bali_tourist',
  seminyak: 'bali_tourist',

  // Lombok / Gili — also tourist but slightly under Bali
  mataram:  'bali_tourist',

  // Jogja + similar mid-tier tourist + student markets
  yogyakarta: 'jogja_local',
  solo:       'jogja_local',
  malang:     'jogja_local',
  semarang:   'jogja_local',
  bandung:    'jogja_local',
  surabaya:   'jogja_local',

  // Jakarta — lowest tourist demand, lowest rental rates
  jakarta:   'jakarta_capital',
  bogor:     'jakarta_capital',
  depok:     'jakarta_capital',
  tangerang: 'jakarta_capital',
  bekasi:    'jakarta_capital',
}

/** Coarse model classes for default-rate lookup. The full bike catalog has
 *  ~250 models; classification puts each into one of these buckets so the
 *  defaults table stays manageable. */
export type RentalModelClass =
  | 'entry_matic'      // BeAT, Mio, Scoopy, Fino, Genio, NEX
  | 'mid_matic'        // Vario 125/160, Lexi, Skydrive
  | 'maxi_scooter'     // NMAX, PCX, Aerox, Stylo, ADV 160
  | 'premium_maxi'     // ADV 350, Forza, Burgman, X-ADV
  | 'sport_naked'      // Vixion, CB150R, MT-15, GSX-S150, Z250
  | 'sport_full'       // Ninja 250, R15, R25, CBR250RR, GSX-R150
  | 'adventure'        // CRF150L, CRF250 Rally, KLX150, V-Strom 250
  | 'large_sport'      // CBR600/1000, Ninja H2, ZX-25R, R1, Z900
  | 'classic_premium'  // Royal Enfield, Vespa GTS, W175
  | 'electric'         // Niu, Yadea, Polytron, Selis
  | 'cub'              // Supra, Revo, Smash, Shogun, Verza, Megapro

// Model-name pattern → class. Order matters — first match wins.
// Patterns are case-insensitive substrings against the model string.
const MODEL_PATTERNS: ReadonlyArray<{ pattern: RegExp; cls: RentalModelClass }> = [
  // Electric (check first — some e-bikes have weird names)
  { pattern: /\b(NQi|UQi|MQi|KQi|E8S|C-Like|Fox-R|T-Rex|X-Tron|Agats|Bromo|Mandalika|Mandala|Tempur|Zuzu)\b/i, cls: 'electric' },
  // Large sport (check before sport_full)
  { pattern: /\b(CBR(?!150|250)|H2|Z(?:7|9|1)|R1|S1000|MT-09|MT-10|GSX-R(?:600|750|1000)|Hayabusa|ZX-(?:6|10))\b/i, cls: 'large_sport' },
  // Premium maxi
  { pattern: /\b(ADV 350|Forza|Burgman|X-ADV|XMAX)\b/i, cls: 'premium_maxi' },
  // Sport full fairing
  { pattern: /\b(Ninja|R15|R25|CBR150|CBR250|GSX-R150|RC ?\d+|Panigale|Tuono|RSV|YZF)\b/i, cls: 'sport_full' },
  // Adventure
  { pattern: /\b(CRF|KLX|V-Strom|Tenere|WR\d+|Versys|Multistrada|GS\b|Adventure|Himalayan|Scram|TRK)\b/i, cls: 'adventure' },
  // Sport naked
  { pattern: /\b(Vixion|CB150|MT-15|MT-25|GSX-S|Z(?:2|4)|Duke|Streetfighter|TNT|Leoncino|Bullet|Hunter|Meteor|Continental|Diavel|Monster|Scrambler|MT-09)\b/i, cls: 'sport_naked' },
  // Classic premium
  { pattern: /\b(W175|Vespa|GTS|Sprint|Primavera|LX|946|Sei Giorni|Elettrica|Imperiale)\b/i, cls: 'classic_premium' },
  // Maxi scooter
  { pattern: /\b(NMAX|PCX|Aerox|Stylo|ADV 160|Lexi|Filano)\b/i, cls: 'maxi_scooter' },
  // Mid matic
  { pattern: /\b(Vario|Skydrive|Avenis|Freego|Address|Gear)\b/i, cls: 'mid_matic' },
  // Cub (entry mopeds)
  { pattern: /\b(Supra|Revo|Smash|Shogun|Verza|Megapro|Satria|Karya|Super Cub|Monkey)\b/i, cls: 'cub' },
  // Entry matic (last — wide net for unknown small scooters)
  { pattern: /\b(BeAT|Mio|Scoopy|Fino|Genio|NEX|Dazz|Neo|Star City|Callisto|Ntorq)\b/i, cls: 'entry_matic' },
]

/** Classify a bike model string into one of the rental tiers. Falls back
 *  to 'entry_matic' for unknown models — the safest defaulting choice
 *  (entry tier is cheapest, so a misclassified premium bike won't
 *  accidentally price below market). */
export function classifyModel(make: BikeMake | string, model: string): RentalModelClass {
  const haystack = `${make} ${model}`
  for (const { pattern, cls } of MODEL_PATTERNS) {
    if (pattern.test(haystack)) return cls
  }
  return 'entry_matic'
}

/** Daily-rate defaults per (city tier × model class) in IDR. From May 2026
 *  market survey — set at the LOWEST observed walk-in price in each tier,
 *  so drivers default to the most competitive rate. They can raise. */
export const DAILY_DEFAULTS_IDR: Record<RentalCityTier, Record<RentalModelClass, number>> = {
  bali_tourist: {
    entry_matic:     75_000,
    mid_matic:      100_000,
    maxi_scooter:   150_000,
    premium_maxi:   220_000,
    sport_naked:    180_000,
    sport_full:     250_000,
    adventure:      300_000,
    large_sport:    600_000,
    classic_premium: 200_000,
    electric:       180_000,
    cub:             65_000,
  },
  jogja_local: {
    entry_matic:     55_000,
    mid_matic:       75_000,
    maxi_scooter:   100_000,
    premium_maxi:   150_000,
    sport_naked:    120_000,
    sport_full:     180_000,
    adventure:      200_000,
    large_sport:    400_000,
    classic_premium: 150_000,
    electric:       120_000,
    cub:             50_000,
  },
  jakarta_capital: {
    entry_matic:     45_000,
    mid_matic:       65_000,
    maxi_scooter:    90_000,
    premium_maxi:   130_000,
    sport_naked:    110_000,
    sport_full:     160_000,
    adventure:      180_000,
    large_sport:    350_000,
    classic_premium: 130_000,
    electric:       100_000,
    cub:             40_000,
  },
  other: {
    entry_matic:     55_000,
    mid_matic:       75_000,
    maxi_scooter:   100_000,
    premium_maxi:   150_000,
    sport_naked:    120_000,
    sport_full:     180_000,
    adventure:      200_000,
    large_sport:    400_000,
    classic_premium: 150_000,
    electric:       120_000,
    cub:             50_000,
  },
}

/** Absolute floor — below this, owner can't cover insurance + wear.
 *  Matches the cheapest Jakarta listings. UI hard-stops below this. */
export const ABSOLUTE_DAILY_FLOOR_IDR = 40_000

/** Standard weekly multiplier = daily × 6 (≈14% discount on 7×daily). */
export const WEEKLY_MULTIPLIER = 6
/** Standard monthly multiplier = daily × 20 (≈33% discount on 30×daily). */
export const MONTHLY_MULTIPLIER = 20

/** Look up the suggested DAILY rate for a model in a given city. Returns
 *  the absolute floor if either is unknown. */
export function suggestedDailyRate(
  make: BikeMake | string,
  model: string,
  city: string | null | undefined,
): number {
  const tier = city ? (CITY_TO_RENTAL_TIER[city.toLowerCase()] ?? 'other') : 'other'
  const cls = classifyModel(make, model)
  return DAILY_DEFAULTS_IDR[tier][cls]
}

/** Auto-derive weekly + monthly from a daily rate using the standard
 *  market formula. */
export function deriveWeeklyMonthly(daily: number): { weekly: number; monthly: number } {
  return {
    weekly:  Math.round(daily * WEEKLY_MULTIPLIER),
    monthly: Math.round(daily * MONTHLY_MULTIPLIER),
  }
}

/** True when weekly/monthly deviate from the standard formula by >20%.
 *  UI uses this to surface a "renters expect a multi-day discount" warning. */
export function isMultiDayDiscountOff(daily: number, weekly: number | null, monthly: number | null): {
  weeklyOff: boolean
  monthlyOff: boolean
} {
  const formulaWeekly  = daily * WEEKLY_MULTIPLIER
  const formulaMonthly = daily * MONTHLY_MULTIPLIER
  const weeklyOff  = weekly  != null && Math.abs(weekly  - formulaWeekly)  / formulaWeekly  > 0.20
  const monthlyOff = monthly != null && Math.abs(monthly - formulaMonthly) / formulaMonthly > 0.20
  return { weeklyOff, monthlyOff }
}

/** Gili Islands ban combustion bikes. Owners listing in Gili must offer
 *  electric only. Returns true if the given city slug is a Gili location. */
export function requiresElectricOnly(city: string | null | undefined): boolean {
  if (!city) return false
  const c = city.toLowerCase()
  return c === 'gili' || c.startsWith('gili-') || c.startsWith('gili_')
}
