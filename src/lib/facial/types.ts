// Types for the Facial marketplace. Structural twin of the massage +
// beautician verticals so the shared profile / dashboard components
// (and the mig 0142 payment surface) work without parameterisation.

import type { BeauticianServicePhoto } from '@/lib/beautician/types'

export type FacialGender = 'woman' | 'man'
export type FacialAvailability = 'online' | 'busy' | 'offline'
export type FacialStatus = 'pending' | 'active' | 'suspended' | 'removed'
export type FacialSubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

// Service catalog. Add entries here as the catalog grows; the
// services_offered column is text[] with no CHECK so adding here
// does not require a follow-up migration.
export const FACIAL_SERVICES_OFFERED = [
  { id: 'classic_facial',       label: 'Classic Facial' },
  { id: 'deep_cleansing',       label: 'Deep Cleansing' },
  { id: 'anti_aging',           label: 'Anti-Aging Facial' },
  { id: 'brightening',          label: 'Brightening Facial' },
  { id: 'acne_treatment',       label: 'Acne Treatment' },
  { id: 'hydrating',            label: 'Hydrating Facial' },
  { id: 'microdermabrasion',    label: 'Microdermabrasion' },
  { id: 'chemical_peel',        label: 'Chemical Peel' },
  { id: 'led_therapy',          label: 'LED Light Therapy' },
  { id: 'oxygen_facial',        label: 'Oxygen Facial' },
  { id: 'gold_facial',          label: 'Gold Facial' },
  { id: 'kbeauty',              label: 'K-Beauty Routine' },
  { id: 'jbeauty',              label: 'J-Beauty Routine' },
  { id: 'gua_sha',              label: 'Gua Sha Facial' },
  { id: 'cryotherapy',          label: 'Cryotherapy Facial' },
  { id: 'high_frequency',       label: 'High Frequency' },
  { id: 'hydra_facial',         label: 'Hydra Facial' },
  { id: 'lifting',              label: 'Lifting Facial' },
  { id: 'extractions',          label: 'Extractions' },
  { id: 'mixed',                label: 'Mixed services' },
] as const

export type FacialServiceOffered = typeof FACIAL_SERVICES_OFFERED[number]['id']

export const FACIAL_SERVICE_LABELS: Record<FacialServiceOffered, string> =
  Object.fromEntries(
    FACIAL_SERVICES_OFFERED.map((s) => [s.id, s.label]),
  ) as Record<FacialServiceOffered, string>

export interface FacialProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  gender: FacialGender
  years_experience: number
  bio: string

  price_60min_idr: number | null
  price_90min_idr: number | null
  price_120min_idr: number | null

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null

  availability: FacialAvailability
  status: FacialStatus

  subscription_status: FacialSubscriptionStatus
  trial_ends_at: string
  paid_until: string | null

  is_mock: boolean

  created_at: string
  updated_at: string

  // mig 0072 — universal extras (cover, gallery, socials, hours,
  // certifications, languages). Surfaced via UniversalProfileExtrasEditor
  // on the dashboard. Read by the public profile.
  cover_image_url?:    string | null
  gallery_image_urls?: string[] | null
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  // mig 0130 — extra socials
  x_url?:              string | null
  snapchat_url?:       string | null
  website_url?:        string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[] | null
  languages?:          string[] | null
  // mig 0137 — public-page contact form opt-in
  contact_form_enabled?: boolean | null
  contact_email?:        string | null
  // mig 0132 — chat handles (also part of universal extras)
  telegram_handle?:    string | null
  wechat_id?:          string | null
  line_id?:            string | null
  kakaotalk_id?:       string | null
}

export type FacialProviderPublic = Pick<
  FacialProvider,
  | 'slug' | 'display_name'
  | 'gender' | 'years_experience' | 'bio'
  | 'price_60min_idr' | 'price_90min_idr' | 'price_120min_idr'
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
  subscription_status?: FacialSubscriptionStatus | null
  is_mock?: boolean
  rating?: number | null
  rating_count?: number | null
  services_offered?: FacialServiceOffered[] | null
  marketplace_categories?: FacialServiceOffered[] | null
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
  // Per-service photo gallery — reuses the rich BeauticianServicePhoto
  // shape so PortfolioCarousel + cart wiring drop in unchanged.
  service_photos?: Partial<Record<FacialServiceOffered, BeauticianServicePhoto[]>> | null
  // mig 0142 — payments + legal + FAQ.
  payment_provider?: 'none' | 'stripe' | 'midtrans' | null
  faq_items?:   Array<{ q: string; a: string }> | null
  faq_enabled?: boolean | null
  legal_terms?:   string | null
  legal_privacy?: string | null
  // mig 0228 — vendor-uploaded static QRIS image URL. When non-null,
  // the public profile renders a "Pay deposit via QRIS" block under
  // the Contact CTA. Kita2u never custodies funds — customer scans
  // the merchant's own QR and pays direct.
  qr_payment_url?: string | null
  // mig 0228 — Pro/Studio draft lock. When is_draft is true the public
  // profile page renders a password gate (locked: true on the API)
  // until the correct ?p= is supplied. draft_password is NEVER sent
  // to the client — it lives in the DB row only.
  is_draft?:       boolean | null
}
