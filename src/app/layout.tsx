import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import PageBackground from '@/components/layout/PageBackground'

// Root layout intentionally does NOT set `export const dynamic = 'force-dynamic'`.
// That switch poisons every route — including marketing landings, vertical
// homepages, and profile pages — and prevents Cloudflare from caching pages
// that have no per-request state. `force-dynamic` is now scoped per-page (or
// per sub-layout) for auth-gated areas only. See:
//   - src/app/dashboard/layout.tsx (auth-gated)
//   - src/app/admin/layout.tsx (auth-gated, via requireAdmin in code)
//   - src/app/login/page.tsx, /signup, /forgot, /onboarding (auth flows)
//   - /cari, /explore (read searchParams)
// Routes with `revalidate = <n>` (e.g. all /car/[slug] profile pages) cache
// at the CDN as expected.
import RegisterServiceWorker from '@/components/pwa/RegisterServiceWorker'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import PreloadTiles from '@/components/pwa/PreloadTiles'
import CapacitorBoot from '@/components/pwa/CapacitorBoot'
import DevToolbar from '@/components/dev/DevToolbar'
import LocationGateProvider from '@/components/onboarding/LocationGateProvider'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://citydrivers.id'

const CITYRIDERS_HOSTS = new Set([
  'citydrivers.id',
  'www.citydrivers.id',
])
const KITA2U_HOSTS = new Set([
  'kita2u.com',
  'www.kita2u.com',
])

// Host-specific OG / social-preview hero images. Each domain gets its own
// branded card so a WhatsApp / Twitter / Facebook share of kita2u.com looks
// visually distinct from a share of citydrivers.id, even though both
// serve from the same Vercel deploy.
const CITYDRIVERS_OG_IMAGE =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2003_30_50%20PM.png'
const KITA2U_OG_IMAGE =
  'https://ik.imagekit.io/9mrgsv2rp/ChatGPT%20Image%20May%2028,%202026,%2012_03_21%20PM.png'

