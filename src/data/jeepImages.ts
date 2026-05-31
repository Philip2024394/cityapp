// ============================================================================
// Jeep color catalog + image lookup.
// ----------------------------------------------------------------------------
// Founder-supplied 2026-05-31: 8 hand-rendered jeep photos, one per body
// colour. Jeep drivers pick ONE colour from their dashboard
// (/dashboard/jeep/vehicle). The picked colour is stored on
// drivers.vehicle_color and surfaces on:
//   • the /jeep marketplace card
//   • the /cari driver card (when the customer picked the Jeep filter)
//   • the /jeep/[slug] public profile page hero
//
// Lookup is case + spelling tolerant: normalises Bahasa + English variants
// to the same catalog entry (e.g. "Kuning", "yellow", "YELLOW" all map to
// the same image). Unknown colour falls back to the yellow default so the
// surface never renders a blank tile.
// ============================================================================

export type JeepColorKey =
  | 'yellow' | 'brown' | 'black' | 'cream'
  | 'blue'   | 'army_green' | 'red' | 'green'

export type JeepColorOption = {
  key:     JeepColorKey
  label:   string   // English display label
  labelId: string   // Bahasa display label (for ID picker)
  swatch:  string   // hex for the picker tile background dot
  url:     string   // hosted image URL
}

export const JEEP_COLOR_OPTIONS: ReadonlyArray<JeepColorOption> = [
  {
    key: 'yellow', label: 'Yellow', labelId: 'Kuning', swatch: '#FACC15',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2001_15_37%20PM.png',
  },
  {
    key: 'brown', label: 'Brown', labelId: 'Coklat', swatch: '#8B5E3C',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2001_12_47%20PM.png',
  },
  {
    key: 'black', label: 'Black', labelId: 'Hitam', swatch: '#0A0A0A',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2001_06_42%20PM.png',
  },
  {
    key: 'cream', label: 'Cream', labelId: 'Krem', swatch: '#F5E9C9',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2001_03_22%20PM.png',
  },
  {
    key: 'blue', label: 'Blue', labelId: 'Biru', swatch: '#2563EB',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2001_01_58%20PM.png',
  },
  {
    key: 'army_green', label: 'Army Green', labelId: 'Hijau Army', swatch: '#4B5320',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_58_26%20PM.png',
  },
  {
    key: 'red', label: 'Red', labelId: 'Merah', swatch: '#DC2626',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_57_39%20PM.png',
  },
  {
    key: 'green', label: 'Green', labelId: 'Hijau', swatch: '#16A34A',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_58_03%20PM.png',
  },
] as const

const NORM: Record<string, JeepColorKey> = {
  yellow:     'yellow', kuning:    'yellow',
  brown:      'brown',  coklat:    'brown',  cokelat: 'brown',
  black:      'black',  hitam:     'black',
  cream:      'cream',  krem:      'cream',
  blue:       'blue',   biru:      'blue',
  'army green': 'army_green', army_green: 'army_green',
  'hijau army': 'army_green', army:        'army_green',
  red:        'red',    merah:     'red',
  green:      'green',  hijau:     'green',
}

const FALLBACK_KEY: JeepColorKey = 'yellow'

/** Normalise a raw colour string (any case, Bahasa or English, single-word
 *  or two-word like "Army Green") to the catalog key. Returns the fallback
 *  key when unrecognised so callers can always render an image. */
export function normalizeJeepColor(raw: string | null | undefined): JeepColorKey {
  if (!raw) return FALLBACK_KEY
  const k = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  return NORM[k] ?? NORM[k.replace(/\s+/g, '_')] ?? FALLBACK_KEY
}

/** Image URL for a colour. Always returns a hosted jeep image — never
 *  null. Falls back to the yellow default for unrecognised colours. */
export function getJeepImageUrl(color: string | null | undefined): string {
  const key = normalizeJeepColor(color)
  return JEEP_COLOR_OPTIONS.find((o) => o.key === key)!.url
}

/** Look up the full option (incl. swatch + labels) for a colour. Useful
 *  for the dashboard picker preview + the public profile colour badge. */
export function getJeepColorOption(color: string | null | undefined): JeepColorOption {
  const key = normalizeJeepColor(color)
  return JEEP_COLOR_OPTIONS.find((o) => o.key === key)!
}
