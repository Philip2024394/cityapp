import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import JsonLd from '@/components/seo/JsonLd'

// ============================================================================
// Server-side metadata + LocalBusiness JSON-LD + lapsed-driver redirect
// for /massage/[slug]. Mirrors the canonical /r/[slug]/layout.tsx pattern.
//
// Lapsed redirect: if subscription_status is past_due / cancelled, silently
// 307 to /massage so the marketing traffic the provider drove on social
// still lands somewhere useful. See /r/[slug]/layout.tsx and commit
// 88a1013 for the rationale.
// ============================================================================

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
  price_60min_idr: number | null
  rating?: number | null
} | null

async function fetchProvider(slug: string): Promise<ProviderRow> {
  const admin = getAdminSupabase()
  if (!admin) return null
  const { data } = await admin
    .from('massage_providers')
    .select('id, slug, display_name, bio, city, whatsapp_e164, profile_image_url, cover_image_url, subscription_status, price_60min_idr')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  return (data as ProviderRow) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = await fetchProvider(slug).catch(() => null)
  if (!p) {
    return { title: 'Massage therapist not found', robots: { index: false, follow: false } }
  }
  const title       = `${p.display_name} · Massage therapist ${p.city || 'Indonesia'}`
  const description = (p.bio?.trim())
    || `Book ${p.display_name} for massage in ${p.city || 'Indonesia'} via WhatsApp. From Rp ${(p.price_60min_idr ?? 0).toLocaleString('id-ID')} per 60 min session.`
  const canonical   = `${SITE_URL}/massage/${p.slug}`
  const cover       = p.cover_image_url || p.profile_image_url || undefined
  return {
    title, description,
    alternates: { canonical },
    openGraph:  { type: 'profile', url: canonical, title, description, images: cover ? [{ url: cover, alt: p.display_name }] : undefined },
    twitter:    { card: 'summary_large_image', title, description, images: cover ? [cover] : undefined },
  }
}

export default async function MassageProviderLayout({
  children, params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const p = await fetchProvider(slug).catch(() => null)

  // Lapsed redirect — runs BEFORE any HTML renders. See /r/[slug]/layout.tsx
  // for the full reasoning; same pattern applied here.
  if (p) {
    const lapsed = p.subscription_status === 'expired' || p.subscription_status === 'cancelled'
    if (lapsed) {
      const qs = new URLSearchParams({ from: 'lapsed_massage', slug: p.slug })
      redirect(`/massage?${qs.toString()}`)
    }
  }

  // JSON-LD LocalBusiness — Google / Knowledge Graph hook.
  const jsonLd = p
    ? {
        '@context': 'https://schema.org',
        '@type':    'LocalBusiness',
        '@id':      `${SITE_URL}/massage/${p.slug}`,
        name:        p.display_name,
        description: p.bio || undefined,
        url:         `${SITE_URL}/massage/${p.slug}`,
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
