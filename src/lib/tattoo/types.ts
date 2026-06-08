export type TattooAvailability = 'online' | 'busy' | 'offline'
export type TattooStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Tattoo "specialty" = artistic style. These are the most-requested
// styles in Indonesian tattoo studios (Bali/Yogya scenes) — bold-line
// traditional, fineline, blackwork, watercolour, etc. Mirrors the
// HandymanSpecialty shape so the shared profile + dashboard machinery
// (chips, services-provided badges, banner picker) reuses identically.
export type TattooSpecialty =
  | 'fineline'
  | 'traditional'
  | 'neo_traditional'
  | 'japanese'
  | 'blackwork'
  | 'dotwork'
  | 'realism'
  | 'watercolour'
  | 'tribal'
  | 'lettering'
  | 'minimalist'
  | 'geometric'
  | 'illustrative'
  | 'biomechanical'
  | 'portrait'
  | 'cover_up'
  | 'piercing'
  | 'mixed'
  | 'other'

// Full-name English labels — international scene, no Bahasa-first
// convention here (most studios market in English on social).
export const SPECIALTY_LABELS: Record<TattooSpecialty, string> = {
  fineline:        'Fineline',
  traditional:     'Traditional · Old School',
  neo_traditional: 'Neo-Traditional',
  japanese:        'Japanese · Irezumi',
  blackwork:       'Blackwork',
  dotwork:         'Dotwork · Stippling',
  realism:         'Realism',
  watercolour:     'Watercolour',
  tribal:          'Tribal',
  lettering:       'Lettering · Script',
  minimalist:      'Minimalist',
  geometric:       'Geometric',
  illustrative:    'Illustrative',
  biomechanical:   'Biomechanical',
  portrait:        'Portrait',
  cover_up:        'Cover-up · Rework',
  piercing:        'Piercing',
  mixed:           'Mixed styles',
  other:           'Other',
}

// Short chip labels — shown on cards (max 3 per artist).
export const SPECIALTY_SHORT: Record<TattooSpecialty, string> = {
  fineline:        'Fineline',
  traditional:     'Traditional',
  neo_traditional: 'Neo-Trad',
  japanese:        'Japanese',
  blackwork:       'Blackwork',
  dotwork:         'Dotwork',
  realism:         'Realism',
  watercolour:     'Watercolour',
  tribal:          'Tribal',
  lettering:       'Lettering',
  minimalist:      'Minimalist',
  geometric:       'Geometric',
  illustrative:    'Illustrative',
  biomechanical:   'Biomech',
  portrait:        'Portrait',
  cover_up:        'Cover-up',
  piercing:        'Piercing',
  mixed:           'Mixed',
  other:           'Other',
}

export const ALL_SPECIALTIES: TattooSpecialty[] = [
  'fineline','traditional','neo_traditional','japanese',
  'blackwork','dotwork','realism','watercolour',
  'tribal','lettering','minimalist','geometric',
  'illustrative','biomechanical','portrait','cover_up',
  'piercing','other','mixed',
]

// UX-enforced cap on a single artist's specialty count. DB CHECK also
// enforces max 3 — keeps profile cards scannable.
export const MAX_TATTOO_SPECIALTIES = 3

export interface TattooProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: TattooSpecialty[]
  // Pricing — tattoo industry convention:
  //   hourly_rate_idr = per-session hourly rate (most-quoted unit)
  //   day_rate_idr    = optional full-day flat (for sleeves, large pieces)
  // CHECK enforces at least one is set. Custom per-piece quotes still
  // happen via WhatsApp; the public profile shows the "starting from"
  // number so customers can self-qualify before messaging.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: TattooAvailability
  status: TattooStatus
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

export type TattooProviderPublic = Pick<
  TattooProvider,
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
