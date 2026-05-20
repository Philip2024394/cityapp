// ============================================================================
// Bike model image lookup + generic fallback.
// ----------------------------------------------------------------------------
// Returns a stock photo URL for a given make+model combo. Used by:
//   • Driver profile bike display (when no driver-uploaded photo)
//   • /rent marketplace RentalCard background
//   • /r/[slug] driver public profile
//
// Image source priority:
//   1. Owner/driver-uploaded photo (caller-supplied)
//   2. BIKE_CATALOG in src/lib/rentals/catalog.ts — 31 curated bikes
//      already mapped to imagekit URLs (CB150R, GSX-R150, Ninja 250,
//      Vespa Primavera, etc.)
//   3. BIKE_MODEL_IMAGES extension below — any model not in the rentals
//      catalog can be added here as you upload more stock photos
//   4. Generic motorbike silhouette fallback
//
// Catalog matching is fuzzy: exact brand + first-5-chars-of-model
// substring match. Handles "CRF150L" vs "CRF 150L", "PCX 150" vs
// "PCX 160", etc. — same approach as RentalCard.resolveCardPhoto.
// ============================================================================

import { BIKE_CATALOG } from '@/lib/rentals/catalog'
import type { BikeMake } from './bikeCatalog'

// Generic fallback when no photo + no catalog hit. Re-uses the
// motorbike silhouette already serving the customer landing rental tile.
const GENERIC_BIKE_FALLBACK =
  'https://ik.imagekit.io/nepgaxllc/Untitledwrrssswdqw-removebg-preview.png?updatedAt=1778253308442'

// Extension catalog — any (make, model) not in BIKE_CATALOG can be
// declared here. Empty for now; populate as you upload more photos.
// Format: `${makeSlug}-${modelSlug}` keys (lowercase, hyphens, no spaces).
export const BIKE_MODEL_IMAGES: Record<string, string> = {
  // Example:
  //   'honda-beat': 'https://ik.imagekit.io/nepgaxllc/bikes/honda-beat.png',
}

// Recently uploaded stock photos not yet mapped to a specific make/model.
// Kept together here so they can be reviewed and assigned when their
// model is identified. `getRecentBikeVariant()` returns one deterministically
// from this pool so listings get visual variety while waiting for mapping.
export const RECENT_BIKE_VARIANTS: ReadonlyArray<string> = [
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2009_47_38%20PM.png',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2009_45_17%20PM.png',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2009_40_21%20PM.png',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2009_33_15%20PM.png',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2009_27_58%20PM.png',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2009_25_59%20PM.png',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2008_14_01%20PM.png',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2008_11_48%20PM.png',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2020,%202026,%2008_11_16%20PM.png',
]

/** Pick one of the recent variants deterministically from a seed string
 *  (typically `${make}-${model}` or a listing id) so the same bike
 *  always renders with the same photo. */
export function getRecentBikeVariant(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  const idx = Math.abs(hash) % RECENT_BIKE_VARIANTS.length
  return RECENT_BIKE_VARIANTS[idx]
}

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function normaliseModelForMatch(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '')
}

/** Try the existing rental catalog first — 32 curated bikes. Returns
 *  null on miss so the caller can fall through to the extension map.
 *  Match priority: exact model → declared aliases → first-5-char partial.
 *  Aliases are how we route variant models (Mio S, NMAX Turbo, R15 V4) to
 *  the closest mapped image without needing a new photo upload per variant. */
function lookupRentalsCatalog(make: string, model: string): string | null {
  const brandL = make.toLowerCase().trim()
  const modelL = normaliseModelForMatch(model)
  for (const bike of BIKE_CATALOG) {
    if (bike.brand.toLowerCase() !== brandL) continue
    const catModel = normaliseModelForMatch(bike.model)
    if (catModel === modelL) return bike.imageUrl
    // Aliases — explicit variant routing (Vario→Vario 160, Mio S→Mio M3, etc.)
    if (bike.aliases?.some((a) => normaliseModelForMatch(a) === modelL)) {
      return bike.imageUrl
    }
    // Partial — first 5 chars in either direction handles "CRF150L" vs
    // "CRF 150L" and similar.
    const slice = (s: string, n = 5) => s.slice(0, n)
    if (catModel.startsWith(slice(modelL)) || modelL.startsWith(slice(catModel))) {
      return bike.imageUrl
    }
  }
  return null
}

/** Returns the best stock-photo URL for a make+model. Falls back through
 *  rental catalog → extension map → generic silhouette. Never returns
 *  null — UI can always render. */
export function getBikeImageUrl(
  make: BikeMake | string | null | undefined,
  model: string | null | undefined,
): string {
  if (make && model) {
    const fromRentals = lookupRentalsCatalog(String(make), String(model))
    if (fromRentals) return fromRentals
    const key = `${toSlug(String(make))}-${toSlug(String(model))}`
    if (BIKE_MODEL_IMAGES[key]) return BIKE_MODEL_IMAGES[key]
    // Before falling back to the silhouette, pick a recent uploaded
    // variant so the listing shows a real bike photo. Stable per
    // make+model so the same bike keeps the same image.
    return getRecentBikeVariant(key)
  }
  return GENERIC_BIKE_FALLBACK
}

/** True when the lookup hit a real catalog or extension entry (not the
 *  generic fallback). Useful for UI that wants to label fallbacks
 *  differently from real model photos. */
export function isExactBikeImage(
  make: BikeMake | string | null | undefined,
  model: string | null | undefined,
): boolean {
  if (!make || !model) return false
  if (lookupRentalsCatalog(String(make), String(model))) return true
  const key = `${toSlug(String(make))}-${toSlug(String(model))}`
  return key in BIKE_MODEL_IMAGES
}
