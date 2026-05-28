import type { Metadata, Viewport } from 'next'
import './globals.css'
import PageBackground from '@/components/layout/PageBackground'

// App-wide dynamic rendering. Indocity is mostly auth-gated / per-request
// (admin, dashboards, profile pages, marketplace queries) so prerendering
// buys nothing and trips on every `useSearchParams()` without a Suspense
// boundary. One switch, no Suspense boilerplate sprinkled across the tree.
export const dynamic = 'force-dynamic'
import RegisterServiceWorker from '@/components/pwa/RegisterServiceWorker'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import PreloadTiles from '@/components/pwa/PreloadTiles'
import CapacitorBoot from '@/components/pwa/CapacitorBoot'
import DevToolbar from '@/components/dev/DevToolbar'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://indocity.id'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'IndoCity — Marketplace kurir motor Indonesia',
    template: '%s · IndoCity',
  },
  description:
    'Platform bisnis untuk rider motor independen. Profil rider, harga sendiri, kontak langsung via WhatsApp. Tidak ada komisi.',
  manifest: '/manifest.webmanifest',
  applicationName: 'IndoCity',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'IndoCity',
    locale: 'id_ID',
    url: SITE_URL,
    title: 'IndoCity — Marketplace kurir motor Indonesia',
    description:
      'Cari rider motor independen di kota kamu. Bayar langsung, kontak via WhatsApp, tanpa komisi.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'IndoCity',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IndoCity',
    description: 'Marketplace kurir motor Indonesia — tanpa komisi.',
    images: ['/og-default.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'IndoCity',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  // Browser translate (Google Translate, Microsoft Edge translate) rewrites
  // the DOM after SSR which breaks React hydration. Native Bahasa serves
  // Indonesian users directly; we will add real i18n with next-intl later.
  other: { google: 'notranslate' },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning: Browser translate (Google Translate, etc.) and
  // some extensions rewrite <html>/<body> attributes after SSR. Suppressing the
  // warning here lets React continue with a client re-render instead of bailing.
  return (
    <html lang="id" translate="no" className="notranslate" suppressHydrationWarning>
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
        {children}
        <InstallPrompt />
        <DevToolbar />
      </body>
    </html>
  )
}
