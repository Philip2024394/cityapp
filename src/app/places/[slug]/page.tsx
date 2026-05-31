import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Car as CarIcon, Bike as BikeIcon, Star } from 'lucide-react'
import JsonLd from '@/components/seo/JsonLd'
import PlaceProfileShell from '@/components/profile/PlaceProfileShell'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'
import { getServerSupabase } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/places/categories'
import type { PlaceCategory } from '@/lib/places/types'

// ============================================================================
// /places/[slug] — Public detail page for a self-listed place
// ----------------------------------------------------------------------------
// Server component: loads the row from Supabase, builds metadata + JSON-LD,
// then hands off to <PlaceProfileShell> (the rich client shell adapted from
// the beautician profile flagship). Status filter is 'approved' so pending /
// rejected / suspended rows don't leak.
//
// revalidate=300 (5 min) keeps the HTML cache fresh enough for moderation
// changes to propagate without a redeploy.
// ============================================================================

export const revalidate = 300

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://citydrivers.id'

type Row = {
  id:              string
  slug:            string
  name:            string
  category:        PlaceCategory
  description:     string | null
  image_urls:      string[] | null
  city:            string
  address:         string | null
  tags:            string[] | null
  lat:             number
  lng:             number
  whatsapp_e164:   string | null
  hours_json:      Record<string, unknown> | null
  rating:          number | null
  review_count:    number | null
  contact_enabled: boolean | null
  cuisine_types:   string[] | null
  free_delivery:   boolean | null
}

type OfferRow = {
  id:          string
  name:        string
  description: string | null
  price_idr:   number | null
  image_url:   string | null
  sort_order:  number
}

async function loadPlace(slug: string): Promise<Row | null> {
  const supabase = await getServerSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('places')
    .select('id, slug, name, category, description, image_urls, city, address, tags, lat, lng, whatsapp_e164, hours_json, rating, review_count, contact_enabled, cuisine_types, free_delivery')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  return data as Row | null
}

// Fetch the place_offers rows for this place. The public RLS policy on
// place_offers already gates this to approved places — we still scope by
// place_id at the query level so each profile only sees its own items.
// Returns [] on missing client / error so the caller can keep rendering.
async function loadOffers(placeId: string): Promise<OfferRow[]> {
  const supabase = await getServerSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('place_offers')
    .select('id, name, description, price_idr, image_url, sort_order')
    .eq('place_id', placeId)
    .order('sort_order', { ascending: true })
  if (error) return []
  return (data ?? []) as unknown as OfferRow[]
}

// Tours-visit-here row — driver_tour_packages JOIN drivers projection
// used by the "Drivers offering tours that visit here" panel below the
// place profile. Capped at 8 rows; section is hidden when empty so we
// don't pollute the page with an empty state.
type TourVisitRow = {
  id:             string
  title:          string
  duration_hours: number
  price_idr:      number
  driver: {
    slug:           string
    business_name:  string | null
    vehicle_type:   string | null
    rating:         number | null
    brand_logo_url: string | null
  } | null
}

async function loadToursVisitingPlace(slug: string): Promise<TourVisitRow[]> {
  const supabase = await getServerSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('driver_tour_packages')
    .select('id, title, duration_hours, price_idr, place_slugs, published, drivers(slug, business_name, vehicle_type, rating, brand_logo_url)')
    .contains('place_slugs', [slug])
    .eq('published', true)
    .limit(8)
  if (error || !data) return []
  return (data as unknown as Array<{
    id: string
    title: string
    duration_hours: number
    price_idr: number
    drivers: TourVisitRow['driver'] | TourVisitRow['driver'][] | null
  }>).map((r) => ({
    id:             r.id,
    title:          r.title,
    duration_hours: r.duration_hours,
    price_idr:      r.price_idr,
    driver:         Array.isArray(r.drivers) ? (r.drivers[0] ?? null) : (r.drivers ?? null),
  })).filter((r) => r.driver != null)
}

function formatDurationLabel(h: number): string {
  const r = Math.round(h * 10) / 10
  const s = Number.isInteger(r) ? String(r) : r.toFixed(1)
  return `${s}h`
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const place = await loadPlace(slug).catch(() => null)
  if (!place) {
    return { title: 'Place not found', robots: { index: false, follow: false } }
  }
  const categoryLabel = CATEGORIES[place.category]?.label ?? place.category
  const title       = `${place.name} · ${place.city}`
  const description = place.description?.slice(0, 160)
    || `${place.name} di ${place.city} — ${categoryLabel}. Pesan rider untuk berangkat lewat CityDrivers.`
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/places/${place.slug}` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/places/${place.slug}`,
      title,
      description,
      images: place.image_urls?.[0] ? [{ url: place.image_urls[0], alt: place.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: place.image_urls?.[0] ? [place.image_urls[0]] : undefined,
    },
  }
}

