export type VideoAvailability = 'online' | 'busy' | 'offline'
export type VideoStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Video "specialty" = the videography genre the videographer covers.
// Indonesian indie videographers cluster around wedding cinematic +
// brand commercial + social reel work (Instagram/TikTok-driven), with
// music videos and event documentation as the everyday paid work.
// Drone/aerial is a paid add-on more than a standalone genre but it's
// worth surfacing so clients can self-qualify. Mirrors the PhotoSpecialty
// shape so the shared profile + dashboard machinery (chips, services-
// provided badges, banner picker) reuses identically.
export type VideoSpecialty =
  | 'wedding_cinematic'
  | 'music_video'
  | 'brand_commercial'
  | 'social_reel'
  | 'event_doc'
  | 'food_broll'
  | 'real_estate'
  | 'drone_aerial'
  | 'corporate'
  | 'editorial'
  | 'mixed'
  | 'other'

// Labels — videography clients in Indonesia mix English trade terms
// (cinematic, b-roll, reel) with Indonesian context. Customer-facing
// copy below leans on the trade terms because that's what clients
// search for.
export const SPECIALTY_LABELS: Record<VideoSpecialty, string> = {
  wedding_cinematic: 'Wedding Cinematic',
  music_video:       'Music Video',
  brand_commercial:  'Brand Commercial',
  social_reel:       'Social Reel',
  event_doc:         'Event · Acara',
  food_broll:        'Food · B-roll',
  real_estate:       'Real Estate',
  drone_aerial:      'Drone · Aerial',
  corporate:         'Corporate',
  editorial:         'Editorial',
  mixed:             'Mixed genres',
  other:             'Lainnya',
}

// Short chip labels — shown on cards (max 3 per videographer).
export const SPECIALTY_SHORT: Record<VideoSpecialty, string> = {
  wedding_cinematic: 'Wedding',
  music_video:       'Music Video',
  brand_commercial:  'Brand',
  social_reel:       'Reel',
  event_doc:         'Event',
  food_broll:        'Food',
  real_estate:       'Real Estate',
  drone_aerial:      'Drone',
  corporate:         'Corporate',
  editorial:         'Editorial',
  mixed:             'Mixed',
  other:             'Lainnya',
}

export const ALL_SPECIALTIES: VideoSpecialty[] = [
  'wedding_cinematic','music_video','brand_commercial','social_reel',
  'event_doc','food_broll','real_estate','drone_aerial','corporate',
  'editorial','other','mixed',
]

// UX-enforced cap on a single videographer's specialty count. DB CHECK
// also enforces max 3 — keeps profile cards scannable.
export const MAX_VIDEO_SPECIALTIES = 3

export interface VideoProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: VideoSpecialty[]
  // Pricing — videography convention:
  //   hourly_rate_idr = "starting from" package price (most-quoted
  //     unit in Indonesia; e.g. Rp 2.5jt social reel, Rp 6jt wedding
  //     cinematic highlight). The column name is kept to reuse the
  //     shared marketplace pill renderer, but the surface label on
  //     dashboard + profile reads "Package from".
  //   day_rate_idr    = optional full-day / full-event package rate
  //     (e.g. wedding cinematic full-day, music video shoot day).
  // CHECK enforces at least one is set. Custom multi-day quotes still
  // happen via WhatsApp; the public profile shows the "starting from"
  // number so clients can self-qualify before messaging.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed photo boolean — for video means "Travels for the shoot"
  // (on-location vs studio-only). Defaults true since most Indonesian
  // indie videographers travel to the venue / restaurant / brand HQ.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: VideoAvailability
  status: VideoStatus
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

export type VideoProviderPublic = Pick<
  VideoProvider,
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
