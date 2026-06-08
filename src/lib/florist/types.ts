export type FloristAvailability = 'online' | 'busy' | 'offline'
export type FloristStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Florist "specialty" = the arrangement category / format the shop covers.
// Indonesian independent florists cluster around hand bouquet (wisuda /
// ulang tahun / valentine), vase arrangement (gifting), standing flower
// for grand openings + funerals, box arrangement (anniversary /
// surprise), corsage + boutonnière for weddings, sympathy / graduation
// occasion sets, and premium import for high-ticket weddings + bespoke
// orders. Buyers send a screenshot ("I want one like this") and pick by
// photo — so the genre vocab here mirrors the photo categories florist
// IGs are organised around.
export type FloristSpecialty =
  | 'hand_bouquet'
  | 'vase_arrangement'
  | 'standing_flower'
  | 'box_arrangement'
  | 'corsage'
  | 'sympathy'
  | 'graduation'
  | 'wedding'
  | 'anniversary'
  | 'valentine'
  | 'premium_import'
  | 'mixed'
  | 'other'

// Labels — Indonesian florist-trade vocab. Mix of Indonesian event terms
// (wisuda / ulang tahun) with arrangement format (hand bouquet, standing,
// box). Premium import flagged explicitly because clients screen for
// rose / lily / hydrangea / tulip imports vs local-only stock.
export const SPECIALTY_LABELS: Record<FloristSpecialty, string> = {
  hand_bouquet:     'Hand Bouquet',
  vase_arrangement: 'Vase Arrangement',
  standing_flower:  'Standing Flower',
  box_arrangement:  'Box Arrangement',
  corsage:          'Corsage · Boutonnière',
  sympathy:         'Sympathy · Funeral',
  graduation:       'Graduation · Wisuda',
  wedding:          'Wedding · Bridal',
  anniversary:      'Anniversary',
  valentine:        'Valentine',
  premium_import:   'Premium Import',
  mixed:            'Mixed arrangements',
  other:            'Lainnya',
}

// Short chip labels — shown on cards (max 3 per florist).
export const SPECIALTY_SHORT: Record<FloristSpecialty, string> = {
  hand_bouquet:     'Hand Bouquet',
  vase_arrangement: 'Vase',
  standing_flower:  'Standing',
  box_arrangement:  'Box',
  corsage:          'Corsage',
  sympathy:         'Sympathy',
  graduation:       'Wisuda',
  wedding:          'Wedding',
  anniversary:      'Anniversary',
  valentine:        'Valentine',
  premium_import:   'Import',
  mixed:            'Mixed',
  other:            'Lainnya',
}

export const ALL_SPECIALTIES: FloristSpecialty[] = [
  'hand_bouquet','vase_arrangement','standing_flower','box_arrangement',
  'corsage','sympathy','graduation','wedding','anniversary','valentine',
  'premium_import','other','mixed',
]

// UX-enforced cap on a single florist's specialty count. DB CHECK
// also enforces max 3 — keeps profile cards scannable.
export const MAX_FLORIST_SPECIALTIES = 3

export interface FloristProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: FloristSpecialty[]
  // Pricing — florist convention is PER-ARRANGEMENT with size tiers
  // (e.g. "Hand bouquet small Rp 150k / medium Rp 280k / large Rp 450k").
  // Distinct from cake's per-cake because flower arrangements are even
  // more "by photo" — buyers send a screenshot and ask for "one like
  // this", picking among size tiers.
  //   hourly_rate_idr = "starting from" per-arrangement price (most-
  //     quoted unit in Indonesia indie florist; e.g. Rp 150,000 hand
  //     bouquet small, Rp 280,000 medium). Column name kept to reuse
  //     the shared marketplace pill renderer, but the surface label
  //     reads "Per-arrangement from".
  //   day_rate_idr    = optional premium / standing flower bundle
  //     (e.g. Standing Flower Grand Opening Rp 1.8jt, Wedding bridal
  //     package from Rp 5jt). Used when per-arrangement starter
  //     doesn't capture the full range.
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for florist this means "Delivery dalam kota"
  // (free in-city same-day drop-off vs pickup-only studio). Defaults
  // true since Indonesian indie florists almost always deliver
  // finished arrangements by ojek / car (same-day cutoff before 16:00
  // local time; standing flower / sympathy needs to arrive fresh).
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: FloristAvailability
  status: FloristStatus
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

export type FloristProviderPublic = Pick<
  FloristProvider,
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
