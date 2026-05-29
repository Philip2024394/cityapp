// ============================================================================
// Car model image lookup + generic fallback.
// ----------------------------------------------------------------------------
// Returns a stock photo URL for a given car make+model combo. Used by:
//   • Driver profile car display (when no driver-uploaded photo)
//   • /car/[slug] driver public profile
//   • /cari booking card (DriverCard) — left-side vehicle image
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
//   3. Generic car silhouette fallback (a real ImageKit asset, never null).
//
// `getCarImageUrl()` NEVER returns null — UI can always render. Pair
// with the `<img onError>` fallback in DriverCard so a transient 404
// (e.g. CDN blip) still resolves to the silhouette instead of a blank
// tile.
//
// Lookup matching mirrors bikeImages.ts: lowercase brand + first-5-char
// partial on the model handles "Avanza 1.5G" vs "Avanza", etc.
// ============================================================================

// Generic fallback when no photo + no extension hit. The previous URL
// (`Untitleddasdas-removebg-preview.png`) rendered a yellow scooter +
// delivery rider, which surfaced as a motorbike on car cards whenever
// the catalog missed — confusing customers shopping for a car ride.
// Swapped to the Toyota Avanza catalog photo since the Avanza is the
// archetypal Indonesian MPV: a sensible visual default for any car
// driver whose make/model isn't (yet) in CAR_MODEL_IMAGES.
export const GENERIC_CAR_FALLBACK =
  'https://ik.imagekit.io/nepgaxllc/sdas-removebg-preview.png?updatedAt=1776107472964'

