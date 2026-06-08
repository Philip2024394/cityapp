import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SPECIALTY_SHORT, type CakeSpecialty } from './types'

// Cake banner library — same shape as catering's CATERING_BANNER_LIBRARY:
// theme-hex (uppercase) → category id (CakeSpecialty) → entries.
//
// Cake brand defaults to a soft pink (#F472B6) — bakery aesthetic.
// Pink imagery is appetising for sweets, photographs well on a feed,
// and matches the pastel buttercream + sprinkle palette that dominates
// Indonesian cake studio Instagram. White CTAs (button_text_color)
// pair high-contrast on soft pink.
//
// Empty for now — bakery businesses upload their own banner image
// during signup or via the dashboard banner picker (which also
// supports library + upload). Founder may seed curated banners later
// once the first batch of bakeries have onboarded and we know which
// formats (birthday / Korean bento / dessert table) need coverage.
export const CAKE_BANNER_LIBRARY: BannerLibrary = {
  '#F472B6': {},
  '#FFFFFF': {},
}

// Categories the picker iterates. We expose every cake specialty so
// when banners are added they can be grouped by product category.
// Order mirrors SPECIALTY_LABELS in types.ts.
export const CAKE_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SPECIALTY_SHORT) as CakeSpecialty[]
).map((id) => ({ id, label: SPECIALTY_SHORT[id] }))
