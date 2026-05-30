'use client'
// ============================================================================
// /dashboard/truck — Truck driver dashboard home
// ----------------------------------------------------------------------------
// Thin shim that delegates to the shared <DriverDashboardHome /> with a
// truck-flavoured config. The full shell (identity row, AvailabilitySwitcher,
// Account Health + Market Position cards, KPI strip, six-page grid, secondary
// nav, subscription banner) lives in /components/dashboard/DriverDashboardHome.
//
// Trucks differ from car/bike in that the dominant transaction shape is
// rental (Pindahan, jasa angkut, distribusi), so the two extra KPI slots
// surface rental_daily_rate_idr + rental_min_days instead of per-km rate.
// Per-km fares are rare for trucks — those stay one click away on the
// services subpage rather than crowding the home tiles.
//
// Regulatory posture: software directory under PM 12/2019. All rates are
// self-published by the driver; we never compute fares.
// ============================================================================

import { Truck } from 'lucide-react'
import DriverDashboardHome, {
  type DashboardOverviewRow,
  type DashboardVerticalConfig,
} from '@/components/dashboard/DriverDashboardHome'

const CONFIG: DashboardVerticalConfig = {
  vertical:           'truck',
  vehicleIcon:        Truck,
  vehicleLabel:       'Truck',
  profilePathPrefix:  '/truck',
  navLabels:          { vehicleDetails: 'Truck details' },
  subscriptionWhatsAppLine:
    'Halo admin, saya mau bayar/renew langganan dashboard Truck driver (Rp 38.000/bulan).',
  allowedVehicleTypes: ['truck'],
  wrongTypeMessage:   (t) => `This dashboard is for truck drivers. Your profile is ${t}.`,
  unauthCta:          { href: '/login?next=/dashboard/truck', label: 'Sign in' },
  noDriverCta:        { href: '/signup/truck', label: 'List your truck' },
  selectColumns:
    'user_id, vehicle_type, business_name, slug, city, area, ' +
    'vehicle_make, vehicle_model, vehicle_year, vehicle_seats, vehicle_photos, ' +
    'rental_daily_rate_idr, rental_min_days, price_per_km, min_fee, ' +
    'availability, paid_until, rating, rating_count, cover_image_url',
  extractVehicleLabel: (row) => {
    const parts = [
      row.vehicle_make,
      row.vehicle_model,
      row.vehicle_year ? String(row.vehicle_year) : null,
    ].filter(Boolean) as string[]
    return parts.length ? parts.join(' ') : 'Truck'
  },
  marketPositionVehicleType: 'truck',
  servicesHref: '/dashboard/truck/services',
  kpiExtras: [
    {
      label: 'Daily rate',
      read: (row: DashboardOverviewRow) => ({
        value: (row.rental_daily_rate_idr ?? 0) > 0
          ? `Rp ${row.rental_daily_rate_idr!.toLocaleString('id-ID')}`
          : '—',
        sub:   'per day',
      }),
    },
    {
      label: 'Min days',
      read: (row: DashboardOverviewRow) => ({
        value: (row.rental_min_days ?? 0) > 0 ? String(row.rental_min_days) : '—',
        sub:   'per booking',
      }),
    },
  ],
  subscriptionNeverBody:
    'Your truck stays hidden from customers until you pay Rp 38.000 for the first month.',
  subscriptionExpiredBody: (until) =>
    `Your access ended ${until}. Renew to come back online.`,
  subscriptionActiveBody: (until) =>
    `Active until ${until}. WhatsApp admin to renew early.`,
  buildProfileHref: (row) => (row.slug ? `/truck/${row.slug}` : null),
}

export default function TruckDriverDashboardHomePage() {
  return <DriverDashboardHome config={CONFIG} />
}
