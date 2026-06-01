// ============================================================================
// Bus / minibus visual-style catalog + image lookup.
// ----------------------------------------------------------------------------
// Founder-supplied 2026-06-01: 5 hand-rendered bus images, one per visual
// preset. Bus drivers pick ONE preset from their dashboard
// (/dashboard/bus/vehicle). The picked preset is stored on
// drivers.vehicle_color and surfaces on:
//   • the /cari driver card (when the customer picked the Bus filter)
//   • the /bus/[slug] public profile page hero / vehicle slot
//
// Lookup is case + spelling tolerant: normalises Bahasa + English variants
// to the same catalog entry (e.g. "Putih", "white-green", "PUTIH HIJAU" all
// map to the same image). Unknown preset falls back to the white-green
// default so the surface never renders a blank tile.
// ============================================================================

export type BusStyleKey =
  | 'red'
  | 'yellow'
  | 'black'
  | 'red_sticker'
  | 'white_green'

export type BusStyleOption = {
  key:     BusStyleKey
  label:   string   // English display label
  labelId: string   // Bahasa display label (for ID picker)
  swatch:  string   // hex for the picker tile background dot
  url:     string   // hosted image URL
}

export const BUS_STYLE_OPTIONS: ReadonlyArray<BusStyleOption> = [
  {
    key: 'white_green', label: 'White / Green', labelId: 'Putih Hijau', swatch: '#16A34A',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2010_33_57%20AM.png',
  },
  {
    key: 'yellow', label: 'Yellow', labelId: 'Kuning', swatch: '#FACC15',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2010_43_27%20AM.png',
  },
  {
    key: 'red', label: 'Red', labelId: 'Merah', swatch: '#DC2626',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2010_45_54%20AM.png',
  },
  {
    key: 'red_sticker', label: 'Red Stickered', labelId: 'Merah Stiker', swatch: '#B91C1C',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2010_34_30%20AM.png',
  },
  {
    key: 'black', label: 'Black', labelId: 'Hitam', swatch: '#0A0A0A',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2010_35_04%20AM.png',
  },
] as const

const NORM: Record<string, BusStyleKey> = {
  // English / single-word forms
  red:           'red',     merah:         'red',
  yellow:        'yellow',  kuning:        'yellow',
  black:         'black',   hitam:         'black',
  // Stickered red — multiple aliases
  'red sticker': 'red_sticker', red_sticker: 'red_sticker',
  'merah stiker':'red_sticker', merah_stiker:'red_sticker',
  stickered:     'red_sticker',
  // Two-tone white-green — covers default seed values like "Putih",
  // "Silver" that don't carry a colour intent of their own.
  'white green': 'white_green', white_green: 'white_green',
  'putih hijau': 'white_green', putih_hijau: 'white_green',
  'white-green': 'white_green',
  white:         'white_green',  putih:       'white_green',
  silver:        'white_green',  green:       'white_green',  hijau: 'white_green',
}

const FALLBACK_KEY: BusStyleKey = 'white_green'

/** Normalise a raw style/colour string (any case, Bahasa or English,
 *  single-word or two-word like "Red Sticker") to the catalog key.
 *  Returns the fallback key when unrecognised. */
export function normalizeBusStyle(raw: string | null | undefined): BusStyleKey {
  if (!raw) return FALLBACK_KEY
  const k = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  return NORM[k] ?? NORM[k.replace(/\s+/g, '_')] ?? FALLBACK_KEY
}

/** Image URL for a style. Always returns a hosted bus image — never
 *  null. Falls back to white/green for unrecognised values. */
export function getBusImageUrl(style: string | null | undefined): string {
  const key = normalizeBusStyle(style)
  return BUS_STYLE_OPTIONS.find((o) => o.key === key)!.url
}

/** Look up the full option (incl. swatch + labels) for a style. Useful
 *  for the dashboard picker preview + the public profile style badge. */
export function getBusStyleOption(style: string | null | undefined): BusStyleOption {
  const key = normalizeBusStyle(style)
  return BUS_STYLE_OPTIONS.find((o) => o.key === key)!
}
