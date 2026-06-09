export type YogaAvailability = 'online' | 'busy' | 'offline'
export type YogaStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Yoga "specialty" = the style/format the teacher offers. Indonesian
// independent yoga teachers cluster around vinyasa + yin (the two most
// requested styles for both studio drop-ins and privates), plus the
// traditional lineages (hatha, ashtanga, kundalini) and the niche
// formats (prenatal, restorative, hot, aerial). `online` is its own
// genre because Zoom/GMeet live classes have their own pricing curve
// (cheaper than in-person). `beginner_friendly` is a discoverability
// flag for first-timers shopping for trial classes.
// Buyers shortlist by style (vinyasa flow / yin recovery / prenatal)
// then read the bio for certification (RYT-200 / RYT-500 / Yoga
// Alliance / Indonesia Yoga Federation).
export type YogaSpecialty =
  | 'hatha'
  | 'vinyasa'
  | 'ashtanga'
  | 'yin'
  | 'restorative'
  | 'prenatal'
  | 'kundalini'
  | 'hot'
  | 'aerial'
  | 'online'
  | 'beginner_friendly'
  | 'mixed'
  | 'other'

// Labels — Indonesian yoga-trade vocab. Mix of traditional lineage
// names (Hatha, Vinyasa, Ashtanga, Yin, Kundalini) with format
// signifiers (Prenatal, Restorative, Hot, Aerial). `beginner_friendly`
// flagged explicitly because first-timer demand is the bulk of trial
// classes and converts the highest into 10-pack buyers.
export const SPECIALTY_LABELS: Record<YogaSpecialty, string> = {
  hatha:             'Hatha · Klasik',
  vinyasa:           'Vinyasa · Flow',
  ashtanga:          'Ashtanga · Series',
  yin:               'Yin · Recovery',
  restorative:       'Restorative · Healing',
  prenatal:          'Prenatal · Ibu Hamil',
  kundalini:         'Kundalini · Energy',
  hot:               'Hot Yoga · 38°C',
  aerial:            'Aerial · Hammock',
  online:            'Online · Live Class',
  beginner_friendly: 'Beginner Friendly',
  mixed:             'Mixed Styles',
  other:             'Lainnya',
}

// Short chip labels — shown on cards (max 3 per teacher).
export const SPECIALTY_SHORT: Record<YogaSpecialty, string> = {
  hatha:             'Hatha',
  vinyasa:           'Vinyasa',
  ashtanga:          'Ashtanga',
  yin:               'Yin',
  restorative:       'Restorative',
  prenatal:          'Prenatal',
  kundalini:         'Kundalini',
  hot:               'Hot',
  aerial:            'Aerial',
  online:            'Online',
  beginner_friendly: 'Beginner',
  mixed:             'Mixed',
  other:             'Lainnya',
}

export const ALL_SPECIALTIES: YogaSpecialty[] = [
  'hatha','vinyasa','ashtanga','yin','restorative','prenatal',
  'kundalini','hot','aerial',
  'online','beginner_friendly','other','mixed',
]

// UX-enforced cap on a single teacher's specialty count. DB CHECK
// also enforces max 3 — keeps profile cards scannable.
export const MAX_YOGA_SPECIALTIES = 3

export interface YogaProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: YogaSpecialty[]
  // Pricing — yoga convention is PER-CLASS with package discounts
  // (e.g. "Drop-in Rp 120k; 10-pack Rp 1jt = Rp 100k/kelas"). Clients
  // buy COMMITMENT PACKAGES not individual items — the 10-pack carries
  // a 17% discount as the standard yoga studio/teacher business model.
  // Distinct from PT because group drop-ins are cheaper (Rp 100-150k
  // for a 75-minute group class vs Rp 200k+ for 1-on-1 PT). Monthly
  // unlimited is the premium retention tier in yoga (rare in PT).
  //   hourly_rate_idr = drop-in single-class price (most-quoted unit
  //     in Indonesia indie yoga; e.g. Rp 120,000 for a 75-minute
  //     group class). Column name kept to reuse the shared marketplace
  //     pill renderer, but the surface label reads "Drop-in from".
  //   day_rate_idr    = optional monthly unlimited bundle (e.g.
  //     unlimited classes + 1 private session bonus from Rp 1.5jt).
  //     Used when drop-in starter doesn't capture the full range.
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for yoga this means "Mat & props provided"
  // (yoga mat, blocks, bolsters, straps vs bring-your-own). Defaults
  // true since Indonesian indie yoga teachers/studios typically supply
  // mats for drop-in students, and home-visit privates carry a spare.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: YogaAvailability
  status: YogaStatus
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

export type YogaProviderPublic = Pick<
  YogaProvider,
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
