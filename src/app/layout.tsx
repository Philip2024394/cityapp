import type { Metadata, Viewport } from 'next'
import './globals.css'
import MapBackground from '@/components/layout/MapBackground'
import RegisterServiceWorker from '@/components/pwa/RegisterServiceWorker'
import CapacitorBoot from '@/components/pwa/CapacitorBoot'
import DevToolbar from '@/components/dev/DevToolbar'

export const metadata: Metadata = {
  title: 'City Rider — Marketplace kurir motor Indonesia',
  description:
    'Platform bisnis untuk rider motor independen. Profil rider, harga sendiri, kontak langsung via WhatsApp. Tidak ada komisi.',
  manifest: '/manifest.webmanifest',
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
      <body suppressHydrationWarning>
        {/* Global dark Yogyakarta map background — mounted once at the root
            so every page sits over the same panning, pulsing scene.
            Fixed to the viewport; doesn't scroll with content. */}
        <MapBackground />
        <RegisterServiceWorker />
        <CapacitorBoot />
        {children}
        <DevToolbar />
      </body>
    </html>
  )
}
