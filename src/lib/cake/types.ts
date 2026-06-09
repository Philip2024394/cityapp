export type CakeAvailability = 'online' | 'busy' | 'offline'
export type CakeStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Cake "specialty" = the product category / format the bakery covers.
// Indonesian independent cake makers cluster around birthday cake
// custom, the viral Korean bento (lunchbox-mini) format, wedding tiers,
// dessert-table set-ups for events, and box-style hampers (cookies /
// brownies / cupcake) for Lebaran / arisan / corporate gifting. Halal
// is a first-class tag because every Lebaran / arisan order screens
// for it. ready_stock / custom_3d differentiate stock-now vs made-to-
// order pricing.
export type CakeSpecialty =
  | 'birthday'
  | 'wedding'
  | 'korean_bento'
  | 'cupcake'
  | 'cookies'
  | 'brownies'
  | 'pastry'
  | 'dessert_table'
  | 'custom_3d'
  | 'ready_stock'
  | 'halal'
  | 'mixed'
  | 'other'

// Labels — Indonesian cake-trade vocab. Mix of Indonesian event terms
// (birthday / wedding / dessert table) with format origins (Korean
// bento, custom 3D). Halal tagged explicitly because clients screen
// for it.
export const SPECIALTY_LABELS: Record<CakeSpecialty, string> = {
  birthday:       'Birthday Cake',
  wedding:        'Wedding Cake',
  korean_bento:   'Korean Bento',
  cupcake:        'Cupcake',
  cookies:        'Cookies · Hampers',
  brownies:       'Brownies',
  pastry:         'Pastry · Croissant',
  dessert_table:  'Dessert Table',
  custom_3d:      'Custom 3D · Figurine',
  ready_stock:    'Ready Stock',
  halal:          'Halal Sertifikat',
  mixed:          'Mixed menu',
  other:          'Lainnya',
}

// Short chip labels — shown on cards (max 3 per bakery).
export const SPECIALTY_SHORT: Record<CakeSpecialty, string> = {
  birthday:       'Birthday',
  wedding:        'Wedding',
  korean_bento:   'Bento',
  cupcake:        'Cupcake',
  cookies:        'Cookies',
  brownies:       'Brownies',
  pastry:         'Pastry',
  dessert_table:  'Dessert',
  custom_3d:      '3D Custom',
  ready_stock:    'Ready',
  halal:          'Halal',
  mixed:          'Mixed',
  other:          'Lainnya',
}

export const ALL_SPECIALTIES: CakeSpecialty[] = [
  'birthday','wedding','korean_bento','cupcake','cookies','brownies',
  'pastry','dessert_table','custom_3d','ready_stock','halal',
  'other','mixed',
]

// UX-enforced cap on a single bakery's specialty count. DB CHECK
// also enforces max 3 — keeps profile cards scannable.
export const MAX_CAKE_SPECIALTIES = 3

export interface CakeProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: CakeSpecialty[]
  // Pricing — cake convention is PER-CAKE (per-unit) with a minimum
  // order count for box products (e.g. "Rp 350,000/cake 1kg birthday",
  // "Rp 95,000/box minimum 5 box for cookies"). Distinct from
  // catering's per-pax (Rp 35k/pax) or photo's per-package.
  //   hourly_rate_idr = "starting from" per-cake price (most-quoted
  //     unit in Indonesia indie bakery; e.g. Rp 95,000 Korean bento
  //     mini, Rp 350,000 round 1kg birthday). Column name kept to
  //     reuse the shared marketplace pill renderer, but the surface
  //     label reads "Per-cake from".
  //   day_rate_idr    = optional dessert-table / custom 3-tier wedding
  //     bundle (e.g. Dessert Table 30-pax Rp 1.5jt, Wedding 3-tier
  //     from Rp 4.5jt). Used when per-cake doesn't apply (bundles
  //     are quoted as a whole-package number, not per-unit).
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for cake this means "Delivery dalam kota"
  // (free in-city drop-off vs pickup-only studio). Defaults true
  // since Indonesian indie bakers almost always deliver finished
  // cakes by ojek / car (fragility + cold-chain make interstate
  // shipping rare).
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: CakeAvailability
  status: CakeStatus
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

export type CakeProviderPublic = Pick<
  CakeProvider,
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
