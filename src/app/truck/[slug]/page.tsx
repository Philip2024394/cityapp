import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import JsonLd from '@/components/seo/JsonLd'
import ProfileViewBeacon from '@/components/profile/ProfileViewBeacon'
import VehicleProfileShell, { type VehiclePublic } from '@/components/profile/VehicleProfileShell'
import { getDefaultBanner } from '@/lib/drivers/banners'
import { MOCK_LANGUAGES } from '@/lib/tours/templates'

// =============================================================================
// /truck/[slug] — public per-driver profile page (Truck rental vertical).
// =============================================================================
// CityDrivers is a SOFTWARE DIRECTORY under PM 12/2019. This page surfaces a
// single truck driver who self-publishes daily / weekly / monthly rental
// rates. CityDrivers never sets, computes, appoints, or matches prices.
//
// The page is server-rendered for SEO (loader + generateMetadata + JsonLd +
// ProfileViewBeacon all stay server-side). The visual layout itself is the
// shared VehicleProfileShell — a 1-for-1 copy of the beautician profile
// page layout (hero / floating info-card / About / Services chips /
// Portfolio carousel / promo marquee / Start-from + Contact CTA) so every
// vehicle vertical reads as one product surface. See
// src/components/profile/VehicleProfileShell.tsx for the layout itself.
// =============================================================================

// CRITICAL: force-dynamic on Cloudflare Workers (ISR `revalidate=300`
// silently breaks on open-next — Worker serves the empty build-time
// shell instead of SSR'ing per request). See /r/[slug] for the full
// incident note.
export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://citydrivers.id'

// -----------------------------------------------------------------------------
// Loader — `drivers` table first (real), then `mock_drivers` (demo seed).
// -----------------------------------------------------------------------------

type TruckDriver = {
  id:                      string
  slug:                    string
  business_name:           string
  bio:                     string | null
  whatsapp_e164:           string | null
  profile_image_url:       string | null
  cover_image_url:         string | null
  city:                    string | null
  area:                    string | null
  rating:                  number | null
  trips_count:             number | null
  availability:            'online' | 'busy' | 'offline' | null
  service_zone_radius_km:  number | null
  vehicle_make:            string | null
  vehicle_model:           string | null
  vehicle_year:            number | null
  vehicle_color:           string | null
  vehicle_plate:           string | null
  vehicle_seats:           number | null
  vehicle_photos:          string[]
  rental_daily_rate_idr:   number | null
  rental_weekly_rate_idr:  number | null
  rental_monthly_rate_idr: number | null
  rental_min_days:         number | null
  service_offerings:       string[]
  service_rates:           Record<string, { rates: { label: string; idr: number; per?: string }[] }>
  /** Spoken languages (mig 0157, ISO 639-1). Real-driver rows pull from
   *  drivers.languages; mock rows fall back to MOCK_LANGUAGES so demo
   *  profiles still surface the avatar flag badge. */
  languages:               string[]
  // Per-slot availability flags (mig 0156) — surfaced as chips on the
  // public profile when at least one is enabled.
  available_sunrise:       boolean | null
  available_daytime:       boolean | null
  available_evening:       boolean | null
  available_nightlife:     boolean | null
}

function parseVehiclePhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

// service_rates jsonb (mig 0169) — { [service_id]: { rates: RateRow[] } }.
// Defensive parser: returns {} on any shape mismatch so the public profile
// just falls back to the catalog default_rates.
function parseServiceRates(raw: unknown): Record<string, { rates: { label: string; idr: number; per?: string }[] }> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, { rates: { label: string; idr: number; per?: string }[] }> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue
    const ratesRaw = (val as { rates?: unknown }).rates
    if (!Array.isArray(ratesRaw)) continue
    const rates: { label: string; idr: number; per?: string }[] = []
    for (const r of ratesRaw) {
      if (!r || typeof r !== 'object') continue
      const row = r as { label?: unknown; idr?: unknown; per?: unknown }
      const label = typeof row.label === 'string' ? row.label : ''
      const idr   = typeof row.idr === 'number' && Number.isFinite(row.idr) ? row.idr : NaN
      if (!label || !Number.isFinite(idr) || idr <= 0) continue
      const per = typeof row.per === 'string' && row.per.trim() ? row.per : undefined
      rates.push({ label, idr, ...(per ? { per } : {}) })
    }
    if (rates.length > 0) out[key] = { rates }
  }
  return out
}

