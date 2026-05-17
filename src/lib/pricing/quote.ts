// Fare quote = max(distance × price/km, min_fee). Rider keeps 100%.
import type { Rider, ServiceType } from '@/types/rider'

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

// Resolve effective rate for a specific service.
// If the rider has a per-service override → use that. Otherwise base.
export function rateFor(rider: Rider, service: ServiceType): Pricing {
  const override = rider.servicePricing?.[service]
  return {
    pricePerKm: override?.perKm  ?? rider.pricePerKm,
    minFee:     override?.minFee ?? rider.minFee,
  }
}

// True if the rider sets any per-service rate that differs from base.
// Useful to show a "rates vary" hint on marketplace cards.
export function hasServiceOverrides(rider: Rider): boolean {
  if (!rider.servicePricing) return false
  return Object.values(rider.servicePricing).some(p =>
    p && (p.perKm !== undefined || p.minFee !== undefined),
  )
}

// Lowest base-or-override rate across the rider's enabled services.
// "Starting from" price for marketplace when no service filter is set.
export function lowestStartingPrice(rider: Rider): Pricing {
  if (!rider.services.length) {
    return { pricePerKm: rider.pricePerKm, minFee: rider.minFee }
  }
  let best: Pricing = rateFor(rider, rider.services[0]!)
  for (const s of rider.services) {
    const r = rateFor(rider, s)
    if (r.pricePerKm < best.pricePerKm) best = r
  }
  return best
}
