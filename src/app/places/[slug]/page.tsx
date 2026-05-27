import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MapPin, Phone, MessageCircle, Tag } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import JsonLd from '@/components/seo/JsonLd'
import { getServerSupabase } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/places/categories'
import type { PlaceCategory } from '@/lib/places/types'

// Public detail page for an approved place. Server-rendered for SEO so
// every place gets its own indexable URL. Status filter is 'approved'
// so pending/rejected/suspended rows don't leak.
//
// revalidate=300 (5 min) replaces force-dynamic so we get edge-cached
// HTML between updates while still picking up moderation changes quickly.
export const revalidate = 300

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id'

async function loadPlace(slug: string) {
  const supabase = await getServerSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('places')
    .select('id, slug, name, category, description, image_urls, city, address, tags, lat, lng, whatsapp_e164, hours_json, rating, review_count')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  return data as Row | null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const place = await loadPlace(slug).catch(() => null)
  if (!place) {
    return { title: 'Place not found', robots: { index: false, follow: false } }
  }
  const categoryLabel = CATEGORIES[place.category]?.label ?? place.category
  const title = `${place.name} · ${place.city}`
  const description = place.description?.slice(0, 160) || `${place.name} di ${place.city} — ${categoryLabel}. Pesan rider untuk berangkat lewat IndoCity.`
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

type Row = {
  id: string
  slug: string
  name: string
  category: PlaceCategory
  description: string | null
  image_urls: string[] | null
  city: string
  address: string | null
  tags: string[] | null
  lat: number
  lng: number
  whatsapp_e164: string | null
  hours_json: Record<string, unknown> | null
  rating: number | null
  review_count: number | null
}

export default async function PlaceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const place = await loadPlace(slug)
  if (!place) notFound()

  const photos = place.image_urls ?? []
  const cover = photos[0] ?? null
  const categoryLabel = CATEGORIES[place.category]?.label ?? place.category

  const waNumber = (place.whatsapp_e164 ?? '').replace(/[^0-9]/g, '')
  const waText = encodeURIComponent(`Halo ${place.name}, saya lihat listingmu di IndoCity.`)
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : null

  // Schema.org Place — gives Google a structured handle on each landmark
  // so they can surface in Maps / Knowledge Graph results.
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    '@id': `${SITE_URL}/places/${place.slug}`,
    name: place.name,
    description: place.description || undefined,
    url: `${SITE_URL}/places/${place.slug}`,
    image: place.image_urls?.[0] || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: place.address || undefined,
      addressLocality: place.city,
      addressCountry: 'ID',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: place.lat,
      longitude: place.lng,
    },
    aggregateRating: place.rating != null && place.review_count != null && place.review_count > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: place.rating,
          reviewCount: place.review_count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <AppNav />
      <main className="min-h-[100dvh] pb-16">
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <Link href="/places" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink mb-4">
            <ChevronLeft className="w-4 h-4" />
            Places
          </Link>

          {/* Hero photo */}
          {cover && (
            <div className="rounded-2xl overflow-hidden bg-black/60 border border-white/10 mb-4">
              <img src={cover} alt={place.name} className="w-full aspect-[16/10] object-cover" />
            </div>
          )}

          <header className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand">
                {categoryLabel}
              </span>
              {place.rating != null && (
                <span className="text-[12px] text-muted">
                  · ★ {place.rating.toFixed(1)} ({place.review_count ?? 0} reviews)
                </span>
              )}
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight leading-tight">
              {place.name}
            </h1>
            {place.address && (
              <p className="text-[13px] text-muted mt-2 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{place.address}</span>
              </p>
            )}
          </header>

          {place.description && (
            <section className="card p-4 mb-4">
              <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-dim mb-2">About</h2>
              <p className="text-[14px] leading-relaxed text-ink/90 whitespace-pre-wrap">
                {place.description}
              </p>
            </section>
          )}

          {/* Photo gallery — skip the cover since it's already up top */}
          {photos.length > 1 && (
            <section className="mb-4">
              <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-dim mb-2 px-1">Photos</h2>
              <div className="grid grid-cols-3 gap-2">
                {photos.slice(1).map((url, i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-black/60 border border-white/10 aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {place.tags && place.tags.length > 0 && (
            <section className="mb-4">
              <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-dim mb-2 px-1">Tags</h2>
              <div className="flex flex-wrap gap-1.5 px-1">
                {place.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[12px] text-muted">
                    <Tag className="w-3 h-3" />
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="card p-4 mb-4">
            <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-dim mb-2">Contact</h2>
            <div className="space-y-2">
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99]"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp {place.name}
                </a>
              ) : (
                <p className="text-[13px] text-muted">No phone provided yet.</p>
              )}
              {place.whatsapp_e164 && (
                <a
                  href={`tel:${place.whatsapp_e164}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-black/50 border border-white/15 text-ink font-extrabold text-[13px] uppercase tracking-wider active:scale-[0.99]"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[13px] font-bold text-brand"
              >
                Open in Google Maps →
              </a>
            </div>
          </section>

          <PlatformDisclaimer variant="compact" />
        </div>
      </main>
    </>
  )
}
