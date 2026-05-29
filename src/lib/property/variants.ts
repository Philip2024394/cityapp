// Shared metadata + helpers for the property dashboard variants
// (property-sale / property-rent / property-builder). Each variant
// reads from / writes to `property_listings` filtered by listing_type.

export type PropertyVariant = 'for_sale' | 'for_rent' | 'new_construction'

export const PROPERTY_TYPE_OPTIONS = [
  { id: 'house',     label_id: 'Rumah'      },
  { id: 'apartment', label_id: 'Apartemen'  },
  { id: 'villa',     label_id: 'Villa'      },
  { id: 'land',      label_id: 'Tanah'      },
  { id: 'shophouse', label_id: 'Ruko'       },
  { id: 'warehouse', label_id: 'Gudang'     },
  { id: 'office',    label_id: 'Kantor'     },
  { id: 'shop',      label_id: 'Kios'       },
] as const

export type PropertyTypeId = typeof PROPERTY_TYPE_OPTIONS[number]['id']

export const PROPERTY_TYPE_ALLOWLIST = new Set<string>(
  PROPERTY_TYPE_OPTIONS.map((o) => o.id),
)

export const CERTIFICATE_OPTIONS = ['SHM', 'HGB', 'SHGB', 'Strata', 'Girik', 'AJB'] as const
export const FURNISHED_OPTIONS   = ['unfurnished', 'semi', 'fully'] as const
export const WATER_SOURCE_OPTIONS = ['PDAM', 'well', 'both'] as const
export const FLOOD_ZONE_OPTIONS   = ['none', 'occasional', 'frequent'] as const

export const PROPERTY_DEFAULT_THEME = '#0EA5E9'

export const PROPERTY_DEFAULT_HERO = {
  line1:   'Indonesia',
  line2:   'Property',
  tagline: 'Find your next home',
}
export const PROPERTY_DEFAULT_HERO_IMAGE =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_45_33%20AM.png'

export const VARIANT_LABELS: Record<PropertyVariant, { en: string; line2: string }> = {
  for_sale:         { en: 'For Sale',         line2: 'Property' },
  for_rent:         { en: 'For Rent',         line2: 'Property' },
  new_construction: { en: 'New Construction', line2: 'Project'  },
}
