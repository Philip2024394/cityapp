import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import JsonLd from '@/components/seo/JsonLd'
import DriverProfileShell, { type DriverPublic } from '@/components/profile/DriverProfileShell'
import type { TourPackage } from '@/lib/tours/types'
import { MOCK_LANGUAGES, mockToursForSlug } from '@/lib/tours/templates'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { BIKE_BANNERS, bannerForSlug } from '@/lib/drivers/banners'
import { PARCEL_RATE_TIER_DEFAULTS_BIKE } from '@/lib/parcel/defaults'

// =============================================================================
// /r/[slug] — public per-driver profile page (bike vertical)
// =============================================================================
// CityDrivers / CityDrivers is a SOFTWARE DIRECTORY under PM 12/2019. This page
// surfaces a single bike driver who self-publishes their own min_fee +
// price_per_km. Customer's destination from /cari driver-result cards —
// renders the shared DriverProfileShell which embeds the booking widget
// (typed pickup + dropoff + multi-stop + WhatsApp deep-link) and the
// alternatives fallback when the page driver is busy/offline.
//
// Server-rendered so every bike driver gets an indexable URL + a populated
// WhatsApp / social-card preview when their profile link is shared. Slug
// lookup hits BOTH `drivers` (real, vehicle_type='bike') and `mock_drivers`
// (demo bike fallback); when neither is reachable (no admin client in dev),
// falls back to the in-repo MOCK_RIDERS array so the demo profiles still
// render end-to-end. Returns 404 only when EVERY source misses.
//
// This file mirrors /car/[slug]/page.tsx — same loader → metadata →
// JSON-LD → DriverProfileShell pipeline, just adapted to the bike data
// shape (drivers.bike_make/bike_model/bike_color/bike_plate instead of
// drivers.vehicle_*). Keeping the two pages structurally identical means
// SEO behaviour stays consistent across verticals and any future
// improvement lands in both places.
// =============================================================================

export const revalidate = 300

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://citydrivers.id'

// -----------------------------------------------------------------------------
// Server-side BikeDriver shape — normalised across the three sources
// (drivers, mock_drivers, in-repo MOCK_RIDERS). Field names mirror the
// underlying drivers table where possible so the adapter below is a
// straightforward 1:1.
// -----------------------------------------------------------------------------

type BikeDriver = {
  source:                 'real' | 'mock' | 'static'
  id:                     string
  slug:                   string
  business_name:          string
  bio:                    string | null
  whatsapp_e164:          string | null
  profile_image_url:      string | null
  city:                   string | null
  area:                   string | null
  rating:                 number | null
  trips_count:            number | null
  availability:           'online' | 'busy' | 'offline' | null
  min_fee:                number | null
  price_per_km:           number | null
  pitstop_fee:            number | null
  service_zone_radius_km: number | null
  bike_make:              string | null
  bike_model:             string | null
  bike_year:              number | null
  bike_color:             string | null
  bike_plate:             string | null
  /** Single photo URL stored on drivers.bike_photo_url (real rows) or
   *  derived from rider.bike.photoUrl (legacy mocks). Wrapped into a
   *  one-element array in the adapter so the shell's photo gallery works
   *  uniformly with the car vertical. */
  bike_photo_url:         string | null
  services:               string[]
  service_offerings:      string[]
  current_lat:            number | null
  current_lng:            number | null
  cover_image_url:        string | null
  hourly_enabled:         boolean | null
  hourly_3h_rate_idr:     number | null
  hourly_6h_rate_idr:     number | null
  hourly_8h_rate_idr:     number | null
  working_hours_start:    string | null
  working_hours_end:      string | null
  available_sunrise:      boolean | null
  available_daytime:      boolean | null
  available_evening:      boolean | null
  available_nightlife:    boolean | null
  parcel_rate_tiers:      unknown | null
  languages:              string[]
  /** Real drivers only — used by the lapsed-redirect gate. Mocks default
   *  to 'active'. */
  subscription_status:    'trial' | 'active' | 'past_due' | 'canceled'
}

function parseStrings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string')
}

