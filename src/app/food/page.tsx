import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
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
// Compliance posture: CityDrivers is a software directory (PM 12/2019). The
// list labels venues as "self-listed". No fake "verified" / "official
// partner" badges — only data the row actually carries is surfaced.
// ============================================================================

// Per-locale metadata. Bahasa text comes from messages/id.json; English
// text from messages/en.json. The catalog is looked up by locale at
// request time so the page title + description always match what
// the visitor sees on screen.
export async function generateMetadata() {
  const t = await getTranslations('verticals.food')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: 'https://kita2u.com/food' },
  }
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

// Chip rail labels are now built per-request from the catalog so the
// "All" / "Resto" / "Café" labels reflect the active locale.
function buildChips(t: (k: string) => string, common: (k: string) => string) {
  return [
    { id: 'all',        label: common('chipAll')       },
    { id: 'restaurant', label: t('chipRestaurant')     },
    { id: 'cafe',       label: t('chipCafe')           },
    { id: 'bar',        label: t('chipBar')            },
    { id: 'club',       label: t('chipClub')           },
  ] as const
}

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
      .eq('status', 'approved')
      .is('mock_hidden_at', null)
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
  // Load translation catalog for this locale (resolved by next-intl from
  // the NEXT_LOCALE cookie set by middleware).
  const t       = await getTranslations('verticals.food')
  const tCommon = await getTranslations('verticals.common')
  const chips   = buildChips(t, tCommon)

  return (
    <main
      className="relative min-h-[100dvh]"
      style={{
        background: '#FFFFFF',
        color: '#0A0A0A',
      }}
    >
      {/* HEADER — Kita2u wordmark. Was CityDrivers ("Ind[pin]City") which is
          the wrong brand on the Kita2u marketplace. Per founder direction,
          category pages live under Kita2u, not CityDrivers. */}
      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center hover:opacity-85 transition"
            aria-label="Kita2u home"
          >
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              Kita
            </span>
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#FACC15', letterSpacing: '-0.02em' }}
            >
              2u
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
          chips={chips}
          title={t('title',    { city: currentCityLabel })}
          subtitle={t('subtitle', { city: currentCityLabel })}
          profileBasePath="/food"
          listHref="/signup?vertical=food"
          listLabel={tCommon('listCta')}
          listAria={t('listAria')}
        />
      </div>
    </main>
  )
}
