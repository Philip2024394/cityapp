import type { MetadataRoute } from 'next'

// ============================================================================
// /robots.txt — controls which URLs search engines may crawl.
// ----------------------------------------------------------------------------
// Public discovery surfaces (driver profiles, places, rentals) are allowed.
// Authenticated app surfaces (dashboard, onboarding, alert) are blocked
// from indexing because they require a session and would be empty for a
// crawler.
// ============================================================================

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/cari',
          '/cari/rider',
          '/places',
          '/places/',
          '/r/',
          '/rent',
          '/rent/',
          '/business',
          '/pricing',
          '/services',
          '/contact',
          '/privacy',
          '/terms',
          '/legal',
          '/account/delete',
          '/list-place',
          '/login',
          '/signup',
        ],
        disallow: [
          '/api/',
          '/dashboard',
          '/dashboard/',
          '/onboarding',
          '/profile',
          '/alert',
          '/cari/pending',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
