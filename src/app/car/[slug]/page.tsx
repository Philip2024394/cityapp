import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import JsonLd from '@/components/seo/JsonLd'
import DriverProfileShell, { type DriverPublic } from '@/components/profile/DriverProfileShell'
import type { TourPackage } from '@/lib/tours/types'
import { MOCK_LANGUAGES, mockToursForSlug } from '@/lib/tours/templates'

// =============================================================================
// /car/[slug] — public per-driver profile page (car vertical)
// =============================================================================
// IndoCity is a SOFTWARE DIRECTORY under PM 12/2019. This page surfaces a
// single car driver who self-publishes their own min_fee + price_per_km.
// Customer's destination from /cari driver-result cards — renders the
// shared DriverProfileShell which embeds the booking widget (typed pickup
// + dropoff + multi-stop + WhatsApp deep-link) and the alternatives
// fallback when the page driver is busy/offline.
//
// Server-rendered so every car driver gets an indexable URL. Slug lookup
// hits BOTH `drivers` (real) and `mock_drivers` (demo fallback); returns
// 404 if neither table has the slug. The booking widget itself is a
// client component (DriverProfileShell) — the page passes server-loaded
// data into it as props.
// =============================================================================

export const revalidate = 300

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id'

// -----------------------------------------------------------------------------
// Loader — checks `drivers` first (real) then falls back to `mock_drivers`.
// Both tables share most column names but a few diverge:
//   drivers.brand_logo_url  ↔  mock_drivers.profile_image_url
// The CarDriver shape below normalises that into a single `profile_image_url`
// field so the rendering code doesn't branch on origin.
// -----------------------------------------------------------------------------

type CarDriver = {
  source:              'real' | 'mock'
  id:                  string
  slug:                string
  business_name:       string
  bio:                 string | null
  whatsapp_e164:       string | null
  profile_image_url:   string | null
  city:                string | null
  area:                string | null
  rating:              number | null
  trips_count:         number | null
  availability:        'online' | 'busy' | 'offline' | null
  min_fee:             number | null
  price_per_km:        number | null
  pitstop_fee:         number | null
  service_zone_radius_km: number | null
  vehicle_make:        string | null
  vehicle_model:       string | null
  vehicle_year:        number | null
  vehicle_color:       string | null
  vehicle_plate:       string | null
  vehicle_seats:       number | null
  vehicle_photos:      string[]
  services:            string[]
  /** Driver-selected trip-type tags (mig 0110). See
   *  src/lib/drivers/serviceOfferings.ts for the canonical id list. */
  service_offerings:   string[]
  current_lat:         number | null
  current_lng:         number | null
  cover_image_url:     string | null
  // ── Hourly hire opt-in + per-tier rates (mig 0156). Null on mock rows
  //    which fall back to hourlyDefaultsForVehicle() in the shell. ──
  hourly_enabled:      boolean | null
  hourly_3h_rate_idr:  number | null
  hourly_6h_rate_idr:  number | null
  hourly_8h_rate_idr:  number | null
  working_hours_start: string | null
  working_hours_end:   string | null
  available_sunrise:   boolean | null
  available_daytime:   boolean | null
  available_evening:   boolean | null
  available_nightlife: boolean | null
  // ── Parcel B2B 5-tier rate ladder (mig 0149). Falls back to vehicle
  //    defaults in the shell when null. ──
  parcel_rate_tiers:   unknown | null
  /** ISO 639-1 language codes (mig 0157). */
  languages:           string[]
}

