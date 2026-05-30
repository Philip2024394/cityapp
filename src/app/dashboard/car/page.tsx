'use client'
// ============================================================================
// /dashboard/car — Car driver dashboard home
// ----------------------------------------------------------------------------
// Thin shim that delegates to the shared <DriverDashboardHome /> with a
// car-flavoured config. The full shell (identity row, AvailabilitySwitcher,
// Account Health + Market Position cards, KPI strip, six-page grid, secondary
// nav, subscription banner) lives in /components/dashboard/DriverDashboardHome.
//
// Car namespace: vehicle_make / vehicle_model / vehicle_seats. The car dashboard
// historically accepts car / truck / bus rows — that allowlist is preserved.
// The public-profile path varies per row (bus → /bus/<slug>, truck →
// /truck/<slug>, otherwise /car/<slug>).
//
// Regulatory posture: software directory under Permenhub 118/2018. Payments
// shown represent what THIS driver accepts — never platform escrow.
// ============================================================================

import { Car } from 'lucide-react'
import DriverDashboardHome, {
  type DashboardOverviewRow,
  type DashboardVerticalConfig,
} from '@/components/dashboard/DriverDashboardHome'

const CONFIG: DashboardVerticalConfig = {
  vertical:           'car',
  vehicleIcon:        Car,
  vehicleLabel:       'Car',
  profilePathPrefix:  '/car',
  navLabels:          { vehicleDetails: 'Vehicle details' },
  subscriptionWhatsAppLine:
    'Halo admin, saya mau bayar/renew langganan dashboard Car driver (Rp 38.000/bulan).',
  allowedVehicleTypes: ['car', 'truck', 'bus'],
  wrongTypeMessage:   (t) => `This dashboard is for car / bus / truck drivers. Your profile is ${t}.`,
  unauthCta:          { href: '/signup', label: 'Sign in' },
  noDriverCta:        { href: '/signup?role=driver&vehicle=car', label: 'Create driver profile' },
  selectColumns:
    'user_id, vehicle_type, business_name, slug, city, area, ' +
    'vehicle_make, vehicle_model, vehicle_year, vehicle_seats, vehicle_photos, ' +
    'price_per_km, min_fee, availability, paid_until, rating, rating_count, cover_image_url',
  extractVehicleLabel: (row) => {
    const parts = [row.vehicle_make, row.vehicle_model].filter(Boolean) as string[]
    if (parts.length) return parts.join(' ')
    if (row.vehicle_type === 'bus')   return 'Bus'
    if (row.vehicle_type === 'truck') return 'Truck'
    return 'Car'
  },
  marketPositionVehicleType: 'car',
  servicesHref: '/dashboard/car/services',
  kpiExtras: [
    {
      label: 'Rate',
      read: (row: DashboardOverviewRow) => ({
        value: (row.price_per_km ?? 0) > 0 ? `Rp ${row.price_per_km!.toLocaleString('id-ID')}` : '—',
        sub:   'per km',
      }),
    },
    {
      label: 'Min fee',
      read: (row: DashboardOverviewRow) => ({
        value: (row.min_fee ?? 0) > 0 ? `Rp ${row.min_fee!.toLocaleString('id-ID')}` : '—',
        sub:   'per trip',
      }),
    },
  ],
  subscriptionNeverBody:
    'Your profile stays hidden from customers until you pay Rp 38.000 for the first month.',
  subscriptionExpiredBody: (until) =>
    `Your access ended ${until}. Renew to come back online.`,
  subscriptionActiveBody: (until) =>
    `Active until ${until}. WhatsApp admin to renew early.`,
  buildProfileHref: (row) => {
    if (!row.slug) return null
    if (row.vehicle_type === 'bus')   return `/bus/${row.slug}`
    if (row.vehicle_type === 'truck') return `/truck/${row.slug}`
    return `/car/${row.slug}`
  },
}

export default function CarDriverDashboardHomePage() {
  return <DriverDashboardHome config={CONFIG} />
}
