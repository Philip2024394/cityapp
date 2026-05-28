export type LaundryAvailability = 'online' | 'busy' | 'offline'
export type LaundryStatus = 'pending' | 'active' | 'suspended' | 'removed'
export type LaundrySubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export interface LaundryProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  price_wash_per_kg_idr:      number | null
  price_wash_dry_per_kg_idr:  number | null
  price_wash_iron_per_kg_idr: number | null

  min_kg: number | null
  turnaround_hours: number | null

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: LaundryAvailability
  status: LaundryStatus
  verified_at: string | null
  verified_by: string | null
  rejected_reason: string | null

  subscription_status: LaundrySubscriptionStatus
  trial_ends_at: string
  paid_until: string | null

  is_mock: boolean
  mock_hidden_at: string | null

  created_at: string
  updated_at: string
}

export type LaundryProviderPublic = Pick<
  LaundryProvider,
  | 'slug' | 'display_name'
  | 'years_experience' | 'bio'
  | 'price_wash_per_kg_idr' | 'price_wash_dry_per_kg_idr' | 'price_wash_iron_per_kg_idr'
  | 'min_kg' | 'turnaround_hours'
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
  subscription_status?: LaundrySubscriptionStatus | null
  is_mock?: boolean
  rating?: number | null
  rating_count?: number | null
  // mig 0087 — per-provider accent for the public profile page.
  theme_color?: string | null
  // mig 0106 — feature parity with beautician (visit us + hero/promo copy)
  has_physical_location?: boolean | null
  latitude?:              number | null
  longitude?:             number | null
  hero_text?:             Record<string, unknown> | null
  promo_text?:            string | null
}

export const PACKAGE_LABELS = {
  wash:      'Wash',
  wash_dry:  'Wash + Dry',
  wash_iron: 'Wash + Iron',
} as const

export type LaundryPackage = keyof typeof PACKAGE_LABELS
