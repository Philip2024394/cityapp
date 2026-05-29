// Types for the Skincare marketplace. Structural twin of the facial /
// massage / beautician verticals — same enums, same payment surface
// (mig 0142), so the shared dashboard + profile components drop in
// without parameterisation.

import type { BeauticianServicePhoto } from '@/lib/beautician/types'

export type SkincareGender = 'woman' | 'man'
export type SkincareAvailability = 'online' | 'busy' | 'offline'
export type SkincareStatus = 'pending' | 'active' | 'suspended' | 'removed'
export type SkincareSubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export const SKINCARE_SERVICES_OFFERED = [
  { id: 'consultation',         label: 'Skin Consultation' },
  { id: 'skin_analysis',        label: 'Skin Analysis' },
  { id: 'acne_program',         label: 'Acne Program' },
  { id: 'pigmentation',         label: 'Pigmentation Treatment' },
  { id: 'anti_aging',           label: 'Anti-Aging Routine' },
  { id: 'hydration',            label: 'Hydration Routine' },
  { id: 'brightening',          label: 'Brightening Routine' },
  { id: 'rosacea',              label: 'Rosacea Care' },
  { id: 'eczema',               label: 'Eczema Care' },
  { id: 'sun_damage',           label: 'Sun Damage Repair' },
  { id: 'scar_treatment',       label: 'Scar Treatment' },
  { id: 'product_curation',     label: 'Product Curation' },
  { id: 'routine_design',       label: 'Routine Design' },
  { id: 'cosmeceutical',        label: 'Cosmeceutical Therapy' },
  { id: 'kbeauty',              label: 'K-Beauty Specialist' },
  { id: 'jbeauty',              label: 'J-Beauty Specialist' },
  { id: 'mens_skin',            label: "Men's Skin" },
  { id: 'teen_skin',            label: 'Teen Skin' },
  { id: 'pre_event_prep',       label: 'Pre-Event Skin Prep' },
  { id: 'mixed',                label: 'Mixed services' },
] as const

export type SkincareServiceOffered = typeof SKINCARE_SERVICES_OFFERED[number]['id']

export const SKINCARE_SERVICE_LABELS: Record<SkincareServiceOffered, string> =
  Object.fromEntries(
    SKINCARE_SERVICES_OFFERED.map((s) => [s.id, s.label]),
  ) as Record<SkincareServiceOffered, string>

export interface SkincareProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  gender: SkincareGender
  years_experience: number
  bio: string

  price_60min_idr: number | null
  price_90min_idr: number | null
  price_120min_idr: number | null

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null

  availability: SkincareAvailability
  status: SkincareStatus

  subscription_status: SkincareSubscriptionStatus
  trial_ends_at: string
  paid_until: string | null

  is_mock: boolean

  created_at: string
  updated_at: string
}

export type SkincareProviderPublic = Pick<
  SkincareProvider,
  | 'slug' | 'display_name'
  | 'gender' | 'years_experience' | 'bio'
  | 'price_60min_idr' | 'price_90min_idr' | 'price_120min_idr'
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
  x_url?:              string | null
  snapchat_url?:       string | null
  website_url?:        string | null
  country_code?:       string | null
  custom_services_offered?: string[] | null
  telegram_handle?:    string | null
  wechat_id?:          string | null
  line_id?:            string | null
  kakaotalk_id?:       string | null
  contact_form_enabled?: boolean | null
  contact_email?:        string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[] | null
  last_active_at?:     string | null
  created_at?:         string | null
  subscription_status?: SkincareSubscriptionStatus | null
  is_mock?: boolean
  rating?: number | null
  rating_count?: number | null
  services_offered?: SkincareServiceOffered[] | null
  marketplace_categories?: SkincareServiceOffered[] | null
  theme_color?: string | null
  has_physical_location?: boolean
  latitude?:  number | null
  longitude?: number | null
  hero_text?: Record<string, unknown> | null
  promo_text?: string | null
  busy_dates?: string[] | null
  service_locations?: Array<'home' | 'hotel' | 'villa'> | null
  cta_button_effect?: 'none' | 'pulse' | 'glow' | 'shake' | null
  avatar_frame_style?: 'none' | 'gradient' | 'pulse' | 'rainbow' | null
  service_photos?: Partial<Record<SkincareServiceOffered, BeauticianServicePhoto[]>> | null
  // mig 0142 — payments + legal + FAQ.
  payment_provider?: 'none' | 'stripe' | 'midtrans' | null
  faq_items?:   Array<{ q: string; a: string }> | null
  faq_enabled?: boolean | null
  legal_terms?:   string | null
  legal_privacy?: string | null
}
