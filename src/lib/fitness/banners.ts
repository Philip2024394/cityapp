import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type FitnessSpecialty } from './types'

// Fitness banner library — same shape as florist's FLORIST_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (FitnessSpecialty) → entries.
//
// Fitness brand defaults to sky blue (#0EA5E9) — sport / active energy.
// Reads as clean, energetic, sweat-and-water vs florist's botanical
// green / cake's bakery pink. White CTAs (button_text_color) pair
// high-contrast on the blue.
//
// Empty for now — coaches upload their own banner image during signup
// or via the dashboard banner picker (which also supports library +
// upload). Founder may seed curated banners later once the first batch
// of coaches have onboarded and we know which training types (strength
// / HIIT / yoga / outdoor) need coverage.
export const FITNESS_BANNER_LIBRARY: BannerLibrary = {
  '#0EA5E9': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every fitness specialty so
// when banners are added they can be grouped by training type.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const FITNESS_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as FitnessSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
