import type { Metadata } from 'next'

// ============================================================================
// Server-side metadata for the public B2B directory (/business). The
// page.tsx is a client component (typeahead + filters), so the metadata
// lives here in the layout — layouts run server-side regardless of child
// runtime.
// ============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cityriders.id'

const title = 'Contract drivers — find a regular delivery rider · City Rider'
const description =
  'Browse independent motorcycle couriers available for regular contracts in Indonesia. Daily parcel runs for Shopee/TikTok sellers, restaurants, warungs. Contact direct on WhatsApp.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/business` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/business`,
    title,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
}

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return children
}
