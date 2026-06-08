export type ParcelAvailability = 'online' | 'busy' | 'offline'
export type ParcelStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Parcel "specialty" = the VEHICLE TYPE + SERVICE LEVEL + COVERAGE axis
// the independent Indonesian parcel courier / jasa kurir antar barang /
// same-day delivery business offers. Indie kurir cluster around three
// axes:
//   1. VEHICLE TYPE — motor (matic/sport max 20kg), pickup_van (single
//      cabin max 300kg), box_cdd (CDD ~12m3 bulk), sepeda (sepeda
//      ontel dalam kampung).
//   2. SERVICE LEVEL — same_day (pickup pagi antar sore), next_day
//      (besok sampai), instant_60min (urgent 60-menit garansi),
//      cargo_besar (volume tinggi), dokumen_express (surat/cek),
//      ecommerce_return (return seller online).
//   3. COVERAGE — dalam_kota (within city), antar_kota (cross-city).
// Buyers shortlist by vehicle/service then sort by coverage pricing
// (base-fare + per-km matrix — see hourly_rate_idr docs below).
//
// CityDrivers boundary: this is PARCEL COURIER for GOODS. NOT food
// delivery, NOT passenger ride-hail (those are CityDrivers concerns
// and stay denied on kita2u — see feedback_cityriders_no_payments_*).
// Specialties vocab stays goods-only (paket / dokumen / cargo /
// ecommerce). No "ojek" / "penumpang" / "ride" tokens anywhere.
export type ParcelSpecialty =
  | 'motor'
  | 'pickup_van'
  | 'box_cdd'
  | 'sepeda'
  | 'same_day'
  | 'next_day'
  | 'instant_60min'
  | 'cargo_besar'
  | 'dokumen_express'
  | 'ecommerce_return'
  | 'antar_kota'
  | 'dalam_kota'
  | 'mixed'
  | 'other'

// Labels — Indonesian kurir antar barang vocab. Vehicle names stay in
// Indonesian (Motor / Pickup Van / Box CDD / Sepeda) because that's how
// Indonesian shippers search. English mix-ins (Same Day / Instant 60-min /
// E-commerce Return) follow how local kurir Instagram bios already
// write them.
export const SPECIALTY_LABELS: Record<ParcelSpecialty, string> = {
  motor:            'Motor · Max 20kg',
  pickup_van:       'Pickup Van · Max 300kg',
  box_cdd:          'Box CDD · ~12m³ Bulk',
  sepeda:           'Sepeda · Kampung Antar',
  same_day:         'Same-Day · Pagi-Sore',
  next_day:         'Next-Day · Besok Sampai',
  instant_60min:    'Instant 60 Menit · Urgent',
  cargo_besar:      'Cargo Besar · Volume Tinggi',
  dokumen_express:  'Dokumen Express · Surat/Cek',
  ecommerce_return: 'E-commerce Return · Seller',
  antar_kota:       'Antar Kota · Cross-City',
  dalam_kota:       'Dalam Kota · Within City',
  mixed:            'Mixed Services',
  other:            'Lainnya',
}

// Short chip labels — shown on cards (max 3 per kurir).
export const SPECIALTY_SHORT: Record<ParcelSpecialty, string> = {
  motor:            'Motor',
  pickup_van:       'Pickup',
  box_cdd:          'Box CDD',
  sepeda:           'Sepeda',
  same_day:         'Same-Day',
  next_day:         'Next-Day',
  instant_60min:    'Instant 60m',
  cargo_besar:      'Cargo',
  dokumen_express:  'Dokumen',
  ecommerce_return: 'E-com Return',
  antar_kota:       'Antar Kota',
  dalam_kota:       'Dalam Kota',
  mixed:            'Mixed',
  other:            'Lainnya',
}

export const ALL_SPECIALTIES: ParcelSpecialty[] = [
  'motor','pickup_van','box_cdd','sepeda',
  'same_day','next_day','instant_60min','cargo_besar','dokumen_express','ecommerce_return',
  'antar_kota','dalam_kota',
  'other','mixed',
]

