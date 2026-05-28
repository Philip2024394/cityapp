// ============================================================================
// Car model image lookup + generic fallback.
// ----------------------------------------------------------------------------
// Returns a stock photo URL for a given car make+model combo. Used by:
//   • Driver profile car display (when no driver-uploaded photo)
//   • /car/[slug] driver public profile
//
// Parallel to src/data/bikeImages.ts — same fallback chain shape, but
// scoped to cars / trucks / minibuses / premium cars. The founder spec
// wants ONE clean stock image per make+model across every driver who
// lists that vehicle, so the directory looks consistent.
//
// Image source priority (caller-side):
//   1. Owner/driver-uploaded photo — caller decides whether to use that
//      before falling through to this helper.
//   2. CAR_MODEL_IMAGES extension below — `${makeSlug}-${modelSlug}` keys.
//   3. Generic car silhouette fallback (the IndoCity Ride tile illustration).
//
// Lookup matching mirrors bikeImages.ts: lowercase brand + first-5-char
// partial on the model handles "Avanza 1.5G" vs "Avanza", etc.
// ============================================================================

// Generic fallback when no photo + no extension hit. Re-uses the IndoCity
// Ride tile illustration — clean transparent-bg silhouette the founder
// can swap later when a proper generic-car asset exists.
const GENERIC_CAR_FALLBACK =
  'https://ik.imagekit.io/nepgaxllc/Untitleddasdas-removebg-preview.png'

// Extension catalog — any (make, model) we have a curated photo for can
// be declared here. Format: `${makeSlug}-${modelSlug}` keys (lowercase,
// hyphens, no spaces). Seeded with the 3 URLs already used in
// mock_drivers.profile_image_url for the car mocks, plus Innova routed
// to the generic fallback until a real asset is uploaded.
export const CAR_MODEL_IMAGES: Record<string, string> = {
  'toyota-avanza': 'https://ik.imagekit.io/nepgaxllc/avanza-budi.png',
  'honda-mobilio': 'https://ik.imagekit.io/nepgaxllc/mobilio-siti.png',
  'suzuki-ertiga': 'https://ik.imagekit.io/nepgaxllc/ertiga-agus.png',
  // TODO: replace Innova fallback once a dedicated asset exists.
  'toyota-innova': 'https://ik.imagekit.io/nepgaxllc/Untitleddasdas-removebg-preview.png',
}

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function normaliseModelForMatch(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '')
}

/** Try the extension map with exact key, then a first-5-char partial
 *  match in either direction. Handles "Avanza 1.5G" → "avanza", etc.
 *  Returns null on miss so the caller falls through to the generic. */
function lookupExtensionMap(make: string, model: string): string | null {
  const key = `${toSlug(make)}-${toSlug(model)}`
  if (CAR_MODEL_IMAGES[key]) return CAR_MODEL_IMAGES[key]

  // Partial match — iterate the extension keys and compare the model
  // portion after the make prefix. Same first-5-char approach as
  // bikeImages.ts so variant naming (e.g. "Innova Zenix" vs "Innova")
  // still routes to the right asset.
  const brandSlug = toSlug(make)
  const modelN = normaliseModelForMatch(model)
  const slice = (s: string, n = 5) => s.slice(0, n)
  for (const k of Object.keys(CAR_MODEL_IMAGES)) {
    if (!k.startsWith(`${brandSlug}-`)) continue
    const kModel = normaliseModelForMatch(k.slice(brandSlug.length + 1))
    if (kModel === modelN) return CAR_MODEL_IMAGES[k]
    if (kModel.startsWith(slice(modelN)) || modelN.startsWith(slice(kModel))) {
      return CAR_MODEL_IMAGES[k]
    }
  }
  return null
}

/** Returns the best stock-photo URL for a car make+model. Falls back
 *  through extension map → generic silhouette. Never returns null —
 *  UI can always render. Safe to call with undefined / null inputs. */
export function getCarImageUrl(
  make: string | null | undefined,
  model: string | null | undefined,
): string {
  if (make && model) {
    const fromExt = lookupExtensionMap(String(make), String(model))
    if (fromExt) return fromExt
  }
  return GENERIC_CAR_FALLBACK
}

/** True when the lookup hit a real extension entry (not the generic
 *  fallback). Useful for UI that wants to label fallbacks differently
 *  from real model photos. Mirror of isExactBikeImage. */
export function isExactCarImage(
  make: string | null | undefined,
  model: string | null | undefined,
): boolean {
  if (!make || !model) return false
  return lookupExtensionMap(String(make), String(model)) !== null
}
