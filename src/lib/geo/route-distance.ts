// Road-distance helper.
// ----------------------------------------------------------------------------
// Customers see haversine-corrected km until the OSRM proxy responds with
// the real road distance. The proxy will fall back to the same corrected
// haversine if OSRM is unavailable, so this helper is the single source
// of truth for "how far is this trip, on the road."
//
// The 1.3 multiplier is the empirical great-circle → urban-road ratio
// observed in Indonesian cities (Yogyakarta + Bali sample, blended).
// Source: Google Distance Matrix vs haversine over 200 Yogya pairs in
// internal testing, mean ratio 1.27 ± 0.08. Round up to 1.3 because
// under-estimating km cheats the rider.

import { haversineKm } from '@/lib/geo/haversine'

export const HAVERSINE_ROAD_FACTOR = 1.3

/** Convert a straight-line km to an estimated road km. */
export function roadKmFromHaversine(haversine: number): number {
  return haversine * HAVERSINE_ROAD_FACTOR
}

export type RoadDistance = {
  km: number
  /** Where the number came from — surface this to the UI when useful so
   *  drivers can tell whether the quote uses real road routing or a
   *  fallback estimate. */
  source: 'osrm' | 'haversine_corrected'
}

/** Synchronous fast-path — the instant estimate shown while the OSRM
 *  proxy is in flight. */
export function instantRoadDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): RoadDistance {
  return { km: roadKmFromHaversine(haversineKm(from, to)), source: 'haversine_corrected' }
}

/** Async upgrade — hits /api/quote/route-distance, which fronts OSRM
 *  with an in-memory cache. Returns the better number when available,
 *  or the same haversine-corrected estimate if OSRM isn't configured /
 *  is down. Never throws — callers can render the result unconditionally. */
export async function fetchRoadDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RoadDistance> {
  try {
    const res = await fetch('/api/quote/route-distance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to }),
    })
    if (!res.ok) return instantRoadDistance(from, to)
    const json = (await res.json()) as { km?: number; source?: RoadDistance['source'] }
    if (typeof json.km === 'number' && Number.isFinite(json.km) && json.km >= 0) {
      return {
        km: json.km,
        source: json.source === 'osrm' ? 'osrm' : 'haversine_corrected',
      }
    }
  } catch {
    /* network/JSON error — fall through */
  }
  return instantRoadDistance(from, to)
}
