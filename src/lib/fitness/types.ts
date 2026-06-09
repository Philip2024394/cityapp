export type FitnessAvailability = 'online' | 'busy' | 'offline'
export type FitnessStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Fitness "specialty" = the training type the coach covers. Indonesian
// independent personal trainers cluster around fat-loss + muscle-gain
// (the two most searched goals), plus the lifestyle modalities (yoga,
// pilates, boxing) that drive small-group classes. `online` is its own
// genre because video-call coaching has its own pricing curve.
// `outdoor` covers sunrise track / pantai / car-free-day sessions.
// `postnatal` and `senior` are demand niches with high retention.
// Buyers shortlist by goal (lose weight / build muscle / general health)
// then read the bio for certification (ACE / NASM / ISSA / SKKNI).
export type FitnessSpecialty =
  | 'strength'
  | 'hiit'
  | 'yoga'
  | 'pilates'
  | 'boxing'
  | 'functional'
  | 'weight_loss'
  | 'muscle_gain'
  | 'postnatal'
  | 'senior'
  | 'online'
  | 'outdoor'
  | 'mixed'
  | 'other'

// Labels — Indonesian PT-trade vocab. Mix of goal language (Fat Loss,
// Muscle Gain) with training modality (Strength, HIIT, Yoga, Pilates,
// Boxing, Functional). Postnatal + Senior flagged explicitly because
// they're growing niches with retention upside.
export const SPECIALTY_LABELS: Record<FitnessSpecialty, string> = {
  strength:    'Strength · Beban',
  hiit:        'HIIT · Cardio',
  yoga:        'Yoga',
  pilates:     'Pilates',
  boxing:      'Boxing · Muay Thai',
  functional:  'Functional · Mobility',
  weight_loss: 'Fat Loss · Diet',
  muscle_gain: 'Muscle Gain · Hypertrophy',
  postnatal:   'Postnatal · Pasca Lahiran',
  senior:      'Senior · Active Aging',
  online:      'Online Coaching',
  outdoor:     'Outdoor · Pantai / Track',
  mixed:       'Mixed program',
  other:       'Lainnya',
}

// Short chip labels — shown on cards (max 3 per coach).
export const SPECIALTY_SHORT: Record<FitnessSpecialty, string> = {
  strength:    'Strength',
  hiit:        'HIIT',
  yoga:        'Yoga',
  pilates:     'Pilates',
  boxing:      'Boxing',
  functional:  'Functional',
  weight_loss: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  postnatal:   'Postnatal',
  senior:      'Senior',
  online:      'Online',
  outdoor:     'Outdoor',
  mixed:       'Mixed',
  other:       'Lainnya',
}

export const ALL_SPECIALTIES: FitnessSpecialty[] = [
  'strength','hiit','yoga','pilates','boxing','functional',
  'weight_loss','muscle_gain','postnatal','senior',
  'online','outdoor','other','mixed',
]

// UX-enforced cap on a single coach's specialty count. DB CHECK
// also enforces max 3 — keeps profile cards scannable.
export const MAX_FITNESS_SPECIALTIES = 3

export interface FitnessProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: FitnessSpecialty[]
  // Pricing — fitness convention is PER-SESSION with package discounts
  // (e.g. "Drop-in Rp 200k; 10-pack Rp 1.8jt = Rp 180k/sesi"). Clients
  // buy COMMITMENT PACKAGES not individual items — the 10-pack carries
  // a 10% discount as the standard PT business model. Distinct from
  // florist's per-arrangement because there's no "item" to ship; the
  // unit being purchased is the trainer's time-on-the-floor.
  //   hourly_rate_idr = drop-in single-session price (most-quoted
  //     unit in Indonesia indie PT; e.g. Rp 200,000 for 60 minutes).
  //     Column name kept to reuse the shared marketplace pill
  //     renderer, but the surface label reads "Drop-in from".
  //   day_rate_idr    = optional monthly coaching bundle (e.g.
  //     12 sesi + nutrition plan + WA 24/7 from Rp 2.5jt). Used when
  //     drop-in starter doesn't capture the full range.
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for fitness this means "Trainer brings
  // equipment" (resistance bands, suspension trainer, kettlebell,
  // jump rope vs gym-equipment only). Defaults true since Indonesian
  // indie PTs typically carry a small kit for home / outdoor sessions.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: FitnessAvailability
  status: FitnessStatus
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

export type FitnessProviderPublic = Pick<
  FitnessProvider,
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
