import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type YogaSpecialty } from './types'

// Yoga banner library — same shape as fitness's FITNESS_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (YogaSpecialty) → entries.
//
// Yoga brand defaults to lavender/violet (#A78BFA) — calming, mindful,
// spiritual without going cliché. Reads as breath-and-stillness vs
// fitness's sport-and-water blue. White CTAs (button_text_color) pair
// high-contrast on the violet.
//
// Empty for now — teachers upload their own banner image during signup
// or via the dashboard banner picker (which also supports library +
// upload). Founder may seed curated banners later once the first batch
// of teachers have onboarded and we know which styles (vinyasa / yin /
// prenatal / hot) need coverage.
export const YOGA_BANNER_LIBRARY: BannerLibrary = {
  '#A78BFA': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every yoga specialty so
// when banners are added they can be grouped by style.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const YOGA_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as YogaSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
