export type PetAvailability = 'online' | 'busy' | 'offline'
export type PetStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Pet "specialty" = the service track + species/size axis the
// independent pet groomer / pet sitter offers. Indonesian indie pet
// businesses cluster around two axes:
//   1. SPECIES — cat (kucing), dog (anjing) cover ~90% of inquiries;
//      rabbit / hamster / bird / exotic fill the rest. Most groomers
//      take cat + dog; exotic-only operators are a niche signal.
//   2. SERVICE TYPE — grooming_bath (mandi-shampoo-blow-dry, the cheap
//      baseline), full_grooming (bath + cut + nail + ear, premium),
//      nail_trim + ear_cleaning (cheap add-ons / standalone),
//      pet_hotel (boarding per-malam), pet_sitting (sitter datang ke
//      rumah pemilik), pet_daycare (titip harian), pet_training
//      (obedience + potty training).
// Buyers shortlist by species + service then sort by size-tier pricing
// (the second axis — see hourly_rate_idr docs below). Bio carries the
// trust signals (vaccine policy, sertifikat groomer, AC-ber-ruang,
// peralatan steril).
export type PetSpecialty =
  | 'cat'
  | 'dog'
  | 'rabbit'
  | 'hamster'
  | 'bird'
  | 'exotic'
  | 'grooming_bath'
  | 'full_grooming'
  | 'nail_trim'
  | 'ear_cleaning'
  | 'pet_hotel'
  | 'pet_sitting'
  | 'pet_daycare'
  | 'pet_training'
  | 'mixed'
  | 'other'

// Labels — Indonesian pet-care vocab. Species in Indonesian (Kucing /
// Anjing / Kelinci) because that's how Indonesian pemilik anabul
// search. Service types mix Indonesian (Mandi, Pet Hotel) and English
// (Grooming, Sitting) the way local groomer Instagram bios already
// write them.
export const SPECIALTY_LABELS: Record<PetSpecialty, string> = {
  cat:             'Kucing',
  dog:             'Anjing',
  rabbit:          'Kelinci',
  hamster:         'Hamster',
  bird:            'Burung',
  exotic:          'Exotic · Reptil',
  grooming_bath:   'Mandi · Blow Dry',
  full_grooming:   'Full Grooming Premium',
  nail_trim:       'Potong Kuku',
  ear_cleaning:    'Bersihkan Telinga',
  pet_hotel:       'Pet Hotel · Boarding',
  pet_sitting:     'Pet Sitting di Rumah',
  pet_daycare:     'Pet Daycare Harian',
  pet_training:    'Pet Training · Obedience',
  mixed:           'Mixed Services',
  other:           'Lainnya',
}

// Short chip labels — shown on cards (max 3 per groomer).
export const SPECIALTY_SHORT: Record<PetSpecialty, string> = {
  cat:             'Kucing',
  dog:             'Anjing',
  rabbit:          'Kelinci',
  hamster:         'Hamster',
  bird:            'Burung',
  exotic:          'Exotic',
  grooming_bath:   'Mandi',
  full_grooming:   'Full Groom',
  nail_trim:       'Potong Kuku',
  ear_cleaning:    'Telinga',
  pet_hotel:       'Pet Hotel',
  pet_sitting:     'Pet Sitting',
  pet_daycare:     'Daycare',
  pet_training:    'Training',
  mixed:           'Mixed',
  other:           'Lainnya',
}

export const ALL_SPECIALTIES: PetSpecialty[] = [
  'cat','dog','rabbit','hamster','bird','exotic',
  'grooming_bath','full_grooming','nail_trim','ear_cleaning',
  'pet_hotel','pet_sitting','pet_daycare','pet_training',
  'other','mixed',
]

// UX-enforced cap on a single groomer's specialty count. DB CHECK also
// enforces max 3 — keeps profile cards scannable.
export const MAX_PET_SPECIALTIES = 3

export interface PetProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: PetSpecialty[]
  // Pricing — pet care has TWO axes:
  //   1. SERVICE TYPE (mandi cheap, full grooming premium, pet hotel
  //      per-malam, pet sitting per-hari, training per-sesi).
  //   2. PET SIZE TIER (small / medium / large / extra-large — grooming
  //      prices scale with size; XL anjing besar (Husky / Golden) cost
  //      ~3x small cat (Persian dewasa)).
  // Local rates (Yogya / Bandung / Jakarta indie groomer):
  //   • Cat bath S (Persian, anak):        Rp 80k  (floor — anchor)
  //   • Cat bath L (Maine Coon dewasa):    Rp 150k
  //   • Dog bath S (Chihuahua / Pom):      Rp 100k
  //   • Dog full-groom M (Shih Tzu):       Rp 200k
  //   • Dog full-groom XL (Husky/Golden):  Rp 250-350k
  //   • Pet hotel kucing per-malam:        Rp 80-150k (AC + makan)
  //   • Pet hotel anjing per-malam:        Rp 120-250k
  //   • Pet sitting datang ke rumah:       Rp 100-200k per hari
  //   • Pet daycare harian:                Rp 80-150k per hari
  //   • Pet training paket 8x:             Rp 1.5-3jt
  // Antar-jemput dalam kota typically + Rp 20-50k surcharge.
  //   hourly_rate_idr = anchor "starting from" price (the cheapest
  //     small-pet bath the business offers; e.g. Rp 80,000 for cat S
  //     bath-only). Column name kept to reuse the shared marketplace
  //     pill renderer, but surface label reads "Mulai dari".
  //   day_rate_idr    = optional pet-hotel per-night OR pet-sitting
  //     per-day rate (e.g. Rp 120k/malam for kucing AC). Used when the
  //     business also offers boarding / sitting alongside grooming.
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for pet this means "Datang ke rumah"
  // (antar-jemput grooming / pet sitting di rumah pemilik vs salon-
  // only). Defaults true because indie groomers and pet sitters
  // typically advertise home pickup / home visit as their main
  // differentiator vs walk-in pet shop chains.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: PetAvailability
  status: PetStatus
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

export type PetProviderPublic = Pick<
  PetProvider,
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
