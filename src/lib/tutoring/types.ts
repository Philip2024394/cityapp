export type TutoringAvailability = 'online' | 'busy' | 'offline'
export type TutoringStatus = 'pending' | 'active' | 'suspended' | 'removed'

// Tutoring "specialty" = the subject / exam-prep track the private
// tutor (les privat) offers. Indonesian indie tutors cluster around
// the academic core (math, physics, chemistry, biology) plus the two
// language anchors (english, bahasa) and the religious staple
// (mengaji — anak SD/SMP tartil + tajwid + hafalan juz 30). Coding
// + music round out the lifestyle wing. The two exam-prep tracks
// (UTBK/SBMPTN for masuk PTN and SAT/TOEFL/IELTS for abroad/Cambridge)
// are priced 2-3x higher than regular subjects so they're their own
// genre. cambridge_ib flags Cambridge curriculum / IB Diploma fluency
// for the international-school market. Buyers shortlist by subject +
// grade-level then read the bio for qualifikasi (S1/S2/S3,
// sertifikat, pengalaman tahun).
export type TutoringSpecialty =
  | 'math'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'english'
  | 'bahasa'
  | 'mengaji'
  | 'coding'
  | 'music'
  | 'sat_toefl_ielts'
  | 'utbk_sbmptn'
  | 'cambridge_ib'
  | 'mixed'
  | 'other'

// Labels — Indonesian les-privat vocab. Core academic subjects in
// Indonesian/English mix (Matematika / Fisika / Kimia / Biologi) the
// way Kurikulum Merdeka labels them; religious + language tracks in
// Indonesian (Mengaji, Bahasa Indonesia); exam prep keeps the
// recognised exam acronyms (UTBK SBMPTN, SAT TOEFL IELTS) because
// those are the searched terms.
export const SPECIALTY_LABELS: Record<TutoringSpecialty, string> = {
  math:             'Matematika',
  physics:          'Fisika',
  chemistry:        'Kimia',
  biology:          'Biologi',
  english:          'English · Conversation',
  bahasa:           'Bahasa Indonesia',
  mengaji:          'Mengaji · Tartil',
  coding:           'Coding · Programming',
  music:            'Musik · Instrumen',
  sat_toefl_ielts:  'SAT · TOEFL · IELTS',
  utbk_sbmptn:      'UTBK · SBMPTN',
  cambridge_ib:     'Cambridge · IB',
  mixed:            'Mixed Subjects',
  other:            'Lainnya',
}

// Short chip labels — shown on cards (max 3 per tutor).
export const SPECIALTY_SHORT: Record<TutoringSpecialty, string> = {
  math:             'Matematika',
  physics:          'Fisika',
  chemistry:        'Kimia',
  biology:          'Biologi',
  english:          'English',
  bahasa:           'Bahasa',
  mengaji:          'Mengaji',
  coding:           'Coding',
  music:            'Musik',
  sat_toefl_ielts:  'SAT/TOEFL',
  utbk_sbmptn:      'UTBK',
  cambridge_ib:     'Cambridge',
  mixed:            'Mixed',
  other:            'Lainnya',
}

export const ALL_SPECIALTIES: TutoringSpecialty[] = [
  'math','physics','chemistry','biology',
  'english','bahasa','mengaji',
  'coding','music',
  'utbk_sbmptn','sat_toefl_ielts','cambridge_ib',
  'other','mixed',
]

// UX-enforced cap on a single tutor's specialty count. DB CHECK also
// enforces max 3 — keeps profile cards scannable.
export const MAX_TUTORING_SPECIALTIES = 3

export interface TutoringProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: TutoringSpecialty[]
  // Pricing — tutoring convention is PER-PERTEMUAN (per-session) with
  // package discounts (e.g. "Per-sesi Rp 120k; paket 12x Rp 1.32jt =
  // Rp 110k/sesi"). Clients buy COMMITMENT PACKAGES for exam prep
  // (UTBK / SAT) and per-session for routine subjects. Local rates:
  //   • SD math:               Rp 80k/jam (floor — anak SD)
  //   • SMP math/physics:      Rp 100k/jam
  //   • SMA math/physics:      Rp 120-150k/jam
  //   • UTBK/SBMPTN prep:      Rp 200-300k/jam (premium exam track)
  //   • English conversation:  Rp 150k/jam
  //   • Mengaji anak SD-SMP:   Rp 80k per pertemuan 45-60 menit
  // Datang ke rumah (home-visit) typically + Rp 20-30k surcharge over
  // online; online via Zoom is the cheap baseline.
  //   hourly_rate_idr = per-pertemuan single-session price (the unit
  //     Indonesian parents/students quote; e.g. Rp 120,000 for a
  //     90-minute SMA math session). Column name kept to reuse the
  //     shared marketplace pill renderer, but surface label reads
  //     "Per pertemuan from".
  //   day_rate_idr    = optional package bundle (e.g. paket 8x or
  //     12x meetings, monthly intensive — Rp 2.2jt for UTBK 12x).
  //     Used when per-session price doesn't capture the full range
  //     (intensive exam prep, paket bulanan).
  // CHECK enforces at least one is set.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  // Repurposed boolean — for tutoring this means "Datang ke rumah"
  // (home-visit available vs online/studio only). Defaults true
  // because Indonesian indie tutors typically offer home-visit
  // (datang ke rumah) as the premium option, with online via Zoom as
  // the cheaper alternative.
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: TutoringAvailability
  status: TutoringStatus
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

export type TutoringProviderPublic = Pick<
  TutoringProvider,
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
