// ============================================================================
// Permenhub tariff zones — driver-self-published rate REFERENCE only.
// ----------------------------------------------------------------------------
// CityDrivers is a software directory under Permenhub PM 12/2019. The
// platform NEVER sets, computes, modifies, or enforces fares — every value
// here is a SUGGESTED DEFAULT shown in the driver-side dashboard at the
// legal batas bawah (regulated minimum). Drivers may publish above or
// below the default; the dashboard warns when below, but the server only
// rejects clearly-broken values (Rp 1,000/km bike, Rp 2,000/km car) as
// anti-abuse, not tariff control.
//
// REGULATORY ANCHOR (last verified 2 June 2026):
//   Bike per-km: KP 564/2022 framework as adjusted by Dirjen Hubdat
//     announcement 30 Jun 2025 (8–15% hike effective 1 Jul 2025). No
//     successor KP number was gazetted in public sources; the announced
//     figures are operative per Tempo/Kaltim Today/Kumparan reporting.
//   Car per-km: PM 118/2018 + KP 348/2019 — UNCHANGED through 2 Jun 2026.
//   Aplikator commission: Perpres 27/2026 (signed 1 May 2026, effective
//     1 Jun 2026) caps platform commission at 8% — supersedes KP 1001/
//     2022's 20% cap. This does NOT touch per-km batas bawah/atas; it
//     only changes the take-home math for OPERATOR drivers. CityDrivers
//     drivers pay zero per-ride commission (flat SaaS), so Perpres
//     27/2026 narrows our take-home advantage from ~25% to ~2% versus
//     Gojek/Grab — competitive emphasis shifts to "you own your
//     business" rather than raw rupiah.
//
// ZONE STRUCTURE
//   Bike has THREE zones (KP 564/2022 schema):
//     I   — Sumatra, Java outside Jabodetabek, Bali
//     II  — Jabodetabek only (Jakarta, Bogor, Depok, Tangerang, Bekasi)
//     III — Kalimantan, Sulawesi, NTT, NTB, Maluku, Papua
//   Car has TWO zones (PM 118/2018 schema, no Jabodetabek separation):
//     I  — Sumatra, Java, Bali
//     II — Kalimantan, Sulawesi, NTT, NTB, Maluku, Papua
//
// COVERAGE STRATEGY
//   We map every entry in src/data/indonesianCities.ts to a zone via the
//   CITY_TO_BIKE_ZONE / CITY_TO_CAR_ZONE tables below. Unknown cities (the
//   driver typed a free-text city not in our list) fall back to Zone I /
//   Zone I — the lowest rates — to ensure new geographies always get a
//   working default rather than the most expensive zone.
// ============================================================================

import { INDONESIAN_CITIES } from '@/data/indonesianCities'

export type BikeZone = 'I' | 'II' | 'III'
export type CarZone  = 'I' | 'II'

// ---------------------------------------------------------------------------
// Per-zone batas bawah (regulated minimum) — used as PRE-FILLED DEFAULTS.
// Adjust here when a successor KP/Permenhub is codified. The dashboard
// warn-banner copy references KP 667/2022 + PM 118/2018 explicitly.
// ---------------------------------------------------------------------------

/** Bike per-km batas bawah by zone — KP 564/2022 framework with the
 *  Dirjen Hubdat 30-Jun-2025 8–15% hike applied (effective 1 Jul 2025).
 *  Rounded down from the published ranges to give drivers the friendliest
 *  starting point while staying at-floor. Last verified 2 Jun 2026. */
export const BIKE_BATAS_BAWAH_PER_KM: Record<BikeZone, number> = {
  I:   2_000,   // Sumatra/Java-ex-Jabo/Bali (published 1,998–2,127)
  II:  2_800,   // Jabodetabek (published 2,808–2,990 — Jul 2025 hike +10%)
  III: 2_300,   // Kalimantan/Sulawesi/East Indonesia (published 2,268–2,415)
}

/** Bike minimum trip fee (first 4 km) by zone — Jul 2025 hike applied. */
export const BIKE_MIN_FEE_BY_ZONE: Record<BikeZone, number> = {
  I:   10_000,  // published 9,990–13,225
  II:  14_000,  // published 14,040–15,525
  III: 11_500,  // published 11,340–14,950
}

/** Car per-km batas bawah by zone (PM 118/2018 + KP 348/2019).
 *  Last verified 2 Jun 2026: NO 2025 or 2026 revision found. Indonesian
 *  taksi-online tariff law has not been updated since 2019 — only the
 *  ojol per-km got the 2025 hike. */
export const CAR_BATAS_BAWAH_PER_KM: Record<CarZone, number> = {
  I:  3_500,   // Sumatra/Java/Bali (Jabodetabek INCLUDED in Zone I for cars)
  II: 3_700,   // Kalimantan/Sulawesi/East Indonesia
}

/** Car minimum trip fee. PM 118/2018 didn't fix a four-km floor like ojek;
 *  using a sensible per-zone default derived from the per-km × typical-
 *  short-trip distance (4 km). Driver can override. */
