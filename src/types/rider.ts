// Three customer-facing service categories. Riders pick which they offer
// + optionally set per-service pricing overrides (otherwise their base
// rate applies to all enabled services).
export type ServiceType = 'person' | 'parcel' | 'food'

export const SERVICE_LABELS: Record<ServiceType, string> = {
  person: 'Antar Penumpang',
  parcel: 'Kirim Paket',
  food:   'Antar Makanan',
}

export const SERVICE_SHORT: Record<ServiceType, string> = {
  person: 'Penumpang',
  parcel: 'Paket',
  food:   'Makanan',
}

export const SERVICE_ICONS: Record<ServiceType, string> = {
  person: '🧍',
  parcel: '📦',
  food:   '🍔',
}

export const SERVICE_DESCRIPTIONS: Record<ServiceType, string> = {
  person: 'Ojek harian, antar-jemput sekolah/kantor, ojek event',
  parcel: 'Paket, dokumen, kurir luar kota — fokus utama platform',
  food:   'Antar makanan dari resto / warung, COD bahan dapur',
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