// Curated stock-image catalog. Identified from a 40-image batch
// (2026-05-29). Twin models that share imagery (Avanza/Xenia,
// Rush/Terios, Agya/Ayla, H-1/Starex, Innova/Kijang Innova, CR-V/CRV,
// BR-V/BRV) are duplicated under both makes so a driver who picks
// either marque hits the right image.
//
// Entries flagged `// TODO verify` are medium-confidence IDs — review
// before relying on them for customer-facing renders.
export const CAR_MODEL_IMAGES: Record<string, string> = {
  // ─── Hatchbacks ────────────────────────────────────────────────────
  'honda-brio':            'https://ik.imagekit.io/nepgaxllc/Untitledddadddssdsdasd-removebg-preview.png?updatedAt=1776106640023',
  'honda-jazz':            'https://ik.imagekit.io/nepgaxllc/Untitledddadddssdsdasddasdfsdf-removebg-preview.png?updatedAt=1776107084764',
  'toyota-agya':           'https://ik.imagekit.io/nepgaxllc/Untitledddadddssdsdasddasd-removebg-preview.png?updatedAt=1776106927539',
  'daihatsu-ayla':         'https://ik.imagekit.io/nepgaxllc/Untitledddadddssdsdasddasd-removebg-preview.png?updatedAt=1776106927539',
  'toyota-yaris':          'https://ik.imagekit.io/nepgaxllc/Untitledddadddssdsdasddasdfsdfdsfsdasd-removebg-preview.png?updatedAt=1776107406058',
  'mitsubishi-mirage':     'https://ik.imagekit.io/nepgaxllc/Untitledddadddssdsdasddasdfsdfdsfs-removebg-preview.png?updatedAt=1776107175516', // TODO verify (could be Datsun GO)

  // ─── MPVs ──────────────────────────────────────────────────────────
  'toyota-avanza':         'https://ik.imagekit.io/nepgaxllc/sdas-removebg-preview.png?updatedAt=1776107472964',
  'daihatsu-xenia':        'https://ik.imagekit.io/nepgaxllc/sdas-removebg-preview.png?updatedAt=1776107472964',
  'suzuki-ertiga':         'https://ik.imagekit.io/nepgaxllc/sdasds-removebg-preview.png?updatedAt=1776107723482',
  'suzuki-apv':            'https://ik.imagekit.io/nepgaxllc/sdasdsdas-removebg-preview.png?updatedAt=1776107822326', // TODO verify
  'mitsubishi-xpander':    'https://ik.imagekit.io/nepgaxllc/sdasdsdasdas-removebg-preview.png?updatedAt=1776108152466',
  'honda-mobilio':         'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasd-removebg-preview.png?updatedAt=1776108325099',
  'toyota-calya':          'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsads-removebg-preview.png?updatedAt=1776108679588',
  'daihatsu-sigra':        'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsads-removebg-preview.png?updatedAt=1776108679588',
  'wuling-cortez':         'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsd-removebg-preview.png?updatedAt=1776108985190', // TODO verify
  'nissan-grand-livina':   'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasda-removebg-preview.png?updatedAt=1776109066348', // TODO verify
  'toyota-kijang-innova':  'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadas-removebg-preview.png?updatedAt=1776109728149',
  'toyota-innova':         'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadas-removebg-preview.png?updatedAt=1776109728149',

  // ─── Luxury / large MPVs + vans ────────────────────────────────────
  'toyota-alphard':        'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassds-removebg-preview.png?updatedAt=1776109786877',
  'toyota-vellfire':       'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdas-removebg-preview.png?updatedAt=1776109926864',
  'hyundai-staria':        'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassads-removebg-preview.png?updatedAt=1776110023108',
  'hyundai-h-1':           'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasd-removebg-preview.png?updatedAt=1776110098189',
  'hyundai-starex':        'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasd-removebg-preview.png?updatedAt=1776110098189',
  'daihatsu-luxio':        'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfassdfsdasdadsdsasdasdaasdasasda-removebg-preview.png?updatedAt=1776111419654',

  // ─── SUVs ──────────────────────────────────────────────────────────
  'toyota-rush':           'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfas-removebg-preview.png?updatedAt=1776110448904',
  'daihatsu-terios':       'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfas-removebg-preview.png?updatedAt=1776110448904',
  'honda-brv':             'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfassdfsd-removebg-preview.png?updatedAt=1776110538872',
  'honda-br-v':            'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfassdfsd-removebg-preview.png?updatedAt=1776110538872',
  'suzuki-xl7':            'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfassdfsdasda-removebg-preview.png?updatedAt=1776110828488', // TODO verify
  'toyota-fortuner':       'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfassdfsdasdads-removebg-preview.png?updatedAt=1776110885983',
  'mitsubishi-pajero-sport':'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfassdfsdasdadsdsasd-removebg-preview.png?updatedAt=1776111125486',
  'hyundai-tucson':        'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfassdfsdasdadsdsasdasda-removebg-preview.png?updatedAt=1776111213187',
  'honda-cr-v':            'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfassdfsdasdadsdsasdasdaasdas-removebg-preview.png?updatedAt=1776111362516',
  'honda-crv':             'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfassdfsdasdadsdsasdasdaasdas-removebg-preview.png?updatedAt=1776111362516',

  // ─── Minibuses / Vans (commercial passenger) ───────────────────────
  'wuling-confero':        'https://ik.imagekit.io/nepgaxllc/sdasdsdasdasasdasddsadssadsdfsdasdadassdsasdassadsasdsdfassdfsdasdadsdsasdasdaasdasasdadfs-removebg-preview.png?updatedAt=1776111549635', // TODO verify
  'dfsk-glory':            'https://ik.imagekit.io/nepgaxllc/00000000dddsasdsadsdfsdf-removebg-preview.png?updatedAt=1776112326488', // TODO verify
  'toyota-hiace':          'https://ik.imagekit.io/nepgaxllc/00000000-removebg-preview.png?updatedAt=1776111708976',

  // ─── Pickup trucks ─────────────────────────────────────────────────
  'suzuki-carry':          'https://ik.imagekit.io/nepgaxllc/00000000dddsasdsadsdfsdfasdaasd-removebg-preview.png?updatedAt=1776112751249',
  'daihatsu-gran-max':     'https://ik.imagekit.io/nepgaxllc/00000000dddsasdsadsdfsdfasdaasdasda-removebg-preview.png?updatedAt=1776112890251',
  'daihatsu-granmax':      'https://ik.imagekit.io/nepgaxllc/00000000dddsasdsadsdfsdfasdaasdasda-removebg-preview.png?updatedAt=1776112890251',
  'toyota-hilux':          'https://ik.imagekit.io/nepgaxllc/00000000dddsasdsadsdfsdfasdaasdasdasadaadsda-removebg-preview.png?updatedAt=1776113355563',
  'mitsubishi-triton':     'https://ik.imagekit.io/nepgaxllc/00000000dddsasdsadsdfsdfasdaasdasdasadaadsdaasdasd-removebg-preview.png?updatedAt=1776113412743',

  // ─── Trucks (medium / heavy) ───────────────────────────────────────
  'isuzu-elf':             'https://ik.imagekit.io/nepgaxllc/00000000dddsas-removebg-preview.png?updatedAt=1776112006481',
  'mitsubishi-fuso-canter':'https://ik.imagekit.io/nepgaxllc/00000000dddsasdsad-removebg-preview.png?updatedAt=1776112170052',
  'mitsubishi-colt-diesel':'https://ik.imagekit.io/nepgaxllc/00000000dddsasdsad-removebg-preview.png?updatedAt=1776112170052',
  'isuzu-traga':           'https://ik.imagekit.io/nepgaxllc/00000000dddsasdsadsdfsdfasdaasdasdasada-removebg-preview.png?updatedAt=1776113199000',
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
