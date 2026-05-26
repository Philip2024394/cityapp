import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type HandymanSpecialty } from './types'

// Handyman banner library — same shape as beautician's BANNER_LIBRARY:
// theme-hex (uppercase) → category id (HandymanSpecialty) → entries.
//
// Empty for now: the founder hasn't sourced handyman scene banners yet.
// The picker still works because the "Upload my own banner" tile is
// always visible. To seed: pick a trade (e.g. 'plumbing'), generate or
// source 16:9 banner URLs hosted on ik.imagekit.io / *.supabase.co, and
// add them to the matching `[themeHex][specialty]` array.
//
// Theme default is yellow (#FACC15) — the City Riders brand. Other
// themes can be added later if handymen want per-provider accents.
export const HANDYMAN_BANNER_LIBRARY: BannerLibrary = {
  '#FACC15': {},
}

// Categories the picker iterates. We expose the same 24 specialties so
// when banners are added they can be grouped by trade. Order mirrors
// SPECIALTY_LABELS in types.ts.
export const HANDYMAN_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as HandymanSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
