'use client'
// ============================================================================
// /dashboard/jeep/rates — Per-service rate overrides for jeep drivers.
// ----------------------------------------------------------------------------
// Thin wrapper around the shared ServiceRatesEditor. Jeep drivers pick from
// the canonical JEEP_SERVICE_OFFERINGS catalog (6 buckets — Temple, City,
// Offroad, Beach, 8h Daily, 4h Daily) and publish their own label + IDR
// amount per row. Yogyakarta market defaults ship pre-filled so a new
// driver can go live without editing anything.
//
// Public profile fallback: when a service has no override (or all rows are
// blank), the customer-facing /jeep/[slug] rate panel reads the catalog
// `default_rates` for that service instead.
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. The
// platform never sets / computes / appoints these rates.
// ============================================================================

import ServiceRatesEditor from '@/components/dashboard/ServiceRatesEditor'
import { JEEP_SERVICE_OFFERINGS } from '@/lib/drivers/serviceOfferings'

export default function JeepRatesPage() {
  return (
    <ServiceRatesEditor
      vehicleType="jeep"
      catalog={JEEP_SERVICE_OFFERINGS}
      backHref="/dashboard/jeep"
      title="Service rates"
    />
  )
}
