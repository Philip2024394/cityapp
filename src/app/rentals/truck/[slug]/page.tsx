import type { Metadata } from 'next'
import {
  buildRentalMetadata,
  renderRentalProfile,
  type RentalVehicleType,
} from '@/components/profile/RentalProfileShell'

// =============================================================================
// /rentals/truck/[slug] — public per-listing truck-rental profile page
// =============================================================================
// IndoCity is a SOFTWARE DIRECTORY under PM 12/2019. This page renders a
// single truck-rental listing — driver self-publishes daily / weekly /
// monthly rates plus a rental_type (typically 'with_driver' for pindahan
// rumah, distribusi barang, jasa angkut, but self-drive truck rental also
// supported). The customer taps "Contact via WhatsApp" → wa.me handoff;
// the driver and customer agree the final rental terms directly in chat.
//
// Trucks have NO live-ride marketplace (no /truck/[slug] page) — they are
// a rental-only vertical. Vehicle filter: drivers/mock_drivers WHERE
// vehicle_type='truck' AND rental_daily_rate_idr IS NOT NULL. Lookup hits
// real `drivers` first, falls back to `mock_drivers` (with yellow demo
// banner). 404 if neither has slug.
//
// All rendering, loader, SEO, JSON-LD live in RentalProfileShell so this
// file stays a thin wrapper — the /rentals/car/[slug] sibling does the same.
// =============================================================================

export const revalidate = 300

const VEHICLE_TYPE: RentalVehicleType = 'truck'
const CONFIG = {
  vehicleType:       VEHICLE_TYPE,
  marketplaceHref:   '/rentals/truck',
  profileHrefPrefix: '/rentals/truck',
  headerLabel:       'Truck rental',
  vehicleFallback:   'Truck',
  seoTitleSegment:   'Truck rental',
  waMessage:         'Halo, saya tertarik menyewa truck/pickup Anda di Kita2u',
  vehicleIconName:   'truck' as const,
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return buildRentalMetadata(slug, CONFIG)
}

export default async function TruckRentalProfilePage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return renderRentalProfile(slug, CONFIG)
}
