import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronLeft, MapPin, MessageCircle, Star, Car as CarIcon,
  Truck as TruckIcon, Calendar, Users, Palette, Hash, Info,
  CalendarDays, KeyRound, UserRound,
} from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import ProfileGallery from '@/components/profile/ProfileGallery'
import WaIntentAnchor from '@/components/profile/WaIntentAnchor'
import JsonLd from '@/components/seo/JsonLd'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'

// =============================================================================
// RentalProfileShell — shared renderer for /rentals/car/[slug] + /rentals/truck/[slug]
// =============================================================================
// CityDrivers is a SOFTWARE DIRECTORY under PM 12/2019. These per-listing rental
// profile pages surface a single driver who self-publishes a daily / weekly /
// monthly rate plus a rental_type (self-drive, with-driver, or both). CityDrivers
// never sets, computes, appoints, or matches prices. The customer taps
// "Contact via WhatsApp" → wa.me handoff; the driver and customer agree
// the final rental terms directly in chat.
//
// The car and truck profile pages are structurally identical except for:
//   • vehicle_type filter ('car' vs 'truck')
//   • back-link label + href
//   • WhatsApp starter message
//   • SEO title segment ("Car rental" vs "Truck rental")
//   • Empty-state hero icon
// Everything else (loader, layout, pricing card, compliance copy) is shared
// here. The two page files become thin wrappers passing a `vehicleType`
// discriminator + copy strings.
// =============================================================================

const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL || 'https://citydrivers.id'
const BRAND_YELLOW = '#FACC15'
const BRAND_NAVY   = '#0F172A'
const WORDMARK_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type RentalVehicleType = 'car' | 'truck'
export type RentalType = 'self_drive' | 'with_driver' | 'both'

type RentalDriver = {
  source:                 'real' | 'mock'
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
  service_zone_radius_km: number | null
  vehicle_make:           string | null
  vehicle_model:          string | null
  vehicle_year:           number | null
  vehicle_color:          string | null
  vehicle_plate:          string | null
  vehicle_seats:          number | null
  vehicle_photos:         string[]
  rental_type:            RentalType | null
  rental_daily_rate_idr:  number | null
  rental_weekly_rate_idr: number | null
  rental_monthly_rate_idr:number | null
  rental_min_days:        number | null
}

// -----------------------------------------------------------------------------
// Loader
// -----------------------------------------------------------------------------

