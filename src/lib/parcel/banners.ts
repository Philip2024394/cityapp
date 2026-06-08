import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type ParcelSpecialty } from './types'

// Parcel banner library — same shape as carwash's CARWASH_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (ParcelSpecialty) → entries.
//
// Parcel brand defaults to urgent orange (#EA580C) — kurir signage in
// Indonesia trends bright orange (JNE, J&T, GoSend, AnterAja, SiCepat
// banners). Reads as urgent / fast-handover / professional vs carwash's
// clean water blue and tailor's bridal violet. White CTAs
// (button_text_color) pair high-contrast on the orange.
//
// Empty for now — kurir upload their own banner image during signup or
// via the dashboard banner picker (which also supports library +
// upload). Founder may seed curated banners later once the first batch
// of kurir businesses have onboarded and we know which categories
// (Motor / Pickup Van / Box CDD / Same-Day / Instant 60-min) need
// coverage.
export const PARCEL_BANNER_LIBRARY: BannerLibrary = {
  '#EA580C': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every parcel specialty so
// when banners are added they can be grouped by vehicle/service type.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const PARCEL_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as ParcelSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
