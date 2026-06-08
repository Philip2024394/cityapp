export type CarwashAvailability = 'online' | 'busy' | 'offline'
export type CarwashStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Carwash "specialty" = the VEHICLE TYPE + WASH-LEVEL axis the
// independent Indonesian car wash / cuci mobil & motor business
// offers. Indie cuci kendaraan cluster around two axes:
//   1. VEHICLE TYPE — motor (matic/sport), mobil_kecil (LCGC/city
//      car / hatchback), mobil_sedang (sedan / MPV kecil), suv
//      (mid-size SUV), pickup (single/double cabin), mpv (MPV
//      besar — Innova / Alphard), sedan (premium sedan).
//   2. WASH LEVEL — body_only (express cuci body), body_plus_dalam
//      (body + interior vacuum + dashboard), detailing (full premium),
//      polish_wax (poles + wax), ceramic_coating (9H coating),
//      engine_bay (cuci mesin), interior_shampoo (shampoo jok +
//      karpet), home_call (panggilan ke rumah / hotel valet).
// Buyers shortlist by vehicle type then sort by wash-level pricing
// (size + level matrix — see hourly_rate_idr docs below).
export type CarwashSpecialty =
  | 'motor'
  | 'mobil_kecil'
  | 'mobil_sedang'
  | 'suv'
  | 'pickup'
  | 'mpv'
  | 'sedan'
  | 'body_only'
  | 'body_plus_dalam'
  | 'detailing'
  | 'polish_wax'
  | 'ceramic_coating'
  | 'engine_bay'
  | 'interior_shampoo'
  | 'home_call'
  | 'mixed'
  | 'other'

// Labels — Indonesian cuci kendaraan vocab. Vehicle names stay in
// Indonesian (Motor / Mobil Kecil / Mobil Sedang / SUV / Pickup / MPV)
// because that's how Indonesian car owners search. English mix-ins
// (Detailing / Coating / Polish Wax) follow how local cuci mobil
// Instagram bios already write them.
export const SPECIALTY_LABELS: Record<CarwashSpecialty, string> = {
  motor:            'Motor · Matic & Sport',
  mobil_kecil:      'Mobil Kecil · LCGC & Hatchback',
  mobil_sedang:     'Mobil Sedang · Sedan & MPV Kecil',
  suv:              'SUV · Mid-Size',
  pickup:           'Pickup · Single & Double Cabin',
  mpv:              'MPV Besar · Innova & Alphard',
  sedan:            'Sedan · Premium',
  body_only:        'Body Only · Express',
  body_plus_dalam:  'Body + Dalam · Interior Vacuum',
  detailing:        'Detailing · Full Premium',
  polish_wax:       'Polish + Wax · Glow',
  ceramic_coating:  'Coating Ceramic · 9H',
  engine_bay:       'Engine Bay · Cuci Mesin',
  interior_shampoo: 'Interior Shampoo · Jok & Karpet',
  home_call:        'Panggilan ke Rumah',
  mixed:            'Mixed Services',
  other:            'Lainnya',
}

// Short chip labels — shown on cards (max 3 per car wash).
export const SPECIALTY_SHORT: Record<CarwashSpecialty, string> = {
  motor:            'Motor',
  mobil_kecil:      'Mobil Kecil',
  mobil_sedang:     'Mobil Sedang',
  suv:              'SUV',
  pickup:           'Pickup',
  mpv:              'MPV',
  sedan:            'Sedan',
  body_only:        'Body Only',
  body_plus_dalam:  'Body + Dalam',
  detailing:        'Detailing',
  polish_wax:       'Polish Wax',
  ceramic_coating:  'Coating',
  engine_bay:       'Engine Bay',
  interior_shampoo: 'Interior',
  home_call:        'Home Call',
  mixed:            'Mixed',
  other:            'Lainnya',
}

export const ALL_SPECIALTIES: CarwashSpecialty[] = [
  'motor','mobil_kecil','mobil_sedang','suv','pickup','mpv','sedan',
  'body_only','body_plus_dalam','detailing','polish_wax','ceramic_coating',
  'engine_bay','interior_shampoo','home_call',
  'other','mixed',
]

// UX-enforced cap on a single car wash's specialty count. DB CHECK also
// enforces max 3 — keeps profile cards scannable.
export const MAX_CARWASH_SPECIALTIES = 3

export interface CarwashProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: CarwashSpecialty[]
  // Pricing — cuci kendaraan has TWO axes:
  //   1. VEHICLE SIZE TIER (motor cheapest → mobil_kecil → sedang →
  //      SUV → MPV besar → premium). Per-tier surcharge — motor body
  //      Rp 15k, mobil sedang body Rp 35k, SUV body+dalam Rp 70k.
  //   2. WASH LEVEL (body_only cheapest → body_plus_dalam → polish_wax
  //      → detailing → ceramic_coating most expensive). Ceramic
  //      coating SUV Rp 4-8jt.
  // Local rates (Yogya / Bandung / Jakarta indie cuci mobil, 2026):
  //   • Motor body only:                 Rp 15k    (floor — express 15 menit)
  //   • Mobil kecil body only:           Rp 25-30k
  //   • Mobil sedang body only:          Rp 35k
  //   • Mobil sedang body + dalam:       Rp 50k
  //   • SUV body only:                   Rp 45k
  //   • SUV body + dalam:                Rp 70k
  //   • Detailing premium SUV:           Rp 350k-500k (3-4 jam)
  //   • Polish wax mobil sedang:         Rp 250k-400k
  //   • Coating ceramic 9H mobil sedang: Rp 3-5jt
  //   • Coating ceramic 9H SUV:          Rp 4-8jt (garansi 1 tahun)
  // Home-call surcharge: typically +Rp 20-50k depending on city/area.
  // Member-card tier (10x cuci diskon): typically saves 10-15% vs single.
  //   hourly_rate_idr = anchor "starting from" price (cheapest line
  //     the car wash offers; e.g. Rp 15k motor body-only floor).
  //     Column name kept to reuse the shared marketplace pill renderer,
  //     but surface label reads "Mulai dari".
  //   day_rate_idr    = optional "paket detailing / paket coating"
  //     all-in rate (e.g. Rp 3.5jt coating ceramic 9H mobil sedang
  //     include surface prep + clay-bar + 1-tahun garansi). Used when
  //     the car wash quotes a flat package vs base + extras.
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for car wash this means "Datang ke Rumah"
  // (siap panggilan ke rumah / hotel valet vs lokasi cuci only).
  // Defaults true since panggilan ke rumah is increasingly the
  // differentiator for indie cuci mobil vs mall / SPBU chains.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: CarwashAvailability
  status: CarwashStatus
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

export type CarwashProviderPublic = Pick<
  CarwashProvider,
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
