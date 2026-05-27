// Server-only OSRM HTTP client.
// ----------------------------------------------------------------------------
// OSRM = Open Source Routing Machine. Self-host with the latest Indonesia
// OSM extract for proper alley/gang coverage that beats Google Maps in
// many parts of Yogyakarta + Bali. Wire it up by setting
//   OSRM_BASE_URL = https://your-osrm-host.example.com
// in the Vercel env. Without that var the helper short-circuits to null
// and the caller falls back to haversine × 1.3 — same fallback the proxy
// route relies on, so the system is always working.
//
// `osrmRoute()` hits the public route service with `overview=false` because
// fare-distance lookups only need the distance number — not the geometry.
// `osrmRouteWithGeometry()` adds `overview=full&geometries=geojson` so the
// map can render the actual road-following polyline with all turns.

import 'server-only'

const OSRM_TIMEOUT_MS = 1500

export type OsrmRouteResult = {
  meters: number
  durationSeconds: number
}

export type OsrmRouteGeometryResult = {
  meters: number
  durationSeconds: number
  /** GeoJSON LineString coordinates: [[lng, lat], ...] in OSRM's full
   *  overview resolution (typically a few hundred points for a city trip,
   *  ~1KB on the wire). Use to render the route polyline with all turns
   *  on the customer's map. */
  coordinates: [number, number][]
}

function getBase(): string | null {
  const raw = process.env.OSRM_BASE_URL?.trim()
  if (!raw) return null
  // Strip trailing slash so callers can join with '/route/v1/...' safely.
  return raw.replace(/\/+$/, '')
}

export async function osrmRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<OsrmRouteResult | null> {
  const base = getBase()
  if (!base) return null

  // OSRM expects lng,lat (not lat,lng) — easy mistake that returns wildly
  // wrong distances if flipped. Pin the order here so the caller can't
  // mess it up.
  const path = `/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}`
  const url = `${base}${path}?overview=false&alternatives=false&steps=false`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const json = (await res.json()) as {
      code?: string
      routes?: { distance?: number; duration?: number }[]
    }
    if (json.code !== 'Ok' || !json.routes?.[0]) return null
    const r = json.routes[0]
    if (typeof r.distance !== 'number' || !Number.isFinite(r.distance)) return null
    return {
      meters: r.distance,
      durationSeconds: typeof r.duration === 'number' ? r.duration : 0,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Variant of osrmRoute() that ALSO returns the route's GeoJSON polyline
// so the customer's map can draw the road-following line with all
// turns. Same OSRM endpoint, just with overview=full instead of false.
// Payload is larger (~1–10 KB depending on trip length) so we use this
// only when the map is actively going to render a route — fare-distance
// lookups continue to call osrmRoute() for the lean response.
export async function osrmRouteWithGeometry(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<OsrmRouteGeometryResult | null> {
  const base = getBase()
  if (!base) return null

  const path = `/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}`
  const url = `${base}${path}?overview=full&geometries=geojson&alternatives=false&steps=false`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const json = (await res.json()) as {
      code?: string
      routes?: {
        distance?: number
        duration?: number
        geometry?: { type?: string; coordinates?: [number, number][] }
      }[]
    }
    if (json.code !== 'Ok' || !json.routes?.[0]) return null
    const r = json.routes[0]
    if (typeof r.distance !== 'number' || !Number.isFinite(r.distance)) return null
    const coords = r.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) return null
    return {
      meters: r.distance,
      durationSeconds: typeof r.duration === 'number' ? r.duration : 0,
      coordinates: coords,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