export default async function PlaceDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const place = await loadPlace(slug)
  if (!place) notFound()

  const offers = await loadOffers(place.id)
  const visitingTours = await loadToursVisitingPlace(place.slug)

  const categoryMeta  = CATEGORIES[place.category]
  const categoryLabel = categoryMeta?.label ?? place.category

  // Schema.org Place — Google can surface the venue in Maps / Knowledge
  // Graph results. aggregateRating only emitted when we actually have a
  // rating to back it up; reviewCount=0 with a rating violates the spec
  // and triggers a Search Console warning.
  const jsonLd: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'Place',
    '@id':        `${SITE_URL}/places/${place.slug}`,
    name:         place.name,
    description:  place.description || undefined,
    url:          `${SITE_URL}/places/${place.slug}`,
    image:        place.image_urls?.[0] || undefined,
    address: {
      '@type':         'PostalAddress',
      streetAddress:   place.address || undefined,
      addressLocality: place.city,
      addressCountry:  'ID',
    },
    geo: {
      '@type':   'GeoCoordinates',
      latitude:  place.lat,
      longitude: place.lng,
    },
    aggregateRating: (place.rating != null && place.review_count != null && place.review_count > 0)
      ? {
          '@type':     'AggregateRating',
          ratingValue: place.rating,
          reviewCount: place.review_count,
          bestRating:  5,
          worstRating: 1,
        }
      : undefined,
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <PlaceProfileShell
        place={{
          id:            place.id,
          slug:          place.slug,
          name:          place.name,
          category:      place.category,
          categoryLabel,
          description:   place.description,
          imageUrls:     place.image_urls ?? [],
          city:          place.city,
          address:       place.address,
          tags:          place.tags ?? [],
          cuisineTypes:  place.cuisine_types ?? [],
          lat:           place.lat,
          lng:           place.lng,
          whatsappE164:  place.whatsapp_e164,
          hoursJson:     place.hours_json,
          rating:        place.rating,
          reviewCount:   place.review_count,
          offers,
        }}
        contactEnabled={place.contact_enabled !== false}
        freeDelivery={place.free_delivery === true}
      />

      {/* Drivers offering tours that visit here — only renders when at
          least one published tour matches. Empty state intentionally
          hidden so the page doesn't pollute with placeholder copy. */}
      {visitingTours.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 sm:px-5 pb-6">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-[#0A0A0A] mb-2">
            Drivers offering tours that visit here
          </h2>
          <ul className="space-y-2">
            {visitingTours.map((t) => {
              const isBike = t.driver?.vehicle_type === 'bike'
              const href = isBike ? `/r/${t.driver?.slug}` : `/car/${t.driver?.slug}`
              return (
                <li key={t.id}>
                  <Link
                    href={href}
                    prefetch
                    className="block rounded-2xl bg-white border border-[#E4E4E7] p-3 active:scale-[0.99] transition"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                        style={{ background: '#FFFBEA', color: '#EAB308', border: '1px solid rgba(250,204,21,0.45)' }}
                        aria-hidden
                      >
                        {isBike
                          ? <BikeIcon className="w-5 h-5" strokeWidth={2.25} />
                          : <CarIcon className="w-5 h-5" strokeWidth={2.25} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[14px] font-black text-[#0A0A0A] leading-tight truncate">
                          {t.title}
                        </h3>
                        <p className="text-[12px] text-black/55 mt-0.5 truncate">
                          {t.driver?.business_name ?? 'Driver'}
                          {t.driver?.rating != null && t.driver.rating > 0 && (
                            <span className="inline-flex items-center gap-0.5 ml-1.5">
                              <Star
                                className="w-3 h-3 inline-block align-middle"
                                strokeWidth={0}
                                fill="#FACC15"
                                style={{ color: '#FACC15' }}
                              />
                              <span className="font-extrabold text-[#0A0A0A]">{t.driver.rating.toFixed(1)}</span>
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[14px] font-black text-[#0A0A0A] leading-none">
                          Rp {t.price_idr.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[11px] font-extrabold text-black/55 mt-0.5">
                          {formatDurationLabel(t.duration_hours)}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <PoweredByKita2u defaultVertical="places" />
    </>
  )
}