function parseVehiclePhotos(raw: unknown): string[] {
  // vehicle_photos is a jsonb array of public URLs. Defensive: tolerate
  // legacy rows where it's null, an object, or contains non-strings.
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function parseServices(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string')
}

async function loadCarDriver(slug: string): Promise<CarDriver | null> {
  if (!slug || !/^[a-z0-9_-]+$/i.test(slug)) return null
  const admin = getAdminSupabase()
  if (!admin) return null

  // 1. Real driver — vehicle_type='car' gate so we don't render a bike row
  //    via the /car URL even if slugs ever collide.
  const real = await admin
    .from('drivers')
    .select(`
      user_id, slug, business_name, bio, whatsapp_e164, brand_logo_url,
      city, area, rating, trips_count, availability,
      min_fee, price_per_km, pitstop_fee, service_zone_radius_km,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
      services, service_offerings, current_lat, current_lng, cover_image_url,
      hourly_enabled, hourly_3h_rate_idr, hourly_6h_rate_idr, hourly_8h_rate_idr,
      working_hours_start, working_hours_end,
      available_sunrise, available_daytime, available_evening, available_nightlife,
      parcel_rate_tiers, languages,
      status
    `)
    .eq('slug', slug)
    .eq('vehicle_type', 'car')
    .eq('status', 'active')
    .maybeSingle()

  if (real.data) {
    const r = real.data as Record<string, unknown>
    return {
      source:                 'real',
      id:                     String(r.user_id ?? slug),
      slug,
      business_name:          String(r.business_name ?? slug),
      bio:                    (r.bio as string | null) ?? null,
      whatsapp_e164:          (r.whatsapp_e164 as string | null) ?? null,
      profile_image_url:      (r.brand_logo_url as string | null) ?? null,
      city:                   (r.city as string | null) ?? null,
      area:                   (r.area as string | null) ?? null,
      rating:                 (r.rating as number | null) ?? null,
      trips_count:            (r.trips_count as number | null) ?? null,
      availability:           (r.availability as CarDriver['availability']) ?? null,
      min_fee:                (r.min_fee as number | null) ?? null,
      price_per_km:           (r.price_per_km as number | null) ?? null,
      pitstop_fee:            (r.pitstop_fee as number | null) ?? null,
      service_zone_radius_km: (r.service_zone_radius_km as number | null) ?? null,
      vehicle_make:           (r.vehicle_make as string | null) ?? null,
      vehicle_model:          (r.vehicle_model as string | null) ?? null,
      vehicle_year:           (r.vehicle_year as number | null) ?? null,
      vehicle_color:          (r.vehicle_color as string | null) ?? null,
      vehicle_plate:          (r.vehicle_plate as string | null) ?? null,
      vehicle_seats:          (r.vehicle_seats as number | null) ?? null,
      vehicle_photos:         parseVehiclePhotos(r.vehicle_photos),
      services:               parseServices(r.services),
      service_offerings:      parseServices(r.service_offerings),
      current_lat:            (r.current_lat as number | null) ?? null,
      current_lng:            (r.current_lng as number | null) ?? null,
      cover_image_url:        (r.cover_image_url as string | null) ?? null,
      hourly_enabled:         (r.hourly_enabled as boolean | null) ?? null,
      hourly_3h_rate_idr:     (r.hourly_3h_rate_idr as number | null) ?? null,
      hourly_6h_rate_idr:     (r.hourly_6h_rate_idr as number | null) ?? null,
      hourly_8h_rate_idr:     (r.hourly_8h_rate_idr as number | null) ?? null,
      working_hours_start:    (r.working_hours_start as string | null) ?? null,
      working_hours_end:      (r.working_hours_end as string | null) ?? null,
      available_sunrise:      (r.available_sunrise as boolean | null) ?? null,
      available_daytime:      (r.available_daytime as boolean | null) ?? null,
      available_evening:      (r.available_evening as boolean | null) ?? null,
      available_nightlife:    (r.available_nightlife as boolean | null) ?? null,
      parcel_rate_tiers:      r.parcel_rate_tiers ?? null,
      languages:              Array.isArray(r.languages)
        ? (r.languages as unknown[]).filter((x): x is string => typeof x === 'string')
        : ['id'],
    }
  }

  // 2. Mock fallback — only if the real query missed. Demo car drivers
  //    seeded in migration 0093 (Yogyakarta). vehicle_type filter keeps
  //    the existing bike mocks from leaking onto a /car URL.
  const mock = await admin
    .from('mock_drivers')
    .select(`
      id, slug, business_name, bio, whatsapp_e164, profile_image_url,
      city, area, rating, availability,
      min_fee, price_per_km,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
      services, service_offerings, cover_image_url
    `)
    .eq('slug', slug)
    .eq('vehicle_type', 'car')
    .is('mock_hidden_at', null)
    .maybeSingle()

  if (mock.data) {
    const r = mock.data as Record<string, unknown>
    return {
      source:                 'mock',
      id:                     String(r.id ?? slug),
      slug,
      business_name:          String(r.business_name ?? slug),
      bio:                    (r.bio as string | null) ?? null,
      whatsapp_e164:          (r.whatsapp_e164 as string | null) ?? null,
      profile_image_url:      (r.profile_image_url as string | null) ?? null,
      city:                   (r.city as string | null) ?? null,
      area:                   (r.area as string | null) ?? null,
      rating:                 (r.rating as number | null) ?? null,
      trips_count:            null,
      availability:           (r.availability as CarDriver['availability']) ?? null,
      min_fee:                (r.min_fee as number | null) ?? null,
      price_per_km:           (r.price_per_km as number | null) ?? null,
      pitstop_fee:            null,
      service_zone_radius_km: null,
      vehicle_make:           (r.vehicle_make as string | null) ?? null,
      vehicle_model:          (r.vehicle_model as string | null) ?? null,
      vehicle_year:           (r.vehicle_year as number | null) ?? null,
      vehicle_color:          (r.vehicle_color as string | null) ?? null,
      vehicle_plate:          (r.vehicle_plate as string | null) ?? null,
      vehicle_seats:          (r.vehicle_seats as number | null) ?? null,
      vehicle_photos:         parseVehiclePhotos(r.vehicle_photos),
      services:               parseServices(r.services),
      service_offerings:      parseServices(r.service_offerings),
      current_lat:            null,
      current_lng:            null,
      cover_image_url:        (r.cover_image_url as string | null) ?? null,
      // Mock rows don't carry the mig-0156 hourly columns; the shell
      // detects this via vehicle_type==='car' + null hourly_enabled and
      // falls back to hourlyDefaultsForVehicle() so the demo car mocks
      // always render the Hourly tab.
      hourly_enabled:         null,
      hourly_3h_rate_idr:     null,
      hourly_6h_rate_idr:     null,
      hourly_8h_rate_idr:     null,
      working_hours_start:    null,
      working_hours_end:      null,
      available_sunrise:      null,
      available_daytime:      null,
      available_evening:      null,
      available_nightlife:    null,
      parcel_rate_tiers:      null,
      languages:              MOCK_LANGUAGES[slug] ?? ['id'],
    }
  }

  return null
}

// -----------------------------------------------------------------------------
// Alternatives loader — populated only when the page driver is NOT online.
// UNIONs real car drivers from `drivers_public` with visible car mocks from
// `mock_drivers`, excluding the current slug, capped at 10 rows total.
// Without the mock union, customers landing on an offline mock driver's
// profile would see "no alternatives" even though the demo pool has other
// online mock cars (HIGH-severity booking-accuracy bug). Sort is done
// inside the shell once we have both anchors.
// -----------------------------------------------------------------------------
async function loadAlternativeCarDrivers(excludeSlug: string): Promise<CarDriver[]> {
  const admin = getAdminSupabase()
  if (!admin) return []
  const [realRes, mockRes] = await Promise.all([
    admin
      .from('drivers_public')
      .select(`
        user_id, slug, business_name, bio, whatsapp_e164, brand_logo_url,
        city, area, rating, trips_count, availability,
        min_fee, price_per_km, pitstop_fee, service_zone_radius_km,
        vehicle_type, vehicle_make, vehicle_model, vehicle_year,
        vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
        services, current_lat, current_lng
      `)
      .eq('vehicle_type', 'car')
      .eq('availability', 'online')
      .neq('slug', excludeSlug)
      .order('last_active_at', { ascending: false, nullsFirst: false })
      .limit(10),
    admin
      .from('mock_drivers')
      .select(`
        id, slug, business_name, bio, whatsapp_e164, profile_image_url,
        city, area, rating, availability,
        min_fee, price_per_km,
        vehicle_type, vehicle_make, vehicle_model, vehicle_year,
        vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
        services, service_offerings, cover_image_url
      `)
      .eq('vehicle_type', 'car')
      .eq('availability', 'online')
      .is('mock_hidden_at', null)
      .neq('slug', excludeSlug)
      .limit(10),
  ])

  const reals: CarDriver[] = (realRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    return {
      source:                 'real',
      id:                     String(r.user_id ?? r.slug),
      slug:                   String(r.slug ?? ''),
      business_name:          String(r.business_name ?? ''),
      bio:                    (r.bio as string | null) ?? null,
      whatsapp_e164:          (r.whatsapp_e164 as string | null) ?? null,
      profile_image_url:      (r.brand_logo_url as string | null) ?? null,
      city:                   (r.city as string | null) ?? null,
      area:                   (r.area as string | null) ?? null,
      rating:                 (r.rating as number | null) ?? null,
      trips_count:            (r.trips_count as number | null) ?? null,
      availability:           (r.availability as CarDriver['availability']) ?? null,
      min_fee:                (r.min_fee as number | null) ?? null,
      price_per_km:           (r.price_per_km as number | null) ?? null,
      pitstop_fee:            (r.pitstop_fee as number | null) ?? null,
      service_zone_radius_km: (r.service_zone_radius_km as number | null) ?? null,
      vehicle_make:           (r.vehicle_make as string | null) ?? null,
      vehicle_model:          (r.vehicle_model as string | null) ?? null,
      vehicle_year:           (r.vehicle_year as number | null) ?? null,
      vehicle_color:          (r.vehicle_color as string | null) ?? null,
      vehicle_plate:          (r.vehicle_plate as string | null) ?? null,
      vehicle_seats:          (r.vehicle_seats as number | null) ?? null,
      vehicle_photos:         parseVehiclePhotos(r.vehicle_photos),
      services:               parseServices(r.services),
      service_offerings:      [],  // drivers_public view doesn't expose service_offerings yet (deferred — same pattern as cover_image_url)
      current_lat:            (r.current_lat as number | null) ?? null,
      current_lng:            (r.current_lng as number | null) ?? null,
      cover_image_url:        null,  // drivers_public view doesn't expose cover_image_url yet (deferred)
      // Hourly + availability + parcel columns aren't on drivers_public yet;
      // alternative cards don't render the full Services tab UI so null is fine.
      hourly_enabled:         null,
      hourly_3h_rate_idr:     null,
      hourly_6h_rate_idr:     null,
      hourly_8h_rate_idr:     null,
      working_hours_start:    null,
      working_hours_end:      null,
      available_sunrise:      null,
      available_daytime:      null,
      available_evening:      null,
      available_nightlife:    null,
      parcel_rate_tiers:      null,
      languages:              [],
    }
  })

  // Mock rows reuse the same per-page driver mock-mapper shape (see
  // loadCarDriver mock branch above) so the shell renders them identically.
  const mocks: CarDriver[] = (mockRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    return {
      source:                 'mock',
      id:                     String(r.id ?? r.slug),
      slug:                   String(r.slug ?? ''),
      business_name:          String(r.business_name ?? ''),
      bio:                    (r.bio as string | null) ?? null,
      whatsapp_e164:          (r.whatsapp_e164 as string | null) ?? null,
      profile_image_url:      (r.profile_image_url as string | null) ?? null,
      city:                   (r.city as string | null) ?? null,
      area:                   (r.area as string | null) ?? null,
      rating:                 (r.rating as number | null) ?? null,
      trips_count:            null,
      availability:           (r.availability as CarDriver['availability']) ?? null,
      min_fee:                (r.min_fee as number | null) ?? null,
      price_per_km:           (r.price_per_km as number | null) ?? null,
      pitstop_fee:            null,
      service_zone_radius_km: null,
      vehicle_make:           (r.vehicle_make as string | null) ?? null,
      vehicle_model:          (r.vehicle_model as string | null) ?? null,
      vehicle_year:           (r.vehicle_year as number | null) ?? null,
      vehicle_color:          (r.vehicle_color as string | null) ?? null,
      vehicle_plate:          (r.vehicle_plate as string | null) ?? null,
      vehicle_seats:          (r.vehicle_seats as number | null) ?? null,
      vehicle_photos:         parseVehiclePhotos(r.vehicle_photos),
      services:               parseServices(r.services),
      service_offerings:      parseServices(r.service_offerings),
      current_lat:            null,
      current_lng:            null,
      cover_image_url:        (r.cover_image_url as string | null) ?? null,
      hourly_enabled:         null,
      hourly_3h_rate_idr:     null,
      hourly_6h_rate_idr:     null,
      hourly_8h_rate_idr:     null,
      working_hours_start:    null,
      working_hours_end:      null,
      available_sunrise:      null,
      available_daytime:      null,
      available_evening:      null,
      available_nightlife:    null,
      parcel_rate_tiers:      null,
      languages:              MOCK_LANGUAGES[String(r.slug ?? '')] ?? ['id'],
    }
  })

  // Dedupe by slug — defence in depth in case a slug ever collides
  // between the real and mock pools — reals win.
  const seen = new Set<string>()
  const merged: CarDriver[] = []
  for (const d of [...reals, ...mocks]) {
    if (!d.slug || seen.has(d.slug)) continue
    seen.add(d.slug)
    merged.push(d)
  }
  return merged
}

