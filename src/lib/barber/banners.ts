import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type BarberSpecialty } from './types'

// Barber banner library — same shape as handyman's HANDYMAN_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (BarberSpecialty) → entries.
//
// Barber brand defaults to a classic deep blue (#1E40AF) — the colour of
// the traditional barber-pole stripe and the dominant signage tone of
// independent Indonesian barbershops. White ink-on-blue accent is set via
// button_text_color on the provider row (not here).
//
// Empty for now — barbers upload their own banner image during signup
// or via the dashboard banner picker (which also supports library +
// upload). Founder may seed curated banners later once the first batch
// of barbers have onboarded and we know which services need coverage.
export const BARBER_BANNER_LIBRARY: BannerLibrary = {
  '#1E40AF': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every barber service so when
// banners are added they can be grouped by service. Order mirrors
// SPECIALTY_LABELS in types.ts.
export const BARBER_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as BarberSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
