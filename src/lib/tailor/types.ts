export type TailorAvailability = 'online' | 'busy' | 'offline'
export type TailorStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Tailor "specialty" = the GARMENT TYPE axis the independent
// tailor / penjahit / custom-clothing studio offers. Indonesian indie
// penjahit cluster around two axes:
//   1. GARMENT TYPE — kemeja (men's shirt), jas (suit / blazer set),
//      kebaya (bridal + party traditional), batik (cap / tulis blouse),
//      gaun (evening / cocktail dress), seragam (corporate / school
//      uniform), streetwear (hoodie / oversized), vermak (alteration /
//      pendekan / ganti resleting), dress (party / casual), blazer
//      (single piece), celana_bahan (men's trousers), muslim_wear
//      (gamis / koko / hijab), bridal (full wedding package).
//   2. FABRIC SUPPLY — every garment may be ordered "bahan dari
//      customer" (customer-provides) vs "bahan dari kami" (stock).
//      Surfaced as a per-photo flag on service_photos, not a top-level
//      specialty chip — buyers still shortlist by garment first.
// Buyers shortlist by garment then sort by per-garment pricing
// (the second axis — see hourly_rate_idr docs below).
export type TailorSpecialty =
  | 'kemeja'
  | 'jas'
  | 'kebaya'
  | 'batik'
  | 'gaun'
  | 'seragam'
  | 'streetwear'
  | 'vermak'
  | 'dress'
  | 'blazer'
  | 'celana_bahan'
  | 'muslim_wear'
  | 'bridal'
  | 'mixed'
  | 'other'

// Labels — Indonesian tailoring vocab. Garment names stay in Indonesian
// (Kemeja / Jas / Kebaya / Batik / Seragam) because that's how Indonesian
// pemilik UKM + calon pengantin search. English mix-ins (Streetwear,
// Bridal) follow how local penjahit Instagram bios already write them.
export const SPECIALTY_LABELS: Record<TailorSpecialty, string> = {
  kemeja:        'Kemeja · Pria & Wanita',
  jas:           'Jas · 2-Piece Custom',
  kebaya:        'Kebaya · Bridal & Pesta',
  batik:         'Batik · Cap & Tulis',
  gaun:          'Gaun · Pesta & Cocktail',
  seragam:       'Seragam · Kantor & Sekolah',
  streetwear:    'Streetwear · Hoodie & Oversize',
  vermak:        'Vermak · Alteration',
  dress:         'Dress · Party & Casual',
  blazer:        'Blazer · Single Piece',
  celana_bahan:  'Celana Bahan · Pria',
  muslim_wear:   'Muslim Wear · Gamis & Koko',
  bridal:        'Bridal · Full Package',
  mixed:         'Mixed Garments',
  other:         'Lainnya',
}

// Short chip labels — shown on cards (max 3 per tailor).
export const SPECIALTY_SHORT: Record<TailorSpecialty, string> = {
  kemeja:        'Kemeja',
  jas:           'Jas',
  kebaya:        'Kebaya',
  batik:         'Batik',
  gaun:          'Gaun',
  seragam:       'Seragam',
  streetwear:    'Streetwear',
  vermak:        'Vermak',
  dress:         'Dress',
  blazer:        'Blazer',
  celana_bahan:  'Celana',
  muslim_wear:   'Muslim',
  bridal:        'Bridal',
  mixed:         'Mixed',
  other:         'Lainnya',
}

export const ALL_SPECIALTIES: TailorSpecialty[] = [
  'kemeja','jas','kebaya','batik','gaun','seragam','streetwear',
  'vermak','dress','blazer','celana_bahan','muslim_wear','bridal',
  'other','mixed',
]

// UX-enforced cap on a single tailor's specialty count. DB CHECK also
// enforces max 3 — keeps profile cards scannable.
export const MAX_TAILOR_SPECIALTIES = 3

export interface TailorProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: TailorSpecialty[]
  // Pricing — tailoring has TWO axes:
  //   1. GARMENT TYPE (vermak/alteration cheapest → kemeja → celana
  //      bahan → seragam → dress → jas → kebaya → bridal most expensive).
  //   2. FABRIC SUPPLY ("bahan dari customer" vs "bahan dari kami" —
  //      adding fabric typically doubles the price; e.g. jas tanpa
  //      bahan Rp 800k vs jas + bahan Rp 1.5jt).
  // Local rates (Yogya / Bandung / Jakarta indie penjahit, 2026):
  //   • Vermak / alteration floor:           Rp 25k    (pendekan celana / resleting)
  //   • Kemeja custom tanpa bahan:           Rp 150-250k (lead time 1-2 minggu)
  //   • Celana bahan tanpa bahan:            Rp 200-300k
  //   • Seragam kantor (kemeja kerah):       Rp 200k/pcs (min 12 pcs)
  //   • Gaun pesta tanpa bahan:              Rp 600k-1.2jt
  //   • Jas pria 2-piece tanpa bahan:        Rp 800k-1.5jt (2x fitting, lead time 2 minggu)
  //   • Jas pria 2-piece + bahan:            Rp 1.5jt-3jt
  //   • Kebaya pesta:                        Rp 800k-2jt
  //   • Kebaya bridal premium full payet:    Rp 3.5jt-15jt (3x fitting, 4-6 minggu)
  // Hand-finish surcharge: payet hand-made +30-50% baseline.
  // Bahan dari kami add-on: typically +Rp 200k-1jt depending on fabric
  // tier (poly cotton vs brokat import vs sutra).
  //   hourly_rate_idr = anchor "starting from" price (cheapest line
  //     the tailor offers; e.g. Rp 25k vermak alteration floor).
  //     Column name kept to reuse the shared marketplace pill renderer,
  //     but surface label reads "Mulai dari".
  //   day_rate_idr    = optional "paket bridal / paket seragam" all-in
  //     rate (e.g. Rp 3.5jt kebaya bridal premium include payet + 3
  //     fitting + lead time 4-6 minggu). Used when the tailor quotes a
  //     flat package vs base + extras.
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for tailor this means "Datang ke Rumah" (siap
  // home-visit for measurement vs studio-visit only). Defaults true
  // since most indie penjahit advertise home-visit measurement +
  // fitting as their main differentiator vs walk-in mall tailor chains.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: TailorAvailability
  status: TailorStatus
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

export type TailorProviderPublic = Pick<
  TailorProvider,
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
