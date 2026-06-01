'use client'
// ============================================================================
// /dashboard/rider — Rider (motorbike) dashboard home
// ----------------------------------------------------------------------------
// Thin shim that delegates to the shared <DriverDashboardHome /> with a
// rider-flavoured config. The full layout (identity row, AvailabilitySwitcher,
// Account Health + Market Position cards, KPI strip, six-page grid, secondary
// nav, subscription banner) lives in /components/dashboard/DriverDashboardHome.
//
// Bike namespace: this vertical reads bike_make / bike_model / bike_cc, NOT
// the vehicle_make / vehicle_model columns. Bike public profiles live at
// /r/<slug> — there are no /car / /bus / /truck variants for bike riders.
//
// Regulatory posture: software directory under Permenhub 118/2018. Payments
// shown represent what THIS rider accepts — never platform escrow.
// ============================================================================

import { Bike } from 'lucide-react'
import DriverDashboardHome, {
  type DashboardOverviewRow,
  type DashboardVerticalConfig,
} from '@/components/dashboard/DriverDashboardHome'

const CONFIG: DashboardVerticalConfig = {
  vertical:           'rider',
  vehicleIcon:        Bike,
  vehicleLabel:       'Bike',
  profilePathPrefix:  '/r',
  navLabels:          { vehicleDetails: 'Bike details' },
  subscriptionWhatsAppLine:
    'Halo admin, saya mau bayar/renew langganan dashboard Rider (Rp 38.000/bulan).',
  allowedVehicleTypes: ['bike'],
  wrongTypeMessage:   (t) => `This dashboard is for bike riders. Your profile is ${t}.`,
  unauthCta:          { href: '/signup', label: 'Sign in' },
  noDriverCta:        { href: '/signup?role=driver&vehicle=bike', label: 'Create rider profile' },
  selectColumns:
    'user_id, vehicle_type, business_name, slug, city, area, ' +
    'bike_make, bike_model, bike_year, bike_cc, vehicle_photos, ' +
    'price_per_km, min_fee, availability, paid_until, rating, rating_count, cover_image_url',
  extractVehicleLabel: (row) => {
    const parts = [row.bike_make, row.bike_model].filter(Boolean) as string[]
    return parts.length ? parts.join(' ') : 'Bike'
  },
  marketPositionVehicleType: 'bike',
  servicesHref: '/dashboard/rider/services',
  kpiExtras: [
    {
      label: 'Engine',
      read:  (row: DashboardOverviewRow) => ({
        value: row.bike_cc ? `${row.bike_cc}cc` : '—',
        sub:   'cc',
      }),
    },
    {
      label: 'Rate',
      read:  (row: DashboardOverviewRow) => ({
        value: (row.price_per_km ?? 0) > 0 ? `Rp ${row.price_per_km!.toLocaleString('id-ID')}` : '—',
        sub:   'per km',
      }),
    },
  ],
  subscriptionNeverBody:
    'Your profile stays hidden from customers until you pay Rp 38.000 for the first month.',
  subscriptionExpiredBody: (until) =>
    `Your access ended ${until}. Renew to come back online.`,
  subscriptionActiveBody: (until) =>
    `Active until ${until}. Rp 38.000/month — tap Renew to pay via QRIS.`,
  buildProfileHref: (row) => (row.slug ? `/r/${row.slug}` : null),
}

export default function RiderDashboardHomePage() {
  return <DriverDashboardHome config={CONFIG} />
}
