import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type CarwashSpecialty } from './types'

// Carwash banner library — same shape as tailor's TAILOR_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (CarwashSpecialty) → entries.
//
// Carwash brand defaults to clean water blue (#0284C7) — car wash
// signage in Indonesia trends bright blue + chrome (DetailMaster,
// Cuci Mobil Auto Glow, indie cuci-kilat banners). Reads as
// fresh / hydrophobic / professional vs tailor's bridal violet.
// White CTAs (button_text_color) pair high-contrast on the blue.
//
// Empty for now — car washes upload their own banner image during
// signup or via the dashboard banner picker (which also supports
// library + upload). Founder may seed curated banners later once
// the first batch of car wash businesses have onboarded and we
// know which categories (Motor / Mobil Sedang / SUV / Detailing /
// Coating) need coverage.
export const CARWASH_BANNER_LIBRARY: BannerLibrary = {
  '#0284C7': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every carwash specialty so
// when banners are added they can be grouped by vehicle/wash type.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const CARWASH_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as CarwashSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
