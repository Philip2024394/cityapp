// ============================================================================
// CATEGORY_CONFIGS — drives the shared ProviderDashboard component
// ----------------------------------------------------------------------------
// Every category mounts the same dashboard UI; only the config swaps. The
// config maps logical-field-name → real-column-name per category, supplies
// the services dropdown catalogue, and declares the pricing-tile shape.
// Adding a new category means adding an entry here, not duplicating UI.
//
// Synthesized 2026-05-29 from the per-category research pass (see thread).
// ============================================================================

export type CategoryId =
  | 'beautician'
  | 'places'
  | 'massage'
  | 'laundry'
  | 'handyman'
  | 'home-clean'
  | 'tour'
  | 'rent'
  | 'property'           // generic — used by the /property browse view
  | 'property-sale'      // dashboard variant
  | 'property-rent'      // dashboard variant
  | 'property-builder'   // dashboard variant — new_construction

export type ServiceOption = {
  id:       string
  label_id: string   // Bahasa
  label_en: string   // English
}

export type PricingField = {
  column: string
  label:  string
  unit:   'flat' | 'per_kg' | 'per_hour' | 'per_day' | 'per_sqm' | 'per_pair' | 'per_session'
  /** Show only when the listing_type (or other discriminator) matches. */
  showWhen?: Record<string, string | string[]>
}

