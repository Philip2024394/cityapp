import Link from 'next/link'
import PlacesBrowser from '@/components/places/PlacesBrowser'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { haversineKm } from '@/lib/geo/haversine'
import type { Place, PlaceCategory, CityZone } from '@/lib/places/types'

// ============================================================================
// /food — White-card directory of self-listed eat/drink venues.
// ----------------------------------------------------------------------------
// Mirror of /places (2026-05-27 redesign) but scoped to the food set
// (restaurant, cafe, bar, club). Same backend `places` table — only the
// category filter and chip rail differ. Profile clicks still route to
// /places/[slug] so the detail surface stays unified across both browse
// views.
//
// Compliance posture: IndoCity is a software directory (PM 12/2019). The
// list labels venues as "self-listed". No fake "verified" / "official
// partner" badges — only data the row actually carries is surfaced.
// ============================================================================

export const metadata = {
  title: 'Food · IndoCity',
  description:
    'Browse self-listed eateries — restaurants, cafés, bars, clubs — ' +
    'near you in Indonesia. IndoCity is a software directory.',
  alternates: { canonical: 'https://indocity.id/food' },
}

// Force fresh data on every request so newly-approved places land without a
// redeploy. Aligns with /places posture verbatim.
export const dynamic = 'force-dynamic'

const DEFAULT_CITY = 'yogyakarta'

// Food-only categories surfaced on /food. Tourism categories live on
// /places; utility categories (hospital, pharmacy, transit, government,
// repair) are intentionally excluded from the default browse view here.
const FOOD_CATEGORIES: ReadonlyArray<PlaceCategory> = [
  'restaurant',
  'cafe',
  'bar',
  'club',
]

// Chip rail for /food — mirrors FOOD_CATEGORIES with Bahasa labels.
const FOOD_CHIPS = [
  { id: 'all',        label: 'All' },
  { id: 'restaurant', label: 'Resto' },
  { id: 'cafe',       label: 'Kafe' },
  { id: 'bar',        label: 'Bar' },
  { id: 'club',       label: 'Klub' },
] as const

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

// Pure rectangle containment — Phase 1's in/out check (lifted from the old
// listPlacesForCity helper). Replace with ST_Contains() against
// city_zones.geometry once we move beyond a single rectangular polygon.
function pointInBounds(
  lng: number,
  lat: number,
  b: { min_lng: number; max_lng: number; min_lat: number; max_lat: number },
): boolean {
  return lng >= b.min_lng && lng <= b.max_lng && lat >= b.min_lat && lat <= b.max_lat
}

function capitalise(s: string): string {
  if (!s) return s
  return s[0]!.toUpperCase() + s.slice(1)
}

// Server-side fetch of every approved food venue in a city + the zone's
// centroid + bounds. Identical shape to /places/loadPlaces so the client
// island receives the same Place[] contract.
async function loadPlaces(city: string): Promise<{ places: Place[]; zone: CityZone | null }> {
  const admin = getAdminSupabase()
  if (!admin) return { places: [], zone: null }

  const [placesRes, zoneRes] = await Promise.all([
    admin
      .from('places')
      .select('id, slug, name, category, description, image_urls, city, address, tags, lat, lng')
      .eq('city', city)
      .eq('status', 'approved')
      .in('category', FOOD_CATEGORIES as unknown as string[])
      .order('name'),
    admin
      .from('city_zones')
      .select('city, centroid_lat, centroid_lng, min_lng, max_lng, min_lat, max_lat')
      .eq('city', city)
      .maybeSingle(),
  ])

  if (placesRes.error || !placesRes.data) return { places: [], zone: null }
  const rows = placesRes.data as PlaceRow[]
  const zoneRow = (zoneRes.data ?? null) as ZoneRow | null

  const zone: CityZone | null = zoneRow
    ? { city: zoneRow.city, centroidLat: zoneRow.centroid_lat, centroidLng: zoneRow.centroid_lng }
    : null

  const places: Place[] = rows.map((row) => {
    const isOutOfZone = zoneRow ? !pointInBounds(row.lng, row.lat, zoneRow) : false
    const returnKm = zoneRow && isOutOfZone
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

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>
}) {
  const params = await searchParams
  const currentCity = (params.city || DEFAULT_CITY).toLowerCase()
  const { places } = await loadPlaces(currentCity)
  const currentCityLabel = capitalise(currentCity)

  return (
    <main
      className="relative min-h-[100dvh]"
      style={{
        background: '#FFFFFF',
        color: '#0A0A0A',
      }}
    >
      {/* HEADER — IndoCity wordmark on the left (Ind + pin + City), nothing
          on the right. Mirrors the /places header pattern verbatim. */}
      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center hover:opacity-85 transition"
            aria-label="IndoCity home"
          >
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              Ind
            </span>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] mx-[1px] translate-y-[3px]"
            >
              <path
                d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
                fill="#FACC15"
              />
              <circle cx="12" cy="10" r="3" fill="#FFFFFF" />
            </svg>
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              City
            </span>
          </Link>
        </div>
      </header>

      {/* WHITE CARD CONTAINER — same posture as /places. Profile clicks
          inside the browser still route to /places/[slug] (same detail
          surface) since there's no separate /food/[slug] route. */}
      <div className="px-[15px] pb-10">
        <PlacesBrowser
          places={places}
          currentCityLabel={currentCityLabel}
          chips={FOOD_CHIPS}
          title={`Food in ${currentCityLabel}`}
          subtitle={`Best restaurants, cafés, bars across ${currentCityLabel}`}
        />
      </div>
    </main>
  )
}
