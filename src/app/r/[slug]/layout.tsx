import type { Metadata } from 'next'
import { fetchDriverBySlugServer } from '@/lib/drivers/queries.server'
import JsonLd from '@/components/seo/JsonLd'

// ============================================================================
// Server-side metadata + LocalBusiness JSON-LD for the public driver
// profile page (/r/[slug]). The page.tsx itself is a client component so
// the metadata + structured data live here in the layout — Next 15 runs
// layout server-side regardless of child runtime.
// ============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cityrider.id'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const driver = await fetchDriverBySlugServer(slug).catch(() => null)
  if (!driver) {
    return {
      title: 'Rider not found',
      robots: { index: false, follow: false },
    }
  }
  const title = `${driver.name} · Kurir motor ${driver.city || 'Indonesia'}`
  const description = driver.bio?.trim()
    || `Pesan ${driver.name} via WhatsApp untuk kurir, antar paket, atau makanan di ${driver.city || 'Indonesia'}. Harga rider mulai Rp ${driver.minFee.toLocaleString('id-ID')}.`
  const canonical = `${SITE_URL}/r/${driver.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      title,
      description,
      images: driver.photoUrl ? [{ url: driver.photoUrl, alt: driver.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: driver.photoUrl ? [driver.photoUrl] : undefined,
    },
  }
}

export default async function RiderLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const driver = await fetchDriverBySlugServer(slug).catch(() => null)

  // JSON-LD LocalBusiness — gives Google a structured handle on each
  // driver so they can appear in Maps / Knowledge Graph results.
  const jsonLd = driver
    ? {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': `${SITE_URL}/r/${driver.slug}`,
        name: driver.name,
        description: driver.bio || undefined,
        url: `${SITE_URL}/r/${driver.slug}`,
        image: driver.photoUrl || undefined,
        telephone: driver.whatsappE164 ? `+${driver.whatsappE164}` : undefined,
        priceRange: 'Rp',
        address: {
          '@type': 'PostalAddress',
          addressLocality: driver.city || undefined,
          addressRegion: driver.area || undefined,
          addressCountry: 'ID',
        },
        geo: driver.lat && driver.lng
          ? {
              '@type': 'GeoCoordinates',
              latitude: driver.lat,
              longitude: driver.lng,
            }
          : undefined,
        aggregateRating: driver.rating
          ? {
              '@type': 'AggregateRating',
              ratingValue: driver.rating,
              reviewCount: driver.trips ?? 1,
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
        areaServed: driver.city || undefined,
      }
    : null

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {children}
    </>
  )
}
