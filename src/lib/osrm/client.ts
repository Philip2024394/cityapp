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
// We hit the public route service (`/route/v1/driving/...`) with
// `overview=false` because we don't need the geometry, just the distance
// in metres. Always pass `geometries=geojson` would be wasted bytes.

import 'server-only'

const OSRM_TIMEOUT_MS = 1500

export type OsrmRouteResult = {
  meters: number
  durationSeconds: number
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
