import { NextResponse } from 'next/server'
import { osrmRoute } from '@/lib/osrm/client'
import { haversineKm } from '@/lib/geo/haversine'
import { HAVERSINE_ROAD_FACTOR } from '@/lib/geo/route-distance'

// ============================================================================
// POST /api/quote/route-distance
// ----------------------------------------------------------------------------
// Quote distance proxy. Forwards to the configured OSRM service for a real
// road km; falls back to haversine × 1.3 if OSRM isn't set up or fails.
// Caches results in process memory keyed by a coarse coordinate hash so
// the same trip — which gets re-quoted many times as the user looks at
// driver cards — only hits OSRM once.
//
// Important: this endpoint is intentionally public/no-auth — it's a
// pricing helper, not a trip record. We do NOT store any of this on disk;
// no row is written. Same legal posture as the rest of the directory.
// ============================================================================

type Coord = { lat: number; lng: number }

type Body = {
  from?: Coord
  to?: Coord
}

type CacheEntry = { km: number; source: 'osrm' | 'haversine_corrected'; at: number }

const CACHE = new Map<string, CacheEntry>()
const CACHE_MAX = 5_000
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const COORD_PRECISION = 4 // ~11m at the equator — good enough for de-dup

function isValidCoord(c: unknown): c is Coord {
  if (!c || typeof c !== 'object') return false
  const o = c as { lat?: unknown; lng?: unknown }
  if (typeof o.lat !== 'number' || typeof o.lng !== 'number') return false
  if (!Number.isFinite(o.lat) || !Number.isFinite(o.lng)) return false
  // Indonesia sanity gate — same box used by /api/drivers/location.
  if (o.lat < -11 || o.lat > 6 || o.lng < 95 || o.lng > 142) return false
  return true
}

function cacheKey(from: Coord, to: Coord): string {
  const r = (n: number) => n.toFixed(COORD_PRECISION)
  return `${r(from.lat)},${r(from.lng)}|${r(to.lat)},${r(to.lng)}`
}

function cacheGet(key: string): CacheEntry | null {
  const hit = CACHE.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    CACHE.delete(key)
    return null
  }
  // LRU touch — re-insert so the most recently used is at the back.
  CACHE.delete(key)
  CACHE.set(key, hit)
  return hit
}

function cacheSet(key: string, entry: CacheEntry) {
  if (CACHE.size >= CACHE_MAX) {
    const first = CACHE.keys().next().value
    if (first) CACHE.delete(first)
  }
  CACHE.set(key, entry)
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!isValidCoord(body.from) || !isValidCoord(body.to)) {
    return NextResponse.json({ error: 'from / to must be valid Indonesia coords' }, { status: 400 })
  }
  const from = body.from
  const to = body.to

  const key = cacheKey(from, to)
  const hit = cacheGet(key)
  if (hit) {
    return NextResponse.json({ km: hit.km, source: hit.source, cached: true })
  }

  // Sanity ceiling — refuse to route trips longer than ~600 km (longest
  // sensible point-to-point delivery on Java). Stops accidental misuse
  // for cross-archipelago routes that would burn OSRM cycles for no
  // sensible pricing outcome.
  const straightKm = haversineKm(from, to)
  if (straightKm > 600) {
    return NextResponse.json({ error: 'Trip too long for a delivery quote' }, { status: 400 })
  }

  let entry: CacheEntry
  const osrm = await osrmRoute(from, to)
  if (osrm && Number.isFinite(osrm.meters)) {
    entry = { km: osrm.meters / 1000, source: 'osrm', at: Date.now() }
  } else {
    entry = { km: straightKm * HAVERSINE_ROAD_FACTOR, source: 'haversine_corrected', at: Date.now() }
  }
  cacheSet(key, entry)
  return NextResponse.json({ km: entry.km, source: entry.source, cached: false })
}
