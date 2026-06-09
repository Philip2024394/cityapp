export type PhotoAvailability = 'online' | 'busy' | 'offline'
export type PhotoStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Photo "specialty" = the photography genre the photographer covers.
// Indonesian indie photographers cluster around wedding / prewedding +
// product / food work (Instagram-driven), with editorial / fashion as
// the higher-end city tier and family / headshot / event as the
// everyday paid work. Mirrors the BarberSpecialty shape so the shared
// profile + dashboard machinery (chips, services-provided badges,
// banner picker) reuses identically.
export type PhotoSpecialty =
  | 'wedding'
  | 'prewedding'
  | 'family'
  | 'headshot'
  | 'fashion'
  | 'product'
  | 'food'
  | 'event'
  | 'editorial'
  | 'travel'
  | 'lifestyle'
  | 'mixed'
  | 'other'

// Labels — photography clients in Indonesia mix English (the trade
// terms: prewedding, headshot, editorial) with Indonesian context
// (keluarga, acara). Customer-facing copy below leans on the trade
// terms because that's what clients search for.
export const SPECIALTY_LABELS: Record<PhotoSpecialty, string> = {
  wedding:    'Wedding',
  prewedding: 'Prewedding',
  family:     'Family · Keluarga',
  headshot:   'Headshot',
  fashion:    'Fashion',
  product:    'Product',
  food:       'Food · Restaurant',
  event:      'Event · Acara',
  editorial:  'Editorial',
  travel:     'Travel',
  lifestyle:  'Lifestyle',
  mixed:      'Mixed genres',
  other:      'Lainnya',
}

// Short chip labels — shown on cards (max 3 per photographer).
export const SPECIALTY_SHORT: Record<PhotoSpecialty, string> = {
  wedding:    'Wedding',
  prewedding: 'Prewedding',
  family:     'Family',
  headshot:   'Headshot',
  fashion:    'Fashion',
  product:    'Product',
  food:       'Food',
  event:      'Event',
  editorial:  'Editorial',
  travel:     'Travel',
  lifestyle:  'Lifestyle',
  mixed:      'Mixed',
  other:      'Lainnya',
}

export const ALL_SPECIALTIES: PhotoSpecialty[] = [
  'wedding','prewedding','family','headshot','fashion',
  'product','food','event','editorial','travel','lifestyle',
  'other','mixed',
]

// UX-enforced cap on a single photographer's specialty count. DB CHECK
// also enforces max 3 — keeps profile cards scannable.
export const MAX_PHOTO_SPECIALTIES = 3

export interface PhotoProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: PhotoSpecialty[]
  // Pricing — photography convention:
  //   hourly_rate_idr = "starting from" package price (most-quoted
  //     unit in Indonesia; e.g. Rp 1.5jt mini session, Rp 3jt family
  //     half-day). The column name is kept to reuse the shared
  //     marketplace pill renderer, but the surface label on dashboard +
  //     profile reads "Package from".
  //   day_rate_idr    = optional full-day / full-event package rate
  //     (e.g. wedding documentation, full-day editorial shoot).
  // CHECK enforces at least one is set. Custom multi-day quotes still
  // happen via WhatsApp; the public profile shows the "starting from"
  // number so clients can self-qualify before messaging.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed barber boolean — for photo means "Travels to client"
  // (on-location vs studio-only). Defaults true since most Indonesian
  // indie photographers travel to the venue / restaurant / home.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: PhotoAvailability
  status: PhotoStatus
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

export type PhotoProviderPublic = Pick<
  PhotoProvider,
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
