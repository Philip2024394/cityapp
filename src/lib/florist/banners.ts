import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type FloristSpecialty } from './types'

// Florist banner library — same shape as cake's CAKE_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (FloristSpecialty) → entries.
//
// Florist brand defaults to a botanical green (#16A34A) — Indonesian
// florist signage trends garden green (vs cake's bakery pink), reads
// as fresh / organic / leaf-and-stem and contrasts well with the
// photo-led bouquet imagery that dominates the IG feeds buyers browse.
// White CTAs (button_text_color) pair high-contrast on the green.
//
// Empty for now — florist shops upload their own banner image during
// signup or via the dashboard banner picker (which also supports
// library + upload). Founder may seed curated banners later once the
// first batch of florists have onboarded and we know which formats
// (hand bouquet / standing flower / box arrangement) need coverage.
export const FLORIST_BANNER_LIBRARY: BannerLibrary = {
  '#16A34A': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every florist specialty so
// when banners are added they can be grouped by arrangement category.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const FLORIST_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as FloristSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
