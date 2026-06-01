'use client'
// ============================================================================
// /dashboard/bus/rates — Per-service rate overrides for minibus drivers.
// ----------------------------------------------------------------------------
// Thin wrapper around the shared ServiceRatesEditor. Each minibus driver picks
// from the canonical BUS_SERVICE_OFFERINGS catalog (12 entries — airport
// transfer, city charter, out-of-town, tour package, wedding shuttle,
// corporate outing, study tour, pilgrimage, Bali drop, multi-day tour, film
// crew, umrah family) and overrides per-row label + IDR amount + /unit.
//
// Public profile fallback: when a service has no override (or all rows are
// blank), the customer-facing /bus/[slug] rate panel reads the catalog
// `default_rates` for that service instead.
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. The
// platform never sets / computes / appoints these rates.
// ============================================================================

import ServiceRatesEditor from '@/components/dashboard/ServiceRatesEditor'
import { BUS_SERVICE_OFFERINGS } from '@/lib/drivers/serviceOfferings'

export default function BusRatesPage() {
  return (
    <ServiceRatesEditor
      vehicleType="bus"
      catalog={BUS_SERVICE_OFFERINGS}
      backHref="/dashboard/bus"
      title="Service rates"
    />
  )
}
