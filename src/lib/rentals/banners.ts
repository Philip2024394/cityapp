import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'

// Rental banner library — same shape as property/beautician:
// theme-hex (uppercase) → category id → entries.
//
// Single `rental` bucket today since the dashboard hands one category
// to the picker and the founder may add bike-type sub-buckets (matic,
// sport, adventure…) later. Picker shows every category with banners,
// so adding more keys is non-breaking.
//
// Keyed under #FACC15 (the rentals migration default theme). When a
// renter picks a custom theme, the picker falls back to this default
// bucket via BannerLibraryPicker's defaultThemeHex resolution.
export const RENTAL_BANNER_LIBRARY: BannerLibrary = {
  '#FACC15': {
    rental: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2005_11_26%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2004_14_50%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2004_15_44%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2004_17_32%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2004_19_14%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2004_19_37%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2004_23_57%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2004_25_59%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2004_29_28%20AM.png',
    ],
  },
}

export const RENTAL_BANNER_CATEGORIES: BannerCategory[] = [
  { id: 'rental', label: 'Motorbike rentals' },
]
