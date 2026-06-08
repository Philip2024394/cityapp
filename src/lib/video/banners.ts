import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type VideoSpecialty } from './types'

// Video banner library — same shape as photo's PHOTO_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (VideoSpecialty) → entries.
//
// Video brand defaults to a cinema purple (#7C3AED) — independent
// Indonesian videographers / production houses lean cinematic /
// editorial purple-magenta so the imagery pops with a film-festival
// accent. White CTAs (button_text_color) pair high-contrast on purple.
//
// Empty for now — videographers upload their own banner image during
// signup or via the dashboard banner picker (which also supports
// library + upload). Founder may seed curated banners later once the
// first batch of videographers have onboarded and we know which genres
// need coverage.
export const VIDEO_BANNER_LIBRARY: BannerLibrary = {
  '#7C3AED': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every video genre so when
// banners are added they can be grouped by genre. Order mirrors
// SPECIALTY_LABELS in types.ts.
export const VIDEO_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as VideoSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