// -----------------------------------------------------------------------------
// Driver loader — drivers (vehicle_type='bike') → mock_drivers (bike) →
// MOCK_RIDERS (in-repo bike-only fallback for dev mode without Supabase
// service-role env).
// -----------------------------------------------------------------------------

async function loadBikeDriver(slug: string): Promise<BikeDriver | null> {
  if (!slug || !/^[a-z0-9_-]+$/i.test(slug)) return null
  const admin = getAdminSupabase()

  // 1. Real driver. vehicle_type='bike' gate so the same slug can't leak
  //    a car row onto a /r URL. status='active' filter — suspended /
  //    removed drivers redirect via the lapsed-driver gate below.
  if (admin) {
    const real = await admin
      .from('drivers')
      .select(`
        user_id, slug, business_name, bio, whatsapp_e164, brand_logo_url,
        city, area, rating, trips_count, availability,
        min_fee, price_per_km, pitstop_fee, service_zone_radius_km,
        vehicle_type, bike_make, bike_model, bike_year, bike_color, bike_plate,
        bike_photo_url, services, service_offerings,
        current_lat, current_lng, cover_image_url,
        hourly_enabled, hourly_3h_rate_idr, hourly_6h_rate_idr, hourly_8h_rate_idr,
        working_hours_start, working_hours_end,
        available_sunrise, available_daytime, available_evening, available_nightlife,
        parcel_rate_tiers, languages,
        status,
        subscriptions(status, trial_ends_at, current_period_end)
      `)
      .eq('slug', slug)
      .eq('vehicle_type', 'bike')
      .eq('status', 'active')
      .maybeSingle()

    if (real.data) {
      const r = real.data as Record<string, unknown>
      // Subscription status — collapsed to a four-state enum here so the
      // page-level lapsed-driver redirect doesn't need to re-derive it.
      const sub = pickFirstSub(r.subscriptions)
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
        availability:           (r.availability as BikeDriver['availability']) ?? null,
        min_fee:                (r.min_fee as number | null) ?? null,
        price_per_km:           (r.price_per_km as number | null) ?? null,
        pitstop_fee:            (r.pitstop_fee as number | null) ?? null,
        service_zone_radius_km: (r.service_zone_radius_km as number | null) ?? null,
        bike_make:              (r.bike_make as string | null) ?? null,
        bike_model:             (r.bike_model as string | null) ?? null,
        bike_year:              (r.bike_year as number | null) ?? null,
        bike_color:             (r.bike_color as string | null) ?? null,
        bike_plate:             (r.bike_plate as string | null) ?? null,
        bike_photo_url:         (r.bike_photo_url as string | null) ?? null,
        services:               parseStrings(r.services),
        service_offerings:      parseStrings(r.service_offerings),
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
        subscription_status:    effectiveSubStatus(sub),
      }
    }

    // 2. Mock fallback. mock_drivers stores bike-vertical data in bike_*
    //    columns but doesn't carry bike_color / bike_plate (mig 0050) —
    //    we map those to null so the shell still renders without the
    //    color / plate line.
    const mock = await admin
      .from('mock_drivers')
      .select(`
        id, slug, business_name, bio, whatsapp_e164, profile_image_url,
        city, area, rating, availability,
        min_fee, price_per_km,
        vehicle_type, bike_make, bike_model, bike_year, bike_type,
        services, service_offerings, cover_image_url, lat, lng, trips_count
      `)
      .eq('slug', slug)
      .eq('vehicle_type', 'bike')
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
        trips_count:            (r.trips_count as number | null) ?? null,
        availability:           (r.availability as BikeDriver['availability']) ?? null,
        min_fee:                (r.min_fee as number | null) ?? null,
        price_per_km:           (r.price_per_km as number | null) ?? null,
        pitstop_fee:            null,
        service_zone_radius_km: null,
        bike_make:              (r.bike_make as string | null) ?? null,
        bike_model:             (r.bike_model as string | null) ?? null,
        bike_year:              (r.bike_year as number | null) ?? null,
        bike_color:             null,
        bike_plate:             null,
        // mock_drivers doesn't store a bike photo URL; the shell falls
        // back to the bike-catalog stock photo via getBikeImageUrl().
        bike_photo_url:         null,
        services:               parseStrings(r.services),
        service_offerings:      parseStrings(r.service_offerings),
        current_lat:            typeof r.lat === 'number' ? (r.lat as number) : null,
        current_lng:            typeof r.lng === 'number' ? (r.lng as number) : null,
        // Mock fallback: deterministic BIKE_BANNERS pick per slug.
        cover_image_url:        (r.cover_image_url as string | null) ?? bannerForSlug(slug, BIKE_BANNERS),
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
        // Mock bikes surface the canonical bike parcel rate ladder so
        // the Parcel B2B tab has real numbers on demo profiles.
        parcel_rate_tiers:      PARCEL_RATE_TIER_DEFAULTS_BIKE,
        languages:              MOCK_LANGUAGES[slug] ?? ['id'],
        subscription_status:    'active',
      }
    }
  }

  // 3. In-repo static fallback (dev mode without Supabase service-role
  //    env). MOCK_RIDERS is bike-only — used by the existing browser
  //    fetcher under the same condition, so behaviour stays parity.
  const stat = MOCK_RIDERS.find((r) => r.slug === slug)
  if (stat) {
    return {
      source:                 'static',
      id:                     stat.id,
      slug:                   stat.slug,
      business_name:          stat.name,
      bio:                    stat.bio || null,
      whatsapp_e164:          stat.whatsappE164,
      profile_image_url:      stat.photoUrl ?? null,
      city:                   stat.city || null,
      area:                   stat.area || null,
      rating:                 stat.rating ?? null,
      trips_count:            stat.trips ?? null,
      availability:           (stat.availability ?? (stat.isOnline ? 'online' : 'offline')) as BikeDriver['availability'],
      min_fee:                stat.minFee,
      price_per_km:           stat.pricePerKm,
      pitstop_fee:            stat.pitstopFee ?? null,
      service_zone_radius_km: stat.serviceZoneRadiusKm ?? null,
      bike_make:              stat.bike.make || null,
      bike_model:             stat.bike.model || null,
      bike_year:              stat.bike.year || null,
      bike_color:             stat.bike.color || null,
      bike_plate:             stat.bike.plate ?? null,
      bike_photo_url:         stat.bike.photoUrl ?? null,
      services:               (stat.services ?? []) as string[],
      service_offerings:      [],
      current_lat:            typeof stat.lat === 'number' ? stat.lat : null,
      current_lng:            typeof stat.lng === 'number' ? stat.lng : null,
      cover_image_url:        null,
      hourly_enabled:         stat.hourlyEnabled ?? null,
      hourly_3h_rate_idr:     stat.hourly3hRateIdr ?? null,
      hourly_6h_rate_idr:     stat.hourly6hRateIdr ?? null,
      hourly_8h_rate_idr:     stat.hourly8hRateIdr ?? null,
      working_hours_start:    stat.workingHoursStart ?? null,
      working_hours_end:      stat.workingHoursEnd ?? null,
      available_sunrise:      null,
      available_daytime:      null,
      available_evening:      null,
      available_nightlife:    null,
      parcel_rate_tiers:      null,
      languages:              stat.languages ?? ['id'],
      subscription_status:    stat.subscriptionStatus,
    }
  }

  return null
}

