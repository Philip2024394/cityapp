// Fare quote = max(distance × price/km, min_fee). Rider keeps 100%.
//
// Round-trip rule:
//   When the trip crosses a driver's service-zone radius the chargeable
//   distance becomes outbound + return (driver has to come home empty).
//   Min fee is still applied once — it's a floor, not a per-leg charge.
import type { Rider, ServiceType } from '@/types/rider'

export type Pricing = { pricePerKm: number; minFee: number }

// Compute chargeable km. When `outOfZone` is true the driver has to
// ride back to base after drop-off, so the customer pays for both legs.
export function chargeableKm(distanceKm: number, outOfZone: boolean): number {
  return outOfZone ? distanceKm * 2 : distanceKm
}

// True when the trip's outbound km exceeds the driver's service-zone radius.
// `radiusKm` falls back to 10 km (the schema default — City driver tier)
// when undefined. Drivers on the "All Indonesia" tier carry a sentinel
// radius of 9999 km so this function effectively returns false.
export function isOutOfZone(distanceKm: number, radiusKm?: number | null): boolean {
  const r = typeof radiusKm === 'number' && radiusKm > 0 ? radiusKm : 10
  return distanceKm > r
}

export function quoteFare(distanceKm: number, pricing: Pricing, outOfZone = false): number {
  const km = chargeableKm(distanceKm, outOfZone)
  const raw = km * pricing.pricePerKm
  return Math.max(raw, pricing.minFee)
}

export function quoteBreakdown(distanceKm: number, pricing: Pricing, outOfZone = false) {
  const km = chargeableKm(distanceKm, outOfZone)
  const raw = Math.round(km * pricing.pricePerKm)
  const final = Math.max(raw, pricing.minFee)
  const minApplied = final > raw
  return { raw, final, minApplied, chargeableKm: km, outOfZone }
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
