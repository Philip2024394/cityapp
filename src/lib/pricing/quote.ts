// Fare quote = max(distance × price/km, min_fee). Rider keeps 100%.
export type Pricing = { pricePerKm: number; minFee: number }

export function quoteFare(distanceKm: number, pricing: Pricing): number {
  const raw = distanceKm * pricing.pricePerKm
  return Math.max(raw, pricing.minFee)
}

export function quoteBreakdown(distanceKm: number, pricing: Pricing) {
  const raw = Math.round(distanceKm * pricing.pricePerKm)
  const final = Math.max(raw, pricing.minFee)
  const minApplied = final > raw
  return { raw, final, minApplied }
}
