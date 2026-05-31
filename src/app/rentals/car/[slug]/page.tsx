import type { Metadata } from 'next'
import {
  buildRentalMetadata,
  renderRentalProfile,
  type RentalVehicleType,
} from '@/components/profile/RentalProfileShell'

// =============================================================================
// /rentals/car/[slug] — public per-listing car-rental profile page
// =============================================================================
// CityDrivers is a SOFTWARE DIRECTORY under PM 12/2019. This page renders a
// single car-rental listing — driver self-publishes daily / weekly / monthly
// rates plus a rental_type (self-drive, with-driver, or both). The customer
// taps "Contact via WhatsApp" → wa.me handoff; the driver and customer agree
// the final rental terms directly in chat.
//
// Distinct from /car/[slug] which is the LIVE-RIDE per-km profile. Wrong
// surface for rentals — different pricing model (daily not per-km), different
// expectation (multi-day vehicle hire not on-demand trip).
//
// Vehicle filter: drivers/mock_drivers WHERE vehicle_type='car' AND
// rental_daily_rate_idr IS NOT NULL. Lookup hits real `drivers` first, falls
// back to `mock_drivers` (with yellow demo banner). 404 if neither has slug.
//
// All rendering, loader, SEO, JSON-LD live in RentalProfileShell so this
// file stays a thin wrapper — the /rentals/truck/[slug] sibling does the same.
// =============================================================================

export const revalidate = 300

const VEHICLE_TYPE: RentalVehicleType = 'car'
const CONFIG = {
  vehicleType:       VEHICLE_TYPE,
  marketplaceHref:   '/rentals/car',
  profileHrefPrefix: '/rentals/car',
  headerLabel:       'Car rental',
  vehicleFallback:   'Car',
  seoTitleSegment:   'Car rental',
  waMessage:         'Halo, saya tertarik menyewa mobil Anda di Kita2u',
  vehicleIconName:   'car' as const,
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return buildRentalMetadata(slug, CONFIG)
}

export default async function CarRentalProfilePage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return renderRentalProfile(slug, CONFIG)
}
