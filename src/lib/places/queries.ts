import 'server-only'
import { getServerSupabase } from '@/lib/supabase/server'
import type { CityZone, Place, PlaceCategory } from './types'

// Single source of truth for the city the Phase 1 directory covers.
// Multi-city support is a schema-level concern; this constant defines
// which polygon and place set we load at the page edge.
export const DEFAULT_CITY = 'yogyakarta'

type PlaceRow = {
  id: string
  slug: string
  name: string
  category: PlaceCategory
  description: string | null
  image_urls: string[] | null
  city: string
  address: string | null
  tags: string[] | null
  lat: number
  lng: number
}

type ZoneRow = {
  city: string
  centroid_lat: number
  centroid_lng: number
  min_lng: number
  max_lng: number
  min_lat: number
  max_lat: number
}

// Returns every approved place for the city, along with the zone's
// bounding box + centroid. The page pre-computes is_out_of_zone and
// return_km here once so cards can render fares without any further
// network round-trip when GPS arrives.
//
// Returns [] + null when Supabase is not configured (demo / preview
// deploys) so callers can show a graceful empty state.
export async function listPlacesForCity(city: string = DEFAULT_CITY): Promise<{
  places: Place[]
  zone: CityZone | null
}> {
  const supabase = await getServerSupabase()
  if (!supabase) return { places: [], zone: null }

  const [placesRes, zoneRes] = await Promise.all([
    supabase
      .from('places')
      .select('id, slug, name, category, description, image_urls, city, address, tags, lat, lng')
      .eq('city', city)
      .eq('status', 'approved')
      .order('name'),
    supabase
      .from('city_zones')
      .select('city, centroid_lat, centroid_lng, min_lng, max_lng, min_lat, max_lat')
      .eq('city', city)
      .maybeSingle(),
  ])

  if (placesRes.error || zoneRes.error || !placesRes.data || !zoneRes.data) {
    return { places: [], zone: null }
  }

  const zoneRow = zoneRes.data as ZoneRow
  const zone: CityZone = {
    city: zoneRow.city,
    centroidLat: zoneRow.centroid_lat,
    centroidLng: zoneRow.centroid_lng,
  }

  const places: Place[] = (placesRes.data as PlaceRow[]).map((row) => {
    const isOutOfZone = !pointInBounds(row.lng, row.lat, zoneRow)
    const returnKm = isOutOfZone
      ? haversineKm(
          { lat: row.lat, lng: row.lng },
          { lat: zoneRow.centroid_lat, lng: zoneRow.centroid_lng },
        )
      : 0
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      description: row.description,
      imageUrls: row.image_urls ?? [],
      lat: row.lat,
      lng: row.lng,
      city: row.city,
      address: row.address,
      tags: row.tags ?? [],
      isOutOfZone,
      returnKm,
    }
  })

  return { places, zone }
}

// Look up a single approved place by slug. Used by the Phase 1 quote
// endpoint to authoritatively resolve the place + its in/out zone flag.
export async function getPlaceBySlug(slug: string): Promise<{
  place: Place
  zone: CityZone
} | null> {
  const supabase = await getServerSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('places')
    .select('id, slug, name, category, description, image_urls, city, address, tags, lat, lng')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  if (error || !data) return null

  const row = data as PlaceRow
  const zoneRes = await supabase
    .from('city_zones')
    .select('city, centroid_lat, centroid_lng, min_lng, max_lng, min_lat, max_lat')
    .eq('city', row.city)
    .maybeSingle()
  if (zoneRes.error || !zoneRes.data) return null
  const zoneRow = zoneRes.data as ZoneRow

  const isOutOfZone = !pointInBounds(row.lng, row.lat, zoneRow)
  const returnKm = isOutOfZone
    ? haversineKm(
        { lat: row.lat, lng: row.lng },
        { lat: zoneRow.centroid_lat, lng: zoneRow.centroid_lng },
      )
    : 0

  return {
    place: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      description: row.description,
      imageUrls: row.image_urls ?? [],
      lat: row.lat,
      lng: row.lng,
      city: row.city,
      address: row.address,
      tags: row.tags ?? [],
      isOutOfZone,
      returnKm,
    },
    zone: {
      city: zoneRow.city,
      centroidLat: zoneRow.centroid_lat,
      centroidLng: zoneRow.centroid_lng,
    },
  }
}

// Pure rectangle containment — Phase 1's in/out check. Replace with
// ST_Contains() against city_zones.geometry once we move beyond a single
// rectangular city polygon.
function pointInBounds(
  lng: number,
  lat: number,
  b: { min_lng: number; max_lng: number; min_lat: number; max_lat: number },
): boolean {
  return lng >= b.min_lng && lng <= b.max_lng && lat >= b.min_lat && lat <= b.max_lat
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
