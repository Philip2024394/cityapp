import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'

// Property banner library — same shape as handyman/beautician:
// theme-hex (uppercase) → category id → entries.
//
// Categories: `for_sale` and `for_rent` mirror the property listing_type
// values from migration 0126. `builder` is a dashboard-only bucket (no
// DB enum) for developer / construction marketing imagery — surfaced by
// the picker because PROPERTY_BANNER_CATEGORIES lists it. Safe to add
// extra picker-only categories without touching the schema.
//
// Theme default is property blue (#0EA5E9). When per-theme accents are
// added later the founder can add sibling keys here; the picker already
// falls back to the default theme when the active hex has no banners.
export const PROPERTY_BANNER_LIBRARY: BannerLibrary = {
  '#0EA5E9': {
    builder: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2005_45_33%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2005_43_46%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2005_42_18%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2005_39_38%20AM.png',
    ],
    for_sale: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2005_40_57%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2005_46_56%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2004_00_28%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2003_52_54%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_45_33%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_47_15%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_48_46%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_49_40%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_50_55%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_53_02%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_54_00%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_54_48%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_56_33%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_57_14%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_58_43%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2002_59_34%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2003_00_51%20AM.png',
    ],
    for_rent: [],
  },
}

// Categories the picker iterates. `for_sale` + `for_rent` mirror the
// listing_type enum from migration 0126; `builder` is dashboard-only
// (developer / construction imagery) and has no DB enum equivalent.
export const PROPERTY_BANNER_CATEGORIES: BannerCategory[] = [
  { id: 'builder',  label: 'Builder'  },
  { id: 'for_sale', label: 'For sale' },
  { id: 'for_rent', label: 'For rent' },
]
