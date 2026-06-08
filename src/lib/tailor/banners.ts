import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type TailorSpecialty } from './types'

// Tailor banner library — same shape as pet's PET_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (TailorSpecialty) → entries.
//
// Tailor brand defaults to rich violet (#9333EA) — bridal / couture
// signage in Indonesia trends violet-purple for luxe + custom-craft
// (Vera Wang, Jenny Yoo, Indonesian celebrity-bridal couture
// Instagram palettes). Reads as bespoke / premium / hand-finished vs
// mover's logistics-teal. White CTAs (button_text_color) pair
// high-contrast on the violet.
//
// Empty for now — tailors upload their own banner image during signup
// or via the dashboard banner picker (which also supports library +
// upload). Founder may seed curated banners later once the first batch
// of tailor businesses have onboarded and we know which categories
// (Kebaya / Jas / Seragam / Vermak) need coverage.
export const TAILOR_BANNER_LIBRARY: BannerLibrary = {
  '#9333EA': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every tailor specialty so
// when banners are added they can be grouped by garment type.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const TAILOR_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as TailorSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
