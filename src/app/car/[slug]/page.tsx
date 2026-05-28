import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import JsonLd from '@/components/seo/JsonLd'
import DriverProfileShell, { type DriverPublic } from '@/components/profile/DriverProfileShell'

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
    }
  }

  return null
}

// -----------------------------------------------------------------------------
// Alternatives loader — populated only when the page driver is NOT online.
// Queries the public `drivers_public` view via the admin client for active
// car drivers excluding the current slug, capped at 5 rows. Sort is done
// inside the shell once we have both anchors.
// -----------------------------------------------------------------------------
async function loadAlternativeCarDrivers(excludeSlug: string): Promise<CarDriver[]> {
  const admin = getAdminSupabase()
  if (!admin) return []
  const { data, error } = await admin
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
    .limit(5)
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map((r) => ({
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
  }))
}

// -----------------------------------------------------------------------------
// Adapter — server CarDriver → DriverPublic (the shell shape).
// -----------------------------------------------------------------------------
function carDriverToDriverPublic(d: CarDriver): DriverPublic {
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
        driver={carDriverToDriverPublic(d)}
        alternatives={alternatives.map(carDriverToDriverPublic)}
      />
    </>
  )
}
