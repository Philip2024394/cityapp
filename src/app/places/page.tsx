import Link from 'next/link'
import PlacesBrowser from '@/components/places/PlacesBrowser'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { haversineKm } from '@/lib/geo/haversine'
import type { Place, PlaceCategory, CityZone } from '@/lib/places/types'

// ============================================================================
// /places — White-card directory of self-listed venues (2026-05-27 redesign)
// ----------------------------------------------------------------------------
// Replaces the dark glass-card layout with a /cari-style white container.
// Server-renders the data, then hands off to <PlacesBrowser>, a small client
// island that owns search + chip-filter + GPS-sort state.
//
// Compliance posture: IndoCity is a software directory (PM 12/2019). The
// list labels venues as "self-listed". No fake "verified" / "official
// partner" badges — only data the row actually carries is surfaced.
//
// Phase 1 hardcodes the default city to Yogyakarta. Multi-city support is
// a `?city=` query param + zones lookup away.
// ============================================================================

export const metadata = {
  title: 'Places · IndoCity',
  description:
    'Browse self-listed venues — restaurants, cafés, beaches, temples, ' +
    'hotels — near you in Indonesia. IndoCity is a software directory.',
  alternates: { canonical: 'https://indocity.id/places' },
}

// Force fresh data on every request so newly-approved places land without a
// redeploy. Aligns with /car and /rentals which use the same posture.
export const dynamic = 'force-dynamic'

const DEFAULT_CITY = 'yogyakarta'

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

// Server-side fetch of every approved place in a city + the zone's
// centroid + bounds. We compute isOutOfZone + returnKm here so the client
// island can render distance / out-of-city badges without a round-trip
// once GPS lands. Uses the service-role admin client (page is fully
// public, RLS on places is "approved-only readable", but using admin
// keeps the read consistent with /car and /rentals).
async function loadPlaces(city: string): Promise<{ places: Place[]; zone: CityZone | null }> {
  const admin = getAdminSupabase()
  if (!admin) return { places: [], zone: null }

  const [placesRes, zoneRes] = await Promise.all([
    admin
      .from('places')
      .select('id, slug, name, category, description, image_urls, city, address, tags, lat, lng')
      .eq('city', city)
      .eq('status', 'approved')
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

export default async function PlacesPage({
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
          on the right. Mirrors the /cari header pattern but on a white
          surface so the wordmark sits in brand-navy + brand-yellow rather
          than white. */}
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

      {/* WHITE CARD CONTAINER — 15px horizontal screen-edge insets, max
          width 640 on desktop. Rounded on ALL corners since this surface
          isn't fixed-to-footer like /cari is. Sits over the page's white
          body so it reads as a softly-elevated panel. */}
      <div className="px-[15px] pb-10">
        <PlacesBrowser places={places} currentCityLabel={currentCityLabel} />
      </div>
    </main>
  )
}
