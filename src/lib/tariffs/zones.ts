// ============================================================================
// Indonesia ojek-online tariff zones (Permenhub PM 12/2019 + KP DJPD)
// ----------------------------------------------------------------------------
// Operative rates per Keputusan Direktur Jenderal Perhubungan Darat,
// announced by DJPHB Aan Suhanan on 30 June 2025 (Commission V DPR
// working session) and effective from 1 July 2025. As of May 2026
// these remain the active legal tariff while Kemenhub continues to
// study further adjustments. Verify against the current KP DJPD
// before publishing externally — regulations can change.
//
// Sources (web research, May 2026):
//   - hubdat.dephub.go.id (Kemenhub siaran pers)
//   - kompas.id, tempo.co, katadata.co.id, cnbcindonesia.com
//
// The platform uses these ONLY as advisory information shown to
// drivers + customers. Drivers are free to set ANY rate; the
// platform never enforces a floor or ceiling. This is a deliberate
// product decision to keep City Rider on the "directory" side of
// PM 12/2019 (not an aplikasi penyedia jasa angkutan / APJT).
// ============================================================================

export type Zone = 'I' | 'II' | 'III'

export type ZoneTariff = {
  zone: Zone
  /** Government-advised lower bound per km (Rp). */
  perKmMin: number
  /** Government-advised upper bound per km (Rp). */
  perKmMax: number
  /** Minimum total fare lower bound (Rp). */
  minFareMin: number
  /** Minimum total fare upper bound (Rp). */
  minFareMax: number
  /** Human-readable area label, Bahasa-first for driver-facing UI. */
  areaLabel: string
}

export const ZONE_TARIFFS: Record<Zone, ZoneTariff> = {
  I: {
    zone: 'I',
    perKmMin: 2_000,
    perKmMax: 2_500,
    minFareMin: 8_000,
    minFareMax: 10_000,
    areaLabel: 'Sumatera · Jawa (di luar Jabodetabek) · Bali',
  },
  II: {
    zone: 'II',
    perKmMin: 2_550,
    perKmMax: 2_800,
    minFareMin: 10_200,
    minFareMax: 11_200,
    areaLabel: 'Jabodetabek (Jakarta · Bogor · Depok · Tangerang · Bekasi)',
  },
  III: {
    zone: 'III',
    perKmMin: 2_300,
    perKmMax: 2_800,
    minFareMin: 9_200,
    minFareMax: 11_000,
    areaLabel: 'Kalimantan · Sulawesi · Nusa Tenggara · Maluku · Papua',
  },
}

// City → Zone mapping per Permenhub PM 12/2019 zonasi rules.
// Slugs match SUPPORTED_CITIES used elsewhere in the app.
export const CITY_TO_ZONE: Record<string, Zone> = {
  // Zone I — Sumatera, Java (excl. Jabodetabek), Bali
  yogyakarta:  'I',
  bandung:     'I',
  surabaya:    'I',
  denpasar:    'I',
  medan:       'I',
  semarang:    'I',
  malang:      'I',
  solo:        'I',
  palembang:   'I',
  padang:      'I',

  // Zone II — Jabodetabek
  jakarta:     'II',
  bogor:       'II',
  depok:       'II',
  bekasi:      'II',
  tangerang:   'II',

  // Zone III — Kalimantan, Sulawesi, NTB/NTT, Maluku, Papua
  makassar:    'III',
  manado:      'III',
  balikpapan:  'III',
  pontianak:   'III',
  banjarmasin: 'III',
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** Returns the tariff bundle for a city, or null if the city isn't mapped. */
export function getTariffForCity(city: string | null | undefined): ZoneTariff | null {
  if (!city) return null
  const zone = CITY_TO_ZONE[city]
  if (!zone) return null
  return ZONE_TARIFFS[zone]
}

/** Midpoint of the per-km range — the "reset to law rate" value. */
export function lawRatePerKm(city: string | null | undefined): number | null {
  const t = getTariffForCity(city)
  if (!t) return null
  return Math.round((t.perKmMin + t.perKmMax) / 2)
}

/** Midpoint of the min-fare range. */
export function lawMinFare(city: string | null | undefined): number | null {
  const t = getTariffForCity(city)
  if (!t) return null
  return Math.round((t.minFareMin + t.minFareMax) / 2)
}

/** True when the rate falls inside the government-advised band. */
export function isPerKmWithinLaw(perKm: number, city: string | null | undefined): boolean {
  const t = getTariffForCity(city)
  if (!t) return false
  return perKm >= t.perKmMin && perKm <= t.perKmMax
}
