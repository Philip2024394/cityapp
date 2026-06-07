import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/seo/JsonLd'
import PlaceProfileShell from '@/components/profile/PlaceProfileShell'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'
import ProfileQaPanel from '@/components/addons/ProfileQaPanel'
import { getServerSupabase } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/places/categories'
import type { PlaceCategory } from '@/lib/places/types'

// ============================================================================
// /food/[slug] — Food-only profile detail.
// ----------------------------------------------------------------------------
// Why a dedicated route (not a re-use of /places/[slug]):
// crash + bug isolation. With the error.tsx boundary in /food, any runtime
// error here is caught by the food segment and other verticals
// (beautician, handyman, laundry, etc.) keep rendering. Before this route
// existed, food profiles shared the /places segment — a render error in
// a /places profile would also break food.
//
// Category guard: rows whose category is NOT in FOOD_CATEGORIES return
// 404 from this URL even if the row exists in the DB. Browsers landing
// here for a non-food slug get a clean not-found rather than a tourism
// listing under a /food URL.
// ============================================================================

export const revalidate = 300

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://citydrivers.id'

const FOOD_CATEGORIES = new Set<PlaceCategory>(['restaurant', 'cafe', 'bar', 'club'])

type Row = {
  id:               string
  slug:             string
  name:             string
  category:         PlaceCategory
  description:      string | null
  image_urls:       string[] | null
  city:             string
  address:          string | null
  tags:             string[] | null
  lat:              number
  lng:              number
  whatsapp_e164:    string | null
  hours_json:       Record<string, unknown> | null
  rating:           number | null
  review_count:     number | null
  contact_enabled:  boolean | null
  cuisine_types:    string[] | null
  free_delivery:    boolean | null
  delivery_enabled: boolean | null
  owner_user_id:    string | null
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
    .select('id, slug, name, category, description, image_urls, city, address, tags, lat, lng, whatsapp_e164, hours_json, rating, review_count, contact_enabled, cuisine_types, free_delivery, delivery_enabled, owner_user_id')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  return data as Row | null
}

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

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const place = await loadPlace(slug).catch(() => null)
  if (!place || !FOOD_CATEGORIES.has(place.category)) {
    return { title: 'Restaurant not found', robots: { index: false, follow: false } }
  }
  const categoryLabel = CATEGORIES[place.category]?.label ?? place.category
  const title       = `${place.name} · ${place.city}`
  const description = place.description?.slice(0, 160)
    || `${place.name} di ${place.city} — ${categoryLabel}. Self-listed pada Kita2u.`
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/food/${place.slug}` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/food/${place.slug}`,
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

export default async function FoodDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const place = await loadPlace(slug)
  // Category guard: non-food rows 404 from this URL.
  if (!place || !FOOD_CATEGORIES.has(place.category)) notFound()

  const offers = await loadOffers(place.id)
  const categoryMeta  = CATEGORIES[place.category]
  const categoryLabel = categoryMeta?.label ?? place.category

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'Restaurant',
    name:        place.name,
    address: place.address
      ? { '@type': 'PostalAddress', streetAddress: place.address, addressLocality: place.city, addressCountry: 'ID' }
      : { '@type': 'PostalAddress', addressLocality: place.city, addressCountry: 'ID' },
    geo: {
      '@type':    'GeoCoordinates',
      latitude:   place.lat,
      longitude:  place.lng,
    },
    url: `${SITE_URL}/food/${place.slug}`,
    image: place.image_urls?.[0] ?? undefined,
    description: place.description ?? undefined,
    ...(place.rating && place.review_count && place.review_count > 0
      ? {
          aggregateRating: {
            '@type':       'AggregateRating',
            ratingValue:   place.rating,
            reviewCount:   place.review_count,
            bestRating:    5,
            worstRating:   1,
          },
        }
      : {}),
  }

  return (
    <>
      <JsonLd data={schema} />
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
        deliveryEnabled={place.delivery_enabled === true}
      />
      <div className="max-w-2xl mx-auto px-4">
        <ProfileQaPanel ownerUserId={place.owner_user_id ?? null} />
      </div>
      <PoweredByKita2u />
    </>
  )
}