export type CategoryConfig = {
  category:           CategoryId
  table:              string
  apiBase:            string             // e.g. '/api/beautician/me'
  publicProfilePath:  string             // e.g. '/beautician/'  -> /beautician/<slug>
  dashboardBase:      string             // e.g. '/dashboard/beautician'
  display: {
    title_id: string                     // Bahasa header
    title_en: string                     // English header
  }
  /** Maps canonical field names to the column actually used by this table. */
  fields: {
    displayName:     string              // 'display_name' | 'name'
    bio:             string              // 'bio' | 'description'
    gallery:         string              // 'gallery_image_urls' | 'image_urls'
    coverImage:      string              // 'cover_image_url'
    profileImage:    string              // 'profile_image_url'
    operatingHours:  string              // 'operating_hours' | 'hours_json'
    latitude:        string              // 'latitude' | 'lat'
    longitude:       string              // 'longitude' | 'lng'
    heroText:        string              // 'hero_text'
    promoText:       string              // 'promo_text'
    themeColor:      string              // 'theme_color'
    businessName:    string              // 'business_name' | fallback to displayName
    servicePhotos:   string | null       // null for tables without service_photos
    /** Shape of service_photos jsonb. 'object' = keyed by service id (beautician/home_clean/places/massage),
     *  'array' = flat list of photo objects (handyman). null for tables that have no service_photos column. */
    servicePhotosShape: 'object' | 'array' | null
  }
  services: {
    column:          string              // text[] column or single-text-with-CHECK
    type:            'multi' | 'single'
    label_id:        string
    label_en:        string
    options:         ServiceOption[]
    maxSelected?:    number              // for multi
  }
  pricing: PricingField[]
  /** A small extra catalogue when needed (e.g. property listing_type discriminator). */
  discriminator?: {
    column:   string
    label_id: string
    label_en: string
    options:  ServiceOption[]
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Catalogues (sourced from the per-category brainstorm pass, mig 0073/0124/
// 0125, src/data/tourServices.ts, src/lib/handyman/types.ts).
// ───────────────────────────────────────────────────────────────────────────

const BEAUTICIAN_OPTIONS: ServiceOption[] = [
  { id: 'makeup',           label_id: 'Make Up',          label_en: 'Make Up'          },
  { id: 'nails',            label_id: 'Nail Art',         label_en: 'Nails'            },
  { id: 'hair',             label_id: 'Rambut',           label_en: 'Hair'             },
  { id: 'skin',             label_id: 'Perawatan Kulit',  label_en: 'Skin'             },
  { id: 'lashes',           label_id: 'Bulu Mata',        label_en: 'Lashes'           },
  { id: 'brows',            label_id: 'Alis',             label_en: 'Brows'            },
  { id: 'waxing',           label_id: 'Waxing',           label_en: 'Waxing'           },
  { id: 'facial',           label_id: 'Facial',           label_en: 'Facial'           },
  { id: 'massage',          label_id: 'Pijat',            label_en: 'Massage'          },
  { id: 'henna',            label_id: 'Henna',            label_en: 'Henna'            },
  { id: 'bridal',           label_id: 'Bridal',           label_en: 'Bridal'           },
  { id: 'spa',              label_id: 'Spa',              label_en: 'Spa'              },
  { id: 'whitening',        label_id: 'Whitening',        label_en: 'Whitening'        },
  { id: 'microblading',     label_id: 'Microblading',     label_en: 'Microblading'     },
  { id: 'smoothing',        label_id: 'Smoothing',        label_en: 'Smoothing'        },
  { id: 'permanent_makeup', label_id: 'Permanent Makeup', label_en: 'Permanent Makeup' },
]

const MASSAGE_OPTIONS: ServiceOption[] = [
  { id: 'balinese',          label_id: 'Pijat Bali',         label_en: 'Balinese'        },
  { id: 'javanese',          label_id: 'Pijat Jawa',         label_en: 'Javanese'        },
  { id: 'lulur',             label_id: 'Lulur',              label_en: 'Lulur Scrub'     },
  { id: 'pijat_tradisional', label_id: 'Pijat Tradisional',  label_en: 'Traditional'     },
  { id: 'refleksi',          label_id: 'Refleksi',           label_en: 'Reflexology'     },
  { id: 'thai',              label_id: 'Thai',               label_en: 'Thai'            },
  { id: 'shiatsu',           label_id: 'Shiatsu',            label_en: 'Shiatsu'         },
  { id: 'tui_na',            label_id: 'Tui Na',             label_en: 'Tui Na'          },
  { id: 'swedish',           label_id: 'Swedish',            label_en: 'Swedish'         },
  { id: 'deep_tissue',       label_id: 'Deep Tissue',        label_en: 'Deep Tissue'     },
  { id: 'sports',            label_id: 'Sports',             label_en: 'Sports'          },
  { id: 'aromatherapy',      label_id: 'Aromaterapi',        label_en: 'Aromatherapy'    },
  { id: 'hot_stone',         label_id: 'Batu Panas',         label_en: 'Hot Stone'       },
  { id: 'trigger_point',     label_id: 'Trigger Point',      label_en: 'Trigger Point'   },
  { id: 'lymphatic',         label_id: 'Limfatik',           label_en: 'Lymphatic'       },
  { id: 'prenatal',          label_id: 'Prenatal',           label_en: 'Prenatal'        },
  { id: 'myofascial',        label_id: 'Myofascial',         label_en: 'Myofascial'      },
  { id: 'cupping',           label_id: 'Bekam',              label_en: 'Cupping'         },
  { id: 'couples',           label_id: 'Pijat Pasangan',     label_en: 'Couples'         },
  { id: 'gua_sha',           label_id: 'Gua Sha',            label_en: 'Gua Sha'         },
  { id: 'other',             label_id: 'Lainnya',            label_en: 'Other'           },
]

const LAUNDRY_OPTIONS: ServiceOption[] = [
  { id: 'wash',       label_id: 'Cuci',                  label_en: 'Wash Only'        },
  { id: 'wash_dry',   label_id: 'Cuci + Jemur',          label_en: 'Wash + Dry'       },
  { id: 'wash_iron',  label_id: 'Cuci + Jemur + Setrika',label_en: 'Wash + Dry + Iron'},
]

const HANDYMAN_OPTIONS: ServiceOption[] = [
  { id: 'electrical',         label_id: 'Tukang Listrik',                  label_en: 'Electrical'         },
  { id: 'plumbing',           label_id: 'Tukang Pipa',                     label_en: 'Plumbing'           },
  { id: 'ac_service',         label_id: 'AC Service',                      label_en: 'AC Service'         },
  { id: 'ac_install',         label_id: 'AC Pasang',                       label_en: 'AC Install'         },
  { id: 'carpentry',          label_id: 'Tukang Kayu',                     label_en: 'Carpentry'          },
  { id: 'painting',           label_id: 'Tukang Cat',                      label_en: 'Painting'           },
  { id: 'general_repair',     label_id: 'Tukang Serabutan',                label_en: 'General Repair'     },
  { id: 'furniture_assembly', label_id: 'Pasang Furniture',                label_en: 'Furniture Assembly' },
  { id: 'appliance_repair',   label_id: 'Service Alat',                    label_en: 'Appliance Repair'   },
  { id: 'roof_repair',        label_id: 'Tukang Atap',                     label_en: 'Roof Repair'        },
  { id: 'tiling',             label_id: 'Tukang Keramik',                  label_en: 'Tiling'             },
  { id: 'welding',            label_id: 'Tukang Las',                      label_en: 'Welding'            },
  { id: 'locksmith',          label_id: 'Tukang Kunci',                    label_en: 'Locksmith'          },
  { id: 'gardening',          label_id: 'Tukang Kebun',                    label_en: 'Gardening'          },
  { id: 'ceiling_gypsum',     label_id: 'Tukang Plafon',                   label_en: 'Ceiling Gypsum'     },
  { id: 'water_pump',         label_id: 'Service Pompa Air',               label_en: 'Water Pump'         },
  { id: 'water_heater',       label_id: 'Service Water Heater',            label_en: 'Water Heater'       },
  { id: 'cctv_antenna',       label_id: 'Pasang CCTV',                     label_en: 'CCTV / Antenna'     },
  { id: 'aluminum',           label_id: 'Tukang Aluminium',                label_en: 'Aluminum / Window'  },
  { id: 'well_drilling',      label_id: 'Sumur Bor',                       label_en: 'Well Drilling'      },
  { id: 'pest_control',       label_id: 'Anti Rayap',                      label_en: 'Pest Control'       },
  { id: 'canopy',             label_id: 'Pasang Kanopi',                   label_en: 'Canopy'             },
  { id: 'glass_window',       label_id: 'Tukang Kaca',                     label_en: 'Glass / Window'     },
  { id: 'wallpaper',          label_id: 'Pasang Wallpaper',                label_en: 'Wallpaper'          },
  { id: 'waterproofing',      label_id: 'Tukang Kedap Air',                label_en: 'Waterproofing'      },
  { id: 'septic_tank',        label_id: 'Service Septik',                  label_en: 'Septic Tank'        },
  { id: 'solar_panel',        label_id: 'Pasang Panel Surya',              label_en: 'Solar Panel'        },
  { id: 'smart_home',         label_id: 'Teknisi Smart Home',              label_en: 'Smart Home'         },
  { id: 'mosquito_net',       label_id: 'Pasang Kawat Nyamuk',             label_en: 'Mosquito Net'       },
  { id: 'other',              label_id: 'Lainnya',                         label_en: 'Other'              },
]

const HOME_CLEAN_OPTIONS: ServiceOption[] = [
  { id: 'regular_clean',     label_id: 'Bersih Rutin',         label_en: 'Regular Clean'   },
  { id: 'deep_clean',        label_id: 'Bersih Dalam',         label_en: 'Deep Clean'      },
  { id: 'move_in_out',       label_id: 'Bersih Pindahan',      label_en: 'Move In / Out'   },
  { id: 'post_construction', label_id: 'Pasca Renovasi',       label_en: 'Post-Construction'},
  { id: 'sofa_carpet',       label_id: 'Sofa & Karpet',        label_en: 'Sofa & Carpet'   },
]

const TOUR_OPTIONS: ServiceOption[] = [
  { id: 'temples',            label_id: 'Candi',                 label_en: 'Temples'            },
  { id: 'beaches',            label_id: 'Pantai',                label_en: 'Beaches'            },
  { id: 'landmarks',          label_id: 'Landmark',              label_en: 'Landmarks'          },
  { id: 'city_center',        label_id: 'Pusat Kota',            label_en: 'City Tour'          },
  { id: 'mountain',           label_id: 'Gunung',                label_en: 'Mountain'           },
  { id: 'volcano',            label_id: 'Gunung Berapi',         label_en: 'Volcano'            },
  { id: 'jungle',             label_id: 'Hutan',                 label_en: 'Jungle'             },
  { id: 'village',            label_id: 'Desa',                  label_en: 'Village'            },
  { id: 'rice_paddy',         label_id: 'Sawah',                 label_en: 'Rice Paddy'         },
  { id: 'cave',               label_id: 'Gua',                   label_en: 'Cave'               },
  { id: 'waterfall',          label_id: 'Air Terjun',            label_en: 'Waterfall'          },
  { id: 'coffee_plantation',  label_id: 'Kebun Kopi',            label_en: 'Coffee Plantation'  },
  { id: 'handy_crafts',       label_id: 'Kerajinan',             label_en: 'Handicrafts'        },
  { id: 'batik_workshop',     label_id: 'Workshop Batik',        label_en: 'Batik Workshop'     },
  { id: 'food_tour',          label_id: 'Wisata Kuliner',        label_en: 'Food Tour'          },
  { id: 'cultural_ceremony',  label_id: 'Upacara Adat',          label_en: 'Cultural Ceremony'  },
  { id: 'snorkeling',         label_id: 'Snorkeling',            label_en: 'Snorkeling'         },
  { id: 'diving',             label_id: 'Diving',                label_en: 'Diving'             },
  { id: 'surfing',            label_id: 'Surfing',               label_en: 'Surfing'            },
  { id: 'yoga_retreat',       label_id: 'Yoga Retreat',          label_en: 'Yoga Retreat'       },
  { id: 'motorbike_trek',     label_id: 'Motor Touring',         label_en: 'Motorbike Trek'     },
  { id: 'cooking_class',      label_id: 'Kelas Memasak',         label_en: 'Cooking Class'      },
  { id: 'jeep_safari',        label_id: 'Jeep Safari',           label_en: 'Jeep Safari'        },
  { id: 'traditional_market', label_id: 'Pasar Tradisional',     label_en: 'Traditional Market' },
  { id: 'craft_class',        label_id: 'Kelas Kerajinan',       label_en: 'Craft Class'        },
]

const RENT_OPTIONS: ServiceOption[] = [
  { id: 'matic',     label_id: 'Matic',     label_en: 'Automatic Scooter' },
  { id: 'sport',     label_id: 'Sport',     label_en: 'Sport Bike'        },
  { id: 'adventure', label_id: 'Adventure', label_en: 'Adventure'         },
  { id: 'bebek',     label_id: 'Bebek',     label_en: 'Cub / Underbone'   },
  { id: 'vespa',     label_id: 'Vespa',     label_en: 'Vespa'             },
  { id: 'classic',   label_id: 'Klasik',    label_en: 'Classic'           },
  { id: 'big_bike',  label_id: 'Big Bike',  label_en: 'Big Bike (250cc+)' },
  { id: 'electric',  label_id: 'Listrik',   label_en: 'Electric'          },
]

const PLACES_OPTIONS: ServiceOption[] = [
  { id: 'restaurant', label_id: 'Resto', label_en: 'Restaurant' },
  { id: 'cafe',       label_id: 'Kafe',  label_en: 'Cafe'       },
  { id: 'bar',        label_id: 'Bar',   label_en: 'Bar'        },
  { id: 'club',       label_id: 'Klub',  label_en: 'Club'       },
]

const PROPERTY_TYPE_OPTIONS: ServiceOption[] = [
  { id: 'house',      label_id: 'Rumah',       label_en: 'House'      },
  { id: 'apartment',  label_id: 'Apartemen',   label_en: 'Apartment'  },
  { id: 'villa',      label_id: 'Villa',       label_en: 'Villa'      },
  { id: 'land',       label_id: 'Tanah',       label_en: 'Land'       },
  { id: 'shophouse',  label_id: 'Ruko',        label_en: 'Shophouse'  },
  { id: 'warehouse',  label_id: 'Gudang',      label_en: 'Warehouse'  },
  { id: 'office',     label_id: 'Kantor',      label_en: 'Office'     },
  { id: 'shop',       label_id: 'Kios / Toko', label_en: 'Shop'       },
]

const PROPERTY_LISTING_TYPE_OPTIONS: ServiceOption[] = [
  { id: 'for_sale',         label_id: 'Dijual',       label_en: 'For Sale'        },
  { id: 'for_rent',         label_id: 'Disewakan',    label_en: 'For Rent'        },
  { id: 'new_construction', label_id: 'Pengembang',   label_en: 'New Construction'},
]

// ───────────────────────────────────────────────────────────────────────────
// CATEGORY_CONFIGS — the central map.
// ───────────────────────────────────────────────────────────────────────────

export const CATEGORY_CONFIGS: Record<CategoryId, CategoryConfig> = {
  beautician: {
    category:          'beautician',
    table:             'beautician_providers',
    apiBase:           '/api/beautician/me',
    publicProfilePath: '/beautician/',
    dashboardBase:     '/dashboard/beautician',
    display:           { title_id: 'Beautician',     title_en: 'Beautician'      },
    fields: {
      displayName:        'display_name',
      bio:                'bio',
      gallery:            'gallery_image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'latitude',
      longitude:          'longitude',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'business_name',
      servicePhotos:      'service_photos',
      servicePhotosShape: 'object',
    },
    services: {
      column:      'services_offered',
      type:        'multi',
      label_id:    'Layanan',
      label_en:    'Services',
      options:     BEAUTICIAN_OPTIONS,
      maxSelected: 6,
    },
    pricing: [
      { column: 'price_makeup_idr', label: 'Makeup', unit: 'flat' },
      { column: 'price_nail_idr',   label: 'Nails',  unit: 'flat' },
      { column: 'price_hair_idr',   label: 'Hair',   unit: 'flat' },
    ],
  },

  massage: {
    category:          'massage',
    table:             'massage_providers',
    apiBase:           '/api/massage/me',
    publicProfilePath: '/massage/',
    dashboardBase:     '/dashboard/massage',
    display:           { title_id: 'Pijat',  title_en: 'Massage' },
    fields: {
      displayName:        'display_name',
      bio:                'bio',
      gallery:            'gallery_image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'latitude',
      longitude:          'longitude',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'display_name',
      servicePhotos:      'service_photos',
      servicePhotosShape: 'object',
    },
    services: {
      column:   'massage_type',
      type:     'single',
      label_id: 'Jenis Pijat Utama',
      label_en: 'Primary Massage Type',
      options:  MASSAGE_OPTIONS,
    },
    pricing: [
      { column: 'price_60min_idr',  label: '60 minutes',  unit: 'per_session' },
      { column: 'price_90min_idr',  label: '90 minutes',  unit: 'per_session' },
      { column: 'price_120min_idr', label: '120 minutes', unit: 'per_session' },
    ],
  },

  laundry: {
    category:          'laundry',
    table:             'laundry_providers',
    apiBase:           '/api/laundry/me',
    publicProfilePath: '/laundry/',
    dashboardBase:     '/dashboard/laundry',
    display:           { title_id: 'Laundry', title_en: 'Laundry' },
    fields: {
      displayName:        'display_name',
      bio:                'bio',
      gallery:            'gallery_image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'latitude',
      longitude:          'longitude',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'display_name',
      servicePhotos:      null,
      servicePhotosShape: null,
    },
    services: {
      column:   'services_offered_synth',
      type:     'multi',
      label_id: 'Layanan',
      label_en: 'Services',
      options:  LAUNDRY_OPTIONS,
    },
    pricing: [
      { column: 'price_wash_per_kg_idr',      label: 'Wash',              unit: 'per_kg' },
      { column: 'price_wash_dry_per_kg_idr',  label: 'Wash + Dry',        unit: 'per_kg' },
      { column: 'price_wash_iron_per_kg_idr', label: 'Wash + Dry + Iron', unit: 'per_kg' },
    ],
  },

  handyman: {
    category:          'handyman',
    table:             'handyman_providers',
    apiBase:           '/api/handyman/me',
    publicProfilePath: '/handyman/',
    dashboardBase:     '/dashboard/handyman',
    display:           { title_id: 'Tukang',  title_en: 'Handyman' },
    fields: {
      displayName:        'display_name',
      bio:                'bio',
      gallery:            'gallery_image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'latitude',
      longitude:          'longitude',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'display_name',
      servicePhotos:      'service_photos',
      servicePhotosShape: 'array',
    },
    services: {
      column:      'specialties',
      type:        'multi',
      label_id:    'Spesialisasi',
      label_en:    'Specialties',
      options:     HANDYMAN_OPTIONS,
      maxSelected: 3,
    },
    pricing: [
      { column: 'hourly_rate_idr', label: 'Per hour', unit: 'per_hour' },
      { column: 'day_rate_idr',    label: 'Per day',  unit: 'per_day'  },
    ],
  },

  'home-clean': {
    category:          'home-clean',
    table:             'home_clean_providers',
    apiBase:           '/api/home-clean/me',
    publicProfilePath: '/home-clean/',
    dashboardBase:     '/dashboard/home-clean',
    display:           { title_id: 'Bersih Rumah', title_en: 'Home Clean' },
    fields: {
      displayName:        'display_name',
      bio:                'bio',
      gallery:            'gallery_image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'latitude',
      longitude:          'longitude',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'display_name',
      servicePhotos:      'service_photos',
      servicePhotosShape: 'object',
    },
    services: {
      column:      'services_offered',
      type:        'multi',
      label_id:    'Layanan',
      label_en:    'Services',
      options:     HOME_CLEAN_OPTIONS,
      maxSelected: 5,
    },
    pricing: [
      { column: 'hourly_rate_idr', label: 'Per hour', unit: 'per_hour' },
      { column: 'day_rate_idr',    label: 'Per day',  unit: 'per_day'  },
    ],
  },

  tour: {
    category:          'tour',
    table:             'tour_guide_listings',
    apiBase:           '/api/tour/me',
    publicProfilePath: '/tour/',
    dashboardBase:     '/dashboard/tour-guide',
    display:           { title_id: 'Tour Guide', title_en: 'Tour Guide' },
    fields: {
      displayName:        'name',
      bio:                'notes',
      gallery:            'image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'lat',
      longitude:          'lng',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'name',
      servicePhotos:      null,
      servicePhotosShape: null,
    },
    services: {
      column:      'services',
      type:        'multi',
      label_id:    'Spesialisasi',
      label_en:    'Tour Specialties',
      options:     TOUR_OPTIONS,
      maxSelected: 3,
    },
    pricing: [
      { column: 'day_rate_idr', label: 'Per day', unit: 'per_day' },
    ],
  },

  rent: {
    category:          'rent',
    table:             'bike_rentals',
    apiBase:           '/api/rent/me',
    publicProfilePath: '/rent/',
    dashboardBase:     '/dashboard/rentals',
    display:           { title_id: 'Rental', title_en: 'Rental' },
    fields: {
      displayName:        'owner_name',
      bio:                'description',
      gallery:            'image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'lat',
      longitude:          'lng',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'owner_company',
      servicePhotos:      null,
      servicePhotosShape: null,
    },
    services: {
      column:   'bike_type',
      type:     'single',
      label_id: 'Tipe Kendaraan',
      label_en: 'Bike Type',
      options:  RENT_OPTIONS,
    },
    pricing: [
      { column: 'daily_price_idr',      label: 'Per day',   unit: 'per_day'  },
      { column: 'weekly_price_idr',     label: 'Per week',  unit: 'flat'     },
      { column: 'monthly_price_idr',    label: 'Per month', unit: 'flat'     },
      { column: 'security_deposit_idr', label: 'Deposit',   unit: 'flat'     },
    ],
  },

  places: {
    category:          'places',
    table:             'places',
    apiBase:           '/api/places/me',
    publicProfilePath: '/places/',
    dashboardBase:     '/dashboard/places',
    display:           { title_id: 'Tempat',   title_en: 'Place' },
    fields: {
      displayName:        'name',
      bio:                'description',
      gallery:            'image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'hours_json',
      latitude:           'lat',
      longitude:          'lng',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'business_name',
      servicePhotos:      'service_photos',
      servicePhotosShape: 'object',
    },
    services: {
      column:   'category',
      type:     'single',
      label_id: 'Tipe Tempat',
      label_en: 'Venue Type',
      options:  PLACES_OPTIONS,
    },
    pricing: [],
  },

  property: {
    category:          'property',
    table:             'property_listings',
    apiBase:           '/api/property/me',
    publicProfilePath: '/property/',
    dashboardBase:     '/dashboard/property',
    display:           { title_id: 'Properti', title_en: 'Property' },
    fields: {
      displayName:        'display_name',
      bio:                'bio',
      gallery:            'gallery_image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'latitude',
      longitude:          'longitude',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'business_name',
      servicePhotos:      'service_photos',
      servicePhotosShape: 'object',
    },
    services: {
      column:   'property_type',
      type:     'single',
      label_id: 'Tipe Properti',
      label_en: 'Property Type',
      options:  PROPERTY_TYPE_OPTIONS,
    },
    discriminator: {
      column:   'listing_type',
      label_id: 'Tipe Listing',
      label_en: 'Listing Type',
      options:  PROPERTY_LISTING_TYPE_OPTIONS,
    },
    pricing: [
      { column: 'price_idr',        label: 'Sale Price', unit: 'flat',
        showWhen: { listing_type: 'for_sale' } },
      { column: 'daily_rent_idr',   label: 'Per day',    unit: 'per_day',
        showWhen: { listing_type: 'for_rent' } },
      { column: 'weekly_rent_idr',  label: 'Per week',   unit: 'flat',
        showWhen: { listing_type: 'for_rent' } },
      { column: 'monthly_rent_idr', label: 'Per month',  unit: 'flat',
        showWhen: { listing_type: 'for_rent' } },
      { column: 'deposit_idr',      label: 'Deposit',    unit: 'flat',
        showWhen: { listing_type: 'for_rent' } },
    ],
  },

  // ─── PROPERTY · SALES — dashboard variant, no discriminator ───
  'property-sale': {
    category:          'property-sale',
    table:             'property_listings',
    apiBase:           '/api/property-sale/me',
    publicProfilePath: '/property/',
    dashboardBase:     '/dashboard/property-sale',
    display:           { title_id: 'Properti · Dijual', title_en: 'Property · Sale' },
    fields: {
      displayName:        'display_name',
      bio:                'bio',
      gallery:            'gallery_image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'latitude',
      longitude:          'longitude',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'business_name',
      servicePhotos:      'service_photos',
      servicePhotosShape: 'object',
    },
    services: {
      column:   'property_type',
      type:     'single',
      label_id: 'Tipe Properti',
      label_en: 'Property Type',
      options:  PROPERTY_TYPE_OPTIONS,
    },
    pricing: [
      { column: 'price_idr', label: 'Sale Price', unit: 'flat' },
    ],
  },

  // ─── PROPERTY · RENTAL — dashboard variant ───
  'property-rent': {
    category:          'property-rent',
    table:             'property_listings',
    apiBase:           '/api/property-rent/me',
    publicProfilePath: '/property/',
    dashboardBase:     '/dashboard/property-rent',
    display:           { title_id: 'Properti · Disewakan', title_en: 'Property · Rental' },
    fields: {
      displayName:        'display_name',
      bio:                'bio',
      gallery:            'gallery_image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'latitude',
      longitude:          'longitude',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'business_name',
      servicePhotos:      'service_photos',
      servicePhotosShape: 'object',
    },
    services: {
      column:   'property_type',
      type:     'single',
      label_id: 'Tipe Properti',
      label_en: 'Property Type',
      options:  PROPERTY_TYPE_OPTIONS,
    },
    pricing: [
      { column: 'daily_rent_idr',   label: 'Per day',   unit: 'per_day' },
      { column: 'weekly_rent_idr',  label: 'Per week',  unit: 'flat'    },
      { column: 'monthly_rent_idr', label: 'Per month', unit: 'flat'    },
      { column: 'deposit_idr',      label: 'Deposit',   unit: 'flat'    },
    ],
  },

  // ─── PROPERTY · BUILDER — new_construction variant ───
  'property-builder': {
    category:          'property-builder',
    table:             'property_listings',
    apiBase:           '/api/property-builder/me',
    publicProfilePath: '/property/',
    dashboardBase:     '/dashboard/property-builder',
    display:           { title_id: 'Properti · Pengembang', title_en: 'Property · Builder' },
    fields: {
      displayName:        'display_name',
      bio:                'bio',
      gallery:            'gallery_image_urls',
      coverImage:         'cover_image_url',
      profileImage:       'profile_image_url',
      operatingHours:     'operating_hours',
      latitude:           'latitude',
      longitude:          'longitude',
      heroText:           'hero_text',
      promoText:          'promo_text',
      themeColor:         'theme_color',
      businessName:       'business_name',
      servicePhotos:      'service_photos',
      servicePhotosShape: 'object',
    },
    services: {
      column:   'property_type',
      type:     'single',
      label_id: 'Tipe Properti',
      label_en: 'Property Type',
      options:  PROPERTY_TYPE_OPTIONS,
    },
    pricing: [
      { column: 'starting_price_idr', label: 'Starting Price', unit: 'flat' },
      { column: 'nup_idr',            label: 'NUP (Booking)',  unit: 'flat' },
    ],
  },
}

export function getCategoryConfig(id: CategoryId): CategoryConfig {
  return CATEGORY_CONFIGS[id]
}
