import { NextResponse } from 'next/server'

// ============================================================================
// GET /api/geo/reverse?lat=&lng=
// ----------------------------------------------------------------------------
// Reverse-geocode a lat/lng → human-readable admin name using OSM
// Nominatim. Used by the LocationPicker to autofill the visible area
// text on the profile + onboarding screens.
//
// Nominatim usage policy (public instance):
//   • Max 1 request per second
//   • Must send a User-Agent identifying the app
//   • Cache results (we use 24h in-memory LRU since admin names are stable)
//
// For production scale we'd move to a self-hosted Nominatim or a paid
// provider — but for launch volume the public instance is fine.
// ============================================================================

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse'
const USER_AGENT = 'CityDrivers/1.0 (citydrivers.streetlocal.live)'

type CachedEntry = { ts: number; payload: ReverseResponse }
const CACHE = new Map<string, CachedEntry>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_MAX = 1000

type ReverseResponse = {
  display_name: string
  province: string | null
  regency: string | null
  district: string | null
  village: string | null
  area_label: string
  city_label: string
}

function cacheKey(lat: number, lng: number): string {
  // 4 decimal places ≈ 11m precision — close enough that two points
  // within the same building share a cache hit.
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

function cacheGet(key: string): ReverseResponse | null {
  const hit = CACHE.get(key)
  if (!hit) return null
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    CACHE.delete(key)
    return null
  }
  return hit.payload
}

function cacheSet(key: string, payload: ReverseResponse) {
  if (CACHE.size >= CACHE_MAX) {
    // Drop the oldest entry by deleting the first iterator entry.
    const firstKey = CACHE.keys().next().value
    if (firstKey) CACHE.delete(firstKey)
  }
  CACHE.set(key, { ts: Date.now(), payload })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get('lat') ?? '')
  const lng = parseFloat(url.searchParams.get('lng') ?? '')
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng query params required as numbers' }, { status: 400 })
  }
  // Indonesia bounding box — refuse points outside the country since
  // the app + admin DB only covers Indonesia.
  if (lat < -11 || lat > 6 || lng < 95 || lng > 142) {
    return NextResponse.json({ error: 'Coordinates outside Indonesia' }, { status: 400 })
  }

  const key = cacheKey(lat, lng)
  const cached = cacheGet(key)
  if (cached) return NextResponse.json(cached)

  const nomUrl = `${NOMINATIM_BASE}?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=14&accept-language=id`
  let nomData: {
    display_name?: string
    address?: Record<string, string | undefined>
  }
  try {
    const res = await fetch(nomUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Nominatim returned ${res.status}` }, { status: 502 })
    }
    nomData = await res.json()
  } catch (err) {
    return NextResponse.json(
      { error: 'Reverse-geocode failed', message: err instanceof Error ? err.message : 'network error' },
      { status: 502 },
    )
  }

  const addr = nomData.address ?? {}
  // Nominatim's Indonesian admin keys are not perfectly stable across
  // boundaries. Province lives at `state`. Regency lives at one of
  // `city` | `town` | `municipality` | `county`. District is usually
  // `city_district` | `suburb`. Village is `village` | `hamlet` |
  // `neighbourhood`. Best-effort mapping with fallbacks.
  const province = addr.state ?? null
  const regency =
    addr.city ?? addr.town ?? addr.municipality ?? addr.county ?? null
  const district = addr.city_district ?? addr.suburb ?? null
  const village = addr.village ?? addr.hamlet ?? addr.neighbourhood ?? null

  // Human-readable labels for the form fields.
  const area_label = [village, district].filter(Boolean).join(', ') || regency || ''
  const city_label = regency ?? province ?? ''

  const payload: ReverseResponse = {
    display_name: nomData.display_name ?? '',
    province,
    regency,
    district,
    village,
    area_label,
    city_label,
  }
  cacheSet(key, payload)
  return NextResponse.json(payload)
}
