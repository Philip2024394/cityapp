import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronLeft, MapPin, MessageCircle, Star, Bus as BusIcon,
  Calendar, Users, Palette, Hash, Info,
} from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import ProfileGallery from '@/components/profile/ProfileGallery'
import JsonLd from '@/components/seo/JsonLd'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'

// =============================================================================
// /bus/[slug] — public per-driver profile page (Phase 1: Minibus vertical)
// =============================================================================
// IndoCity is a SOFTWARE DIRECTORY under PM 12/2019. This page surfaces a
// single minibus driver (Hiace / Avanza / Innova class) who self-publishes
// their own min_fee + price_per_km. IndoCity never sets, computes, appoints,
// or matches fares. The customer taps "Contact via WhatsApp" → wa.me handoff
// with a starter message; the driver and customer agree the final fare
// directly in chat.
//
// Minibus drivers serve group-transport demand: Yogya/Bali tourism, airport
// charters, multi-passenger transfers. So the hero copy emphasises group
// capacity ("Seats X passengers + luggage") and the vehicle card surfaces
// "Group capacity: X" near the top so customers immediately see how many
// people fit.
//
// Server-rendered for SEO so every minibus driver gets an indexable URL.
// Slug lookup hits BOTH `drivers` (real) and `mock_drivers` (demo fallback);
// returns 404 if neither table has the slug. Pricing copy is intentionally
// compliance-safe — never "our prices", never "trip cost".
// =============================================================================

export const revalidate = 300

const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id'
const BRAND_YELLOW = '#FACC15'
const BRAND_NAVY   = '#0F172A'
const WORDMARK_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitleddfsdfsdfs-removebg-preview.png'

// -----------------------------------------------------------------------------
// Loader — checks `drivers` first (real) then falls back to `mock_drivers`.
// -----------------------------------------------------------------------------
// Both tables share most column names but a few diverge:
//   drivers.brand_logo_url  ↔  mock_drivers.profile_image_url
// The BusDriver shape below normalises that into a single `profile_image_url`
// field so the rendering code doesn't branch on origin.

type BusDriver = {
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
  service_zone_radius_km: number | null
  vehicle_make:        string | null
  vehicle_model:       string | null
  vehicle_year:        number | null
  vehicle_color:       string | null
  vehicle_plate:       string | null
  vehicle_seats:       number | null
  vehicle_photos:      string[]
}

function parseVehiclePhotos(raw: unknown): string[] {
  // vehicle_photos is a jsonb array of public URLs. Defensive: tolerate
  // legacy rows where it's null, an object, or contains non-strings.
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

async function loadBusDriver(slug: string): Promise<BusDriver | null> {
  if (!slug || !/^[a-z0-9_-]+$/i.test(slug)) return null
  const admin = getAdminSupabase()
  if (!admin) return null

  // 1. Real driver — vehicle_type='minibus' gate so we don't render a car
  //    or bike row via the /bus URL even if slugs ever collide.
  const real = await admin
    .from('drivers')
    .select(`
      user_id, slug, business_name, bio, whatsapp_e164, brand_logo_url,
      city, area, rating, trips_count, availability,
      min_fee, price_per_km, service_zone_radius_km,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
      status
    `)
    .eq('slug', slug)
    .eq('vehicle_type', 'minibus')
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
      availability:           (r.availability as BusDriver['availability']) ?? null,
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
    }
  }

  // 2. Mock fallback — only if the real query missed. Demo minibus drivers
  //    seeded in migration 0095 (Yogyakarta). vehicle_type filter keeps
  //    the existing bike/car mocks from leaking onto a /bus URL.
  const mock = await admin
    .from('mock_drivers')
    .select(`
      id, slug, business_name, bio, whatsapp_e164, profile_image_url,
      city, area, rating, availability,
      min_fee, price_per_km,
      vehicle_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos
    `)
    .eq('slug', slug)
    .eq('vehicle_type', 'minibus')
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
      availability:           (r.availability as BusDriver['availability']) ?? null,
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

function vehicleHeadline(d: BusDriver): string {
  const parts = [d.vehicle_make, d.vehicle_model].filter(Boolean) as string[]
  if (parts.length === 0) return 'Minibus'
  return parts.join(' ')
}

