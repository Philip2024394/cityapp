import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import JsonLd from '@/components/seo/JsonLd'

// Server-side SEO + lapsed-subscription redirect for /tour/[slug].
// Mirrors the canonical pattern from /massage/[slug] etc.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id'

type Row = {
  id: string
  slug: string
  name: string
  city: string | null
  notes: string | null
  whatsapp_e164: string | null
  cover_image_url: string | null
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled' | null
  day_rate_idr: number | null
} | null

async function fetchListing(slug: string): Promise<Row> {
  const admin = getAdminSupabase()
  if (!admin) return null
  const { data } = await admin
    .from('tour_guide_listings')
    .select('id, slug, name, city, notes, whatsapp_e164, cover_image_url, subscription_status, day_rate_idr')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  return (data as Row) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const r = await fetchListing(slug).catch(() => null)
  if (!r) return { title: 'Tour guide not found', robots: { index: false, follow: false } }
  const city = r.city ? r.city.replace(/-/g, ' ') : 'Indonesia'
  const title       = `${r.name} · Tour Guide ${city}`
  const description = (r.notes?.trim())
    || `Hire ${r.name} as your local tour guide in ${city} via WhatsApp.${r.day_rate_idr ? ` Mulai Rp ${r.day_rate_idr.toLocaleString('id-ID')}/hari.` : ''}`
  const canonical   = `${SITE_URL}/tour/${r.slug}`
  const cover       = r.cover_image_url || undefined
  return {
    title, description,
    alternates: { canonical },
    openGraph:  { type: 'profile', url: canonical, title, description, images: cover ? [{ url: cover, alt: r.name }] : undefined },
    twitter:    { card: 'summary_large_image', title, description, images: cover ? [cover] : undefined },
  }
}

export default async function TourListingLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const r = await fetchListing(slug).catch(() => null)
  if (r) {
    const lapsed = r.subscription_status === 'expired' || r.subscription_status === 'cancelled'
    if (lapsed) {
      const qs = new URLSearchParams({ from: 'lapsed_tour', slug: r.slug })
      redirect(`/tour?${qs.toString()}`)
    }
  }
  const jsonLd = r
    ? {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': `${SITE_URL}/tour/${r.slug}`,
        name: r.name,
        description: r.notes || undefined,
        url: `${SITE_URL}/tour/${r.slug}`,
        image: r.cover_image_url || undefined,
        telephone: r.whatsapp_e164 ? `+${r.whatsapp_e164}` : undefined,
        priceRange: 'Rp',
        address: { '@type': 'PostalAddress', addressLocality: r.city || undefined, addressCountry: 'ID' },
      }
    : null
  return <>{jsonLd && <JsonLd data={jsonLd} />}{children}</>
}
