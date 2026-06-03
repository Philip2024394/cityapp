import { NextResponse } from 'next/server'

// ============================================================================
// GET /api/geo/search?q=&near=lat,lng&countries=id&maxDistanceKm=
// ----------------------------------------------------------------------------
// Server-side place-search proxy. Replaces the direct Nominatim call the
// client was making from usePlaceSearch. Two reasons (founder direction
// 2026-06-03 fix #4 of 4):
//
//   1. RATE LIMIT — Nominatim is 1 req/sec PER IP. With direct client
//      calls, two customers on the same office Wi-Fi typing at once get
//      429s, see empty dropdowns, and the page looks broken. Routing
//      through our server means the rate limit applies to ONE IP (our
//      function's outbound) which we can manage. Plus the in-memory
//      cache below means the same query in the next 24h doesn't hit
//      Nominatim at all.
//
//   2. RESILIENT FALLBACK — when Nominatim errors / times out / returns
//      0 results, we transparently try Mapbox Geocoding (requires the
//      MAPBOX_ACCESS_TOKEN env var to be set; if it isn't, we just
//      return whatever Nominatim gave us). Customer never sees the
//      backend swap.
//
// Response shape mirrors what PlaceSuggestion expects in usePlaceSearch
// so the hook only needs its fetch URL changed (no client refactor).
// ============================================================================

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

// Tiny module-level LRU cache. Lives for the lifetime of a warm Vercel
// function instance — typically 5-30 min between cold starts in
// production. Hit rate is high enough to dent the Nominatim QPS without
// the overhead of Vercel KV / Redis. Cap entries at 500 so a busy day
// doesn't grow it unbounded.
const CACHE_MAX = 500
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24h
type CacheEntry = { data: PlaceSuggestion[]; ts: number }
const cache = new Map<string, CacheEntry>()

function cacheGet(key: string): PlaceSuggestion[] | null {
  const e = cache.get(key)
  if (!e) return null
  if (Date.now() - e.ts > CACHE_TTL_MS) { cache.delete(key); return null }
  // Bump to MRU position by re-inserting.
  cache.delete(key); cache.set(key, e)
  return e.data
}
function cacheSet(key: string, data: PlaceSuggestion[]) {
  if (cache.size >= CACHE_MAX) {
    // Evict oldest (first key).
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, { data, ts: Date.now() })
}

type PlaceSuggestion = {
  id:     string
  label:  string
  detail: string
  lat:    number
  lng:    number
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const MAPBOX_URL    = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q                = (url.searchParams.get('q') ?? '').trim()
  const nearRaw          = url.searchParams.get('near')
  const countriesRaw     = url.searchParams.get('countries') ?? ''
  const maxDistanceKmRaw = url.searchParams.get('maxDistanceKm')

  if (q.length < 3) return NextResponse.json({ suggestions: [] })

  let near: { lat: number; lng: number } | null = null
  if (nearRaw) {
    const [latS, lngS] = nearRaw.split(',')
    const lat = parseFloat(latS ?? '')
    const lng = parseFloat(lngS ?? '')
    if (Number.isFinite(lat) && Number.isFinite(lng)) near = { lat, lng }
  }
  const countries = countriesRaw
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter((c) => /^[a-z]{2}$/.test(c))
  const maxDistanceKm = maxDistanceKmRaw ? Math.max(0, parseFloat(maxDistanceKmRaw)) : 50

  const cacheKey = JSON.stringify({ q: q.toLowerCase(), near, countries, maxDistanceKm })
  const hit = cacheGet(cacheKey)
  if (hit) {
    return NextResponse.json(
      { suggestions: hit, source: 'cache' },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' } },
    )
  }

  // Try Nominatim first.
  let suggestions: PlaceSuggestion[] = []
  let source: 'nominatim' | 'nominatim-soft' | 'mapbox' | 'none' = 'none'
  try {
    suggestions = await searchNominatim(q, { near, countries, maxDistanceKm, bounded: true })
    source = 'nominatim'
    // Empty + near set → retry without bounded clip (same logic the
    // client-side viewbox fallback uses).
    if (suggestions.length === 0 && near) {
      suggestions = await searchNominatim(q, { near, countries, maxDistanceKm, bounded: false })
      if (suggestions.length > 0) source = 'nominatim-soft'
    }
  } catch (e) {
    // Nominatim error (429, 5xx, timeout). Leave suggestions empty so
    // the Mapbox fallback below picks up the slack.
    console.warn('[geo/search] nominatim failed:', (e as Error).message)
  }

  // Mapbox fallback — only when Nominatim returned 0 / errored AND the
  // env token is configured. Opt-in so deployments without a Mapbox
  // account continue to work (Nominatim-only with caching).
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN
  if (suggestions.length === 0 && mapboxToken) {
    try {
      suggestions = await searchMapbox(q, { near, countries, mapboxToken })
      if (suggestions.length > 0) source = 'mapbox'
    } catch (e) {
      console.warn('[geo/search] mapbox failed:', (e as Error).message)
    }
  }

  // Post-filter by maxDistanceKm — same rule the client used to apply.
  if (near && maxDistanceKm > 0 && suggestions.length > 0) {
    suggestions = suggestions.filter((s) => haversineKm(near!, { lat: s.lat, lng: s.lng }) <= maxDistanceKm)
  }

  cacheSet(cacheKey, suggestions)

  return NextResponse.json(
    { suggestions, source },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' } },
  )
}