// -----------------------------------------------------------------------------
// Subscription helpers — duplicates the lapse logic in queries.ts so we
// don't have to import a browser-flagged module from a server file.
// -----------------------------------------------------------------------------

type SubInfo = {
  status: 'trial' | 'active' | 'past_due' | 'canceled' | null
  trial_ends_at: string | null
  current_period_end: string | null
} | null

function pickFirstSub(raw: unknown): SubInfo {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as SubInfo) ?? null
  return raw as SubInfo
}

function effectiveSubStatus(sub: SubInfo): 'trial' | 'active' | 'past_due' | 'canceled' {
  if (!sub || !sub.status) return 'past_due'
  const now = Date.now()
  if (sub.status === 'trial') {
    const t = sub.trial_ends_at ? Date.parse(sub.trial_ends_at) : NaN
    return Number.isFinite(t) && t < now ? 'past_due' : 'trial'
  }
  if (sub.status === 'active') {
    const e = sub.current_period_end ? Date.parse(sub.current_period_end) : NaN
    return Number.isFinite(e) && e < now ? 'past_due' : 'active'
  }
  return sub.status
}

// -----------------------------------------------------------------------------
// Alternatives loader — same intent as /car: populated only when the page
// driver isn't online. Queries `drivers_public` for active bike drivers
// excluding the current slug, capped at 5.
// -----------------------------------------------------------------------------

