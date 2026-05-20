// Bike rental marketplace types — mirrors the bike_rentals table from
// migration 0008 with camelCase keys for the React side. Booking flow,
// per-day calendar, and dispute fields will arrive in later slices.

export type RentalMode = 'self_ride' | 'with_driver' | 'both'
export type Transmission = 'automatic' | 'manual' | 'semi_auto'
export type RentalStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ListingTier = 'free' | 'paid' | 'featured'

export type BikeRental = {
  id: string
  slug: string

  // Owner
  ownerName: string
  ownerCompany: string | null
  ownerWhatsapp: string
  ownerLanguages: string[]
  ownerResponseTimeMin: number | null

  // Bike
  brand: string
  model: string
  year: number
  cc: number
  transmission: Transmission
  bikeType: string | null
  color: string | null

  // Pricing — bike rental (self-ride or with-driver baseline)
  dailyPriceIdr: number
  weeklyPriceIdr: number | null
  monthlyPriceIdr: number | null
  securityDepositIdr: number | null
  driverRatePerDayIdr: number | null
  // Pricing — hourly bike+driver tour blocks (3 / 6 / 8 hours)
  // Default lowest-rate baseline: 150k / 280k / 350k IDR. Petrol charged
  // separately by default (see fuelIncluded).
  tour3hIdr: number | null
  tour6hIdr: number | null
  tour8hIdr: number | null
  fuelIncluded: boolean

  // Inclusions
  helmetCount: number
  raincoatCount: number
  hasPhoneHolder: boolean
  hasPhoneCharger: boolean
  hasDeliveryBox: boolean
  readyToWork: boolean

  // Service
  deliversToHotel: boolean
  deliversToVilla: boolean
  pickupDropoff: boolean

  // Mode + location
  rentalMode: RentalMode
  city: string
  address: string | null
  lat: number
  lng: number

  // Media + trust
  imageUrls: string[]
  description: string | null
  tags: string[]
  rating: number | null
  reviewCount: number

  verified: boolean
  availableNow: boolean
  listingTier: ListingTier
}