function parseVehiclePhotos(raw: unknown): string[] {
  // vehicle_photos is a jsonb array of public URLs. Defensive: tolerate
  // legacy rows where it's null, an object, or contains non-strings.
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

async function loadRentalDriver(
  slug: string,
  vehicleType: RentalVehicleType,
): Promise<RentalDriver | null> {
  if (!slug || !/^[a-z0-9_-]+$/i.test(slug)) return null
  const admin = getAdminSupabase()
  if (!admin) return null

  // 1. Real driver — vehicle_type AND rental_daily_rate_idr both required
  //    so we don't render a live-ride-only driver via the rental URL.
  const real = await admin
    .from('drivers')
    .select(`
      user_id, slug, business_name, bio, whatsapp_e164, brand_logo_url,
      city, area, rating, trips_count, availability,
      service_zone_radius_km,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
      rental_type, rental_daily_rate_idr, rental_weekly_rate_idr,
      rental_monthly_rate_idr, rental_min_days,
      status
    `)
    .eq('slug', slug)
    .eq('vehicle_type', vehicleType)
    .eq('status', 'active')
    .not('rental_daily_rate_idr', 'is', null)
    .maybeSingle()

  if (real.data) {
    const r = real.data as Record<string, unknown>
    return {
      source:                  'real',
      id:                      String(r.user_id ?? slug),
      slug,
      business_name:           String(r.business_name ?? slug),
      bio:                     (r.bio as string | null) ?? null,
      whatsapp_e164:           (r.whatsapp_e164 as string | null) ?? null,
      profile_image_url:       (r.brand_logo_url as string | null) ?? null,
      city:                    (r.city as string | null) ?? null,
      area:                    (r.area as string | null) ?? null,
      rating:                  (r.rating as number | null) ?? null,
      trips_count:             (r.trips_count as number | null) ?? null,
      availability:            (r.availability as RentalDriver['availability']) ?? null,
      service_zone_radius_km:  (r.service_zone_radius_km as number | null) ?? null,
      vehicle_make:            (r.vehicle_make as string | null) ?? null,
      vehicle_model:           (r.vehicle_model as string | null) ?? null,
      vehicle_year:            (r.vehicle_year as number | null) ?? null,
      vehicle_color:           (r.vehicle_color as string | null) ?? null,
      vehicle_plate:           (r.vehicle_plate as string | null) ?? null,
      vehicle_seats:           (r.vehicle_seats as number | null) ?? null,
      vehicle_photos:          parseVehiclePhotos(r.vehicle_photos),
      rental_type:             (r.rental_type as RentalType | null) ?? null,
      rental_daily_rate_idr:   (r.rental_daily_rate_idr as number | null) ?? null,
      rental_weekly_rate_idr:  (r.rental_weekly_rate_idr as number | null) ?? null,
      rental_monthly_rate_idr: (r.rental_monthly_rate_idr as number | null) ?? null,
      rental_min_days:         (r.rental_min_days as number | null) ?? null,
    }
  }

  // 2. Mock fallback — only if the real query missed. Demo rental drivers
  //    seeded in migrations 0097/0098. vehicle_type + rental_daily_rate
  //    filter keeps non-rental mocks from leaking onto the URL.
  const mock = await admin
    .from('mock_drivers')
    .select(`
      id, slug, business_name, bio, whatsapp_e164, profile_image_url,
      city, area, rating, availability,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
      rental_type, rental_daily_rate_idr, rental_weekly_rate_idr,
      rental_monthly_rate_idr, rental_min_days
    `)
    .eq('slug', slug)
    .eq('vehicle_type', vehicleType)
    .not('rental_daily_rate_idr', 'is', null)
    .is('mock_hidden_at', null)
    .maybeSingle()

  if (mock.data) {
    const r = mock.data as Record<string, unknown>
    return {
      source:                  'mock',
      id:                      String(r.id ?? slug),
      slug,
      business_name:           String(r.business_name ?? slug),
      bio:                     (r.bio as string | null) ?? null,
      whatsapp_e164:           (r.whatsapp_e164 as string | null) ?? null,
      profile_image_url:       (r.profile_image_url as string | null) ?? null,
      city:                    (r.city as string | null) ?? null,
      area:                    (r.area as string | null) ?? null,
      rating:                  (r.rating as number | null) ?? null,
      trips_count:             null,
      availability:            (r.availability as RentalDriver['availability']) ?? null,
      service_zone_radius_km:  null,
      vehicle_make:            (r.vehicle_make as string | null) ?? null,
      vehicle_model:           (r.vehicle_model as string | null) ?? null,
      vehicle_year:            (r.vehicle_year as number | null) ?? null,
      vehicle_color:           (r.vehicle_color as string | null) ?? null,
      vehicle_plate:           (r.vehicle_plate as string | null) ?? null,
      vehicle_seats:           (r.vehicle_seats as number | null) ?? null,
      vehicle_photos:          parseVehiclePhotos(r.vehicle_photos),
      rental_type:             (r.rental_type as RentalType | null) ?? null,
      rental_daily_rate_idr:   (r.rental_daily_rate_idr as number | null) ?? null,
      rental_weekly_rate_idr:  (r.rental_weekly_rate_idr as number | null) ?? null,
      rental_monthly_rate_idr: (r.rental_monthly_rate_idr as number | null) ?? null,
      rental_min_days:         (r.rental_min_days as number | null) ?? null,
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

function vehicleHeadline(d: RentalDriver, fallback: string): string {
  const parts = [d.vehicle_make, d.vehicle_model].filter(Boolean) as string[]
  if (parts.length === 0) return fallback
  return parts.join(' ')
}

// -----------------------------------------------------------------------------
// Per-vertical copy + routing config — keeps the two page wrappers thin.
// -----------------------------------------------------------------------------

type RentalProfileConfig = {
  vehicleType:       RentalVehicleType
  // Browse-route slug for the back link + canonical URL prefix
  marketplaceHref:   string         // '/rentals/car'   | '/rentals/truck'
  profileHrefPrefix: string         // '/rentals/car'   | '/rentals/truck'
  // Header chip label rendered next to the chevron
  headerLabel:       string         // 'Car rental'     | 'Truck rental'
  // SEO + h1 fallback vehicle label
  vehicleFallback:   string         // 'Car'            | 'Truck'
  // SEO title segment after the business name
  seoTitleSegment:   string         // 'Car rental'     | 'Truck rental'
  // WhatsApp starter message (Indonesian)
  waMessage:         string
  // Empty-state hero icon
  vehicleIconName:   'car' | 'truck'
}

// -----------------------------------------------------------------------------
// generateMetadata helper — invoked from each page's exported generateMetadata
// -----------------------------------------------------------------------------

export async function buildRentalMetadata(
  slug: string,
  config: RentalProfileConfig,
): Promise<Metadata> {
  const d = await loadRentalDriver(slug, config.vehicleType).catch(() => null)
  if (!d) return { title: 'Listing not found', robots: { index: false, follow: false } }
  const vehicle = vehicleHeadline(d, config.vehicleFallback)
  const where   = [d.area, d.city].filter(Boolean).join(', ') || 'Indonesia'
  const title       = `${d.business_name} · ${config.seoTitleSegment} · CityDrivers`
  const description = (d.bio?.trim())
    || `${d.business_name} — ${config.seoTitleSegment.toLowerCase()} ${vehicle} di ${where}. ` +
       `Daily, weekly, monthly rates · self-drive or with driver. Contact via WhatsApp.`
  const canonical   = `${SITE_URL}${config.profileHrefPrefix}/${d.slug}`
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
// Page renderer — invoked from each page's default-exported component
// -----------------------------------------------------------------------------

export async function renderRentalProfile(
  slug: string,
  config: RentalProfileConfig,
) {
  const d = await loadRentalDriver(slug, config.vehicleType)
  if (!d) notFound()

  const photos      = d.vehicle_photos
  const dailyLabel  = formatIdr(d.rental_daily_rate_idr)
  const weeklyLabel = formatIdr(d.rental_weekly_rate_idr)
  const monthlyLabel = formatIdr(d.rental_monthly_rate_idr)
  const waLink      = buildWhatsAppLink(d, config.waMessage)
  const vehicle     = vehicleHeadline(d, config.vehicleFallback)
  const where       = [d.area, d.city].filter(Boolean).join(', ')

  // Schema.org LocalBusiness — keeps the per-listing page eligible for
  // Knowledge Graph / Maps surfacing. priceRange is the generic 'Rp'
  // marker; we intentionally don't expose the daily rate here because
  // the schema interpretation of price would suggest CityDrivers is selling
  // a service at that price — which violates PM 12/2019 positioning.
  const jsonLd: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'LocalBusiness',
    '@id':        `${SITE_URL}${config.profileHrefPrefix}/${d.slug}`,
    name:         d.business_name,
    description:  d.bio || undefined,
    url:          `${SITE_URL}${config.profileHrefPrefix}/${d.slug}`,
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

  // Rental-type chip(s) at the top of the pricing card. 'both' renders
  // TWO chips (Self-drive + With driver) so the customer immediately sees
  // they have a choice.
  const rentalChips: Array<{ key: string; label: string; tone: 'green' | 'blue' }> = []
  if (d.rental_type === 'self_drive' || d.rental_type === 'both') {
    rentalChips.push({ key: 'self_drive', label: 'Self-drive', tone: 'green' })
  }
  if (d.rental_type === 'with_driver' || d.rental_type === 'both') {
    rentalChips.push({ key: 'with_driver', label: 'With driver', tone: 'blue' })
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className="relative min-h-[100dvh] bg-white text-[#0A0A0A]">
        {/* -------- Brand header — navy bar with the wordmark logo -------- */}
        <header
          className="w-full flex items-center justify-between px-4"
          style={{ background: BRAND_NAVY, height: 56 }}
        >
          <Link
            href={config.marketplaceHref}
            aria-label={`Back to ${config.headerLabel.toLowerCase()} directory`}
            className="inline-flex items-center gap-1.5 text-white/85 active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span className="text-[13px] font-extrabold uppercase tracking-wider">
              {config.headerLabel}
            </span>
          </Link>
          <img
            src={WORDMARK_URL}
            alt="CityDrivers"
            className="h-7 w-auto"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
          />
          <span aria-hidden style={{ width: 56 }} />
        </header>

        {d.source === 'mock' && (
          <div
            className="px-4 py-2 flex items-center justify-center gap-1.5 text-[13px] font-extrabold"
            style={{ background: '#FEF3C7', color: '#92400E' }}
          >
            <Info className="w-3.5 h-3.5" strokeWidth={2.5} />
            Demo profile — this is a seeded example listing
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 pt-3 pb-24">
          {/* -------- Hero — vehicle photos (carousel if >1, single if 1) -------- */}
          {photos.length > 1 ? (
            <ProfileGallery
              photos={photos}
              title=""
              variant="carousel"
              titleClassName="hidden"
            />
          ) : photos.length === 1 ? (
            <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 mb-3">
              <img
                src={photos[0]}
                alt={`${d.business_name} — ${vehicle}`}
                className="w-full aspect-[16/10] object-cover"
              />
            </div>
          ) : (
            // No photos uploaded yet → friendly placeholder. Keeps the
            // hero block height stable so the page below doesn't jump.
            <div
              className="rounded-2xl overflow-hidden mb-3 flex items-center justify-center"
              style={{
                aspectRatio: '16 / 10',
                background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, #EAB308 100%)`,
              }}
            >
              {config.vehicleIconName === 'truck' ? (
                <TruckIcon className="w-16 h-16 text-white/85" strokeWidth={1.5} />
              ) : (
                <CarIcon className="w-16 h-16 text-white/85" strokeWidth={1.5} />
              )}
            </div>
          )}

          {/* -------- Driver headline card -------- */}
          <section className="mt-3 flex items-start gap-3">
            {d.profile_image_url ? (
              <img
                src={d.profile_image_url}
                alt={d.business_name}
                className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-white shadow"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-black shrink-0 border-2 border-white shadow"
                style={{ background: BRAND_YELLOW }}
              >
                {d.business_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] sm:text-[22px] font-black text-black leading-tight">
                {d.business_name}
              </h1>
              <p className="text-[13px] text-gray-500 truncate mt-0.5">
                {vehicle}{where ? ` · ${where}` : ''}
              </p>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Daily, weekly, monthly rates · Self-drive or with driver
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {d.availability && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-extrabold"
                    style={{
                      background:
                        d.availability === 'online' ? '#DCFCE7' :
                        d.availability === 'busy'   ? '#FEF3C7' : '#F3F4F6',
                      color:
                        d.availability === 'online' ? '#166534' :
                        d.availability === 'busy'   ? '#92400E' : '#374151',
                    }}
                  >
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background:
                          d.availability === 'online' ? '#16A34A' :
                          d.availability === 'busy'   ? '#F59E0B' : '#9CA3AF',
                      }}
                    />
                    {d.availability === 'online' ? 'Available' :
                     d.availability === 'busy'   ? 'Busy'      : 'Offline'}
                  </span>
                )}
                {(d.rating != null && d.rating > 0) && (
                  <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-black">
                    <Star
                      className="w-3.5 h-3.5"
                      strokeWidth={0}
                      fill={BRAND_YELLOW}
                      style={{ color: BRAND_YELLOW }}
                    />
                    {d.rating.toFixed(1)}
                    {d.trips_count != null && (
                      <span className="text-[12px] font-medium text-gray-500">
                        · {d.trips_count} trip{d.trips_count === 1 ? '' : 's'}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* -------- Driver bio -------- */}
          {d.bio?.trim() && (
            <section className="mt-4">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black mb-1.5">
                About {d.business_name}
              </h2>
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                {d.bio}
              </p>
            </section>
          )}

          {/* -------- Vehicle details card -------- */}
          <section className="mt-4">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black mb-2">
              Vehicle details
            </h2>
            <div
              className="rounded-2xl border border-gray-200 bg-white p-3 grid grid-cols-2 gap-2"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <VehicleField
                icon={config.vehicleIconName === 'truck'
                  ? <TruckIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                  : <CarIcon className="w-3.5 h-3.5" strokeWidth={2.25} />}
                label="Make"
                value={d.vehicle_make}
              />
              <VehicleField
                icon={config.vehicleIconName === 'truck'
                  ? <TruckIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                  : <CarIcon className="w-3.5 h-3.5" strokeWidth={2.25} />}
                label="Model"
                value={d.vehicle_model}
              />
              <VehicleField icon={<Calendar className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Year"  value={d.vehicle_year ? String(d.vehicle_year) : null} />
              <VehicleField icon={<Palette className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Color" value={d.vehicle_color} />
              <VehicleField icon={<Hash className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Plate"  value={d.vehicle_plate} />
              <VehicleField icon={<Users className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Seats" value={d.vehicle_seats ? `${d.vehicle_seats} passengers` : null} />
            </div>
          </section>

          {/* -------- Pricing — rental rates (compliance-safe) -------- */}
          <section className="mt-4">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black mb-2">
              Published rental rates
            </h2>
            <div
              className="rounded-2xl border border-gray-200 bg-white p-3 space-y-3"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              {/* Rental-type chips at the top of the pricing card */}
              {rentalChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {rentalChips.map((chip) => (
                    <span
                      key={chip.key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-extrabold"
                      style={{
                        background: chip.tone === 'green' ? '#DCFCE7' : '#DBEAFE',
                        color:      chip.tone === 'green' ? '#166534' : '#1E40AF',
                      }}
                    >
                      {chip.tone === 'green'
                        ? <KeyRound className="w-3 h-3" strokeWidth={2.5} />
                        : <UserRound className="w-3 h-3" strokeWidth={2.5} />}
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Daily — large + prominent */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold uppercase tracking-wider text-gray-500">
                    Daily rate
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Published by driver
                  </div>
                </div>
                <div className="text-[20px] font-black text-black shrink-0 leading-none">
                  {dailyLabel ? `${dailyLabel}/day` : 'Not yet published'}
                </div>
              </div>

              {(weeklyLabel || monthlyLabel) && <div className="h-px bg-gray-100" />}

              {weeklyLabel && (
                <PriceRow
                  label="Weekly rate"
                  value={`${weeklyLabel}/week`}
                  subnote="Published by driver"
                />
              )}

              {monthlyLabel && weeklyLabel && <div className="h-px bg-gray-100" />}

              {monthlyLabel && (
                <PriceRow
                  label="Monthly rate"
                  value={`${monthlyLabel}/month`}
                  subnote="Published by driver"
                />
              )}

              {d.rental_min_days != null && d.rental_min_days > 1 && (
                <>
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center gap-2 text-[12px] text-gray-700">
                    <CalendarDays
                      className="w-3.5 h-3.5 shrink-0"
                      strokeWidth={2.25}
                      style={{ color: BRAND_YELLOW }}
                    />
                    <span className="font-extrabold">Minimum {d.rental_min_days} days</span>
                  </div>
                </>
              )}
            </div>
            <p className="text-[12px] text-gray-500 leading-snug mt-2 px-1">
              Self-published rates · agree rental terms directly with driver.
              CityDrivers is a software directory — we never set, calculate, or
              modify prices.
            </p>
          </section>

          {/* -------- Service area -------- */}
          {(where || d.service_zone_radius_km != null) && (
            <section className="mt-4">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black mb-2">
                Service area
              </h2>
              <div
                className="rounded-2xl border border-gray-200 bg-white p-3 flex items-start gap-2"
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              >
                <MapPin
                  className="w-4 h-4 mt-0.5 shrink-0"
                  strokeWidth={2.25}
                  style={{ color: BRAND_YELLOW }}
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-extrabold text-black">
                    {where || 'Indonesia'}
                  </div>
                  {d.service_zone_radius_km != null && d.service_zone_radius_km > 0 && (
                    <div className="text-[12px] text-gray-500 mt-0.5">
                      Service zone radius · {d.service_zone_radius_km} km
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* -------- Compliance disclaimer (compact) -------- */}
          <div className="mt-4">
            <PlatformDisclaimer variant="compact" />
          </div>
        </div>

        {/* -------- Sticky bottom CTA bar — Contact via WhatsApp -------- */}
        {waLink && (
          <div
            className="fixed left-0 right-0 z-30 px-4 py-3"
            style={{
              bottom: 0,
              background: 'rgba(255,255,255,0.95)',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <div className="max-w-2xl mx-auto">
              <WaIntentAnchor
                href={waLink}
                providerId={d.id}
                vertical="rentals"
                source="rentals_profile"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[13px] active:scale-[0.98] transition"
                style={{
                  background: BRAND_YELLOW,
                  color: BRAND_NAVY,
                  minHeight: 48,
                  boxShadow: '0 8px 18px rgba(250,204,21,0.35)',
                }}
              >
                <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                Contact {d.business_name} on WhatsApp
              </WaIntentAnchor>
              <p className="text-[11px] text-gray-500 text-center mt-1.5 leading-snug">
                Chat directly — agree rental terms with the driver.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function buildWhatsAppLink(d: RentalDriver, message: string): string | null {
  // Strip the leading '+' (and any other non-digit) before passing to
  // wa.me — Indonesian e.164 numbers come in as '62...' already.
  const num = (d.whatsapp_e164 ?? '').replace(/\D+/g, '')
  if (!num) return null
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

// -----------------------------------------------------------------------------
// Small presentational helpers (server-rendered, no client JS)
// -----------------------------------------------------------------------------

function VehicleField({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
        <span style={{ color: BRAND_YELLOW }}>{icon}</span>
        {label}
      </div>
      <div className="text-[13px] font-extrabold text-black truncate mt-0.5">
        {value ?? '—'}
      </div>
    </div>
  )
}

function PriceRow({
  label, value, subnote,
}: { label: string; value: string; subnote: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-gray-500">
          {label}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5">{subnote}</div>
      </div>
      <div className="text-[15px] font-black text-black shrink-0">{value}</div>
    </div>
  )
}
