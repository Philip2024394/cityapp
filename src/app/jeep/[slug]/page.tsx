import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import JsonLd from '@/components/seo/JsonLd'
import ProfileViewBeacon from '@/components/profile/ProfileViewBeacon'
import VehicleProfileShell, { type VehiclePublic } from '@/components/profile/VehicleProfileShell'
import { JEEP_BANNERS, bannerForSlug } from '@/lib/drivers/banners'
import { MOCK_LANGUAGES } from '@/lib/tours/templates'

// =============================================================================
// /jeep/[slug] — public per-driver profile page (Jeep vertical).
// =============================================================================
// CityDrivers is a SOFTWARE DIRECTORY under PM 12/2019. This page surfaces a
// single jeep driver who self-publishes their own min_fee + price_per_km.
// CityDrivers never sets, computes, appoints, or matches fares.
//
// The page is server-rendered for SEO (loader + generateMetadata + JsonLd +
// ProfileViewBeacon all stay server-side). The visual layout itself is the
// shared VehicleProfileShell — a 1-for-1 copy of the beautician profile
// page layout so every vehicle vertical reads as one product surface. See
// src/components/profile/VehicleProfileShell.tsx for the layout itself.
// =============================================================================

// CRITICAL: force-dynamic on Cloudflare Workers (ISR `revalidate=300`
// silently breaks on open-next — Worker serves the empty build-time
// shell instead of SSR'ing per request). See /r/[slug] for the full
// incident note.
export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://citydrivers.id'

// -----------------------------------------------------------------------------
// Loader — `drivers` first (real) then `mock_drivers` (demo jeep mocks seeded
// in mig 0093). drivers.brand_logo_url ↔ mock_drivers.profile_image_url is
// normalised to a single `profile_image_url` field so the rendering layer
// never branches on row origin.
// -----------------------------------------------------------------------------

type JeepDriver = {
  source:              'real' | 'mock'
  id:                  string
  slug:                string
  business_name:       string
  bio:                 string | null
  whatsapp_e164:       string | null
  profile_image_url:   string | null
  cover_image_url:     string | null
  city:                string | null
  area:                string | null
  rating:              number | null
  trips_count:         number | null
  availability:        'online' | 'busy' | 'offline' | null
  min_fee:             number | null
  price_per_km:        number | null
  service_zone_radius_km: number | null
  vehicle_make:        string | null
  vehicle_model:       string | null
  vehicle_year:        number | null
  vehicle_color:       string | null
  vehicle_plate:       string | null
  vehicle_seats:       number | null
  vehicle_photos:      string[]
  service_offerings:   string[]
  /** Spoken languages (mig 0157, ISO 639-1). Real-driver rows pull from
   *  drivers.languages; mock rows fall back to MOCK_LANGUAGES so demo
   *  profiles still surface the avatar flag badge. */
  languages:           string[]
  // Per-slot availability flags (mig 0156) — surfaced as emoji chips on
  // the public profile when at least one is enabled.
  available_sunrise:   boolean | null
  available_daytime:   boolean | null
  available_evening:   boolean | null
  available_nightlife: boolean | null
  // Hourly hire opt-in + per-tier rates (mig 0156).
  hourly_enabled:      boolean | null
  hourly_3h_rate_idr:  number | null
  hourly_6h_rate_idr:  number | null
  hourly_8h_rate_idr:  number | null
  // Long-term rental rates — bus parity. Surfaced via RentalContractCards
  // on the public profile when at least one tier > 0.
  rental_daily_rate_idr:   number | null
  rental_weekly_rate_idr:  number | null
  rental_monthly_rate_idr: number | null
}

function parseVehiclePhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function parseServiceOfferings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string')
}

