// ============================================================================
// serviceOfferings — canonical catalog of trip types a driver can offer.
// ----------------------------------------------------------------------------
// One row per offering. Stored as a `text[]` of these `id` values on
// `drivers.service_offerings` / `mock_drivers.service_offerings` (migration
// 0110). Surfaced on the customer-facing profile (DriverProfileShell) as a
// row of yellow-tint badges under the bio, and edited by drivers from the
// car + bike dashboards as toggle pills.
//
// CityDrivers is a SOFTWARE DIRECTORY under PM 12/2019 — these labels describe
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

// ============================================================================
// Truck-specific service catalog. Small-truck drivers haul a different mix
// from passenger drivers — what they offer is *what they can carry*, not a
// trip type. Surfaced as the "Services Provided" badge row on /truck/[slug]
// and tied to per-photo descriptions in the portfolio carousel.
// ============================================================================

export type TruckServiceId =
  | 'construction_materials'
  | 'furniture_moving'
  | 'appliance_delivery'
  | 'event_logistics'
  | 'motorbike_transport'
  | 'sand_delivery'
  | 'brick_delivery'

export const TRUCK_SERVICE_OFFERINGS: ReadonlyArray<{
  id:          TruckServiceId
  /** Short chip label (≤ ~10 chars). Used on the badge row + dropdown. */
  label:       string
  /** 1–2 sentence card description used by the portfolio carousel. */
  description: string
  /** Representative service image used on the carousel card. Curated
   *  per-service so each card actually depicts what the service is
   *  (cement on truck for Construction, sofa on truck for Furniture,
   *  etc.) instead of cycling the driver's generic vehicle photos. */
  imageUrl:    string
}> = [
  { id: 'construction_materials', label: 'Construction',
    description: 'Cement, steel, timber and construction supplies hauled to your site.',
    imageUrl:    'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2004_39_58%20PM.png' },
  { id: 'furniture_moving',       label: 'Furniture',
    description: 'Beds, sofas, cabinets — house or office moves with careful handling.',
    imageUrl:    'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2004_39_58%20PM.png' },
  { id: 'appliance_delivery',     label: 'Appliances',
    description: 'Fridges, washing machines, AC units delivered and unloaded safely.',
    imageUrl:    'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2004_39_58%20PM.png' },
  { id: 'event_logistics',        label: 'Events',
    description: 'Tents, chairs, sound gear and event kit moved to and from the venue.',
    imageUrl:    'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2004_39_58%20PM.png' },
  { id: 'motorbike_transport',    label: 'Motorbike',
    description: 'Single or multiple motorbikes transported between cities or to service.',
    imageUrl:    'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2004_39_58%20PM.png' },
  { id: 'sand_delivery',          label: 'Sand',
    description: 'Bulk sand from quarry to site — load size agreed direct with driver.',
    imageUrl:    'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2004_39_58%20PM.png' },
  { id: 'brick_delivery',         label: 'Bricks',
    description: 'Bricks, pavers and concrete blocks delivered straight to your build.',
    imageUrl:    'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2004_39_58%20PM.png' },
]