// -----------------------------------------------------------------------------
// Tours loader — published tours for a single driver. Empty for mocks
// (no rows in driver_tour_packages keyed off a mock UUID).
// -----------------------------------------------------------------------------
async function loadPublishedTours(driverId: string): Promise<TourPackage[]> {
  const admin = getAdminSupabase()
  if (!admin) return []
  const { data, error } = await admin
    .from('driver_tour_packages')
    .select('*')
    .eq('driver_id', driverId)
    .eq('published', true)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map((r) => ({
    id:             String(r.id ?? ''),
    driver_id:      String(r.driver_id ?? driverId),
    template_id:    (r.template_id as string | null) ?? null,
    title:          String(r.title ?? ''),
    description:    (r.description as string | null) ?? null,
    duration_hours: Number(r.duration_hours ?? 0),
    max_pax:        (r.max_pax as number | null) ?? null,
    price_idr:      Number(r.price_idr ?? 0),
    includes:       Array.isArray(r.includes)
      ? (r.includes as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    excludes:       Array.isArray(r.excludes)
      ? (r.excludes as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    place_slugs:    Array.isArray(r.place_slugs)
      ? (r.place_slugs as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    photo_url:      (r.photo_url as string | null) ?? null,
    published:      Boolean(r.published ?? false),
    created_at:     String(r.created_at ?? ''),
    updated_at:     String(r.updated_at ?? ''),
  }))
}

// -----------------------------------------------------------------------------
// Adapter — server CarDriver → DriverPublic (the shell shape).
// -----------------------------------------------------------------------------
function carDriverToDriverPublic(d: CarDriver, tours: TourPackage[] = []): DriverPublic {
  return {
    id:             d.id,
    slug:           d.slug,
    business_name:  d.business_name,
    bio:            d.bio,
    whatsapp_e164:  d.whatsapp_e164,
    photo_url:      d.profile_image_url,
    city:           d.city,
    area:           d.area,
    rating:         d.rating,
    trips_count:    d.trips_count,
    availability:   d.availability,
    vehicle_type:   'car',
    vehicle_make:   d.vehicle_make,
    vehicle_model:  d.vehicle_model,
    vehicle_year:   d.vehicle_year,
    vehicle_color:  d.vehicle_color,
    vehicle_seats:  d.vehicle_seats,
    vehicle_photos: d.vehicle_photos,
    price_per_km:   d.price_per_km,
    min_fee:        d.min_fee,
    pitstop_fee:    d.pitstop_fee,
    lat:            d.current_lat,
    lng:            d.current_lng,
    services:       d.services,
    service_offerings: d.service_offerings ?? [],
    cover_image_url: d.cover_image_url,
    hourly_enabled:      d.hourly_enabled,
    hourly_3h_rate_idr:  d.hourly_3h_rate_idr,
    hourly_6h_rate_idr:  d.hourly_6h_rate_idr,
    hourly_8h_rate_idr:  d.hourly_8h_rate_idr,
    working_hours_start: d.working_hours_start,
    working_hours_end:   d.working_hours_end,
    available_sunrise:   d.available_sunrise,
    available_daytime:   d.available_daytime,
    available_evening:   d.available_evening,
    available_nightlife: d.available_nightlife,
    parcel_rate_tiers:   d.parcel_rate_tiers,
    languages:           d.languages,
    tours,
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function vehicleHeadline(d: CarDriver): string {
  const parts = [d.vehicle_make, d.vehicle_model].filter(Boolean) as string[]
  if (parts.length === 0) return 'Car'
  return parts.join(' ')
}

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const d = await loadCarDriver(slug).catch(() => null)
  if (!d) return { title: 'Driver not found', robots: { index: false, follow: false } }
  const vehicle = vehicleHeadline(d)
  const where   = [d.area, d.city].filter(Boolean).join(', ') || 'Indonesia'
  const title       = `${d.business_name} · ${vehicle} · ${where}`
  const description = (d.bio?.trim())
    || `${d.business_name} — driver mobil ${vehicle} di ${where}. Hubungi langsung via WhatsApp untuk menyepakati tarif.`
  const canonical   = `${SITE_URL}/car/${d.slug}`
  const cover       = d.vehicle_photos[0] || d.profile_image_url || undefined
  return {
    title, description,
    alternates: { canonical },
    openGraph:  {
      type: 'profile', url: canonical, title, description,
      images: cover ? [{ url: cover, alt: d.business_name }] : undefined,
    },
    twitter:    {
      card: 'summary_large_image', title, description,
      images: cover ? [cover] : undefined,
    },
    robots: d.source === 'mock'
      // Don't index demo rows — they exist to seed the marketplace,
      // not to compete with real drivers in search.
      ? { index: false, follow: true }
      : undefined,
  }
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function CarDriverProfilePage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await loadCarDriver(slug)
  if (!d) notFound()

  // Alternatives — only when the page driver is NOT online. Saves a
  // round-trip when the booking widget will render anyway.
  const isOffline = d.availability === 'busy' || d.availability === 'offline'
  const alternatives = isOffline ? await loadAlternativeCarDrivers(d.slug) : []
  // Tours — real drivers query driver_tour_packages; mocks render
  // synthetic tours from MOCK_TOUR_ASSIGNMENTS so the demo profiles
  // visibly carry the Tours tab on the public surface.
  const tours = d.source === 'real'
    ? await loadPublishedTours(d.id)
    : mockToursForSlug(d.slug)

  // Schema.org LocalBusiness — keeps the per-driver page eligible for
  // Knowledge Graph / Maps surfacing. priceRange is the generic 'Rp'
  // marker; we intentionally don't expose min_fee here because the
  // schema interpretation of price would suggest IndoCity is selling
  // a service at that price — which violates PM 12/2019 positioning.
  const jsonLd: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'LocalBusiness',
    '@id':        `${SITE_URL}/car/${d.slug}`,
    name:         d.business_name,
    description:  d.bio || undefined,
    url:          `${SITE_URL}/car/${d.slug}`,
    image:        d.vehicle_photos[0] || d.profile_image_url || undefined,
    telephone:    d.whatsapp_e164 ? `+${d.whatsapp_e164}` : undefined,
    priceRange:   'Rp',
    address: {
      '@type':          'PostalAddress',
      addressLocality: d.city || undefined,
      addressCountry:  'ID',
    },
    aggregateRating: (d.rating != null && d.rating > 0)
      ? {
          '@type':      'AggregateRating',
          ratingValue:  d.rating,
          reviewCount:  d.trips_count ?? 1,
          bestRating:   5,
          worstRating:  1,
        }
      : undefined,
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <DriverProfileShell
        driver={carDriverToDriverPublic(d, tours)}
        alternatives={alternatives.map((alt) => carDriverToDriverPublic(alt))}
      />
    </>
  )
}
