// Customer-facing service categories. Each maps onto one row in the
// vehicle / dashboard discriminator (`drivers.vehicle_type`):
//   'person' / 'parcel' / 'food' → vehicle_type = 'bike'
//   'car'                         → vehicle_type = 'car'
//   'bus'                         → vehicle_type = 'minibus'
// As we add Truck / Premium Car the matching service entries will be
// added here so the /cari tab selector stays the single source of
// truth for what the customer is browsing.
export type ServiceType = 'person' | 'parcel' | 'food' | 'car' | 'bus'

export const SERVICE_LABELS: Record<ServiceType, string> = {
  person: 'Bike Ride',
  parcel: 'Bike Parcel',
  food:   'Bike Food',
  car:    'Car Ride',
  bus:    'Bus / Minibus',
}

export const SERVICE_SHORT: Record<ServiceType, string> = {
  person: 'Ride',
  parcel: 'Parcel',
  food:   'Food',
  car:    'Car',
  bus:    'Bus',
}

export const SERVICE_ICONS: Record<ServiceType, string> = {
  person: '🧍',
  parcel: '📦',
  food:   '🍔',
  car:    '🚗',
  bus:    '🚐',
}

export const SERVICE_DESCRIPTIONS: Record<ServiceType, string> = {
  person: 'Daily rides, school/office pickup, event rides',
  parcel: 'Parcels, documents, out-of-town courier — platform focus',
  food:   'Food delivery from restaurants / warungs, COD groceries',
  car:    'Airport runs, family rides, rain rides, longer trips',
  bus:    'Group transport — Hiace, Avanza, Innova for tours + airports',
}

export type Bike = {
  make:  string       // 'Honda', 'Yamaha', etc.
  model: string       // 'BeAT', 'NMAX', etc.
  year:  number       // 2022
  color: string       // 'Hitam', 'Merah', etc.
  type:  'matic' | 'sport' | 'manual'
  cc?:   number       // 110, 125, 155, 250 — engine displacement in cc
  photoUrl?: string
  plate?:    string
  hasBox:    boolean
}

// Pricing model:
// - `pricePerKm` + `minFee` are the BASE — always set, applied to any
//   service that doesn't have a per-service override.
// - `servicePricing` is optional; ride can override per-service.
export type ServicePricing = {
  perKm?:  number   // null/undefined → uses base
  minFee?: number   // null/undefined → uses base
}

