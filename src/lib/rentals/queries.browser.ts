// Browser-safe rental queries. Server-side queries.ts is `import 'server-only'`
// so client components can't pull from it — this file is the public surface
// for any component that needs to read rentals from the browser (RLS-gated).

import { getBrowserSupabase } from '@/lib/supabase/client'
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
  tour_3h_idr: number | null
  tour_6h_idr: number | null
  tour_8h_idr: number | null
  fuel_included: boolean
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
    tour3hIdr: r.tour_3h_idr,
    tour6hIdr: r.tour_6h_idr,
    tour8hIdr: r.tour_8h_idr,
    fuelIncluded: r.fuel_included,
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

const RENTAL_SELECT =
  'id, slug, owner_name, owner_company, owner_whatsapp_e164, owner_languages, owner_response_time_min, ' +
  'brand, model, year, cc, transmission, bike_type, color, ' +
  'daily_price_idr, weekly_price_idr, monthly_price_idr, security_deposit_idr, driver_rate_per_day_idr, ' +
  'helmet_count, raincoat_count, has_phone_holder, has_phone_charger, has_delivery_box, ready_to_work, ' +
  'delivers_to_hotel, delivers_to_villa, pickup_dropoff, ' +
  'tour_3h_idr, tour_6h_idr, tour_8h_idr, fuel_included, ' +
  'rental_mode, city, address, lat, lng, image_urls, description, tags, rating, review_count, ' +
  'verified, available_now, listing_tier'

/** Returns the (single) approved + available bike rental owned by a
 *  specific driver, or null. Used by /r/[slug] to surface "this driver
 *  also rents their bike / offers tours" tiles on their public profile.
 *  Browser-safe; uses the anon key + the public RLS policy that allows
 *  SELECT on approved rentals. */
export async function fetchRentalForOwnerBrowser(ownerUserId: string): Promise<BikeRental | null> {
  const supabase = getBrowserSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('bike_rentals')
    .select(RENTAL_SELECT)
    .eq('owner_user_id', ownerUserId)
    .eq('status', 'approved')
    .eq('available_now', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return rowToRental(data as unknown as RentalRow)
}
