import { headers } from 'next/headers'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// /sitemap.xml — host-aware sitemap.
// ----------------------------------------------------------------------------
// Replaces the previous build-time src/app/sitemap.ts which always emitted
// citydrivers.id URLs regardless of which host was crawling. Now each
// production hostname gets its OWN sitemap so Google indexes each as a
// distinct property:
//
//   citydrivers.id  — driver-directory routes only (cityriders / drivers /
//                     car / truck / bus / jeep / r / signup / places).
//   kita2u.com      — multi-vertical marketplace routes only (beautician /
//                     handyman / laundry / massage / home-clean / facial /
//                     skincare / tour / rent / business / etc.).
//
// Both hosts get the legal trio (/privacy, /terms, /legal) plus a host-
// appropriate `/` entry.
//
// Failure tolerance: Supabase unreachable → just the static section.
// Caching: 6h sliding revalidation (Vercel CDN + browser).
// ============================================================================

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Vertical = 'cityriders' | 'kita2u'

const CITYRIDERS_HOSTS = new Set(['citydrivers.id', 'www.citydrivers.id'])
const KITA2U_HOSTS     = new Set(['kita2u.com',     'www.kita2u.com'])

// Static routes per vertical. Path + change frequency + priority. The first
// entry (priority 1.0) is the host's landing page.
const CITYRIDERS_STATIC = [
  { path: '/',              freq: 'daily',   priority: 1.0 },
  { path: '/cari',          freq: 'daily',   priority: 0.9 },
  { path: '/drivers',       freq: 'weekly',  priority: 0.8 },
  { path: '/drivers/car',   freq: 'weekly',  priority: 0.8 },
  { path: '/drivers/truck', freq: 'weekly',  priority: 0.8 },
  { path: '/drivers/bus',   freq: 'weekly',  priority: 0.8 },
  { path: '/drivers/jeep',  freq: 'weekly',  priority: 0.8 },
  { path: '/car',           freq: 'daily',   priority: 0.8 },
  { path: '/truck',         freq: 'daily',   priority: 0.8 },
  { path: '/bus',           freq: 'daily',   priority: 0.8 },
  { path: '/jeep',          freq: 'daily',   priority: 0.8 },
  { path: '/places',        freq: 'daily',   priority: 0.7 },
  { path: '/login',         freq: 'yearly',  priority: 0.3 },
  { path: '/signup',        freq: 'yearly',  priority: 0.4 },
  { path: '/privacy',       freq: 'yearly',  priority: 0.3 },
  { path: '/terms',         freq: 'yearly',  priority: 0.3 },
] as const

const KITA2U_STATIC = [
  { path: '/',           freq: 'daily',   priority: 1.0 },
  { path: '/cari',       freq: 'daily',   priority: 0.9 },
  { path: '/places',     freq: 'daily',   priority: 0.9 },
  { path: '/business',   freq: 'daily',   priority: 0.9 },
  { path: '/rent',       freq: 'daily',   priority: 0.8 },
  { path: '/pricing',    freq: 'monthly', priority: 0.7 },
  { path: '/services',   freq: 'monthly', priority: 0.7 },
  { path: '/list-place', freq: 'monthly', priority: 0.6 },
  { path: '/contact',    freq: 'yearly',  priority: 0.4 },
  { path: '/privacy',    freq: 'yearly',  priority: 0.3 },
  { path: '/terms',      freq: 'yearly',  priority: 0.3 },
  { path: '/legal',      freq: 'yearly',  priority: 0.3 },
] as const

type Entry = { url: string; lastmod?: string; changefreq?: string; priority?: number }

