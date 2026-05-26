import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import JsonLd from '@/components/seo/JsonLd'

// Server-side SEO + lapsed-subscription redirect for /rent/[slug].
// Nested layout — the parent /rent/layout.tsx still injects
// AppImageBackground.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id'

type Row = {
  id: string
  slug: string
  brand: string
  model: string
  city: string | null
  description: string | null
  image_urls: string[] | null
  cover_image_url: string | null
  owner_name: string | null
  owner_whatsapp_e164: string | null
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled' | null
  daily_price_idr: number | null
} | null

async function fetchListing(slug: string): Promise<Row> {
  const admin = getAdminSupabase()
  if (!admin) return null
  const { data } = await admin
    .from('bike_rentals')
    .select('id, slug, brand, model, city, description, image_urls, cover_image_url, owner_name, owner_whatsapp_e164, subscription_status, daily_price_idr')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  return (data as Row) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const r = await fetchListing(slug).catch(() => null)
  if (!r) return { title: 'Rental not found', robots: { index: false, follow: false } }
  const bike = `${r.brand} ${r.model}`
  const city = r.city ? r.city.replace(/-/g, ' ') : 'Indonesia'
  const title       = `${bike} · Sewa Motor ${city}`
  const description = (r.description?.trim())
    || `Sewa ${bike} di ${city} via WhatsApp.${r.daily_price_idr ? ` Mulai Rp ${r.daily_price_idr.toLocaleString('id-ID')}/hari.` : ''}`
  const canonical   = `${SITE_URL}/rent/${r.slug}`
  const cover       = r.cover_image_url || (r.image_urls && r.image_urls[0]) || undefined
  return {
    title, description,
    alternates: { canonical },
    openGraph:  { type: 'website', url: canonical, title, description, images: cover ? [{ url: cover, alt: bike }] : undefined },
    twitter:    { card: 'summary_large_image', title, description, images: cover ? [cover] : undefined },
  }
}

export default async function RentListingLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const r = await fetchListing(slug).catch(() => null)
  if (r) {
    const lapsed = r.subscription_status === 'expired' || r.subscription_status === 'cancelled'
    if (lapsed) {
      const qs = new URLSearchParams({ from: 'lapsed_rent', slug: r.slug })
      redirect(`/rent?${qs.toString()}`)
    }
  }
  // schema.org Product fits a rental better than LocalBusiness — the listing
  // IS the rentable item, and Google rich results have first-class Product
  // support for image + name + offer.
  const jsonLd = r
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${SITE_URL}/rent/${r.slug}`,
        name: `${r.brand} ${r.model}`,
        description: r.description || undefined,
        url: `${SITE_URL}/rent/${r.slug}`,
        image: r.cover_image_url || (r.image_urls && r.image_urls[0]) || undefined,
        brand: { '@type': 'Brand', name: r.brand },
        offers: r.daily_price_idr
          ? {
              '@type': 'Offer',
              priceCurrency: 'IDR',
              price: r.daily_price_idr,
              availability: 'https://schema.org/InStock',
              url: `${SITE_URL}/rent/${r.slug}`,
            }
          : undefined,
      }
    : null
  return <>{jsonLd && <JsonLd data={jsonLd} />}{children}</>
}
