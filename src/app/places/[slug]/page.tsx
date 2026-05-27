import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/seo/JsonLd'
import PlaceProfileShell from '@/components/profile/PlaceProfileShell'
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id'

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
    .select('id, slug, name, category, description, image_urls, city, address, tags, lat, lng, whatsapp_e164, hours_json, rating, review_count, contact_enabled, cuisine_types')
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
    || `${place.name} di ${place.city} — ${categoryLabel}. Pesan rider untuk berangkat lewat IndoCity.`
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
      />
    </>
  )
}
