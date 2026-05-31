import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type HandymanSpecialty } from './types'

// Handyman banner library — same shape as beautician's BANNER_LIBRARY:
// theme-hex (uppercase) → category id (HandymanSpecialty) → entries.
//
// Curated banners sourced by the founder, grouped by closest matching
// specialty. The picker doesn't gate visibility by the tukang's selected
// specialties — every category header with banners is shown — so each
// banner only needs to live under its single best fit.
//
// Theme default is yellow (#FACC15) — the CityDrivers brand. Other
// themes can be added later if handymen want per-provider accents.
export const HANDYMAN_BANNER_LIBRARY: BannerLibrary = {
  '#FACC15': {
    carpentry: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_39_50%20PM.png',
    ],
    general_repair: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_38_08%20PM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_33_32%20PM.png',
    ],
    plumbing: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_42_54%20PM.png',
    ],
    electrical: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_46_51%20PM.png',
    ],
    roof_repair: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_49_10%20PM.png',
    ],
  },
}

// Categories the picker iterates. We expose the same 24 specialties so
// when banners are added they can be grouped by trade. Order mirrors
// SPECIALTY_LABELS in types.ts.
export const HANDYMAN_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as HandymanSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
