import type { Place } from './types'
import { haversineKm } from '@/lib/geo/haversine'
import { AVG_SPEED_KMH } from '@/lib/geo/eta'

// Platform-average rate used for the discovery card preview ONLY. The
// authoritative fare comes from the rider's own pricing on /cari/rider.
// Tuned to sit between the typical 2000 and 3000 per-km rates riders set,
// so the displayed fare is close to (but never above) what the cheapest
// rider will quote — the customer never feels surprised by a higher bill.
export const PLATFORM_AVG_RATE_PER_KM = 2500
export const PLATFORM_AVG_MIN_FEE     = 12000

export type PlaceQuote = {
  distanceKm: number       // one-way pickup → place (haversine)
  returnKm: number         // 0 if place is in-zone, else place → city centroid
  billableKm: number       // distanceKm + returnKm
  etaMin: number           // one-way travel time only
  fareIdr: number          // platform-average fare for billableKm
  isOutOfZone: boolean     // server-confirmed via PostGIS ST_Contains
  includesReturn: boolean  // === isOutOfZone, but explicit for the UI chip
}

// Pure quote calculation given a pickup point and a place that already
// carries the server-computed isOutOfZone + returnKm. No round-trips:
// fast enough to run inside the card render loop on a mid-range phone.
export function quotePlace(
  pickup: { lat: number; lng: number },
  place: Pick<Place, 'lat' | 'lng' | 'isOutOfZone' | 'returnKm'>,
): PlaceQuote {
  const distanceKm = haversineKm(pickup, { lat: place.lat, lng: place.lng })
  const returnKm = place.isOutOfZone ? place.returnKm : 0
  const billableKm = distanceKm + returnKm
  const etaMin = Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60))
  const fareIdr = Math.max(
    PLATFORM_AVG_MIN_FEE,
    Math.round(billableKm * PLATFORM_AVG_RATE_PER_KM),
  )
  return {
    distanceKm,
    returnKm,
    billableKm,
    etaMin,
    fareIdr,
    isOutOfZone: place.isOutOfZone,
    includesReturn: place.isOutOfZone,
  }
}

// Display rounding rules: short trips shown to one decimal, long trips
// rounded to nearest km. Stops the on-card distance from flickering as
// GPS jitters by 10–50 m. Returns a localised Bahasa-friendly string.
export function formatDistanceKm(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function formatEtaMin(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} jam` : `${h} jam ${m} min`
}
