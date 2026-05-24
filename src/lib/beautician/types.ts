// Types for the Bike Beautician marketplace. Mirrors the massage types
// shape — same availability / status / subscription enums.

export type BeauticianGender = 'woman' | 'man'
export type BeauticianAvailability = 'online' | 'busy' | 'offline'
export type BeauticianStatus = 'pending' | 'active' | 'suspended' | 'removed'
export type BeauticianSubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export interface BeauticianProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  gender: BeauticianGender
  years_experience: number
  bio: string

  price_makeup_idr: number | null
  price_nail_idr:   number | null
  price_hair_idr:   number | null

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: BeauticianAvailability
  status: BeauticianStatus
  verified_at: string | null
  verified_by: string | null
  rejected_reason: string | null

  subscription_status: BeauticianSubscriptionStatus
  trial_ends_at: string
  paid_until: string | null

  is_mock: boolean
  mock_hidden_at: string | null

  created_at: string
  updated_at: string
}

// Marketplace-safe subset — no KTP, no internal verifier ids.
export type BeauticianProviderPublic = Pick<
  BeauticianProvider,
  | 'slug' | 'display_name'
  | 'gender' | 'years_experience' | 'bio'
  | 'price_makeup_idr' | 'price_nail_idr' | 'price_hair_idr'
  | 'city' | 'service_area_notes'
  | 'whatsapp_e164'
  | 'profile_image_url'
  | 'availability'
> & {
  // mig 0072 — universal profile fields
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
  subscription_status?: BeauticianSubscriptionStatus | null
  is_mock?: boolean
  rating?: number | null
  rating_count?: number | null
}

export const SERVICE_LABELS = {
  makeup: 'Makeup',
  nail:   'Nail Art',
  hair:   'Hair',
} as const

export type BeauticianService = keyof typeof SERVICE_LABELS