export type Rider = {
  id: string
  slug: string
  name: string
  photoUrl: string
  whatsappE164: string
  bio: string
  area: string
  city: string
  services: ServiceType[]
  bike: Bike
  pricePerKm: number              // base
  minFee:     number              // base
  servicePricing?: Partial<Record<ServiceType, ServicePricing>>
  // Pit-stop fee — what rider charges to make a brief stop along the way
  // for the customer (buy something, ATM, etc.). 0 = free, undefined = won't do.
  // Item costs handled separately between customer + rider via GoPay/QRIS.
  pitstopFee?: number
  isOnline:   boolean
  /** Three-state availability used by the new schema. Falls back to derived
   *  value (`isOnline ? 'online' : 'offline'`) for legacy mock data. */
  availability?: 'online' | 'busy' | 'offline'
  lastSeenAt: string
  /** ISO timestamp of when the driver most recently went online. Cleared
   *  on offline. Drives the "Online for Xh" badge. Set by the driver's own
   *  availability toggle / location ping — no customer-event recording. */
  sessionStartedAt?: string | null
  /** ISO timestamp of the driver's last GPS ping. Distinct from
   *  lastSeenAt (which is bumped on any server interaction). When stale
   *  (> 15 min) the marketplace hides distance/ETA and shows
   *  "Based in {area}" instead — refuses to lie about distance. */
  currentLocationUpdatedAt?: string | null
  /** True if currentLocationUpdatedAt is within the freshness window
   *  (15 min). Derived in queries.ts so consumers don't need to repeat
   *  the staleness check. */
  locationFresh?: boolean
  /** ISO timestamp — driver's chosen end-of-shift. NULL means "until I
   *  toggle off". Marketplace filters out drivers whose onlineUntil
   *  has passed. */
  onlineUntil?: string | null
  /** Driver's own shareable code — defaults to their slug. Used to
   *  generate /?ref={code} referral links. */
  referralCode?: string | null
  /** user_id of the driver who referred this one (if any). */
  referrerDriverId?: string | null
  /** B2B contract availability — opt-in. When true, surfaces on the
   *  public /business directory for businesses to negotiate regular
   *  delivery contracts (Shopee sellers, restaurants, etc.). */
  businessContractEnabled?: boolean
  /** Capacity ceiling — shown on the B2B card so buyers know if the
   *  driver can handle their volume. */
  businessMaxParcelsPerDay?: number | null
  /** Service tags for B2B: 'parcels' | 'restaurant' | 'documents' |
   *  'groceries' | 'batched'. */
  businessServices?: string[]
  /** Free-text pitch on the B2B card. */
  businessNotes?: string | null
  /** When the driver first opted into B2B — drives the 30-day grace window. */
  businessEnabledAt?: string | null
  /** 0-100 reliability score, recomputed nightly. */
  b2bScore?: number | null
  /** Visibility tier — top/standard/hidden/removed. Controls placement on /business. */
  b2bTier?: 'top' | 'standard' | 'hidden' | 'removed' | null
  /** When the score was last recomputed (UI uses this to show "scored X hours ago"). */
  b2bScoreUpdatedAt?: string | null
  /** Tour-guide opt-in — driver offers 8-hour day-tour service via /places. */
  tourGuideEnabled?: boolean
  /** Full-day (8h) rate in IDR — bike, fuel, driver-as-guide. */
  tourGuideDayRateIdr?: number | null
  /** Spoken languages for tour-guide work — codes: 'id','en','zh','ja','ko','nl'. */
  tourGuideLanguages?: string[]
  /** Free-text pitch on the tour-guide card. */
  tourGuideNotes?: string | null
  /** When the driver first opted into tour-guide service. */
  tourGuideEnabledAt?: string | null
  lat: number
  lng: number
  /** Driver's chosen service radius from base, in km. When a trip exceeds
   *  this distance the fare switches to round-trip (km × 2) so the
   *  customer covers the return leg back to pickup. */
  serviceZoneRadiusKm?: number | null
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled'
  /** Average customer rating (1–5, one decimal place). Undefined for new
   *  riders with no completed trips yet — UI hides the rating row in that
   *  case rather than showing a default. */
  rating?: number
  /** Total completed trips. Undefined for new riders. */
  trips?: number
  /** Seeded mock profile (from mock_drivers table). Marketplace renders
   *  these alongside real drivers to populate the surface at launch;
   *  Chat button is disabled to prevent real bookings. Real drivers
   *  always sort before mocks. */
  isMock?: boolean
  /** Hourly hire opt-in (3h/6h/8h block rate, petrol separate). When
   *  true the driver appears in /cari's Hourly filter. */
  hourlyEnabled?: boolean | null
  /** Customer-paid hourly block rates in IDR — driver-published. */
  hourly3hRateIdr?: number | null
  hourly6hRateIdr?: number | null
  hourly8hRateIdr?: number | null
  /** Working window "HH:MM" 24h — drives the Hourly mismatch check on
   *  the booking popup. NULL on either side = no constraint. */
  workingHoursStart?: string | null
  workingHoursEnd?:   string | null
  /** ISO 639-1 language codes (mig 0157). Indonesian-only is the default
   *  for legacy mocks; surfaced as a flag row on the public profile. */
  languages?: string[] | null
}

export type QuoteEvent = {
  id: string
  riderId: string
  service: ServiceType            // which service the customer booked
  pickupLat: number
  pickupLng: number
  pickupLabel?: string
  dropoffLat: number
  dropoffLng: number
  dropoffLabel?: string
  distanceKm: number
  estimatedFare: number
  source: 'marketplace' | 'profile_page' | 'offline_fallback'
  createdAt: string
}
