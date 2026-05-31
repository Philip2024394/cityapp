import { headers } from 'next/headers'

// Host-aware PWA manifest. citydrivers.id (apex or www) gets the CityDrivers
// branding; everything else (citydrivers.id, localhost, previews) gets the
// CityDrivers branding.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CITYRIDERS_HOSTS = new Set([
  'citydrivers.id',
  'www.citydrivers.id',
])

const CITYRIDERS_LOGO_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351'

const CITYRIDERS_MANIFEST = {
  name:             'CityDrivers',
  short_name:       'CityDrivers',
  description:      'indoriders — indonesia local driver community',
  start_url:        '/',
  scope:            '/',
  display:          'standalone',
  orientation:      'portrait',
  background_color: '#FFFFFF',
  theme_color:      '#FFFFFF',
  lang:             'id',
  dir:              'ltr',
  categories:       ['lifestyle', 'travel', 'business'],
  // Single icon, both purposes. Transparent CityDrivers logo composites
  // onto the white background_color for adaptive icon shapes on Android.
  icons: [
    { src: CITYRIDERS_LOGO_URL, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: CITYRIDERS_LOGO_URL, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
}

const INDOCITY_MANIFEST = {
  name:             'CityDrivers — Indonesia local business directory',
  short_name:       'CityDrivers',
  description:
    'Indonesia\'s local business directory. Handyman, beautician, laundry, massage, home-clean, tour guides, riders, rentals — find them on CityDrivers and contact via WhatsApp.',
  start_url:        '/',
  scope:            '/',
  display:          'standalone',
  orientation:      'portrait',
  background_color: '#FFFFFF',
  theme_color:      '#FFFFFF',
  lang:             'id',
  dir:              'ltr',
  categories:       ['business', 'lifestyle', 'productivity'],
  icons: [
    { src: '/icons/icon-192.svg',           sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
    { src: '/icons/icon-512.svg',           sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
    { src: '/icons/icon-192.png',           sizes: '192x192', type: 'image/png',     purpose: 'any' },
    { src: '/icons/icon-512.png',           sizes: '512x512', type: 'image/png',     purpose: 'any' },
    { src: '/icons/icon-512-maskable.png',  sizes: '512x512', type: 'image/png',     purpose: 'maskable' },
  ],
}

export async function GET() {
  const h = await headers()
  const host = (h.get('host') || '').toLowerCase().split(':')[0]
  const body = CITYRIDERS_HOSTS.has(host) ? CITYRIDERS_MANIFEST : INDOCITY_MANIFEST
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type':  'application/manifest+json',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
