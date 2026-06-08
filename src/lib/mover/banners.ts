import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type MoverSpecialty } from './types'

// Mover banner library — same shape as pet's PET_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (MoverSpecialty) → entries.
//
// Mover brand defaults to deep teal (#0F766E) — moving / logistics
// signage in Indonesia trends teal-green for trustworthy + sturdy
// (think GoBox / Lalamove / Mover ID Instagram palettes). Reads as
// reliable / professional / heavy-duty vs pet's playful orange.
// White CTAs (button_text_color) pair high-contrast on the teal.
//
// Empty for now — movers upload their own banner image during signup
// or via the dashboard banner picker (which also supports library +
// upload). Founder may seed curated banners later once the first batch
// of mover businesses have onboarded and we know which categories
// (Grandmax / Box CDD / Wing / packing service) need coverage.
export const MOVER_BANNER_LIBRARY: BannerLibrary = {
  '#0F766E': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every mover specialty so
// when banners are added they can be grouped by vehicle + service.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const MOVER_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as MoverSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