// ─── Nominatim ──────────────────────────────────────────────────────────────

type NominatimItem = {
  place_id: number
  lat:      string
  lon:      string
  display_name: string
  name?:    string
  address?: Record<string, string | undefined>
}

async function searchNominatim(
  q: string,
  opts: { near: { lat: number; lng: number } | null; countries: string[]; maxDistanceKm: number; bounded: boolean },
): Promise<PlaceSuggestion[]> {
  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '8')
  url.searchParams.set('addressdetails', '1')
  if (opts.countries.length) url.searchParams.set('countrycodes', opts.countries.join(','))
  if (opts.near) {
    const wide = opts.maxDistanceKm > 0 ? 0.5 : 0.3
    url.searchParams.set(
      'viewbox',
      `${opts.near.lng - wide},${opts.near.lat + wide},${opts.near.lng + wide},${opts.near.lat - wide}`,
    )
    url.searchParams.set('bounded', opts.bounded ? '1' : '0')
  }
  const res = await fetch(url.toString(), {
    headers: {
      // Nominatim policy: send a descriptive User-Agent.
      'User-Agent': 'CityDrivers/1.0 (https://citydrivers.id)',
    },
    // Defensive timeout — Nominatim sometimes hangs.
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`nominatim ${res.status}`)
  const data: NominatimItem[] = await res.json()
  return data.map((d) => ({
    id:     String(d.place_id),
    label:  pickShortLabel(d),
    detail: d.display_name,
    lat:    parseFloat(d.lat),
    lng:    parseFloat(d.lon),
  }))
}

function pickShortLabel(d: NominatimItem): string {
  const addr = d.address ?? {}
  return (
    d.name ||
    addr.amenity ||
    addr.shop ||
    addr.tourism ||
    addr.building ||
    addr.road ||
    addr.suburb ||
    addr.village ||
    addr.town ||
    addr.city_district ||
    addr.city ||
    addr.county ||
    addr.state ||
    d.display_name.split(',')[0] ||
    'Place'
  )
}

// ─── Mapbox (fallback) ──────────────────────────────────────────────────────

type MapboxFeature = {
  id?:           string
  text?:         string
  place_name?:   string
  center?:       [number, number]  // [lng, lat]
}
type MapboxResponse = { features?: MapboxFeature[] }

async function searchMapbox(
  q: string,
  opts: { near: { lat: number; lng: number } | null; countries: string[]; mapboxToken: string },
): Promise<PlaceSuggestion[]> {
  const url = new URL(`${MAPBOX_URL}/${encodeURIComponent(q)}.json`)
  url.searchParams.set('access_token', opts.mapboxToken)
  url.searchParams.set('limit', '8')
  url.searchParams.set('autocomplete', 'true')
  if (opts.countries.length) url.searchParams.set('country', opts.countries.join(','))
  if (opts.near) url.searchParams.set('proximity', `${opts.near.lng},${opts.near.lat}`)
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`mapbox ${res.status}`)
  const data: MapboxResponse = await res.json()
  const feats = Array.isArray(data.features) ? data.features : []
  const out: PlaceSuggestion[] = []
  for (const f of feats) {
    if (!Array.isArray(f.center)) continue
    const [lng, lat] = f.center
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    out.push({
      id:     f.id ?? `${lat},${lng}`,
      label:  f.text ?? f.place_name?.split(',')[0] ?? 'Place',
      detail: f.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
    })
  }
  return out
}

// ─── Tiny haversine — duplicated here so the route is self-contained.

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
