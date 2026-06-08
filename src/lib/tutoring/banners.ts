import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type TutoringSpecialty } from './types'

// Tutoring banner library — same shape as yoga's YOGA_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (TutoringSpecialty) → entries.
//
// Tutoring brand defaults to academic blue (#2563EB) — scholarly,
// trustworthy, knowledge-anchored. Reads as study-and-focus vs yoga's
// breath-violet and fitness's sport-blue. White CTAs (button_text_color)
// pair high-contrast on the blue.
//
// Empty for now — tutors upload their own banner image during signup
// or via the dashboard banner picker (which also supports library +
// upload). Founder may seed curated banners later once the first batch
// of tutors have onboarded and we know which subjects (math / UTBK /
// english / mengaji) need coverage.
export const TUTORING_BANNER_LIBRARY: BannerLibrary = {
  '#2563EB': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every tutoring specialty so
// when banners are added they can be grouped by subject.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const TUTORING_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as TutoringSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