// UX-enforced cap on a single kurir's specialty count. DB CHECK also
// enforces max 3 — keeps profile cards scannable.
export const MAX_PARCEL_SPECIALTIES = 3

export interface ParcelProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: ParcelSpecialty[]
  // Pricing — kurir antar barang has THREE axes:
  //   1. VEHICLE TYPE (motor cheapest dalam kota → pickup_van mid →
  //      box CDD bulk). Per-tier base fare — motor Rp 8-15k, pickup
  //      Rp 250k, box CDD Rp 350k.
  //   2. SERVICE LEVEL (next_day cheapest → same_day mid →
  //      instant_60min premium). Per-level surcharge — instant
  //      60-menit adds ~Rp 20k premium over same-day.
  //   3. COVERAGE (dalam_kota cheapest → antar_kota mid → antar
  //      provinsi). Per-km rate scales with coverage tier.
  // Local rates (Yogya / Bandung / Jakarta indie kurir, 2026):
  //   • Motor dalam kota:           Rp 8k base + Rp 2.5k/km (floor)
  //   • Motor same-day:             Rp 15k base + Rp 3k/km
  //   • Instant 60-menit motor:     Rp 35k + Rp 3.5k/km (garansi)
  //   • Pickup van antar kota:      Rp 250k base + Rp 4k/km (max 300kg)
  //   • Box CDD bulk pickup:        Rp 350k base + Rp 5k/km (~12m³)
  //   • Cargo besar antar provinsi: Rp 500k base + Rp 6k/km
  // COD surcharge: typically 1-2% of barang value (cap Rp 5k min).
  // Asuransi paket berharga: optional, ~0.2-0.5% of declared value.
  //   hourly_rate_idr = anchor "starting from" price (cheapest line
  //     the kurir offers; e.g. Rp 15k motor dalam kota typical job).
  //     Column name kept to reuse the shared marketplace pill
  //     renderer, but surface label reads "Mulai dari".
  //   day_rate_idr    = optional "paket bulk" all-in rate (e.g.
  //     Rp 350k box CDD e-commerce bulk pickup). Used when the kurir
  //     quotes a flat package vs base + per-km extras.
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for parcel this means "Pickup di Lokasi"
  // (siap pickup di lokasi pengirim vs drop-off only). Defaults true
  // since pickup-di-lokasi is the differentiator for indie kurir vs
  // counter-only chains.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: ParcelAvailability
  status: ParcelStatus
  verified_at: string | null
  verified_by: string | null
  rejected_reason: string | null

  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled'
  trial_ends_at: string
  paid_until: string | null

  is_mock: boolean
  mock_hidden_at: string | null

  created_at: string
  updated_at: string
}

export type ParcelProviderPublic = Pick<
  ParcelProvider,
  | 'slug' | 'display_name'
  | 'years_experience' | 'bio'
  | 'specialties'
  | 'hourly_rate_idr' | 'day_rate_idr' | 'has_own_tools'
  | 'city' | 'service_area_notes'
  | 'whatsapp_e164'
  | 'profile_image_url'
  | 'availability'
> & {
  id?: string
  owner_user_id?: string
  cover_image_url?:    string | null
  gallery_image_urls?: string[] | null
  languages?:          string[] | null
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[] | null
  last_active_at?:     string | null
  created_at?:         string | null
  subscription_status?: 'trial' | 'active' | 'expired' | 'cancelled' | null
  is_mock?: boolean
  rating?: number | null
  rating_count?: number | null
  theme_color?: string | null
  hero_text?: {
    line1?:         string
    line2?:         string
    tagline?:       string
    color?:         string
    line1_color?:   string
    tagline_color?: string
    effect?:        'none' | 'shimmer' | 'dance' | 'underline'
  } | null
  promo_text?:           string | null
  service_photos?:       Array<{
    url:               string
    name?:             string
    description?:      string
    price_idr?:        number | null
    before_image_url?: string | null
    after_image_url?:  string | null
  }> | null
  busy_dates?:           string[] | null
  has_physical_location?: boolean | null
  latitude?:             number | null
  longitude?:            number | null
}
