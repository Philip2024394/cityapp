// ============================================================================
// serviceOfferings — canonical catalog of trip types a driver can offer.
// ----------------------------------------------------------------------------
// One row per offering. Stored as a `text[]` of these `id` values on
// `drivers.service_offerings` / `mock_drivers.service_offerings` (migration
// 0110). Surfaced on the customer-facing profile (DriverProfileShell) as a
// row of yellow-tint badges under the bio, and edited by drivers from the
// car + bike dashboards as toggle pills.
//
// IndoCity is a SOFTWARE DIRECTORY under PM 12/2019 — these labels describe
// the kinds of trips a driver SAYS they offer, not promises by the platform.
// ============================================================================

export type ServiceOfferingId =
  | 'city_service'
  | 'daily_hire'
  | 'hourly_hire'
  | 'airport_pickup'
  | 'tour_destinations'
  | 'private_charter'
  | 'wedding_event'
  | 'cargo_parcel'

export const SERVICE_OFFERINGS: ReadonlyArray<{ id: ServiceOfferingId; label: string }> = [
  { id: 'city_service',      label: 'City Service' },
  { id: 'daily_hire',        label: 'Daily Hire' },
  { id: 'hourly_hire',       label: 'Hourly Hire' },
  { id: 'airport_pickup',    label: 'Airport Pickup' },
  { id: 'tour_destinations', label: 'Tour Destinations' },
  { id: 'private_charter',   label: 'Private Charter' },
  { id: 'wedding_event',     label: 'Wedding / Event' },
  { id: 'cargo_parcel',      label: 'Cargo / Parcel' },
]
