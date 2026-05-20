// ============================================================================
// Indonesian motorbike color palette.
// ----------------------------------------------------------------------------
// Standard list spanning Honda / Yamaha / Suzuki / Kawasaki / Vespa
// 2023-2026 line-ups. Bahasa labels are what dealerships actually print
// on STNK (vehicle registration) — using these keeps the driver's
// listing aligned with their official documents.
//
// "Custom" + the free-text fallback handle the rare colour that's not
// in the palette (chrome wraps, two-tone factory specials, custom paint
// jobs). The picker accepts any typed value and saves it verbatim.
//
// Swatch hex values approximate the real factory paint code so the
// visual chip in the picker reads correctly. They're for UI display
// only — never used for matching or filtering.
// ============================================================================

export type BikeColor = {
  /** Canonical English label saved to bike_color column. */
  label: string
  /** Bahasa Indonesia label shown in the picker (matches STNK / Bahasa UI). */
  labelId: string
  /** Hex swatch for the picker chip. */
  swatch: string
  /** Optional second swatch — for two-tone or matte/glossy distinction. */
  swatchAccent?: string
}

export const BIKE_COLORS: ReadonlyArray<BikeColor> = [
  // Core single-tone — most common across all makes
  { label: 'Black',           labelId: 'Hitam',            swatch: '#0A0A0A' },
  { label: 'Matte Black',     labelId: 'Hitam Doff',       swatch: '#1A1A1A' },
  { label: 'White',           labelId: 'Putih',            swatch: '#F5F5F5' },
  { label: 'Matte White',     labelId: 'Putih Doff',       swatch: '#E8E8E8' },
  { label: 'Silver',          labelId: 'Silver',           swatch: '#C0C0C0' },
  { label: 'Grey',            labelId: 'Abu-abu',          swatch: '#808080' },
  { label: 'Matte Grey',      labelId: 'Abu-abu Doff',     swatch: '#5C5C5C' },

  // Reds + warm — Honda Sporty Red, Yamaha Matte Red, Vespa Rosso
  { label: 'Red',             labelId: 'Merah',            swatch: '#DC2626' },
  { label: 'Matte Red',       labelId: 'Merah Doff',       swatch: '#B91C1C' },
  { label: 'Maroon',          labelId: 'Marun',            swatch: '#7F1D1D' },
  { label: 'Orange',          labelId: 'Oranye',           swatch: '#F97316' },

  // Blues — Honda Sporty Blue, Yamaha Racing Blue
  { label: 'Blue',            labelId: 'Biru',             swatch: '#2563EB' },
  { label: 'Matte Blue',      labelId: 'Biru Doff',        swatch: '#1D4ED8' },
  { label: 'Navy',            labelId: 'Biru Tua',         swatch: '#1E3A8A' },
  { label: 'Sky Blue',        labelId: 'Biru Muda',        swatch: '#38BDF8' },

  // Greens
  { label: 'Green',           labelId: 'Hijau',            swatch: '#16A34A' },
  { label: 'Matte Green',     labelId: 'Hijau Doff',       swatch: '#15803D' },
  { label: 'Army Green',      labelId: 'Hijau Tentara',    swatch: '#4D5D3A' },
  { label: 'Kawasaki Green',  labelId: 'Hijau Kawasaki',   swatch: '#00B140' },

  // Yellow + lifestyle (Vespa, BeAT Street etc.)
  { label: 'Yellow',          labelId: 'Kuning',           swatch: '#FACC15' },
  { label: 'Gold',            labelId: 'Emas',             swatch: '#D4AF37' },
  { label: 'Beige',           labelId: 'Krem',             swatch: '#D2B48C' },
  { label: 'Brown',           labelId: 'Coklat',           swatch: '#92400E' },

  // Soft / pastel — popular on Scoopy, Fazzio, Filano
  { label: 'Pink',            labelId: 'Pink',             swatch: '#EC4899' },
  { label: 'Pulp Pink',       labelId: 'Pink Muda',        swatch: '#F9A8D4' },
  { label: 'Purple',          labelId: 'Ungu',             swatch: '#A855F7' },
  { label: 'Mint',            labelId: 'Mint',             swatch: '#86EFAC' },
  { label: 'Pastel Blue',     labelId: 'Biru Pastel',      swatch: '#BFDBFE' },
  { label: 'Pastel Green',    labelId: 'Hijau Pastel',     swatch: '#BBF7D0' },

  // Two-tone + special
  { label: 'Two-tone',        labelId: 'Dua Warna',        swatch: '#0A0A0A', swatchAccent: '#F5F5F5' },
  { label: 'Custom',          labelId: 'Kustom',           swatch: 'linear-gradient(135deg, #DC2626 0%, #2563EB 50%, #16A34A 100%)' },
]

/** Try to match a free-text color string to a known palette entry.
 *  Case-insensitive, checks both English + Bahasa labels. Returns null
 *  if no match — caller can keep the original free text. */
export function findColor(raw: string | null | undefined): BikeColor | null {
  if (!raw) return null
  const q = raw.toLowerCase().trim()
  return BIKE_COLORS.find(
    (c) => c.label.toLowerCase() === q || c.labelId.toLowerCase() === q,
  ) ?? null
}
