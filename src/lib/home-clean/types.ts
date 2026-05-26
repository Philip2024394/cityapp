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
}
