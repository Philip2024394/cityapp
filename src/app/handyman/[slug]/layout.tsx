import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import JsonLd from '@/components/seo/JsonLd'

// Server-side SEO + lapsed redirect for /handyman/[slug].
// Mirrors /r/[slug] / /massage/[slug] / /beautician/[slug] pattern.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id'

type Row = {
  id?: string; slug: string; display_name: string; bio: string | null
  city: string | null; whatsapp_e164: string | null
  profile_image_url: string | null; cover_image_url: string | null
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled' | null
  hourly_rate_idr: number | null; day_rate_idr: number | null
} | null

async function fetchProvider(slug: string): Promise<Row> {
  const admin = getAdminSupabase()
  if (!admin) return null
  const { data } = await admin
    .from('handyman_providers')
    .select('id, slug, display_name, bio, city, whatsapp_e164, profile_image_url, cover_image_url, subscription_status, hourly_rate_idr, day_rate_idr')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  return (data as Row) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = await fetchProvider(slug).catch(() => null)
  if (!p) return { title: 'Tukang not found', robots: { index: false, follow: false } }
  const hourly = p.hourly_rate_idr ?? null
  const title       = `${p.display_name} · Tukang ${p.city || 'Indonesia'}`
  const description = (p.bio?.trim())
    || `Pesan ${p.display_name} (tukang) di ${p.city || 'Indonesia'} via WhatsApp.${hourly ? ` Mulai Rp ${hourly.toLocaleString('id-ID')}/jam.` : ''}`
  const canonical   = `${SITE_URL}/handyman/${p.slug}`
  const cover       = p.cover_image_url || p.profile_image_url || undefined
  return {
    title, description,
    alternates: { canonical },
    openGraph:  { type: 'profile', url: canonical, title, description, images: cover ? [{ url: cover, alt: p.display_name }] : undefined },
    twitter:    { card: 'summary_large_image', title, description, images: cover ? [cover] : undefined },
  }
}

export default async function HandymanProviderLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = await fetchProvider(slug).catch(() => null)
  if (p) {
    const lapsed = p.subscription_status === 'expired' || p.subscription_status === 'cancelled'
    if (lapsed) {
      const qs = new URLSearchParams({ from: 'lapsed_handyman', slug: p.slug })
      redirect(`/handyman?${qs.toString()}`)
    }
  }
  const jsonLd = p
    ? {
        '@context': 'https://schema.org', '@type': 'LocalBusiness',
        '@id': `${SITE_URL}/handyman/${p.slug}`,
        name: p.display_name, description: p.bio || undefined,
        url: `${SITE_URL}/handyman/${p.slug}`,
        image: p.cover_image_url || p.profile_image_url || undefined,
        telephone: p.whatsapp_e164 ? `+${p.whatsapp_e164}` : undefined,
        priceRange: 'Rp',
        address: { '@type': 'PostalAddress', addressLocality: p.city || undefined, addressCountry: 'ID' },
      }
    : null
  return <>{jsonLd && <JsonLd data={jsonLd} />}{children}</>
}
