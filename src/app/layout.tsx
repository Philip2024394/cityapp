import type { Metadata, Viewport } from 'next'
import './globals.css'
import PageBackground from '@/components/layout/PageBackground'
import RegisterServiceWorker from '@/components/pwa/RegisterServiceWorker'
import PreloadTiles from '@/components/pwa/PreloadTiles'
import CapacitorBoot from '@/components/pwa/CapacitorBoot'
import DevToolbar from '@/components/dev/DevToolbar'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cityrider.id'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'City Rider — Marketplace kurir motor Indonesia',
    template: '%s · City Rider',
  },
  description:
    'Platform bisnis untuk rider motor independen. Profil rider, harga sendiri, kontak langsung via WhatsApp. Tidak ada komisi.',
  manifest: '/manifest.webmanifest',
  applicationName: 'City Rider',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'City Rider',
    locale: 'id_ID',
    url: SITE_URL,
    title: 'City Rider — Marketplace kurir motor Indonesia',
    description:
      'Cari rider motor independen di kota kamu. Bayar langsung, kontak via WhatsApp, tanpa komisi.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'City Rider',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'City Rider',
    description: 'Marketplace kurir motor Indonesia — tanpa komisi.',
    images: ['/og-default.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'City Rider',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  // Browser translate (Google Translate, Microsoft Edge translate) rewrites
  // the DOM after SSR which breaks React hydration. Native Bahasa serves
  // Indonesian users directly; we will add real i18n with next-intl later.
  other: { google: 'notranslate' },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
        <DevToolbar />
      </body>
    </html>
  )
}
