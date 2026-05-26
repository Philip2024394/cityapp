import type { MetadataRoute } from 'next'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// /sitemap.xml — pulled dynamically from Supabase at build / revalidation.
// ----------------------------------------------------------------------------
// Static public surfaces are listed first, then dynamic driver / place /
// rental URLs are appended. Each entry sets a sensible `changeFrequency`
// and `priority` — Google increasingly ignores priority but it doesn't
// hurt.
//
// Failure tolerance: if Supabase is unreachable during build, we return
// just the static section. Better an incomplete sitemap than a build error.
// ============================================================================

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id').replace(/\/$/, '')

// Revalidate every 6 hours — Google re-crawls major sites at ~daily
// cadence, so 6h captures fresh listings without hammering Supabase.
export const revalidate = 21_600

const STATIC_ROUTES: ReadonlyArray<{ path: string; changeFreq: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
  { path: '/',              changeFreq: 'daily',   priority: 1.0 },
  { path: '/cari',          changeFreq: 'daily',   priority: 0.9 },
  { path: '/places',        changeFreq: 'daily',   priority: 0.9 },
  { path: '/business',      changeFreq: 'daily',   priority: 0.9 },
  { path: '/rent',          changeFreq: 'daily',   priority: 0.8 },
  { path: '/pricing',       changeFreq: 'monthly', priority: 0.7 },
  { path: '/services',      changeFreq: 'monthly', priority: 0.7 },
  { path: '/list-place',    changeFreq: 'monthly', priority: 0.6 },
  { path: '/contact',       changeFreq: 'yearly',  priority: 0.4 },
  { path: '/privacy',       changeFreq: 'yearly',  priority: 0.3 },
  { path: '/terms',         changeFreq: 'yearly',  priority: 0.3 },
  { path: '/legal',         changeFreq: 'yearly',  priority: 0.3 },
  { path: '/account/delete',changeFreq: 'yearly',  priority: 0.2 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static section — always present.
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFreq,
    priority: r.priority,
  }))

  // Dynamic sections — best-effort from Supabase. Failure returns static only.
  const admin = getAdminSupabase()
  if (!admin) return staticEntries

  // Three best-effort queries — wrapped individually so a single
  // table-missing or RLS slip-up never fails the whole sitemap.
  async function safeList(builder: () => PromiseLike<{ data: unknown }>) {
    try {
      const r = await builder()
      return (r?.data ?? []) as Array<{ slug: string | null; updated_at: string | null }>
    } catch {
      return []
    }
  }

  const [driversRes, placesRes, rentalsRes] = await Promise.all([
    safeList(() =>
      admin.from('drivers').select('slug, updated_at').eq('status', 'active').limit(2000),
    ),
    safeList(() =>
      admin.from('places').select('slug, updated_at').eq('status', 'approved').limit(5000),
    ),
    safeList(() =>
      admin.from('bike_rentals').select('slug, updated_at').eq('status', 'approved').limit(2000),
    ),
  ])

  const driverEntries: MetadataRoute.Sitemap = driversRes
    .filter((d) => !!d.slug && !d.slug.startsWith('deleted-'))
    .map((d) => ({
      url: `${SITE}/r/${d.slug}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  const placeEntries: MetadataRoute.Sitemap = placesRes
    .filter((p) => !!p.slug)
    .map((p) => ({
      url: `${SITE}/places/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))

  const rentalEntries: MetadataRoute.Sitemap = rentalsRes
    .filter((r) => !!r.slug)
    .map((r) => ({
      url: `${SITE}/rent/${r.slug}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

  return [...staticEntries, ...driverEntries, ...placeEntries, ...rentalEntries]
}
