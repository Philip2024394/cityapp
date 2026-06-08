import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type TattooSpecialty } from './types'

// Tattoo banner library — same shape as handyman's HANDYMAN_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (TattooSpecialty) → entries.
//
// Tattoo brand is intentionally black (#0A0A0A) by default — most tattoo
// studios run a dark aesthetic. Yellow ink-on-black accent is set via
// button_text_color on the provider row (not here).
//
// Empty for now — artists upload their own banner image during signup
// or via the dashboard banner picker (which also supports library +
// upload). Founder may seed curated banners later once the first batch
// of artists have onboarded and we know which styles need coverage.
export const TATTOO_BANNER_LIBRARY: BannerLibrary = {
  '#0A0A0A': {},
  '#FACC15': {},
}

// Categories the picker iterates. We expose every tattoo style so when
// banners are added they can be grouped by aesthetic. Order mirrors
// SPECIALTY_LABELS in types.ts.
export const TATTOO_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as TattooSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
