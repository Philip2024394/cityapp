export type HandymanAvailability = 'online' | 'busy' | 'offline'
export type HandymanStatus = 'pending' | 'active' | 'suspended' | 'removed'

export type HandymanSpecialty =
  | 'electrical' | 'plumbing' | 'ac_service' | 'ac_install'
  | 'carpentry'  | 'painting' | 'general_repair'
  | 'furniture_assembly' | 'appliance_repair'
  | 'roof_repair' | 'tiling' | 'welding' | 'locksmith' | 'gardening'
  | 'ceiling_gypsum' | 'water_pump' | 'water_heater'
  | 'cctv_antenna'   | 'aluminum'   | 'well_drilling'
  | 'pest_control'   | 'canopy'     | 'glass_window' | 'wallpaper'
  | 'other'

// Bahasa-first labels — tukang search by Indonesian terms in real life.
export const SPECIALTY_LABELS: Record<HandymanSpecialty, string> = {
  electrical:         'Tukang Listrik',
  plumbing:           'Tukang Pipa · Plumbing',
  ac_service:         'AC Service',
  ac_install:         'AC Pasang',
  carpentry:          'Tukang Kayu',
  painting:           'Tukang Cat',
  general_repair:     'Tukang Serabutan',
  furniture_assembly: 'Pasang Furniture (IKEA, Informa)',
  appliance_repair:   'Service Alat (Kulkas, Mesin Cuci)',
  roof_repair:        'Tukang Atap · Bocor',
  tiling:             'Tukang Keramik',
  welding:            'Tukang Las',
  locksmith:          'Tukang Kunci',
  gardening:          'Tukang Kebun · Taman',
  ceiling_gypsum:     'Tukang Plafon · Gypsum',
  water_pump:         'Service Pompa Air',
  water_heater:       'Service Water Heater',
  cctv_antenna:       'Pasang CCTV · Antena',
  aluminum:           'Tukang Aluminium · Jendela',
  well_drilling:      'Sumur Bor',
  pest_control:       'Anti Rayap · Hama',
  canopy:             'Pasang Kanopi',
  glass_window:       'Tukang Kaca',
  wallpaper:          'Pasang Wallpaper',
  other:              'Lainnya',
}

// Short chip labels — shown on cards (max 3 per provider).
export const SPECIALTY_SHORT: Record<HandymanSpecialty, string> = {
  electrical:         'Listrik',
  plumbing:           'Plumbing',
  ac_service:         'AC Service',
  ac_install:         'AC Pasang',
  carpentry:          'Kayu',
  painting:           'Cat',
  general_repair:     'Serabutan',
  furniture_assembly: 'Furniture',
  appliance_repair:   'Appliance',
  roof_repair:        'Atap',
  tiling:             'Keramik',
  welding:            'Las',
  locksmith:          'Kunci',
  gardening:          'Kebun',
  ceiling_gypsum:     'Plafon',
  water_pump:         'Pompa Air',
  water_heater:       'Water Heater',
  cctv_antenna:       'CCTV',
  aluminum:           'Aluminium',
  well_drilling:      'Sumur Bor',
  pest_control:       'Anti Rayap',
  canopy:             'Kanopi',
  glass_window:       'Kaca',
  wallpaper:          'Wallpaper',
  other:              'Lainnya',
}

export const ALL_SPECIALTIES: HandymanSpecialty[] = [
  'electrical','plumbing','ac_service','ac_install',
  'carpentry','painting','general_repair',
  'furniture_assembly','appliance_repair',
  'roof_repair','tiling','welding','locksmith','gardening',
  'ceiling_gypsum','water_pump','water_heater',
  'cctv_antenna','aluminum','well_drilling',
  'pest_control','canopy','glass_window','wallpaper',
  'other',
]

// UX-enforced cap on a single tukang's specialty count. DB also enforces
// via a CHECK (see migration 0061) so the UI rule can't be bypassed.
export const MAX_HANDYMAN_SPECIALTIES = 3

export interface HandymanProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  years_experience: number
  bio: string

  specialties: HandymanSpecialty[]
  // Pricing — hour and/or day only (visit fee dropped in mig 0062).
  // CHECK enforces at least one is set. Day = 8 working hours.
  hourly_rate_idr: number | null
  day_rate_idr: number | null
  has_own_tools: boolean

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: HandymanAvailability
  status: HandymanStatus
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

export type HandymanProviderPublic = Pick<
  HandymanProvider,
  | 'slug' | 'display_name'
  | 'years_experience' | 'bio'
  | 'specialties'
  | 'hourly_rate_idr' | 'day_rate_idr' | 'has_own_tools'
  | 'city' | 'service_area_notes'
  | 'whatsapp_e164'
  | 'profile_image_url'
  | 'availability'
> & { is_mock?: boolean; rating?: number | null }
