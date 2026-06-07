export type HomeCleanAvailability = 'online' | 'busy' | 'offline'
export type HomeCleanStatus = 'pending' | 'active' | 'suspended' | 'removed'

export interface HomeCleanProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  // Pricing — hour and/or day. DB CHECK enforces at least one is set.
  // Day = 8 working hours.
  hourly_rate_idr: number | null
  day_rate_idr: number | null

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: HomeCleanAvailability
  status: HomeCleanStatus
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

export type HomeCleanProviderPublic = Pick<
  HomeCleanProvider,
  | 'slug' | 'display_name'
  | 'years_experience' | 'bio'
  | 'hourly_rate_idr' | 'day_rate_idr'
  | 'city' | 'service_area_notes'
  | 'whatsapp_e164'
  | 'profile_image_url'
  | 'availability'
> & {
  id?: string
  owner_user_id?: string  // mig 0193 — for client-side add-on widgets
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
  // mig 0087 — per-provider accent for the public profile page.
  theme_color?: string | null
  // mig 0123 — Services Offered catalog (independent of pricing).
  services_offered?: HomeCleanService[] | null
  // mig 0105 — beautician-parity feature columns. service_photos is the
  // SAME keyed-object shape as beautician mig 0074 — keys are HomeCleanService
  // IDs, values are arrays of rich photo objects (or legacy URL strings).
  service_photos?:        Partial<Record<HomeCleanService, HomeCleanServicePhoto[]>> | null
  has_physical_location?: boolean | null
  latitude?:              number | null
  longitude?:             number | null
  busy_dates?:            string[] | null
  hero_text?:             HomeCleanHeroText | null
  promo_text?:            string | null
  // Optional travel-location subset — home_clean does not yet have a
  // dedicated migration, but if/when the column lands the public page
  // already renders icons for any value present.
  service_locations?: Array<'home' | 'hotel' | 'villa'> | null
}

// mig 0123 — Home-clean service catalog. DB CHECK constraint mirrors this
// list, so adding here requires re-running 0123 with the new entry
// appended to the allowlist.
export const HOME_CLEAN_SERVICES_OFFERED = [
  { id: 'regular_clean',     label: 'Regular Clean'    },
  { id: 'deep_clean',        label: 'Deep Clean'       },
  { id: 'move_in_out',       label: 'Move In / Out'    },
  { id: 'post_construction', label: 'Post-Construction'},
  { id: 'sofa_carpet',       label: 'Sofa & Carpet'    },
] as const

export type HomeCleanService = typeof HOME_CLEAN_SERVICES_OFFERED[number]['id']

export const HOME_CLEAN_SERVICE_LABELS: Record<HomeCleanService, string> =
  Object.fromEntries(
    HOME_CLEAN_SERVICES_OFFERED.map((s) => [s.id, s.label]),
  ) as Record<HomeCleanService, string>

// Hero text customisation — mirrors beautician mig 0081.
export type HomeCleanHeroEffect = 'none' | 'shimmer' | 'dance' | 'underline'
export type HomeCleanHeroText = {
  line1?:         string
  line2?:         string
  tagline?:       string
  color?:         string
  line1_color?:   string
  tagline_color?: string
  effect?:        HomeCleanHeroEffect
}

// Carousel entry — mirrors beautician mig 0074 rich photo shape.
export type HomeCleanServicePhoto = {
  url:              string
  name?:            string
  description?:     string
  price_idr?:       number | null
  object_position?: string
  before_image_url?: string
  after_image_url?:  string
}