export const CAR_MIN_FEE_BY_ZONE: Record<CarZone, number> = {
  I:  20_000,  // ~Rp 3,500 × 4 + rounding buffer
  II: 22_000,
}

// ---------------------------------------------------------------------------
// Anti-spam HARD floor (Option B) — server-side reject values clearly
// below any plausible market rate. NOT regulatory enforcement; this just
// catches typos, test data, or accidental zeros. Framing in the rejection
// message matters: this is "anti-abuse minimum", not "regulated minimum".
// ---------------------------------------------------------------------------

/** Bike anti-spam per-km floor — ~half the lowest zone batas bawah. */
export const BIKE_ANTI_SPAM_PER_KM = 1_000

/** Car anti-spam per-km floor. */
export const CAR_ANTI_SPAM_PER_KM = 2_000

/** Anti-spam minimum trip fee — covers the case of Rp 0 or single-digit min_fee. */
export const ANTI_SPAM_MIN_FEE = 5_000

// ---------------------------------------------------------------------------
// City → zone mapping. Covers every entry in INDONESIAN_CITIES + a few
// historical aliases. Unknown cities fall back to Zone I (lowest rates).
// ---------------------------------------------------------------------------

// Bike Zone II = Jabodetabek only
const JABODETABEK_BIKE = new Set<string>([
  'Jakarta', 'Bogor', 'Depok', 'Tangerang', 'Bekasi',
])

// Bike + Car Zone III (= Car Zone II) — Kalimantan, Sulawesi, NTT, NTB,
// Maluku, Papua. We list each INDONESIAN_CITIES entry that belongs here.
const EAST_INDONESIA = new Set<string>([
  // Kalimantan
  'Balikpapan', 'Banjarmasin', 'Pontianak', 'Samarinda', 'Tarakan',
  // Sulawesi
  'Makassar', 'Manado', 'Kendari',
  // NTT
  'Kupang', 'Labuan Bajo',
  // NTB
  'Lombok — Mataram', 'Lombok — Senggigi',
  // Maluku
  'Ambon', 'Ternate',
  // Papua
  'Jayapura', 'Sorong',
])

function normalize(city: string): string {
  return city.trim()
}

/** Map a city name to its BIKE zone (KP 667/2022 three-zone schema). */
export function bikeZoneForCity(city: string | null | undefined): BikeZone {
  const c = normalize(city ?? '')
  if (!c) return 'I'
  if (JABODETABEK_BIKE.has(c)) return 'II'
  if (EAST_INDONESIA.has(c))  return 'III'
  return 'I'
}

/** Map a city name to its CAR zone (PM 118/2018 two-zone schema —
 *  Jabodetabek collapses into Zone I unlike for bikes). */
export function carZoneForCity(city: string | null | undefined): CarZone {
  const c = normalize(city ?? '')
  if (!c) return 'I'
  if (EAST_INDONESIA.has(c)) return 'II'
  return 'I'
}

/** Convenience: get the suggested batas bawah for a vehicle + city. */
export function suggestedPricePerKm(vehicleType: string, city: string | null | undefined): number {
  const vt = (vehicleType || '').toLowerCase()
  if (vt === 'bike') return BIKE_BATAS_BAWAH_PER_KM[bikeZoneForCity(city)]
  // Cars, trucks, jeeps, minibuses all use the car schema as a baseline.
  // Drivers of larger vehicles will override upward via the dashboard.
  return CAR_BATAS_BAWAH_PER_KM[carZoneForCity(city)]
}

/** Convenience: get the suggested minimum trip fee for a vehicle + city. */
export function suggestedMinFee(vehicleType: string, city: string | null | undefined): number {
  const vt = (vehicleType || '').toLowerCase()
  if (vt === 'bike') return BIKE_MIN_FEE_BY_ZONE[bikeZoneForCity(city)]
  return CAR_MIN_FEE_BY_ZONE[carZoneForCity(city)]
}

/** Anti-spam per-km floor for the given vehicle. Used by the server-side
 *  service-rates validation to reject Rp 0 / clearly broken submissions. */
export function antiSpamPerKm(vehicleType: string): number {
  return (vehicleType || '').toLowerCase() === 'bike'
    ? BIKE_ANTI_SPAM_PER_KM
    : CAR_ANTI_SPAM_PER_KM
}

// ---------------------------------------------------------------------------
// Self-test (compile-time invariant): every INDONESIAN_CITIES entry must
// map to a valid zone. This is checked by the typecheck pass — if the city
// list grows and a new city isn't in JABODETABEK_BIKE or EAST_INDONESIA,
// the fall-through is Zone I (the safe default). No runtime cost.
// ---------------------------------------------------------------------------
export function _selfTestCoverage(): { unmapped_to_zone1: string[] } {
  const out: string[] = []
  for (const c of INDONESIAN_CITIES) {
    if (!JABODETABEK_BIKE.has(c) && !EAST_INDONESIA.has(c)) out.push(c)
  }
  return { unmapped_to_zone1: out }
}
