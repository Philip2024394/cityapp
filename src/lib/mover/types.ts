export type MoverAvailability = 'online' | 'busy' | 'offline'
export type MoverStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Mover "specialty" = the vehicle tier + service type axis the
// independent moving / jasa pindahan operator offers. Indonesian indie
// moving businesses cluster around two axes:
//   1. VEHICLE TIER — grandmax (cheapest, ~3m³, single furniture +
//      kost-an pindahan), pickup (open-bak, ~3m³, antar kota cargo),
//      box (closed CDD/Box, ~6-12m³, pindahan rumah penuh weather-
//      protected), cdd (Colt Diesel Double, ~12m³, full-house +
//      antar provinsi), wing (Wing Box, ~15-20m³, large office
//      relocation), tronton (~25m³+, factory / heavy machinery).
//      Buyer's primary axis — vehicle capacity drives the price floor.
//   2. SERVICE TYPE — home_small (kost / 1-2 room move), home_full
//      (pindahan rumah penuh, 2-crew + survey), office_relocation
//      (kantor / co-working, weekend night-shift), single_furniture
//      (1 item: lemari/sofa/kasur, driver bantu loading),
//      heavy_lifting (driver-only for muscle, no transport),
//      packing_service (kardus + bubble wrap + wrapping include),
//      insurance (asuransi all-risk barang dalam perjalanan).
// Buyers shortlist by vehicle + service then sort by per-trip pricing
// (the second axis — see hourly_rate_idr docs below).
export type MoverSpecialty =
  | 'grandmax'
  | 'pickup'
  | 'box'
  | 'cdd'
  | 'wing'
  | 'tronton'
  | 'home_small'
  | 'home_full'
  | 'office_relocation'
  | 'single_furniture'
  | 'heavy_lifting'
  | 'packing_service'
  | 'insurance'
  | 'mixed'
  | 'other'

// Labels — Indonesian moving / jasa pindahan vocab. Vehicle tier names
// stay in Indonesian (Grandmax / Pickup / Box CDD / Wing / Tronton)
// because that's how Indonesian pemilik UKM + ibu rumah tangga search.
// Service types mix Indonesian (Pindahan, Antar Kota, Kantor) and
// English (Packing, Insurance) the way local mover Instagram bios
// already write them.
export const SPECIALTY_LABELS: Record<MoverSpecialty, string> = {
  grandmax:           'Grandmax · Dalam Kota',
  pickup:             'Pickup · Antar Kota',
  box:                'Box CDD · Rumah Penuh',
  cdd:                'CDD · Antar Provinsi',
  wing:               'Wing Box · Kantor',
  tronton:            'Tronton · Cargo Besar',
  home_small:         'Pindahan Kost / Studio',
  home_full:          'Pindahan Rumah Penuh',
  office_relocation:  'Relokasi Kantor',
  single_furniture:   'Single Furniture · 1 Barang',
  heavy_lifting:      'Heavy Lifting · Tenaga Saja',
  packing_service:    'Packing Material · Bubble Wrap',
  insurance:          'Asuransi All-Risk',
  mixed:              'Mixed Services',
  other:              'Lainnya',
}

// Short chip labels — shown on cards (max 3 per mover).
export const SPECIALTY_SHORT: Record<MoverSpecialty, string> = {
  grandmax:           'Grandmax',
  pickup:             'Pickup',
  box:                'Box CDD',
  cdd:                'CDD',
  wing:               'Wing',
  tronton:            'Tronton',
  home_small:         'Kost / Studio',
  home_full:          'Rumah Penuh',
  office_relocation:  'Kantor',
  single_furniture:   'Single',
  heavy_lifting:      'Heavy Lift',
  packing_service:    'Packing',
  insurance:          'Asuransi',
  mixed:              'Mixed',
  other:              'Lainnya',
}

export const ALL_SPECIALTIES: MoverSpecialty[] = [
  'grandmax','pickup','box','cdd','wing','tronton',
  'home_small','home_full','office_relocation','single_furniture',
  'heavy_lifting','packing_service','insurance',
  'other','mixed',
]

// UX-enforced cap on a single mover's specialty count. DB CHECK also
// enforces max 3 — keeps profile cards scannable.
export const MAX_MOVER_SPECIALTIES = 3

export interface MoverProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: MoverSpecialty[]
  // Pricing — moving has THREE axes:
  //   1. VEHICLE TIER (Grandmax cheapest → Pickup → Box → CDD → Wing →
  //      Tronton most expensive — capacity drives base fare).
  //   2. DISTANCE (dalam kota base + Rp/km after first 10km; antar
  //      kota fixed-route quoted; antar provinsi survey first).
  //   3. CREW SIZE (driver-only / +1 helper / +2 crew — each helper
  //      adds Rp 100-150k for full house move).
  // Local rates (Yogya / Bandung / Jakarta indie mover, 2026):
  //   • Grandmax dalam kota base:           Rp 350k   (10km, driver+1)
  //   • Pickup antar kota Yogya-Solo:       Rp 850k   (driver+1, ~100km)
  //   • Box CDD pindahan rumah penuh:       Rp 2.5jt  (2 crew, survey, packing)
  //   • CDD antar provinsi Yogya-Jakarta:   Rp 4-6jt  (survey first)
  //   • Wing kantor weekend night:          Rp 3-5jt  (2-3 crew, weekend surcharge)
  //   • Single furniture pickup-drop:       Rp 180k   (floor — sofa/kasur/lemari dalam kota)
  // Packing material add-on: +Rp 150-300k (kardus + bubble wrap + wrapping).
  // Asuransi all-risk: +1-2% nilai barang.
  // Stairs/lift surcharge: +Rp 50-100k per lantai above 2nd floor (no lift).
  //   hourly_rate_idr = anchor "starting from" price (cheapest tier
  //     the business offers; e.g. Rp 350k Grandmax dalam kota base).
  //     Column name kept to reuse the shared marketplace pill renderer,
  //     but surface label reads "Mulai dari".
  //   day_rate_idr    = optional "pindahan rumah penuh paket" all-in
  //     rate (e.g. Rp 2.5jt Box CDD + 2 crew + packing + survey).
  //     Used when the mover quotes a flat package vs base + extras.
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for mover this means "Antar Provinsi" (siap
  // interstate cross-Java / cross-island vs dalam kota only).
  // Defaults true because most indie movers advertise antar kota +
  // antar provinsi as their main differentiator vs walk-in pet shop
  // chains.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: MoverAvailability
  status: MoverStatus
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

export type MoverProviderPublic = Pick<
  MoverProvider,
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
