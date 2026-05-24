import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { fetchDriverBySlugServer } from '@/lib/drivers/queries.server'
import JsonLd from '@/components/seo/JsonLd'

// ============================================================================
// Server-side metadata + LocalBusiness JSON-LD for the public driver
// profile page (/r/[slug]). The page.tsx itself is a client component so
// the metadata + structured data live here in the layout — Next 15 runs
// layout server-side regardless of child runtime.
// ============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cityriders.id'

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

  // Lapsed-driver redirect — runs BEFORE any HTML renders so the user
  // never sees a broken-looking "this driver is dead" profile page.
  // A driver shared their link on social media → that traffic is
  // valuable; we land the visitor on the main booking page instead of
  // burning the click. Query params preserve attribution so we can
  // see in analytics which lapsed driver brought how much traffic.
  //
  // Conditions that trigger redirect:
  //   • drivers.status        in ('suspended', 'removed')   — admin action
  //   • subscriptionStatus    in ('past_due', 'canceled')   — billing lapsed
  //
  // Onine/busy/offline drivers fall through — the page handles those
  // states with the DriverUnavailableCard (lets the visitor see the
  // driver they expected + a fast escape to alternates).
  if (driver) {
    const subLapsed = driver.subscriptionStatus === 'past_due'
                   || driver.subscriptionStatus === 'canceled'
    // The Rider type doesn't surface drivers.status directly; the
    // queries layer filters out non-active drivers from public reads.
    // So if we got a Rider back, status is 'active' (or mock). The
    // lapsed gate above catches the only remaining bookable-but-dead state.
    if (subLapsed) {
      const qs = new URLSearchParams({
        from: 'lapsed_driver',
        slug: driver.slug,
      })
      redirect(`/cari?${qs.toString()}`)
    }
  }

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
