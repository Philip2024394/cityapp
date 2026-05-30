import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronLeft, MapPin, MessageCircle, Star, Truck as TruckIcon,
  Calendar, Users, Palette, Hash, Info, CalendarDays,
} from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import ProfileGallery from '@/components/profile/ProfileGallery'
import WaIntentAnchor from '@/components/profile/WaIntentAnchor'
import JsonLd from '@/components/seo/JsonLd'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import ProfileViewBeacon from '@/components/profile/ProfileViewBeacon'
import TruckServicesTabs from '@/components/profile/TruckServicesTabs'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'

// =============================================================================
// /truck/[slug] — public per-driver profile page (Truck rental vertical)
// =============================================================================
// IndoCity is a SOFTWARE DIRECTORY under PM 12/2019. This page surfaces a
// single truck driver who self-publishes daily / weekly / monthly rental
// rates. Trucks are rented by the DAY (not metered per-km like cars and
// not per-parcel like couriers) — moving, hauling, multi-day project work.
// IndoCity never sets, computes, appoints, or matches prices. The customer
// taps "Contact via WhatsApp" → wa.me handoff with a starter message; the
// driver and customer agree the final rate directly in chat.
//
// Server-rendered for SEO so every truck driver gets an indexable URL.
// Slug lookup hits the `drivers` table only (no mock_drivers seed for the
// truck vertical yet); vehicle_type='truck' gate stops slug collisions
// from bleeding a car/bike row onto a /truck URL.
//
// Layout (mobile-first):
//   • Hero      — vehicle_photos[0] (or carousel if multiple)
//   • Headline  — business_name, vehicle, location, availability, rating
//   • Bio
//   • Vehicle   — make, model, year, color, plate, seats
//   • Rates     — DAILY headline + weekly/monthly + min-days (emphasised)
//   • Service area
//   • Gallery duplication is handled inside the hero block (ProfileGallery
//     already surfaces every photo)
//   • Sticky CTA — WaIntentAnchor → wa.me deeplink
// =============================================================================

export const revalidate = 300

const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id'
const BRAND_YELLOW = '#FACC15'
const BRAND_NAVY   = '#0F172A'
const WORDMARK_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitleddfsdfsdfs-removebg-preview.png'

// -----------------------------------------------------------------------------
// Loader — `drivers` table only, vehicle_type='truck' + status='active'.
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
  /** Driver-selected trip-type tags (mig 0110). Used to surface the
   *  Services Offered tab row — trucks expose All + Parcel B2B (if
   *  cargo_parcel is included) + Hourly (when hourly_enabled). */
  service_offerings:       string[]
  /** Hourly hire opt-in + 3h/6h/8h rates + working window (mig 0156). */
  hourly_enabled:          boolean | null
  hourly_3h_rate_idr:      number | null
  hourly_6h_rate_idr:      number | null
  hourly_8h_rate_idr:      number | null
  working_hours_start:     string | null
  working_hours_end:       string | null
}

