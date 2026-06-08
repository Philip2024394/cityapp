import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type CateringSpecialty } from './types'

// Catering banner library — same shape as photo's PHOTO_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (CateringSpecialty) → entries.
//
// Catering brand defaults to a warm red (#DC2626) — Indonesian
// catering signage trends warm reds + golds for appetite (rendang
// brown, sambal red, tumpeng yellow). White CTAs (button_text_color)
// pair high-contrast on warm red.
//
// Empty for now — catering businesses upload their own banner image
// during signup or via the dashboard banner picker (which also
// supports library + upload). Founder may seed curated banners later
// once the first batch of catering businesses have onboarded and we
// know which cuisines / formats need coverage.
export const CATERING_BANNER_LIBRARY: BannerLibrary = {
  '#DC2626': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every catering specialty
// so when banners are added they can be grouped by cuisine / format.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const CATERING_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as CateringSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