async function loadTruckDriver(slug: string): Promise<TruckDriver | null> {
  if (!slug || !/^[a-z0-9_-]+$/i.test(slug)) return null
  const admin = getAdminSupabase()
  if (!admin) return null

  const real = await admin
    .from('drivers')
    .select(`
      user_id, slug, business_name, bio, whatsapp_e164, brand_logo_url,
      cover_image_url, city, area, rating, trips_count, availability,
      service_zone_radius_km,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
      rental_daily_rate_idr, rental_weekly_rate_idr,
      rental_monthly_rate_idr, rental_min_days,
      service_offerings, service_rates, languages,
      available_sunrise, available_daytime, available_evening, available_nightlife,
      status
    `)
    .eq('slug', slug)
    .eq('vehicle_type', 'truck')
    .eq('status', 'active')
    .maybeSingle()

  if (real.data) {
    const r = real.data as Record<string, unknown>
    return {
      id:                      String(r.user_id ?? slug),
      slug,
      business_name:           String(r.business_name ?? slug),
      bio:                     (r.bio as string | null) ?? null,
      whatsapp_e164:           (r.whatsapp_e164 as string | null) ?? null,
      profile_image_url:       (r.brand_logo_url as string | null) ?? null,
      cover_image_url:         (r.cover_image_url as string | null) ?? null,
      city:                    (r.city as string | null) ?? null,
      area:                    (r.area as string | null) ?? null,
      rating:                  (r.rating as number | null) ?? null,
      trips_count:             (r.trips_count as number | null) ?? null,
      availability:            (r.availability as TruckDriver['availability']) ?? null,
      service_zone_radius_km:  (r.service_zone_radius_km as number | null) ?? null,
      vehicle_make:            (r.vehicle_make as string | null) ?? null,
      vehicle_model:           (r.vehicle_model as string | null) ?? null,
      vehicle_year:            (r.vehicle_year as number | null) ?? null,
      vehicle_color:           (r.vehicle_color as string | null) ?? null,
      vehicle_plate:           (r.vehicle_plate as string | null) ?? null,
      vehicle_seats:           (r.vehicle_seats as number | null) ?? null,
      vehicle_photos:          parseVehiclePhotos(r.vehicle_photos),
      rental_daily_rate_idr:   (r.rental_daily_rate_idr as number | null) ?? null,
      rental_weekly_rate_idr:  (r.rental_weekly_rate_idr as number | null) ?? null,
      rental_monthly_rate_idr: (r.rental_monthly_rate_idr as number | null) ?? null,
      rental_min_days:         (r.rental_min_days as number | null) ?? null,
      service_offerings:       Array.isArray(r.service_offerings)
        ? (r.service_offerings as unknown[]).filter((x): x is string => typeof x === 'string')
        : [],
      service_rates:           parseServiceRates(r.service_rates),
      languages:               Array.isArray(r.languages)
        ? (r.languages as unknown[]).filter((x): x is string => typeof x === 'string')
        : ['id'],
      available_sunrise:       (r.available_sunrise   as boolean | null) ?? null,
      available_daytime:       (r.available_daytime   as boolean | null) ?? null,
      available_evening:       (r.available_evening   as boolean | null) ?? null,
      available_nightlife:     (r.available_nightlife as boolean | null) ?? null,
    }
  }

  const mock = await admin
    .from('mock_drivers')
    .select(`
      id, slug, business_name, bio, whatsapp_e164, profile_image_url,
      cover_image_url, city, area, rating, availability,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
      rental_daily_rate_idr, rental_weekly_rate_idr,
      rental_monthly_rate_idr, rental_min_days,
      service_offerings, service_rates
    `)
    .eq('slug', slug)
    .eq('vehicle_type', 'truck')
    .is('mock_hidden_at', null)
    .maybeSingle()

  if (!mock.data) return null
  const m = mock.data as Record<string, unknown>
  return {
    id:                      String(m.id ?? slug),
    slug,
    business_name:           String(m.business_name ?? slug),
    bio:                     (m.bio as string | null) ?? null,
    whatsapp_e164:           (m.whatsapp_e164 as string | null) ?? null,
    profile_image_url:       (m.profile_image_url as string | null) ?? null,
    cover_image_url:         (m.cover_image_url as string | null) ?? null,
    city:                    (m.city as string | null) ?? null,
    area:                    (m.area as string | null) ?? null,
    rating:                  (m.rating as number | null) ?? null,
    trips_count:             null,
    availability:            (m.availability as TruckDriver['availability']) ?? null,
    service_zone_radius_km:  null,
    vehicle_make:            (m.vehicle_make as string | null) ?? null,
    vehicle_model:           (m.vehicle_model as string | null) ?? null,
    vehicle_year:            (m.vehicle_year as number | null) ?? null,
    vehicle_color:           (m.vehicle_color as string | null) ?? null,
    vehicle_plate:           (m.vehicle_plate as string | null) ?? null,
    vehicle_seats:           (m.vehicle_seats as number | null) ?? null,
    vehicle_photos:          parseVehiclePhotos(m.vehicle_photos),
    rental_daily_rate_idr:   (m.rental_daily_rate_idr as number | null) ?? null,
    rental_weekly_rate_idr:  (m.rental_weekly_rate_idr as number | null) ?? null,
    rental_monthly_rate_idr: (m.rental_monthly_rate_idr as number | null) ?? null,
    rental_min_days:         (m.rental_min_days as number | null) ?? null,
    service_offerings:       Array.isArray(m.service_offerings)
      ? (m.service_offerings as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    service_rates:           parseServiceRates(m.service_rates),
    // mock_drivers doesn't carry mig 0157's `languages` column — mocks
    // borrow the per-slug entries from MOCK_LANGUAGES, defaulting to
    // Indonesian-only when the slug isn't seeded there.
    languages:               MOCK_LANGUAGES[slug] ?? ['id'],
    available_sunrise:       null,
    available_daytime:       null,
    available_evening:       null,
    available_nightlife:     null,
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatIdr(amount: number | null | undefined): string | null {
  if (typeof amount !== 'number' || amount <= 0) return null
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function vehicleHeadline(d: TruckDriver): string {
  const parts = [d.vehicle_make, d.vehicle_model].filter(Boolean) as string[]
  if (parts.length === 0) return 'Truck'
  return parts.join(' ')
}

// Adapter — TruckDriver → VehiclePublic (the shell shape). Surfaces the
// truck's daily / weekly / monthly rates as PriceRow rows, and the min-
// days note as the rate_footnote.
function truckDriverToVehiclePublic(d: TruckDriver): VehiclePublic {
  const rateRows: VehiclePublic['rate_rows'] = []
  const daily   = formatIdr(d.rental_daily_rate_idr)
  const weekly  = formatIdr(d.rental_weekly_rate_idr)
  const monthly = formatIdr(d.rental_monthly_rate_idr)
  if (daily)   rateRows.push({ label: 'Daily rate',   value: `${daily}/day` })
  if (weekly)  rateRows.push({ label: 'Weekly rate',  value: `${weekly}/week` })
  if (monthly) rateRows.push({ label: 'Monthly rate', value: `${monthly}/month` })
  if (rateRows.length === 0) {
    // Fall back to a single "Not yet published" row so the rates card
    // never reads empty — keeps the visual rhythm of the page intact.
    rateRows.push({ label: 'Daily rate', value: 'Not yet published' })
  }
  const minDaysNote = (d.rental_min_days != null && d.rental_min_days > 1)
    ? `Minimum ${d.rental_min_days} days per booking.`
    : null

  return {
    id:                     d.id,
    slug:                   d.slug,
    display_name:           d.business_name,
    bio:                    d.bio,
    whatsapp_e164:          d.whatsapp_e164,
    profile_image_url:      d.profile_image_url,
    cover_image_url:        d.cover_image_url ?? getDefaultBanner('truck'),
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
    start_price_idr:        d.rental_daily_rate_idr,
    rate_rows:              rateRows,
    rate_footnote:          minDaysNote,
    service_rates:          d.service_rates,
    languages:              d.languages,
    available_sunrise:      d.available_sunrise,
    available_daytime:      d.available_daytime,
    available_evening:      d.available_evening,
    available_nightlife:    d.available_nightlife,
  }
}

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const tm = await getTranslations('truckProfileMeta')
  const d = await loadTruckDriver(slug).catch(() => null)
  if (!d) return { title: tm('metaNotFound'), robots: { index: false, follow: false } }
  const vehicle    = vehicleHeadline(d)
  const where      = [d.area, d.city].filter(Boolean).join(', ') || 'Yogyakarta'
  const dailyLabel = formatIdr(d.rental_daily_rate_idr)
  const title      = tm('metaTitleFmt', { name: d.business_name })
  const description = (d.bio?.trim())
    || (dailyLabel
      ? tm('metaDescriptionDaily',   { name: d.business_name, vehicle, where, dailyLabel })
      : tm('metaDescriptionDefault', { name: d.business_name, vehicle, where }))
  const canonical  = `${SITE_URL}/truck/${d.slug}`
  const cover      = d.vehicle_photos[0] || d.cover_image_url || d.profile_image_url || undefined
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
  }
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function TruckDriverProfilePage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await loadTruckDriver(slug)
  if (!d) notFound()

  // Lapsed-driver redirect — mirrors /r/[slug]:577-580 and /car/[slug].
  // Query unconditionally: mock_drivers don't have subscription rows, so
  // the query returns null and the redirect doesn't fire. Only lapsed
  // REAL drivers (past_due / canceled) get bounced to /cari alternatives.
  {
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

  const heroCover = d.vehicle_photos[0] || d.cover_image_url

  // Schema.org LocalBusiness — identical payload to the previous truck
  // page; priceRange stays the generic 'Rp' marker per PM 12/2019
  // positioning (we don't sell the rental ourselves).
  const jsonLd: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'LocalBusiness',
    '@id':        `${SITE_URL}/truck/${d.slug}`,
    name:         d.business_name,
    description:  d.bio || undefined,
    url:          `${SITE_URL}/truck/${d.slug}`,
    image:        heroCover || d.profile_image_url || undefined,
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
      <VehicleProfileShell vehicle={truckDriverToVehiclePublic(d)} vehicleType="truck" />
    </>
  )
}