function detectVertical(host: string): Vertical {
  if (CITYRIDERS_HOSTS.has(host)) return 'cityriders'
  if (KITA2U_HOSTS.has(host))     return 'kita2u'
  // Unknown / dev host — default to Kita2u (the marketplace surface) so
  // local preview deploys get something testable.
  return 'kita2u'
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildXml(entries: ReadonlyArray<Entry>): string {
  const items = entries.map((e) => {
    const lines = [`    <loc>${escapeXml(e.url)}</loc>`]
    if (e.lastmod)    lines.push(`    <lastmod>${e.lastmod}</lastmod>`)
    if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`)
    if (typeof e.priority === 'number') lines.push(`    <priority>${e.priority.toFixed(1)}</priority>`)
    return `  <url>\n${lines.join('\n')}\n  </url>`
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...items,
    '</urlset>',
    '',
  ].join('\n')
}

async function safeList<T = { slug: string | null; updated_at: string | null }>(
  builder: () => PromiseLike<{ data: unknown }>,
): Promise<T[]> {
  try {
    const r = await builder()
    return (r?.data ?? []) as T[]
  } catch {
    return []
  }
}

export async function GET() {
  const h = await headers()
  const host = (h.get('host') || '').toLowerCase().split(':')[0]
  const vertical = detectVertical(host)
  const origin = `https://${host || (vertical === 'cityriders' ? 'citydrivers.id' : 'kita2u.com')}`
  const nowIso = new Date().toISOString()

  const staticRoutes = vertical === 'cityriders' ? CITYRIDERS_STATIC : KITA2U_STATIC
  const entries: Entry[] = staticRoutes.map((r) => ({
    url:        `${origin}${r.path}`,
    lastmod:    nowIso,
    changefreq: r.freq,
    priority:   r.priority,
  }))

  const admin = getAdminSupabase()
  if (admin) {
    if (vertical === 'cityriders') {
      // Drivers + places — the two dynamic catalogs on citydrivers.id.
      const [driversRes, placesRes] = await Promise.all([
        safeList<{ slug: string | null; updated_at: string | null; vehicle_type: string | null }>(() =>
          admin.from('drivers').select('slug, updated_at, vehicle_type').eq('status', 'active').limit(2000),
        ),
        safeList(() =>
          admin.from('places').select('slug, updated_at').eq('status', 'approved').limit(5000),
        ),
      ])
      for (const d of driversRes) {
        if (!d.slug || d.slug.startsWith('deleted-')) continue
        // Route per vehicle vertical — /r (bike), /car, /truck, /bus, /jeep.
        const path =
          d.vehicle_type === 'car'   ? `/car/${d.slug}`   :
          d.vehicle_type === 'truck' ? `/truck/${d.slug}` :
          (d.vehicle_type === 'bus' || d.vehicle_type === 'minibus') ? `/bus/${d.slug}` :
          d.vehicle_type === 'jeep'  ? `/jeep/${d.slug}`  :
          `/r/${d.slug}`
        entries.push({
          url:        `${origin}${path}`,
          lastmod:    d.updated_at ?? nowIso,
          changefreq: 'weekly',
          priority:   0.7,
        })
      }
      for (const p of placesRes) {
        if (!p.slug) continue
        entries.push({
          url:        `${origin}/places/${p.slug}`,
          lastmod:    p.updated_at ?? nowIso,
          changefreq: 'monthly',
          priority:   0.6,
        })
      }
    } else {
      // Kita2u — multi-vertical marketplace catalogs.
      const [beautyRes, handyRes, laundryRes, massageRes, homeCleanRes, facialRes, skincareRes, tourRes, bikeRentRes] =
        await Promise.all([
          safeList(() => admin.from('beautician_providers').select('slug, updated_at').limit(5000)),
          safeList(() => admin.from('handyman_providers').select('slug, updated_at').limit(5000)),
          safeList(() => admin.from('laundry_providers').select('slug, updated_at').limit(5000)),
          safeList(() => admin.from('massage_providers').select('slug, updated_at').limit(5000)),
          safeList(() => admin.from('home_clean_providers').select('slug, updated_at').limit(5000)),
          safeList(() => admin.from('facial_providers').select('slug, updated_at').limit(5000)),
          safeList(() => admin.from('skincare_providers').select('slug, updated_at').limit(5000)),
          safeList(() => admin.from('tour_guide_listings').select('slug, updated_at').eq('status', 'approved').limit(5000)),
          safeList(() => admin.from('bike_rentals').select('slug, updated_at').eq('status', 'approved').limit(5000)),
        ])
      const append = (rows: { slug: string | null; updated_at: string | null }[], prefix: string) => {
        for (const row of rows) {
          if (!row.slug) continue
          entries.push({
            url:        `${origin}${prefix}/${row.slug}`,
            lastmod:    row.updated_at ?? nowIso,
            changefreq: 'weekly',
            priority:   0.6,
          })
        }
      }
      append(beautyRes,    '/beautician')
      append(handyRes,     '/handyman')
      append(laundryRes,   '/laundry')
      append(massageRes,   '/massage')
      append(homeCleanRes, '/home-clean')
      append(facialRes,    '/facial')
      append(skincareRes,  '/skincare')
      append(tourRes,      '/tour')
      append(bikeRentRes,  '/rent')
    }
  }

  return new Response(buildXml(entries), {
    headers: {
      'Content-Type':  'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=21600, stale-while-revalidate=43200',
    },
  })
}
