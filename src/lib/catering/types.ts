export type CateringAvailability = 'online' | 'busy' | 'offline'
export type CateringStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Catering "specialty" = the cuisine / menu format the catering business
// covers. Indonesian independent caterers cluster around home-style
// Indonesian (Padang / Jawa), nasi-box delivery, snack-box meeting
// service, tumpeng for selamatan / syukuran, and prasmanan (buffet)
// for weddings / corporate events. Halal + vegan are first-class tags
// because they're often a dealbreaker for the client (event venue,
// religious context, or dietary restriction).
export type CateringSpecialty =
  | 'indonesian'
  | 'padang'
  | 'jawa'
  | 'chinese'
  | 'western'
  | 'vegan'
  | 'halal'
  | 'snack_box'
  | 'tumpeng'
  | 'buffet_wedding'
  | 'prasmanan'
  | 'nasi_box'
  | 'mixed'
  | 'other'

// Labels — Indonesian catering vocab. Mix of Indonesian event-trade
// terms (tumpeng, prasmanan, nasi-box) with cuisine origins. Halal +
// vegan tagged explicitly because clients screen for them.
export const SPECIALTY_LABELS: Record<CateringSpecialty, string> = {
  indonesian:     'Indonesia Rumahan',
  padang:         'Padang',
  jawa:           'Jawa',
  chinese:        'Chinese',
  western:        'Western',
  vegan:          'Vegan',
  halal:          'Halal Sertifikat',
  snack_box:      'Snack Box · Kue',
  tumpeng:        'Tumpeng · Selamatan',
  buffet_wedding: 'Buffet Wedding',
  prasmanan:      'Prasmanan',
  nasi_box:       'Nasi Box',
  mixed:          'Mixed menu',
  other:          'Lainnya',
}

// Short chip labels — shown on cards (max 3 per catering business).
export const SPECIALTY_SHORT: Record<CateringSpecialty, string> = {
  indonesian:     'Indonesia',
  padang:         'Padang',
  jawa:           'Jawa',
  chinese:        'Chinese',
  western:        'Western',
  vegan:          'Vegan',
  halal:          'Halal',
  snack_box:      'Snack',
  tumpeng:        'Tumpeng',
  buffet_wedding: 'Wedding',
  prasmanan:      'Prasmanan',
  nasi_box:       'Nasi Box',
  mixed:          'Mixed',
  other:          'Lainnya',
}

export const ALL_SPECIALTIES: CateringSpecialty[] = [
  'indonesian','padang','jawa','chinese','western','vegan','halal',
  'snack_box','tumpeng','buffet_wedding','prasmanan','nasi_box',
  'other','mixed',
]

// UX-enforced cap on a single catering business's specialty count. DB CHECK
// also enforces max 3 — keeps profile cards scannable.
export const MAX_CATERING_SPECIALTIES = 3

export interface CateringProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: CateringSpecialty[]
  // Pricing — catering convention is PER-PAX with a minimum order
  // count (e.g. "Rp 35,000/pax minimum 50 pax" for nasi box; "Rp
  // 95,000/pax minimum 100 pax" for full prasmanan). Distinct from
  // per-package (photo) or per-cut (barber).
  //   hourly_rate_idr = "starting from" per-pax price (most-quoted
  //     unit in Indonesia; e.g. Rp 22,000/pax snack box, Rp 35,000/
  //     pax nasi box, Rp 95,000/pax buffet). Column name kept to
  //     reuse the shared marketplace pill renderer, but the surface
  //     label reads "Per-pax from".
  //   day_rate_idr    = optional full-package / tumpeng / event-day
  //     bundle (e.g. Tumpeng Mini Rp 450k, full-event minimum
  //     bundle). Used when per-pax doesn't apply (tumpeng is per
  //     buah / per ekor, not per-pax).
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for catering this means "Delivery dalam
  // kota" (free in-city drop-off vs setup-on-site / dine-in studio
  // pickup). Defaults true since Indonesian indie caterers almost
  // always deliver hot food to the venue / office / customer house.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: CateringAvailability
  status: CateringStatus
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

export type CateringProviderPublic = Pick<
  CateringProvider,
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
