export type BarberAvailability = 'online' | 'busy' | 'offline'
export type BarberStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Barber "specialty" = the chair-side service the barber offers. The
// classic barbershop menu in Indonesia centres around the cut + fade +
// beard work; we extend with hot-towel shave, kids cut, line-up, and
// hair design / colour for the modern barbershop scene (Yogya / Jakarta
// independents). Mirrors the HandymanSpecialty shape so the shared
// profile + dashboard machinery (chips, services-provided badges,
// banner picker) reuses identically.
export type BarberSpecialty =
  | 'classic_cut'
  | 'fade'
  | 'taper'
  | 'beard_trim'
  | 'hot_towel_shave'
  | 'kids_cut'
  | 'hair_design'
  | 'hair_tint'
  | 'line_up'
  | 'lineup_with_beard'
  | 'mixed'
  | 'other'

// Indonesian-leaning labels — barbershop customers think in Indonesian
// for the staples (potong, cukur, jenggot) and English for the trend
// pieces (fade, line-up). The mix below reflects what's actually on a
// shop's chalkboard menu in 2026.
export const SPECIALTY_LABELS: Record<BarberSpecialty, string> = {
  classic_cut:       'Potong Klasik · Classic Cut',
  fade:              'Fade',
  taper:             'Taper',
  beard_trim:        'Rapikan Jenggot · Beard Trim',
  hot_towel_shave:   'Hot Towel Shave',
  kids_cut:          'Potong Anak · Kids Cut',
  hair_design:       'Hair Design · Pattern',
  hair_tint:         'Tint · Pewarnaan',
  line_up:           'Line-up',
  lineup_with_beard: 'Line-up + Jenggot',
  mixed:             'Mixed services',
  other:             'Lainnya',
}

// Short chip labels — shown on cards (max 3 per barber).
export const SPECIALTY_SHORT: Record<BarberSpecialty, string> = {
  classic_cut:       'Classic',
  fade:              'Fade',
  taper:             'Taper',
  beard_trim:        'Beard',
  hot_towel_shave:   'Hot Towel',
  kids_cut:          'Kids',
  hair_design:       'Design',
  hair_tint:         'Tint',
  line_up:           'Line-up',
  lineup_with_beard: 'Cut + Beard',
  mixed:             'Mixed',
  other:             'Lainnya',
}

export const ALL_SPECIALTIES: BarberSpecialty[] = [
  'classic_cut','fade','taper','beard_trim','hot_towel_shave',
  'kids_cut','hair_design','hair_tint','line_up','lineup_with_beard',
  'other','mixed',
]

// UX-enforced cap on a single barber's specialty count. DB CHECK also
// enforces max 3 — keeps profile cards scannable.
export const MAX_BARBER_SPECIALTIES = 3

export interface BarberProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: BarberSpecialty[]
  // Pricing — barbershop convention:
  //   hourly_rate_idr = "starting from" flat per-cut fee (most-quoted unit;
  //     a Rp 65k haircut, Rp 30k beard trim, Rp 100k combo). The column
  //     name is kept to reuse the shared marketplace pill renderer, but
  //     the surface label on dashboard + profile reads "Per cut".
  //   day_rate_idr    = optional combo/all-in (cut + beard + hot towel)
  // CHECK enforces at least one is set. Custom per-service quotes still
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

  availability: BarberAvailability
  status: BarberStatus
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

export type BarberProviderPublic = Pick<
  BarberProvider,
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
