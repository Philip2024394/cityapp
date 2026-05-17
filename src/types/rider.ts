// Three customer-facing service categories. Riders pick which they offer
// + optionally set per-service pricing overrides (otherwise their base
// rate applies to all enabled services).
export type ServiceType = 'person' | 'parcel' | 'food'

export const SERVICE_LABELS: Record<ServiceType, string> = {
  person: 'Bike Ride',
  parcel: 'Bike Parcel',
  food:   'Bike Food',
}

export const SERVICE_SHORT: Record<ServiceType, string> = {
  person: 'Ride',
  parcel: 'Parcel',
  food:   'Food',
}

export const SERVICE_ICONS: Record<ServiceType, string> = {
  person: '🧍',
  parcel: '📦',
  food:   '🍔',
}

export const SERVICE_DESCRIPTIONS: Record<ServiceType, string> = {
  person: 'Daily rides, school/office pickup, event rides',
  parcel: 'Parcels, documents, out-of-town courier — platform focus',
  food:   'Food delivery from restaurants / warungs, COD groceries',
}

export type Bike = {
  make:  string       // 'Honda', 'Yamaha', etc.
  model: string       // 'BeAT', 'NMAX', etc.
  year:  number       // 2022
  color: string       // 'Hitam', 'Merah', etc.
  type:  'matic' | 'sport' | 'manual'
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
  lastSeenAt: string
  lat: number
  lng: number
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled'
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