function parseVehiclePhotos(raw: unknown): string[] {
  // vehicle_photos is a jsonb array of public URLs. Defensive: tolerate
  // legacy rows where it's null, an object, or contains non-strings.
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

async function loadTruckDriver(slug: string): Promise<TruckDriver | null> {
  if (!slug || !/^[a-z0-9_-]+$/i.test(slug)) return null
  const admin = getAdminSupabase()
  if (!admin) return null

  // 1. Real driver row (drivers table)
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
      service_offerings,
      hourly_enabled, hourly_3h_rate_idr, hourly_6h_rate_idr, hourly_8h_rate_idr,
      working_hours_start, working_hours_end,
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
      hourly_enabled:          (r.hourly_enabled as boolean | null) ?? null,
      hourly_3h_rate_idr:      (r.hourly_3h_rate_idr as number | null) ?? null,
      hourly_6h_rate_idr:      (r.hourly_6h_rate_idr as number | null) ?? null,
      hourly_8h_rate_idr:      (r.hourly_8h_rate_idr as number | null) ?? null,
      working_hours_start:     (r.working_hours_start as string | null) ?? null,
      working_hours_end:       (r.working_hours_end as string | null) ?? null,
    }
  }

  // 2. Mock fallback — only when no real row + mock not hidden. Demo
  //    truck mocks (e.g. `l300-pickup-pindahan-yogya`) live in
  //    mock_drivers; the customer-facing /cityriders/parcel surface
  //    surfaces them, so the profile URL must render too.
  const mock = await admin
    .from('mock_drivers')
    .select(`
      id, slug, business_name, bio, whatsapp_e164, profile_image_url,
      cover_image_url, city, area, rating, availability,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
      rental_daily_rate_idr, rental_weekly_rate_idr,
      rental_monthly_rate_idr, rental_min_days,
      service_offerings
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
    // Mocks don't have mig-0156 columns — null falls through to defaults.
    hourly_enabled:          null,
    hourly_3h_rate_idr:      null,
    hourly_6h_rate_idr:      null,
    hourly_8h_rate_idr:      null,
    working_hours_start:     null,
    working_hours_end:       null,
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

function buildWhatsAppLink(d: TruckDriver): string | null {
  // Strip the leading '+' (and any other non-digit) before passing to
  // wa.me — Indonesian e.164 numbers come in as '62...' already.
  const num = (d.whatsapp_e164 ?? '').replace(/\D+/g, '')
  if (!num) return null
  const msg = `Halo, saya tertarik menyewa truk Anda di IndoCity`
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const d = await loadTruckDriver(slug).catch(() => null)
  if (!d) return { title: 'Truck not found', robots: { index: false, follow: false } }
  const vehicle    = vehicleHeadline(d)
  const where      = [d.area, d.city].filter(Boolean).join(', ') || 'Yogyakarta'
  const dailyLabel = formatIdr(d.rental_daily_rate_idr)
  const title      = `Sewa truk ${d.business_name} — Yogyakarta`
  const description = (d.bio?.trim())
    || (dailyLabel
      ? `${d.business_name} — ${vehicle} di ${where}. Sewa harian mulai ${dailyLabel}/hari. Hubungi langsung via WhatsApp.`
      : `${d.business_name} — ${vehicle} di ${where}. Sewa harian, mingguan, bulanan. Hubungi langsung via WhatsApp.`)
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

  // Hero photo precedence: first vehicle photo, then cover_image_url, then
  // the empty-state TruckIcon block. Carousel kicks in when >1 photo so
  // the customer can swipe through the cargo bed, cab, full side view.
  const photos       = d.vehicle_photos
  const heroCover    = photos[0] || d.cover_image_url
  const dailyLabel   = formatIdr(d.rental_daily_rate_idr)
  const weeklyLabel  = formatIdr(d.rental_weekly_rate_idr)
  const monthlyLabel = formatIdr(d.rental_monthly_rate_idr)
  const waLink       = buildWhatsAppLink(d)
  const vehicle      = vehicleHeadline(d)
  const where        = [d.area, d.city].filter(Boolean).join(', ')

  // Schema.org LocalBusiness — keeps the per-driver page eligible for
  // Knowledge Graph / Maps surfacing. priceRange is the generic 'Rp'
  // marker; we intentionally don't expose the daily rate here because
  // the schema interpretation of price would suggest IndoCity is selling
  // a service at that price — which violates PM 12/2019 positioning.
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
      {/* Profile-view tracker — sessionStorage-deduped client island that
          pings /api/profile-view on mount so the driver's stats page picks
          up this visit. Server-rendered page can't use the hook directly. */}
      <ProfileViewBeacon providerType="driver" providerId={d.id} />

      {/* Right-edge yellow BACK tab — matches the beautician / car /
          bike profile shells. Drops back to the parcel hub where
          truck cards live. */}
      <a
        href="/cityriders/parcel"
        aria-label="Back to parcel hub"
        className="fixed z-50 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition"
        style={{
          right:                  0,
          top:                    '35%',
          transform:              'translateY(-50%)',
          width:                  34,
          height:                 110,
          background:             '#FACC15',
          color:                  '#0A0A0A',
          borderTopLeftRadius:    14,
          borderBottomLeftRadius: 14,
          boxShadow:              '-4px 4px 14px rgba(0,0,0,0.22)',
        }}
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        <span
          className="font-extrabold uppercase"
          style={{
            writingMode:    'vertical-rl',
            transform:      'rotate(180deg)',
            fontSize:       11,
            letterSpacing:  '0.18em',
          }}
        >
          Back
        </span>
      </a>

      <main className="relative min-h-[100dvh] bg-white text-[#0A0A0A]">
        {/* -------- Brand header — navy bar with the wordmark logo -------- */}
        <header
          className="w-full flex items-center justify-between px-4"
          style={{ background: BRAND_NAVY, height: 56 }}
        >
          <Link
            href="/truck"
            aria-label="Back to truck directory"
            className="inline-flex items-center gap-1.5 text-white/85 active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span className="text-[13px] font-extrabold uppercase tracking-wider">Truck</span>
          </Link>
          <img
            src={WORDMARK_URL}
            alt="IndoCity"
            className="h-7 w-auto"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
          />
          <span aria-hidden style={{ width: 56 }} />
        </header>

        <div className="max-w-2xl mx-auto px-4 pt-3 pb-24">
          {/* -------- Hero — vehicle photos (carousel if >1, single if 1) -------- */}
          {/* White top scrim sits inside the rounded container so the hero  */}
          {/* edge meets the brand header cleanly on mobile.                 */}
          {photos.length > 1 ? (
            <div className="relative">
              <ProfileGallery
                photos={photos}
                title=""
                variant="carousel"
                titleClassName="hidden"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-t-2xl"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)' }}
              />
            </div>
          ) : heroCover ? (
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 mb-3">
              <img
                src={heroCover}
                alt={`${d.business_name} — ${vehicle}`}
                className="w-full aspect-[16/10] object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-10"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)' }}
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
              <TruckIcon className="w-16 h-16 text-white/85" strokeWidth={1.5} />
            </div>
          )}

          {/* -------- Driver headline card (overlaps hero bottom edge) -------- */}
          <section className="relative -mt-4 sm:-mt-6 mx-1 sm:mx-2 rounded-2xl bg-white border border-gray-200 p-3 flex items-start gap-3"
            style={{ boxShadow: '0 6px 18px rgba(10,10,10,0.06)' }}
          >
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

          {/* -------- Services Offered — tab row (truck profile). Trucks
                      have no Hourly tab (daily-rate model). Passenger tab
                      surfaces only when the driver opted into a
                      passenger-style trip type; Parcel B2B when
                      cargo_parcel is in service_offerings. ----------- */}
          <section className="mt-4">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black mb-2">
              Services Offered
            </h2>
            <TruckServicesTabs
              driverId={d.id}
              driverBusinessName={d.business_name}
              driverWhatsappE164={d.whatsapp_e164}
              vehicleMake={d.vehicle_make}
              vehicleModel={d.vehicle_model}
              hasPassenger={false}
              hasParcel={d.service_offerings.includes('cargo_parcel')}
              hourlyEnabled={d.hourly_enabled}
              hourly3hRateIdr={d.hourly_3h_rate_idr}
              hourly6hRateIdr={d.hourly_6h_rate_idr}
              hourly8hRateIdr={d.hourly_8h_rate_idr}
              workingHoursStart={d.working_hours_start}
              workingHoursEnd={d.working_hours_end}
            />
          </section>

          {/* -------- Vehicle details card -------- */}
          <section className="mt-4">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black mb-2">
              Vehicle details
            </h2>
            <div
              className="rounded-2xl border border-gray-200 bg-white p-3 grid grid-cols-2 gap-2"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <VehicleField icon={<TruckIcon className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Make"  value={d.vehicle_make} />
              <VehicleField icon={<TruckIcon className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Model" value={d.vehicle_model} />
              <VehicleField icon={<Calendar className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Year"  value={d.vehicle_year ? String(d.vehicle_year) : null} />
              <VehicleField icon={<Palette className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Color" value={d.vehicle_color} />
              <VehicleField icon={<Hash className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Plate"  value={d.vehicle_plate} />
              <VehicleField icon={<Users className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Seats" value={d.vehicle_seats ? `${d.vehicle_seats} cab seats` : null} />
            </div>
          </section>

          {/* -------- Rental rates — HEADLINE SECTION for trucks -------- */}
          {/* Trucks rent by the DAY (not per-km, not per-parcel). Daily is */}
          {/* the headline; weekly + monthly are secondary; min_days note   */}
          {/* sits at the bottom. Emphasised more than booking widgets.     */}
          <section className="mt-4">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black mb-2">
              Published rental rates
            </h2>
            <div
              className="rounded-2xl border-2 bg-white p-4 space-y-3"
              style={{ borderColor: BRAND_YELLOW, boxShadow: '0 6px 18px rgba(250,204,21,0.18)' }}
            >
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
                <div className="text-[24px] sm:text-[28px] font-black text-black shrink-0 leading-none">
                  {dailyLabel ? `${dailyLabel}` : 'Not yet published'}
                  {dailyLabel && (
                    <span className="text-[13px] font-extrabold text-gray-500 ml-1">/day</span>
                  )}
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
                    <span className="font-extrabold">Minimum {d.rental_min_days} days per booking</span>
                  </div>
                </>
              )}
            </div>
            <p className="text-[12px] text-gray-500 leading-snug mt-2 px-1">
              Self-published rates · agree rental terms directly with driver.
              IndoCity is a software directory — we never set, calculate, or
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

          {/* -------- Inline static "first photo" hint when no carousel -------- */}
          {/* ProfileGallery already handles the multi-photo carousel above.    */}
          {/* Nothing extra to do here — kept as a comment so the layout intent */}
          {/* (photos surface inside the hero) stays clear to future editors.   */}
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
                source="other"
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
        <PoweredByKita2u defaultVertical="truck-driver" />
      </main>
    </>
  )
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
