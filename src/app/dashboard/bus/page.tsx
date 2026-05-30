'use client'
// ============================================================================
// /dashboard/bus — Minibus driver dashboard home
// ----------------------------------------------------------------------------
// Thin shim that delegates to the shared <DriverDashboardHome /> with a
// bus-flavoured config. This page previously held a 1,150-line monolith
// (sectioned forms + an inline QRIS modal). The deep editing now lives in
// /dashboard/bus/info, /dashboard/bus/vehicle, /dashboard/bus/services,
// /dashboard/bus/payments, etc. Subscription payment routes to the shared
// /dashboard/car/subscription flow (which handles bus too).
//
// Bus namespace: the DB enum value is 'minibus' (not 'bus'). The bus public
// profile lives at /bus/<slug>. KPI strip surfaces per-km rate + min fee
// because minibus customers care about charter pricing alongside seat count.
//
// Regulatory posture: software directory under PM 12/2019. Drivers publish
// their own rates; CityRiders never sets prices or appoints orders.
// ============================================================================

import { Car } from 'lucide-react'
import DriverDashboardHome, {
  type DashboardOverviewRow,
  type DashboardVerticalConfig,
} from '@/components/dashboard/DriverDashboardHome'

const CONFIG: DashboardVerticalConfig = {
  vertical:           'bus',
  vehicleIcon:        Car,
  vehicleLabel:       'Bus',
  profilePathPrefix:  '/bus',
  navLabels:          { vehicleDetails: 'Bus details' },
  subscriptionWhatsAppLine:
    'Halo admin, saya mau bayar/renew langganan dashboard Minibus driver CityRiders (Rp 38.000/bulan).',
  // DB enum is 'minibus' for the bus vertical.
  allowedVehicleTypes: ['minibus'],
  wrongTypeMessage:   (t) => `This dashboard is for minibus drivers. Your profile is ${t}.`,
  unauthCta:          { href: '/login?next=/dashboard/bus', label: 'Sign in' },
  noDriverCta:        { href: '/signup/bus', label: 'Sign up as Minibus driver' },
  selectColumns:
    'user_id, vehicle_type, business_name, slug, city, area, ' +
    'vehicle_make, vehicle_model, vehicle_year, vehicle_seats, vehicle_photos, ' +
    'price_per_km, min_fee, availability, paid_until, rating, rating_count, cover_image_url',
  extractVehicleLabel: (row) => {
    const parts = [row.vehicle_make, row.vehicle_model].filter(Boolean) as string[]
    return parts.length ? parts.join(' ') : 'Bus'
  },
  marketPositionVehicleType: 'minibus',
  servicesHref: '/dashboard/bus/services',
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
    'Your bus stays hidden from customers until you pay Rp 38.000 for the first month.',
  subscriptionExpiredBody: (until) =>
    `Your access ended ${until}. Renew to come back online.`,
  subscriptionActiveBody: (until) =>
    `Active until ${until}. WhatsApp admin to renew early.`,
  buildProfileHref: (row) => (row.slug ? `/bus/${row.slug}` : null),
}

export default function MinibusDriverDashboardHomePage() {
  return <DriverDashboardHome config={CONFIG} />
}
