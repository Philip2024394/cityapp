'use client'
// ============================================================================
// /dashboard/truck/rates — Per-service rate overrides for truck drivers.
// ----------------------------------------------------------------------------
// Thin wrapper around the shared ServiceRatesEditor. Each truck driver picks
// from the canonical TRUCK_SERVICE_OFFERINGS catalog (10 entries — pindahan,
// construction, sand/gravel, bricks, debris haul, furniture, appliances,
// motorbike transport, event logistics, market run) and overrides per-row
// label + IDR amount + optional /unit suffix.
//
// Public profile fallback: when a service has no override (or all rows are
// blank), the customer-facing /truck/[slug] rate panel reads the catalog
// `default_rates` for that service instead.
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. The
// platform never sets / computes / appoints these rates.
// ============================================================================

import ServiceRatesEditor from '@/components/dashboard/ServiceRatesEditor'
import { TRUCK_SERVICE_OFFERINGS } from '@/lib/drivers/serviceOfferings'

export default function TruckRatesPage() {
  return (
    <ServiceRatesEditor
      vehicleType="truck"
      catalog={TRUCK_SERVICE_OFFERINGS}
      backHref="/dashboard/truck"
      title="Service rates"
    />
  )
}
