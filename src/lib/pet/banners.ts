import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type PetSpecialty } from './types'

// Pet banner library — same shape as tutoring's TUTORING_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (PetSpecialty) → entries.
//
// Pet brand defaults to warm orange (#F97316) — friendly, playful,
// pet-care brands trend bright warm (think Pet Kingdom / Groovy Groomer
// Instagram palettes). Reads as cheerful / animal-friendly vs
// tutoring's academic blue and yoga's breath-violet. White CTAs
// (button_text_color) pair high-contrast on the orange.
//
// Empty for now — groomers upload their own banner image during signup
// or via the dashboard banner picker (which also supports library +
// upload). Founder may seed curated banners later once the first batch
// of pet businesses have onboarded and we know which categories (cat /
// dog / pet hotel / sitting) need coverage.
export const PET_BANNER_LIBRARY: BannerLibrary = {
  '#F97316': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every pet specialty so
// when banners are added they can be grouped by species + service.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const PET_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as PetSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