async function loadAlternativeBikeDrivers(excludeSlug: string): Promise<BikeDriver[]> {
  const admin = getAdminSupabase()
  if (!admin) return []
  const { data, error } = await admin
    .from('drivers_public')
    .select(`
      user_id, slug, business_name, bio, whatsapp_e164, brand_logo_url,
      city, area, rating, trips_count, availability,
      min_fee, price_per_km, pitstop_fee, service_zone_radius_km,
      vehicle_type, bike_make, bike_model, bike_year, bike_color,
      bike_photo_url, services, current_lat, current_lng
    `)
    .eq('vehicle_type', 'bike')
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
    availability:           (r.availability as BikeDriver['availability']) ?? null,
    min_fee:                (r.min_fee as number | null) ?? null,
    price_per_km:           (r.price_per_km as number | null) ?? null,
    pitstop_fee:            (r.pitstop_fee as number | null) ?? null,
    service_zone_radius_km: (r.service_zone_radius_km as number | null) ?? null,
    bike_make:              (r.bike_make as string | null) ?? null,
    bike_model:             (r.bike_model as string | null) ?? null,
    bike_year:              (r.bike_year as number | null) ?? null,
    bike_color:             (r.bike_color as string | null) ?? null,
    bike_plate:             null,
    bike_photo_url:         (r.bike_photo_url as string | null) ?? null,
    services:               parseStrings(r.services),
    service_offerings:      [],
    current_lat:            (r.current_lat as number | null) ?? null,
    current_lng:            (r.current_lng as number | null) ?? null,
    cover_image_url:        null,
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
    subscription_status:    'active',
  }))
}

// -----------------------------------------------------------------------------
// Tours loader — published tours for a single driver. Empty for mocks /
// static (no rows in driver_tour_packages keyed off a non-UUID id).
// -----------------------------------------------------------------------------