function buildWhatsAppLink(d: BusDriver): string | null {
  // Strip the leading '+' (and any other non-digit) before passing to
  // wa.me — Indonesian e.164 numbers come in as '62...' already.
  const num = (d.whatsapp_e164 ?? '').replace(/\D+/g, '')
  if (!num) return null
  const msg = `Halo, saya tertarik menyewa minibus Anda di IndoCity`
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const d = await loadBusDriver(slug).catch(() => null)
  if (!d) return { title: 'Driver not found', robots: { index: false, follow: false } }
  const vehicle = vehicleHeadline(d)
  const where   = [d.area, d.city].filter(Boolean).join(', ') || 'Indonesia'
  const title       = `${d.business_name} · Minibus charter · IndoCity`
  const description = (d.bio?.trim())
    || `${d.business_name} — driver minibus ${vehicle} di ${where}. Hubungi langsung via WhatsApp untuk menyepakati tarif.`
  const canonical   = `${SITE_URL}/bus/${d.slug}`
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

export default async function BusDriverProfilePage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const d = await loadBusDriver(slug)
  if (!d) notFound()

  const photos      = d.vehicle_photos
  const minFeeLabel = formatIdr(d.min_fee)
  const perKmLabel  = formatIdr(d.price_per_km)
  const waLink      = buildWhatsAppLink(d)
  const vehicle     = vehicleHeadline(d)
  const where       = [d.area, d.city].filter(Boolean).join(', ')

  // Hero subline emphasises group capacity — the whole reason a customer
  // is on /bus instead of /car. Falls back gracefully if seats aren't set.
  const capacityHeroLine = d.vehicle_seats
    ? `Seats ${d.vehicle_seats} passengers + luggage`
    : null

  // Schema.org LocalBusiness — keeps the per-driver page eligible for
  // Knowledge Graph / Maps surfacing. priceRange is the generic 'Rp'
  // marker; we intentionally don't expose min_fee here because the
  // schema interpretation of price would suggest IndoCity is selling
  // a service at that price — which violates PM 12/2019 positioning.
  // Type stays LocalBusiness (we're a directory, not a transport operator).
  const jsonLd: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'LocalBusiness',
    '@id':        `${SITE_URL}/bus/${d.slug}`,
    name:         d.business_name,
    description:  d.bio || undefined,
    url:          `${SITE_URL}/bus/${d.slug}`,
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
      <main className="relative min-h-[100dvh] bg-white text-[#0A0A0A]">
        {/* -------- Brand header — navy bar with the wordmark logo -------- */}
        <header
          className="w-full flex items-center justify-between px-4"
          style={{ background: BRAND_NAVY, height: 56 }}
        >
          <Link
            href="/bus"
            aria-label="Back to minibus directory"
            className="inline-flex items-center gap-1.5 text-white/85 active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span className="text-[13px] font-extrabold uppercase tracking-wider">Minibus</span>
          </Link>
          <img
            src={WORDMARK_URL}
            alt="IndoCity"
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
            Demo profile — this is a seeded example driver
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
              <BusIcon className="w-16 h-16 text-white/85" strokeWidth={1.5} />
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
              {capacityHeroLine && (
                <p className="text-[13px] font-extrabold mt-1" style={{ color: BRAND_NAVY }}>
                  {capacityHeroLine}
                </p>
              )}
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
          {/* Heading stays "Vehicle details" per spec. Group capacity is */}
          {/* surfaced as the first row inside the card so it's visible    */}
          {/* without scrolling on small screens.                          */}
          <section className="mt-4">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black mb-2">
              Vehicle details
            </h2>
            <div
              className="rounded-2xl border border-gray-200 bg-white p-3"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              {d.vehicle_seats != null && d.vehicle_seats > 0 && (
                <div
                  className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100"
                >
                  <Users
                    className="w-4 h-4 shrink-0"
                    strokeWidth={2.25}
                    style={{ color: BRAND_YELLOW }}
                  />
                  <span className="text-[13px] font-extrabold text-black">
                    Group capacity: {d.vehicle_seats} passengers
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <VehicleField icon={<BusIcon className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Make"  value={d.vehicle_make} />
                <VehicleField icon={<BusIcon className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Model" value={d.vehicle_model} />
                <VehicleField icon={<Calendar className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Year"  value={d.vehicle_year ? String(d.vehicle_year) : null} />
                <VehicleField icon={<Palette className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Color" value={d.vehicle_color} />
                <VehicleField icon={<Hash className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Plate"  value={d.vehicle_plate} />
                <VehicleField icon={<Users className="w-3.5 h-3.5" strokeWidth={2.25} />} label="Seats" value={d.vehicle_seats ? `${d.vehicle_seats} passengers` : null} />
              </div>
            </div>
          </section>

          {/* -------- Pricing — compliance-safe wording -------- */}
          <section className="mt-4">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-black mb-2">
              Published rates
            </h2>
            <div
              className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <PriceRow
                label="From"
                value={minFeeLabel ? `From ${minFeeLabel}` : 'Not yet published'}
                subnote="Self-published by driver"
              />
              <div className="h-px bg-gray-100" />
              <PriceRow
                label="Per kilometer"
                value={perKmLabel ? `${perKmLabel} / km` : 'Not yet published'}
                subnote="Self-published by driver"
              />
            </div>
            <p className="text-[12px] text-gray-500 leading-snug mt-2 px-1">
              Driver publishes their own rates. Agree the final fare directly
              with the driver — IndoCity is a directory only.
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
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-white font-extrabold text-[13px] active:scale-[0.98] transition"
                style={{
                  background: BRAND_YELLOW,
                  color: BRAND_NAVY,
                  minHeight: 48,
                  boxShadow: '0 8px 18px rgba(250,204,21,0.35)',
                }}
              >
                <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                Contact {d.business_name} on WhatsApp
              </a>
              <p className="text-[11px] text-gray-500 text-center mt-1.5 leading-snug">
                Chat directly — agree the trip and final fare with the driver.
              </p>
            </div>
          </div>
        )}
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
