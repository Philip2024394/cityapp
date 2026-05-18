import 'server-only'
import { getServerSupabase } from '@/lib/supabase/server'
import type { BikeRental, RentalMode, Transmission, ListingTier } from './types'

type RentalRow = {
  id: string
  slug: string
  owner_name: string
  owner_company: string | null
  owner_whatsapp_e164: string
  owner_languages: string[] | null
  owner_response_time_min: number | null
  brand: string
  model: string
  year: number
  cc: number
  transmission: Transmission
  bike_type: string | null
  color: string | null
  daily_price_idr: number
  weekly_price_idr: number | null
  monthly_price_idr: number | null
  security_deposit_idr: number | null
  driver_rate_per_day_idr: number | null
  helmet_count: number
  raincoat_count: number
  has_phone_holder: boolean
  has_phone_charger: boolean
  has_delivery_box: boolean
  ready_to_work: boolean
  delivers_to_hotel: boolean
  delivers_to_villa: boolean
  pickup_dropoff: boolean
  rental_mode: RentalMode
  city: string
  address: string | null
  lat: number
  lng: number
  image_urls: string[] | null
  description: string | null
  tags: string[] | null
  rating: number | null
  review_count: number
  verified: boolean
  available_now: boolean
  listing_tier: ListingTier
}

function rowToRental(r: RentalRow): BikeRental {
  return {
    id: r.id,
    slug: r.slug,
    ownerName: r.owner_name,
    ownerCompany: r.owner_company,
    ownerWhatsapp: r.owner_whatsapp_e164,
    ownerLanguages: r.owner_languages ?? [],
    ownerResponseTimeMin: r.owner_response_time_min,
    brand: r.brand,
    model: r.model,
    year: r.year,
    cc: r.cc,
    transmission: r.transmission,
    bikeType: r.bike_type,
    color: r.color,
    dailyPriceIdr: r.daily_price_idr,
    weeklyPriceIdr: r.weekly_price_idr,
    monthlyPriceIdr: r.monthly_price_idr,
    securityDepositIdr: r.security_deposit_idr,
    driverRatePerDayIdr: r.driver_rate_per_day_idr,
    helmetCount: r.helmet_count,
    raincoatCount: r.raincoat_count,
    hasPhoneHolder: r.has_phone_holder,
    hasPhoneCharger: r.has_phone_charger,
    hasDeliveryBox: r.has_delivery_box,
    readyToWork: r.ready_to_work,
    deliversToHotel: r.delivers_to_hotel,
    deliversToVilla: r.delivers_to_villa,
    pickupDropoff: r.pickup_dropoff,
    rentalMode: r.rental_mode,
    city: r.city,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    imageUrls: r.image_urls ?? [],
    description: r.description,
    tags: r.tags ?? [],
    rating: r.rating,
    reviewCount: r.review_count,
    verified: r.verified,
    availableNow: r.available_now,
    listingTier: r.listing_tier,
  }
}

// Returns approved bike rentals for the given city. Ordered featured →
// paid → free, then by recency. Returns [] when Supabase isn't
// configured (demo / preview deploys).
export async function listRentalsForCity(city: string): Promise<BikeRental[]> {
  const supabase = await getServerSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('bike_rentals')
    .select(
      'id, slug, owner_name, owner_company, owner_whatsapp_e164, owner_languages, owner_response_time_min, ' +
      'brand, model, year, cc, transmission, bike_type, color, ' +
      'daily_price_idr, weekly_price_idr, monthly_price_idr, security_deposit_idr, driver_rate_per_day_idr, ' +
      'helmet_count, raincoat_count, has_phone_holder, has_phone_charger, has_delivery_box, ready_to_work, ' +
      'delivers_to_hotel, delivers_to_villa, pickup_dropoff, ' +
      'rental_mode, city, address, lat, lng, image_urls, description, tags, rating, review_count, ' +
      'verified, available_now, listing_tier',
    )
    .eq('city', city)
    .eq('status', 'approved')
    .order('listing_tier', { ascending: false })  // featured > paid > free (string sort)
    .order('available_now', { ascending: false })
    .order('rating', { ascending: false, nullsFirst: false })

  if (error || !data) return []
  return (data as RentalRow[]).map(rowToRental)
}
