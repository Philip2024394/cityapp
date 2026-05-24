// Types for the massage marketplace. Keep in sync with the columns in
// 0047_massage_providers.sql until a generator is added.

export type MassageGender = 'woman' | 'man'

export type MassageAvailability = 'online' | 'busy' | 'offline'

export type MassageStatus = 'pending' | 'active' | 'suspended' | 'removed'

export type MassageSubscriptionStatus =
  | 'trial' | 'active' | 'expired' | 'cancelled'

export type MassageType =
  // Indonesian / Asian
  | 'balinese' | 'javanese' | 'lulur' | 'pijat_tradisional' | 'refleksi'
  | 'thai' | 'shiatsu' | 'tui_na'
  // Western
  | 'swedish' | 'deep_tissue' | 'sports' | 'aromatherapy' | 'hot_stone'
  | 'trigger_point' | 'lymphatic' | 'prenatal' | 'myofascial'
  // Catch-all
  | 'other'

// Grouped for the picker UI. Labels stay in plain English; "Pijat …"
// prefixes mark the Indonesian-tradition ones so therapists recognise
// them in the dropdown.
export const MASSAGE_TYPE_GROUPS: { group: string; items: { value: MassageType; label: string }[] }[] = [
  {
    group: 'Indonesian & Asian',
    items: [
      { value: 'balinese',         label: 'Pijat Bali (Balinese)' },
      { value: 'javanese',         label: 'Pijat Jawa (Javanese)' },
      { value: 'pijat_tradisional',label: 'Pijat Tradisional (Traditional Indonesian)' },
      { value: 'lulur',            label: 'Lulur (Body Scrub)' },
      { value: 'refleksi',         label: 'Refleksi (Reflexology)' },
      { value: 'thai',             label: 'Thai (Pijat Thailand)' },
      { value: 'shiatsu',          label: 'Shiatsu (Japanese)' },
      { value: 'tui_na',           label: 'Tui Na (Chinese)' },
    ],
  },
  {
    group: 'Western',
    items: [
      { value: 'swedish',       label: 'Swedish' },
      { value: 'deep_tissue',   label: 'Deep Tissue' },
      { value: 'sports',        label: 'Sports / Athletic' },
      { value: 'aromatherapy',  label: 'Aromatherapy' },
      { value: 'hot_stone',     label: 'Hot Stone' },
      { value: 'trigger_point', label: 'Trigger Point' },
      { value: 'lymphatic',     label: 'Lymphatic Drainage' },
      { value: 'prenatal',      label: 'Prenatal' },
      { value: 'myofascial',    label: 'Myofascial Release' },
    ],
  },
  {
    group: 'Other',
    items: [
      { value: 'other', label: 'Other / Custom' },
    ],
  },
]

export const MASSAGE_TYPE_LABELS: Record<MassageType, string> = Object.fromEntries(
  MASSAGE_TYPE_GROUPS.flatMap((g) => g.items.map((it) => [it.value, it.label]))
) as Record<MassageType, string>

// Short label for the card under-name slot — strips parenthetical so it
// fits next to the availability dot on a narrow card.
export const MASSAGE_TYPE_SHORT: Record<MassageType, string> = {
  balinese:          'Pijat Bali',
  javanese:          'Pijat Jawa',
  pijat_tradisional: 'Pijat Tradisional',
  lulur:             'Lulur',
  refleksi:          'Refleksi',
  thai:              'Thai',
  shiatsu:           'Shiatsu',
  tui_na:            'Tui Na',
  swedish:           'Swedish',
  deep_tissue:       'Deep Tissue',
  sports:            'Sports',
  aromatherapy:      'Aromatherapy',
  hot_stone:         'Hot Stone',
  trigger_point:     'Trigger Point',
  lymphatic:         'Lymphatic',
  prenatal:          'Prenatal',
  myofascial:        'Myofascial',
  other:             'Custom',
}

export interface MassageProvider {
  id: string
  user_id: string
  slug: string
  display_name: string

  gender: MassageGender
  years_experience: number
  bio: string
  massage_type: MassageType

  price_60min_idr: number
  price_90min_idr: number
  price_120min_idr: number

  city: string | null
  service_area_notes: string | null

  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: MassageAvailability
  status: MassageStatus
  verified_at: string | null
  verified_by: string | null
  rejected_reason: string | null

  subscription_status: MassageSubscriptionStatus
  trial_ends_at: string
  paid_until: string | null

  created_at: string
  updated_at: string
}

// Marketplace-safe subset — no KTP, no internal verifier ids.
// Rating fields are optional and will be wired to a reviews table in a
// later migration. For now demo cards carry mock values so the layout is
// visible; real providers render no rating until reviews ship.
export type MassageProviderPublic = Pick<
  MassageProvider,
  | 'slug' | 'display_name'
  | 'gender' | 'years_experience' | 'bio'
  | 'massage_type'
  | 'price_60min_idr' | 'price_90min_idr' | 'price_120min_idr'
  | 'city' | 'service_area_notes'
  | 'whatsapp_e164'
  | 'profile_image_url'
  | 'availability'
> & {
  rating?: number | null
  rating_count?: number | null
}

export const AVAILABILITY_LABELS: Record<MassageAvailability, string> = {
  online:  'Available now',
  busy:    'Busy',
  offline: 'Offline',
}

export const GENDER_LABELS: Record<MassageGender, string> = {
  woman: 'Wanita',
  man:   'Pria',
}
