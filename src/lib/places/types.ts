// Phase 1 types. status/listing_tier columns are stored but only 'approved' +
// 'free' are surfaced in Phase 1; future phases will read the other states.

export type PlaceCategory =
  | 'temple'
  | 'beach'
  | 'attraction'
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'club'
  | 'hospital'
  | 'doctor'
  | 'dentist'
  | 'pharmacy'
  | 'mall'
  | 'hotel'
  | 'bus_station'
  | 'train_station'
  | 'airport'
  | 'government'
  | 'bike_repair'

export type PlaceGroup =
  | 'transit'
  | 'tourist'
  | 'eat_drink'
  | 'health'
  | 'stay_shop'
  | 'services'

export type Place = {
  id: string
  slug: string
  name: string
  category: PlaceCategory
  description: string | null
  imageUrls: string[]
  lat: number
  lng: number
  city: string
  address: string | null
  tags: string[]

  // Computed server-side via PostGIS for fast client-side rendering.
  isOutOfZone: boolean
  returnKm: number   // empty-leg distance from the place back to city centroid (km)
}

export type CityZone = {
  city: string
  centroidLat: number
  centroidLng: number
}
