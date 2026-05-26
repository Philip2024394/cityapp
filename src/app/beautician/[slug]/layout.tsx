import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import JsonLd from '@/components/seo/JsonLd'

// Server-side SEO + lapsed redirect for /beautician/[slug].
// Same canonical pattern as /r/[slug]/layout.tsx and /massage/[slug]/layout.tsx.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id'

type ProviderRow = {
  id?: string
  slug: string
  display_name: string
  bio: string | null
  city: string | null
  whatsapp_e164: string | null
  profile_image_url: string | null
  cover_image_url: string | null
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled' | null
  price_makeup_idr: number | null
  price_nail_idr:   number | null
  price_hair_idr:   number | null
} | null

async function fetchProvider(slug: string): Promise<ProviderRow> {
  const admin = getAdminSupabase()
  if (!admin) return null
  const { data } = await admin
    .from('beautician_providers')
    .select('id, slug, display_name, bio, city, whatsapp_e164, profile_image_url, cover_image_url, subscription_status, price_makeup_idr, price_nail_idr, price_hair_idr')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  return (data as ProviderRow) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = await fetchProvider(slug).catch(() => null)
  if (!p) return { title: 'Beautician not found', robots: { index: false, follow: false } }
  const cheapest = [p.price_makeup_idr, p.price_nail_idr, p.price_hair_idr]
    .filter((n): n is number => typeof n === 'number' && n > 0)
    .reduce((min, n) => Math.min(min, n), Number.POSITIVE_INFINITY)
  const title       = `${p.display_name} · Beautician ${p.city || 'Indonesia'}`
  const description = (p.bio?.trim())
    || `Book ${p.display_name} for makeup, nails, or hair in ${p.city || 'Indonesia'} via WhatsApp. From Rp ${Number.isFinite(cheapest) ? cheapest.toLocaleString('id-ID') : '—'}.`
  const canonical   = `${SITE_URL}/beautician/${p.slug}`
  const cover       = p.cover_image_url || p.profile_image_url || undefined
  return {
    title, description,
    alternates: { canonical },
    openGraph:  { type: 'profile', url: canonical, title, description, images: cover ? [{ url: cover, alt: p.display_name }] : undefined },
    twitter:    { card: 'summary_large_image', title, description, images: cover ? [cover] : undefined },
  }
}

export default async function BeauticianProviderLayout({
  children, params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const p = await fetchProvider(slug).catch(() => null)

  if (p) {
    const lapsed = p.subscription_status === 'expired' || p.subscription_status === 'cancelled'
    if (lapsed) {
      const qs = new URLSearchParams({ from: 'lapsed_beautician', slug: p.slug })
      redirect(`/beautician?${qs.toString()}`)
    }
  }

  const jsonLd = p
    ? {
        '@context': 'https://schema.org',
        '@type':    'LocalBusiness',
        '@id':      `${SITE_URL}/beautician/${p.slug}`,
        name:        p.display_name,
        description: p.bio || undefined,
        url:         `${SITE_URL}/beautician/${p.slug}`,
        image:       p.cover_image_url || p.profile_image_url || undefined,
        telephone:   p.whatsapp_e164 ? `+${p.whatsapp_e164}` : undefined,
        priceRange:  'Rp',
        address:     { '@type': 'PostalAddress', addressLocality: p.city || undefined, addressCountry: 'ID' },
      }
    : null

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {children}
    </>
  )
}
