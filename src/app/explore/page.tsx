import type { Metadata } from 'next'
import ExploreClient from './ExploreClient'

// Reads search params (filters) via ExploreClient — keep dynamic so
// shareable filter URLs always render fresh data and never serve stale
// search results from the CDN.
export const dynamic = 'force-dynamic'

// ============================================================================
// /explore — the new "hub" page (May 2026 restructure)
// ----------------------------------------------------------------------------
// Houses everything that used to live on /:
//   - 10 service tiles (Ride / Parcel / Food / Rental / Tour / Massage /
//     Beautician / Laundry / Handyman / Home Clean)
//   - Three browse CTAs (Rentals / Bus charter / B2B contracts)
//   - Language toggle + Sign-in link
//
// Arrived at via the "Enter App" CTA on / after the location warm-up modal
// (whether GPS granted or skipped). The page does NOT itself trigger any
// location prompt — that's exclusively the warm-up's job.
// ============================================================================

export const metadata: Metadata = {
  title: 'Explore · Kita2u',
  description: 'Browse rides, rentals, places, and services across Indonesia.',
}

export default function ExplorePage() {
  return <ExploreClient />
}