async function loadJeepDriver(slug: string): Promise<JeepDriver | null> {
  if (!slug || !/^[a-z0-9_-]+$/i.test(slug)) return null
  const admin = getAdminSupabase()
  if (!admin) return null

  // 1. Real driver — vehicle_type='jeep' gate so a bike/car slug
  //    collision can't bleed onto a /jeep URL.
  const real = await admin
    .from('drivers')
    .select(`
      user_id, slug, business_name, bio, whatsapp_e164, brand_logo_url,
      cover_image_url, city, area, rating, trips_count, availability,
      min_fee, price_per_km, service_zone_radius_km,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
      service_offerings, languages,
      available_sunrise, available_daytime, available_evening, available_nightlife,
      hourly_enabled, hourly_3h_rate_idr, hourly_6h_rate_idr, hourly_8h_rate_idr,
      rental_daily_rate_idr, rental_weekly_rate_idr, rental_monthly_rate_idr,
      status
    `)
    .eq('slug', slug)
    .eq('vehicle_type', 'jeep')
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
      cover_image_url:        (r.cover_image_url as string | null) ?? null,
      city:                   (r.city as string | null) ?? null,
      area:                   (r.area as string | null) ?? null,
      rating:                 (r.rating as number | null) ?? null,
      trips_count:            (r.trips_count as number | null) ?? null,
      availability:           (r.availability as JeepDriver['availability']) ?? null,
      min_fee:                (r.min_fee as number | null) ?? null,
      price_per_km:           (r.price_per_km as number | null) ?? null,
      service_zone_radius_km: (r.service_zone_radius_km as number | null) ?? null,
      vehicle_make:           (r.vehicle_make as string | null) ?? null,
      vehicle_model:          (r.vehicle_model as string | null) ?? null,
      vehicle_year:           (r.vehicle_year as number | null) ?? null,
      vehicle_color:          (r.vehicle_color as string | null) ?? null,
      vehicle_plate:          (r.vehicle_plate as string | null) ?? null,
      vehicle_seats:          (r.vehicle_seats as number | null) ?? null,
      vehicle_photos:         parseVehiclePhotos(r.vehicle_photos),
      service_offerings:      parseServiceOfferings(r.service_offerings),
      languages:              Array.isArray(r.languages)
        ? (r.languages as unknown[]).filter((x): x is string => typeof x === 'string')
        : ['id'],
      available_sunrise:       (r.available_sunrise   as boolean | null) ?? null,
      available_daytime:       (r.available_daytime   as boolean | null) ?? null,
      available_evening:       (r.available_evening   as boolean | null) ?? null,
      available_nightlife:     (r.available_nightlife as boolean | null) ?? null,
      hourly_enabled:          (r.hourly_enabled        as boolean | null) ?? null,
      hourly_3h_rate_idr:      (r.hourly_3h_rate_idr    as number | null) ?? null,
      hourly_6h_rate_idr:      (r.hourly_6h_rate_idr    as number | null) ?? null,
      hourly_8h_rate_idr:      (r.hourly_8h_rate_idr    as number | null) ?? null,
      rental_daily_rate_idr:   (r.rental_daily_rate_idr   as number | null) ?? null,
      rental_weekly_rate_idr:  (r.rental_weekly_rate_idr  as number | null) ?? null,
      rental_monthly_rate_idr: (r.rental_monthly_rate_idr as number | null) ?? null,
    }
  }

  // 2. Mock fallback (demo jeep drivers seeded in mig 0093).
  const mock = await admin
    .from('mock_drivers')
    .select(`
      id, slug, business_name, bio, whatsapp_e164, profile_image_url,
      cover_image_url, city, area, rating, availability,
      min_fee, price_per_km,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
      service_offerings
    `)
    .eq('slug', slug)
    .eq('vehicle_type', 'jeep')
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
      // Mock fallback: deterministic JEEP_BANNERS pick per slug so each
      // demo jeep profile gets a distinct hero from the dashboard library.
      cover_image_url:        (r.cover_image_url as string | null) ?? bannerForSlug(slug, JEEP_BANNERS),
      city:                   (r.city as string | null) ?? null,
      area:                   (r.area as string | null) ?? null,
      rating:                 (r.rating as number | null) ?? null,
      trips_count:            null,
      availability:           (r.availability as JeepDriver['availability']) ?? null,
      min_fee:                (r.min_fee as number | null) ?? null,
      price_per_km:           (r.price_per_km as number | null) ?? null,
      service_zone_radius_km: null,
      vehicle_make:           (r.vehicle_make as string | null) ?? null,
      vehicle_model:          (r.vehicle_model as string | null) ?? null,
      vehicle_year:           (r.vehicle_year as number | null) ?? null,
      vehicle_color:          (r.vehicle_color as string | null) ?? null,
      vehicle_plate:          (r.vehicle_plate as string | null) ?? null,
      vehicle_seats:          (r.vehicle_seats as number | null) ?? null,
      vehicle_photos:         parseVehiclePhotos(r.vehicle_photos),
      service_offerings:      parseServiceOfferings(r.service_offerings),
      // mock_drivers doesn't carry mig 0157's `languages` column — mocks
      // borrow the per-slug entries from MOCK_LANGUAGES, defaulting to
      // Indonesian-only when the slug isn't seeded there.
      languages:              MOCK_LANGUAGES[slug] ?? ['id'],
      available_sunrise:       null,
      available_daytime:       null,
      available_evening:       null,
      available_nightlife:     null,
      hourly_enabled:          null,
      hourly_3h_rate_idr:      null,
      hourly_6h_rate_idr:      null,
      hourly_8h_rate_idr:      null,
      rental_daily_rate_idr:   null,
      rental_weekly_rate_idr:  null,
      rental_monthly_rate_idr: null,
    }
  }

  return null
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatIdr(amount: number | null | undefined): string | null {
  if (typeof amount !== 'number' || amount <= 0) return null
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function vehicleHeadline(d: JeepDriver): string {
  const parts = [d.vehicle_make, d.vehicle_model].filter(Boolean) as string[]
  if (parts.length === 0) return 'Jeep'
  return parts.join(' ')
}

// Adapter — JeepDriver → VehiclePublic. Surfaces min_fee + price_per_km
// as the two rate rows inside the beautician-style services-menu slot.
function jeepDriverToVehiclePublic(d: JeepDriver): VehiclePublic {
  const minFee = formatIdr(d.min_fee)
  const perKm  = formatIdr(d.price_per_km)
  const rateRows: VehiclePublic['rate_rows'] = [
    {
      label: 'From',
      value: minFee ? `From ${minFee}` : 'Not yet published',
    },
    {
      label: 'Per kilometer',
      value: perKm ? `${perKm} / km` : 'Not yet published',
    },
  ]
  const capacityNote = (d.vehicle_seats != null && d.vehicle_seats > 0)
    ? `Seats ${d.vehicle_seats} passengers.`
    : null

  return {
    id:                     d.id,
    slug:                   d.slug,
    display_name:           d.business_name,
    bio:                    d.bio,
    whatsapp_e164:          d.whatsapp_e164,
    profile_image_url:      d.profile_image_url,
    cover_image_url:        d.cover_image_url,
    city:                   d.city,
    area:                   d.area,
    rating:                 d.rating,
    rating_count:           d.trips_count,
    availability:           d.availability,
    service_zone_radius_km: d.service_zone_radius_km,
    vehicle_make:           d.vehicle_make,
    vehicle_model:          d.vehicle_model,
    vehicle_year:           d.vehicle_year,
    vehicle_color:          d.vehicle_color,
    vehicle_plate:          d.vehicle_plate,
    vehicle_seats:          d.vehicle_seats,
    vehicle_photos:         d.vehicle_photos,
    service_offerings:      d.service_offerings,
    start_price_idr:        d.min_fee,
    rate_rows:              rateRows,
    rate_footnote:          capacityNote,
    languages:              d.languages,
    available_sunrise:      d.available_sunrise,
    available_daytime:      d.available_daytime,
    available_evening:      d.available_evening,
    available_nightlife:    d.available_nightlife,
    hourly_enabled:         d.hourly_enabled,
    hourly_3h_rate_idr:     d.hourly_3h_rate_idr,
    hourly_6h_rate_idr:     d.hourly_6h_rate_idr,
    hourly_8h_rate_idr:     d.hourly_8h_rate_idr,
    rental_daily_rate_idr:  d.rental_daily_rate_idr,
    rental_weekly_rate_idr: d.rental_weekly_rate_idr,
    rental_monthly_rate_idr:d.rental_monthly_rate_idr,
  }
}

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const d = await loadJeepDriver(slug).catch(() => null)
  if (!d) return { title: 'Driver not found', robots: { index: false, follow: false } }
  const vehicle = vehicleHeadline(d)
  const where   = [d.area, d.city].filter(Boolean).join(', ') || 'Indonesia'
  const title       = `${d.business_name} · ${vehicle} · ${where}`
  const description = (d.bio?.trim())
    || `${d.business_name} — driver jeep ${vehicle} di ${where}. Hubungi langsung via WhatsApp untuk menyepakati tarif.`
  const canonical   = `${SITE_URL}/jeep/${d.slug}`
  const cover       = d.vehicle_photos[0] || d.cover_image_url || d.profile_image_url || undefined
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
      ? { index: false, follow: true }
      : undefined,
  }
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function JeepDriverProfilePage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await loadJeepDriver(slug)
  if (!d) notFound()

  // Lapsed-driver redirect — mirrors /r/[slug]:577-580.
  if (d.source === 'real') {
    const adminCheck = getAdminSupabase()
    if (adminCheck) {
      const { data: sub } = await adminCheck
        .from('subscriptions')
        .select('status')
        .eq('driver_id', d.id)
        .maybeSingle()
      const st = (sub?.status as string | undefined) ?? null
      if (st === 'past_due' || st === 'canceled') {
        const qs = new URLSearchParams({ from: 'lapsed_driver', slug: d.slug })
        redirect(`/cari?${qs.toString()}`)
      }
    }
  }

  const jsonLd: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'LocalBusiness',
    '@id':        `${SITE_URL}/jeep/${d.slug}`,
    name:         d.business_name,
    description:  d.bio || undefined,
    url:          `${SITE_URL}/jeep/${d.slug}`,
    image:        d.vehicle_photos[0] || d.cover_image_url || d.profile_image_url || undefined,
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
      <ProfileViewBeacon providerType="driver" providerId={d.id} />
      <VehicleProfileShell vehicle={jeepDriverToVehiclePublic(d)} vehicleType="jeep" />
    </>
  )
}
