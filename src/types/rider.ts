export type ServiceType = 'package' | 'food' | 'courier' | 'personal'

export const SERVICE_LABELS: Record<ServiceType, string> = {
  package:  'Package Delivery',
  food:     'Food Delivery',
  courier:  'Local Courier',
  personal: 'Personal Rider',
}

export const SERVICE_ICONS: Record<ServiceType, string> = {
  package:  '📦',
  food:     '🍔',
  courier:  '🚚',
  personal: '🛵',
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
  pricePerKm: number
  minFee:     number
  isOnline:   boolean
  lastSeenAt: string
  lat: number
  lng: number
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled'
}

export type QuoteEvent = {
  id: string
  riderId: string
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