// Host-aware metadata. Install prompts, OG previews, and the apple-web-app
// title all read these — must match the host the user is actually on.
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const host = (h.get('host') || '').toLowerCase().split(':')[0]
  const isCityriders = CITYRIDERS_HOSTS.has(host)
  const isKita2u     = KITA2U_HOSTS.has(host)

  if (isCityriders) {
    const SITE = 'https://citydrivers.id'
    return {
      metadataBase: new URL(SITE),
      title: {
        default: 'CityDrivers — Local drivers. Direct WhatsApp. No app needed.',
        template: '%s · CityDrivers',
      },
      description:
        'Find local Indonesian drivers in Yogyakarta, Bali, and Jogja. Tap WhatsApp, agree the fare, get a ride. No app install, no surge pricing.',
      // Cache-bust the manifest URL so phones that previously cached the
      // old (CityDrivers) manifest fetch the new CityDrivers one on next visit.
      manifest: '/manifest.webmanifest?v=2026-05-31-cr',
      applicationName: 'CityDrivers',
      icons: {
        icon: [
          { url: 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351', sizes: '192x192', type: 'image/png' },
          { url: 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351', sizes: '512x512', type: 'image/png' },
        ],
        apple: [
          { url: 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351', sizes: '180x180', type: 'image/png' },
        ],
      },
      alternates: { canonical: '/' },
      openGraph: {
        type: 'website',
        siteName: 'CityDrivers',
        locale: 'id_ID',
        url: SITE,
        title: 'CityDrivers — Local drivers. Direct WhatsApp. No app needed.',
        description:
          'Find local Indonesian drivers in Yogyakarta, Bali, and Jogja. Tap WhatsApp, agree the fare, get a ride.',
        images: [
          { url: CITYDRIVERS_OG_IMAGE, width: 1200, height: 630, alt: 'CityDrivers' },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'CityDrivers',
        description: 'Local Indonesian drivers, direct WhatsApp booking, no app install.',
        images: [CITYDRIVERS_OG_IMAGE],
      },
      appleWebApp: {
        capable: true,
        title: 'CityDrivers',
        statusBarStyle: 'black-translucent',
      },
      formatDetection: { telephone: false },
      other: { google: 'notranslate' },
    }
  }

  // Kita2u branch — serves the multi-vertical marketplace on kita2u.com
  // and on dev / preview hosts. The canonical SITE prefers the live
  // Kita2u apex when the request actually arrived on kita2u.com, so
  // og:url and the canonical link no longer leak a citydrivers.id URL
  // (which is what the previous SITE_URL fallback was doing).
  const SITE = isKita2u ? 'https://kita2u.com' : SITE_URL
  return {
    metadataBase: new URL(SITE),
    title: {
      default: 'Kita2u — Marketplace kurir motor Indonesia',
      template: '%s · Kita2u',
    },
    description:
      'Platform bisnis untuk rider motor independen. Profil rider, harga sendiri, kontak langsung via WhatsApp. Tidak ada komisi.',
    manifest: '/manifest.webmanifest',
    applicationName: 'Kita2u',
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: 'Kita2u',
      locale: 'id_ID',
      url: SITE,
      title: 'Kita2u — Marketplace kurir motor Indonesia',
      description:
        'Cari rider motor independen di kota kamu. Bayar langsung, kontak via WhatsApp, tanpa komisi.',
      images: [
        { url: KITA2U_OG_IMAGE, width: 1200, height: 630, alt: 'Kita2u' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Kita2u',
      description: 'Marketplace kurir motor Indonesia — tanpa komisi.',
      images: [KITA2U_OG_IMAGE],
    },
    appleWebApp: {
      capable: true,
      title: 'Kita2u',
      statusBarStyle: 'black-translucent',
    },
    formatDetection: { telephone: false },
    // Browser translate (Google Translate, Microsoft Edge translate) rewrites
    // the DOM after SSR which breaks React hydration. Native Bahasa serves
    // Indonesian users directly; we will add real i18n with next-intl later.
    other: { google: 'notranslate' },
  }
}

export const viewport: Viewport = {
  // White matches the new app surface (every page paints white). This
  // colour also drives the mobile browser chrome tint + the PWA splash
  // / status-bar background in standalone mode.
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  // maximumScale removed — pinch-zoom is a baseline accessibility
  // requirement; locking it down hurts low-vision users.
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning: Browser translate (Google Translate, etc.) and
  // some extensions rewrite <html>/<body> attributes after SSR. Suppressing the
  // warning here lets React continue with a client re-render instead of bailing.
  // Locale + messages flow from the NEXT_LOCALE cookie via src/i18n/request.ts;
  // both are needed by NextIntlClientProvider so client components can call
  // useTranslations() in the same render tree as server components.
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <html lang={locale} translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        {/* Preconnect to first-paint-critical third-party origins so the
            TLS + DNS handshakes happen in parallel with HTML parse. On 3G
            in Indonesia this can shave 200-500ms off LCP. Hosts must match
            what we actually fetch — stale preconnects waste DNS lookups. */}
        <link rel="preconnect" href="https://krbewsrfxjswkoosohyc.supabase.co" crossOrigin="" />
        <link rel="preconnect" href="https://pub-fa7f8b7f5d5f4ab08a8a14d5a6c3bfb8.r2.dev" crossOrigin="" />
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="" />
        <link rel="dns-prefetch" href="https://nominatim.openstreetmap.org" />
      </head>
      <body suppressHydrationWarning>
        {/* Global background image — mounted once at the root so every
            page sits over the same scene. Fixed to the viewport; doesn't
            scroll with content. Dark scrim keeps text legible. */}
        <PageBackground />
        <RegisterServiceWorker />
        <PreloadTiles />
        <CapacitorBoot />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LocationGateProvider>
            {children}
          </LocationGateProvider>
        </NextIntlClientProvider>
        <InstallPrompt />
        <DevToolbar />
      </body>
    </html>
  )
}
