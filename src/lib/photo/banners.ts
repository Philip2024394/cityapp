import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type PhotoSpecialty } from './types'

// Photo banner library — same shape as barber's BARBER_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (PhotoSpecialty) → entries.
//
// Photo brand defaults to a deep charcoal slate (#1F2937) — independent
// Indonesian photographers / studios trend dark/charcoal aesthetics so
// the imagery pops against the chrome. White CTAs (button_text_color)
// pair high-contrast on slate.
//
// Empty for now — photographers upload their own banner image during
// signup or via the dashboard banner picker (which also supports library
// + upload). Founder may seed curated banners later once the first
// batch of photographers have onboarded and we know which genres need
// coverage.
export const PHOTO_BANNER_LIBRARY: BannerLibrary = {
  '#1F2937': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every photo genre so when
// banners are added they can be grouped by genre. Order mirrors
// SPECIALTY_LABELS in types.ts.
export const PHOTO_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as PhotoSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
