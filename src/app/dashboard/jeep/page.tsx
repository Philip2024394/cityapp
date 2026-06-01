'use client'
// ============================================================================
// /dashboard/jeep — Jeep driver dashboard home
// ----------------------------------------------------------------------------
// Thin shim that delegates to the shared <DriverDashboardHome /> with a
// jeep-flavoured config. Deep editing lives in /dashboard/jeep/info,
// /dashboard/jeep/vehicle, /dashboard/jeep/services, /dashboard/jeep/payments,
// /dashboard/jeep/subscription, etc.
//
// Jeep namespace: the DB enum value is 'jeep'. The jeep public profile
// lives at /jeep/<slug>. KPI strip surfaces per-km rate + min fee because
// jeep customers comparing charter pricing care about both numbers.
//
// Regulatory posture: software directory under PM 12/2019. Drivers publish
// their own rates; CityDrivers never sets prices or appoints orders.
// ============================================================================

import { Car } from 'lucide-react'
import DriverDashboardHome, {
  type DashboardOverviewRow,
  type DashboardVerticalConfig,
} from '@/components/dashboard/DriverDashboardHome'

const CONFIG: DashboardVerticalConfig = {
  vertical:           'jeep',
  vehicleIcon:        Car,
  vehicleLabel:       'Jeep',
  profilePathPrefix:  '/jeep',
  navLabels:          { vehicleDetails: 'Jeep details' },
  subscriptionWhatsAppLine:
    'Halo admin, saya mau bayar/renew langganan dashboard Jeep driver CityDrivers (Rp 38.000/bulan).',
  allowedVehicleTypes: ['jeep'],
  wrongTypeMessage:   (t) => `This dashboard is for jeep drivers. Your profile is ${t}.`,
  unauthCta:          { href: '/login?next=/dashboard/jeep', label: 'Sign in' },
  noDriverCta:        { href: '/signup/jeep', label: 'Sign up as Jeep driver' },
  selectColumns:
    'user_id, vehicle_type, business_name, slug, city, area, ' +
    'vehicle_make, vehicle_model, vehicle_year, vehicle_seats, vehicle_photos, ' +
    'price_per_km, min_fee, availability, paid_until, rating, rating_count, cover_image_url',
  extractVehicleLabel: (row) => {
    const parts = [row.vehicle_make, row.vehicle_model].filter(Boolean) as string[]
    return parts.length ? parts.join(' ') : 'Jeep'
  },
  marketPositionVehicleType: 'jeep',
  servicesHref: '/dashboard/jeep/services',
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
    'Your jeep stays hidden from customers until you pay Rp 38.000 for the first month.',
  subscriptionExpiredBody: (until) =>
    `Your access ended ${until}. Renew to come back online.`,
  subscriptionActiveBody: (until) =>
    `Active until ${until}. Rp 38.000/month — tap Renew to pay via QRIS.`,
  buildProfileHref: (row) => (row.slug ? `/jeep/${row.slug}` : null),
}

export default function JeepDriverDashboardHomePage() {
  return <DriverDashboardHome config={CONFIG} />
}
