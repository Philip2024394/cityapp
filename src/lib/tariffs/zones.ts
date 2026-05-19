// ============================================================================
// Indonesia ojek-online tariff zones — government-regulated minimums
// ----------------------------------------------------------------------------
// LEGAL BASIS
//
//  * KP 667/2022 (Kemenhub) — Pedoman Perhitungan Biaya Jasa Kendaraan
//    Bermotor Roda Dua Yang Digunakan Untuk Kepentingan Masyarakat Yang
//    Dilakukan Dengan Aplikasi. Defines zonasi + batas bawah/atas per km
//    and biaya jasa minimum for the first 4 km. This is the operative
//    regulation for PASSENGER rides (antar penumpang).
//
//  * KP-DRJD 5201/2025 — implementing/adjusting decision issued by the
//    Direktur Jenderal Perhubungan Darat. As of May 2026 this is the
//    most recent published instrument touching ojol tariffs. The
//    primary sources (hukumonline.com and hubdat.dephub.go.id) are
//    behind 403/502 from external IPs; numbers below are reconciled
//    from Katadata + Tempo + Kompas reporting that read the document
//    directly. VERIFY against the active KP before publishing to
//    real drivers.
//
//  * Permenkominfo 1/2012 — governs courier-style tariffs. PARCEL
//    delivery and FOOD delivery are NOT under Permenhub PM 12/2019;
//    they are "diserahkan kepada masing-masing perusahaan"
//    (delegated to each operator). NO government floor or ceiling
//    applies to parcel/food rates — the driver sets these freely.
//
//  * Local taxi rates (online taksi 4-wheel) are set by pemda — out
//    of scope for this directory.
//
// HOW THIS FILE IS USED
//
// Only as advisory information shown to drivers + customers on the
// onboarding form. The platform NEVER enforces a floor or ceiling
// — drivers can save any rate. Reset button snaps to perKmMin
// (the legal lowest rate / batas bawah), which is what most drivers
// want to advertise competitively. The platform stays a directory
// under PM 12/2019, not an aplikasi penyedia jasa angkutan.
// ============================================================================

export type Zone = 'I' | 'II' | 'III'

export type ZoneTariff = {
  zone: Zone
  /** Government-mandated lower bound per km (Rp). The "lowest legal rate." */
  perKmMin: number
  /** Government-mandated upper bound per km (Rp). */
  perKmMax: number
  /** Minimum total fare floor — lower bound (Rp). For trips under ~4 km. */
  minFareMin: number
  /** Minimum total fare floor — upper bound (Rp). */
  minFareMax: number
  /** Human-readable area label for the UI. */
  areaLabel: string
}

// Numbers reconciled from KP 667/2022 + KP-DRJD 5201/2025 reporting.
// PASSENGER rides only. Parcel + food are NOT regulated — see file
// header.
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
    perKmMin: 2_650,
    perKmMax: 2_750,
    minFareMin: 10_500,
    minFareMax: 13_000,
    areaLabel: 'Jabodetabek (Jakarta · Bogor · Depok · Tangerang · Bekasi)',
  },
  III: {
    zone: 'III',
    perKmMin: 2_300,
    perKmMax: 2_750,
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

/**
 * Lowest legal per-km rate for a city (Rp) — the batas bawah from KP 667/2022.
 * This is what the Reset → law-rate button snaps to. Drivers can set lower
 * but they are then below the official tariff floor.
 */
export function legalMinPerKm(city: string | null | undefined): number | null {
  return getTariffForCity(city)?.perKmMin ?? null
}

/**
 * Lowest legal minimum fare for a city (Rp) — biaya jasa minimum lower bound
 * from KP 667/2022. Applies to short trips (under ~4 km).
 */
export function legalMinFare(city: string | null | undefined): number | null {
  return getTariffForCity(city)?.minFareMin ?? null
}

/** True when the per-km rate falls inside the legal band. */
export function isPerKmWithinLaw(perKm: number, city: string | null | undefined): boolean {
  const t = getTariffForCity(city)
  if (!t) return false
  return perKm >= t.perKmMin && perKm <= t.perKmMax
}

/**
 * Legacy helper kept for older imports. Returns the LEGAL MINIMUM (batas bawah)
 * to match the new "reset to lowest legal rate" behaviour, not the midpoint.
 */
export function lawRatePerKm(city: string | null | undefined): number | null {
  return legalMinPerKm(city)
}

/**
 * Legacy helper kept for older imports. Returns the LEGAL MINIMUM fare.
 */
export function lawMinFare(city: string | null | undefined): number | null {
  return legalMinFare(city)
}

// ─────────────────────────────────────────────────────────────────────
// Service-level regulation status
// ─────────────────────────────────────────────────────────────────────
//
// Used by the UI to render advisory hints per service tile. Only
// PASSENGER rides (person) are price-regulated by the government;
// the platform should make this explicit to the driver so they
// understand which floor matters and which they set freely.
//
import type { ServiceType } from '@/types/rider'

export const SERVICE_REGULATION: Record<ServiceType, {
  regulated: boolean
  basis: string
}> = {
  person: {
    regulated: true,
    basis: 'Diatur KP 667/2022 + KP-DRJD 5201/2025',
  },
  parcel: {
    regulated: false,
    basis: 'Tidak diatur pemerintah (Permenkominfo 1/2012 — operator menetapkan)',
  },
  food: {
    regulated: false,
    basis: 'Tidak diatur pemerintah (Permenkominfo 1/2012 — operator menetapkan)',
  },
}