async function loadPublishedTours(driverId: string): Promise<TourPackage[]> {
  const admin = getAdminSupabase()
  if (!admin) return []
  const isUuid = /^[0-9a-f-]{36}$/i.test(driverId)
  if (!isUuid) return []
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
// Adapter — server BikeDriver → DriverPublic (the shell shape).
// -----------------------------------------------------------------------------

function bikeDriverToDriverPublic(d: BikeDriver, tours: TourPackage[] = []): DriverPublic {
  // Bike vertical stores a single photo on `bike_photo_url` — wrap into a
  // one-element array so the shell's photo gallery code path is uniform
  // with /car's `vehicle_photos: string[]`.
  const photos: string[] = []
  if (d.bike_photo_url) photos.push(d.bike_photo_url)
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
    vehicle_type:   'bike',
    vehicle_make:   d.bike_make,
    vehicle_model:  d.bike_model,
    vehicle_year:   d.bike_year,
    vehicle_color:  d.bike_color,
    vehicle_seats:  null,  // bikes don't carry seat counts
    vehicle_photos: photos,
    price_per_km:   d.price_per_km,
    min_fee:        d.min_fee,
    pitstop_fee:    d.pitstop_fee,
    lat:            d.current_lat,
    lng:            d.current_lng,
    services:       d.services,
    service_offerings:   d.service_offerings ?? [],
    cover_image_url:     d.cover_image_url,
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

function vehicleHeadline(d: BikeDriver): string {
  const parts = [d.bike_make, d.bike_model].filter(Boolean) as string[]
  if (parts.length === 0) return 'Motorbike'
  return parts.join(' ')
}

// -----------------------------------------------------------------------------
// Metadata — server-rendered so every shared /r/[slug] link populates a
// rich WhatsApp / Twitter preview card. Mocks are robots:noindex so demo
// rows don't compete with real driver pages in search.
// -----------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const d = await loadBikeDriver(slug).catch(() => null)
  if (!d) return { title: 'Driver not found', robots: { index: false, follow: false } }
  const where = d.area || d.city || 'Indonesia'
  const title = `${d.business_name} — Bike rider in ${where} · CityDrivers`
  const description = ((d.bio?.trim() || `${d.business_name} — ${vehicleHeadline(d)} rider in ${where}. Book directly via WhatsApp.`)).slice(0, 160)
  const canonical = `${SITE_URL}/r/${d.slug}`
  // Image preference: cover_image_url → first bike photo → profile photo
  const cover = d.cover_image_url || d.bike_photo_url || d.profile_image_url || undefined
  return {
    title,
    description,
    alternates: { canonical },
    openGraph:  {
      type: 'profile', url: canonical, title, description,
      images: cover ? [{ url: cover, alt: d.business_name }] : undefined,
    },
    twitter:    {
      card: 'summary_large_image', title, description,
      images: cover ? [cover] : undefined,
    },
    // Demo rows aren't real businesses — index=false so they don't pollute
    // search results. Real rows fall through to the site default.
    robots: d.source === 'real' ? undefined : { index: false, follow: true },
  }
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function RiderProfilePage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await loadBikeDriver(slug)
  if (!d) notFound()

  // Lapsed-driver redirect — runs BEFORE any HTML renders so a visitor
  // following a real driver's social-shared link never lands on a dead
  // profile. Preserved from the previous layout.tsx implementation.
  // Mocks and static fallbacks always have status='active' so this gate
  // only ever fires for real drivers whose billing has lapsed.
  if (d.source === 'real' && (d.subscription_status === 'past_due' || d.subscription_status === 'canceled')) {
    const qs = new URLSearchParams({ from: 'lapsed_driver', slug: d.slug })
    redirect(`/cari?${qs.toString()}`)
  }

  // Alternatives — only when the page driver isn't online. Saves a
  // round-trip when the booking widget will render anyway.
  const isOffline = d.availability === 'busy' || d.availability === 'offline'
  const alternatives = isOffline ? await loadAlternativeBikeDrivers(d.slug) : []

  // Tours — real drivers query driver_tour_packages; mocks/static render
  // synthetic tours from MOCK_TOUR_ASSIGNMENTS so the demo profiles
  // visibly carry the Tours tab on the public surface.
  const tours: TourPackage[] = d.source === 'real'
    ? await loadPublishedTours(d.id)
    : (mockToursForSlug(d.slug) as unknown as TourPackage[])

  // Schema.org LocalBusiness — same shape /car emits today so SEO
  // behaviour stays consistent across verticals. Per the audit note,
  // both pages may eventually move to schema.org/Service; doing that
  // here in isolation would put /r and /car on different schemas which
  // is worse than the current parity.
  const jsonLd: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'LocalBusiness',
    '@id':        `${SITE_URL}/r/${d.slug}`,
    name:         d.business_name,
    description:  d.bio || undefined,
    url:          `${SITE_URL}/r/${d.slug}`,
    image:        d.cover_image_url || d.bike_photo_url || d.profile_image_url || undefined,
    telephone:    d.whatsapp_e164 ? `+${d.whatsapp_e164}` : undefined,
    priceRange:   'Rp',
    address: {
      '@type':          'PostalAddress',
      addressLocality: d.city || undefined,
      addressRegion:   d.area || undefined,
      addressCountry:  'ID',
    },
    geo: (d.current_lat != null && d.current_lng != null)
      ? {
          '@type':    'GeoCoordinates',
          latitude:   d.current_lat,
          longitude:  d.current_lng,
        }
      : undefined,
    aggregateRating: (d.rating != null && d.rating > 0)
      ? {
          '@type':      'AggregateRating',
          ratingValue:  d.rating,
          reviewCount:  d.trips_count ?? 1,
          bestRating:   5,
          worstRating:  1,
        }
      : undefined,
    areaServed: d.city || undefined,
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <DriverProfileShell
        driver={bikeDriverToDriverPublic(d, tours)}
        alternatives={alternatives.map((alt) => bikeDriverToDriverPublic(alt))}
      />
    </>
  )
}
