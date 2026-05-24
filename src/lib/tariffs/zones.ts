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
//
// Coverage: curated list of the major Indonesian kabupaten/kota
// (provincial capitals + populous secondary cities). For cities not
// in this map, callers should fall back to zoneFromLatLng() which
// returns the right zone for any lat/lng inside Indonesia via
// regional bbox testing.
export const CITY_TO_ZONE: Record<string, Zone> = {
  // ── Zone I — Sumatera + Java (excl. Jabodetabek) + Bali ────────────────────
  // Java (DIY + Jawa Tengah + Jawa Timur + Jawa Barat + Banten — non-Jabotabek)
  yogyakarta:    'I', sleman:        'I', bantul:        'I', kulonprogo:    'I',
  gunungkidul:   'I',
  bandung:       'I', cimahi:        'I', cirebon:       'I', sukabumi:      'I',
  tasikmalaya:   'I', garut:         'I', purwakarta:    'I', subang:        'I',
  indramayu:     'I',
  surabaya:      'I', malang:        'I', kediri:        'I', mojokerto:     'I',
  madiun:        'I', probolinggo:   'I', pasuruan:      'I', batu:          'I',
  blitar:        'I', jember:        'I', banyuwangi:    'I', sidoarjo:      'I',
  gresik:        'I', tuban:         'I', lamongan:      'I',
  semarang:      'I', solo:          'I', surakarta:     'I', tegal:         'I',
  pekalongan:    'I', magelang:      'I', salatiga:      'I', purwokerto:    'I',
  cilacap:       'I', kudus:         'I', jepara:        'I', pati:          'I',
  serang:        'I', cilegon:       'I', pandeglang:    'I', lebak:         'I',
  // Bali
  denpasar:      'I', badung:        'I', gianyar:       'I', tabanan:       'I',
  klungkung:     'I', bangli:        'I', karangasem:    'I', buleleng:      'I',
  jembrana:      'I', ubud:          'I', kuta:          'I', canggu:        'I',
  // Sumatera
  medan:         'I', binjai:        'I', deli_serdang:  'I', tebing_tinggi: 'I',
  pematangsiantar: 'I',
  padang:        'I', bukittinggi:   'I', payakumbuh:    'I', padangpanjang: 'I',
  pariaman:      'I', solok:         'I', sawahlunto:    'I',
  palembang:     'I', prabumulih:    'I', lubuklinggau:  'I', pagaralam:     'I',
  pekanbaru:     'I', dumai:         'I',
  jambi:         'I', sungaipenuh:   'I',
  bandar_lampung:'I', bandarlampung: 'I', metro:         'I',
  bengkulu:      'I',
  banda_aceh:    'I', bandaaceh:     'I', lhokseumawe:   'I', langsa:        'I',
  sabang:        'I', subulussalam:  'I',
  tanjungpinang: 'I', batam:         'I',
  pangkalpinang: 'I',

  // ── Zone II — Jabodetabek ──────────────────────────────────────────────────
  jakarta:        'II', jakartautara:  'II', jakartapusat:  'II', jakartabarat: 'II',
  jakartaselatan: 'II', jakartatimur:  'II',
  bogor:          'II', depok:         'II', bekasi:        'II',
  tangerang:      'II', tangerangselatan: 'II', tangerang_selatan: 'II',

  // ── Zone III — Kalimantan + Sulawesi + NTB/NTT + Maluku + Papua ────────────
  // Kalimantan
  pontianak:     'III', singkawang:    'III',
  banjarmasin:   'III', banjarbaru:    'III',
  palangkaraya:  'III', palangka_raya: 'III',
  samarinda:     'III', balikpapan:    'III', bontang:       'III',
  tarakan:       'III',
  // Sulawesi
  makassar:      'III', parepare:      'III', palopo:        'III',
  manado:        'III', bitung:        'III', tomohon:       'III', kotamobagu:    'III',
  palu:          'III',
  kendari:       'III', baubau:        'III', bau_bau:       'III',
  gorontalo:     'III',
  mamuju:        'III',
  // Nusa Tenggara
  mataram:       'III', bima:          'III',
  kupang:        'III',
  // Maluku
  ambon:         'III', tual:          'III',
  ternate:       'III', tidore:        'III',
  // Papua
  jayapura:      'III', sorong:        'III', manokwari:     'III', merauke:       'III',
  timika:        'III',
}

// ─────────────────────────────────────────────────────────────────────
// Lat/lng → Zone fallback. Covers every Indonesia coordinate via
// regional bbox + island-edge tests. Used when a driver's city slug
// isn't in CITY_TO_ZONE — e.g. drivers in a sub-district town we haven't
// listed individually. The returned zone matches what Permenhub PM
// 12/2019 zonasi would assign for that island/region.
// ─────────────────────────────────────────────────────────────────────

// Jabodetabek bounding box — Greater Jakarta covering Jakarta DKI +
// surrounding kabupaten (Bogor / Depok / Tangerang / Bekasi). Generous
// margins to absorb peri-urban edges (Karawang, Serang, etc. stay
// Zone I per gov spec — they're NOT Jabodetabek).
const JABODETABEK_BBOX = {
  south: -6.55, north: -5.90,
  west:  106.40, east:  107.20,
} as const

// Indonesia outer bbox — sanity gate before zone inference. Coords
// outside this range can't be assigned a zone.
const INDONESIA_BBOX = {
  south: -11, north: 6,
  west:  94,  east:  142,
} as const

function isInBbox(
  lat: number, lng: number,
  b: { south: number; north: number; west: number; east: number },
): boolean {
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east
}

/**
 * Maps any Indonesia lat/lng to its tariff zone via regional bbox tests.
 * Returns null when the coordinate is outside the Indonesia bbox.
 *
 * Regions (per KP 667/2022 zonasi):
 *  - Zone II: Jabodetabek bbox (Jakarta metro)
 *  - Zone III: Kalimantan, Sulawesi, Nusa Tenggara, Maluku, Papua
 *              (i.e. east of ~116°E + Kalimantan island bbox)
 *  - Zone I: Sumatera + Java (excl. Jabodetabek) + Bali (default)
 */
export function zoneFromLatLng(lat: number, lng: number): Zone | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (!isInBbox(lat, lng, INDONESIA_BBOX)) return null

  // Zone II — Jabodetabek
  if (isInBbox(lat, lng, JABODETABEK_BBOX)) return 'II'

  // Zone III — Eastern Indonesia (Nusa Tenggara, Sulawesi, Maluku, Papua)
  // Cutoff at longitude 116°E (just east of Lombok). Catches NTB, NTT,
  // Sulawesi, Maluku, Papua in one rule.
  if (lng >= 116) return 'III'

  // Zone III — Kalimantan (south of equator + 4°N, west of 119°E,
  // north of -4°S). Covers Kalimantan Barat / Tengah / Selatan / Timur /
  // Utara without bleeding into Java (which is south of -5°S).
  if (lat >= -4 && lat <= 5 && lng >= 108 && lng < 119) return 'III'

  // Default — Zone I (Sumatera + Java [excl. Jabodetabek] + Bali)
  return 'I'
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Returns the tariff bundle for a city, or null if neither the city
 * slug nor the optional lat/lng resolves to a zone.
 *
 * Lookup order:
 *  1. Normalised city slug (lower-case, spaces → underscores) against
 *     CITY_TO_ZONE — fast path for the curated list
 *  2. lat/lng → zoneFromLatLng() polygon fallback when supplied
 *  3. null
 */
export function getTariffForCity(
  city: string | null | undefined,
  coords?: { lat: number; lng: number } | null,
): ZoneTariff | null {
  if (city) {
    const slug = normaliseCitySlug(city)
    const z = CITY_TO_ZONE[slug]
    if (z) return ZONE_TARIFFS[z]
  }
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
    const z = zoneFromLatLng(coords.lat, coords.lng)
    if (z) return ZONE_TARIFFS[z]
  }
  return null
}

/** Normalise free-form city text → slug for CITY_TO_ZONE lookup.
 *  "Bandar Lampung" → "bandar_lampung", "BANDUNG " → "bandung". */
export function normaliseCitySlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

/**
 * Lowest legal per-km rate for a city (Rp) — the batas bawah from KP 667/2022.
 * This is what the Reset → law-rate button snaps to. Drivers can set lower
 * but they are then below the official tariff floor.
 *
 * Optional `coords` fallback resolves zone via lat/lng when the city
 * slug isn't in CITY_TO_ZONE.
 */
export function legalMinPerKm(
  city: string | null | undefined,
  coords?: { lat: number; lng: number } | null,
): number | null {
  return getTariffForCity(city, coords)?.perKmMin ?? null
}

/**
 * Lowest legal minimum fare for a city (Rp) — biaya jasa minimum lower bound
 * from KP 667/2022. Applies to short trips (under ~4 km).
 */
export function legalMinFare(
  city: string | null | undefined,
  coords?: { lat: number; lng: number } | null,
): number | null {
  return getTariffForCity(city, coords)?.minFareMin ?? null
}

/** True when the per-km rate falls inside the legal band. */
export function isPerKmWithinLaw(
  perKm: number,
  city: string | null | undefined,
  coords?: { lat: number; lng: number } | null,
): boolean {
  const t = getTariffForCity(city, coords)
  if (!t) return false
  return perKm >= t.perKmMin && perKm <= t.perKmMax
}

/**
 * Legacy helper kept for older imports. Returns the LEGAL MINIMUM (batas bawah)
 * to match the new "reset to lowest legal rate" behaviour, not the midpoint.
 */
export function lawRatePerKm(
  city: string | null | undefined,
  coords?: { lat: number; lng: number } | null,
): number | null {
  return legalMinPerKm(city, coords)
}

/**
 * Legacy helper kept for older imports. Returns the LEGAL MINIMUM fare.
 */
export function lawMinFare(
  city: string | null | undefined,
  coords?: { lat: number; lng: number } | null,
): number | null {
  return legalMinFare(city, coords)
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

// ─────────────────────────────────────────────────────────────────────
// Suggested PARCEL + FOOD rates per zone (City Rider platform defaults)
// ─────────────────────────────────────────────────────────────────────
//
// Parcel + food have NO statutory floor in Indonesia (Permenkominfo
// 1/2012 delegates to operators, and the new Perpres 27/2026 only
// caps commission — not floor rates). So these are PLATFORM-SET
// suggested minimums derived from May 2026 market research:
//
// PARCEL benchmarks (motorcycle, intra-city, same-day, per-km):
//   GoSend Instant Yogya ~Rp 2,000/km, Rp 8-10k min
//   GoSend Instant Jakarta ~Rp 2,500/km, Rp 20k min
//   GrabExpress Instant Bike Rp 3,000/km, Rp 20k min
//   Lalamove Motor ~Rp 2,000-2,300/km, Rp 8k min
// Our defaults sit at/below the lowest competitor while staying ABOVE
// the passenger ojol floor (which is a fair-pay signal).
//
// FOOD benchmarks (driver-facing, same-day):
//   GoFood Jabodetabek customer ~Rp 2,815/km + Rp 13k min
//   GoFood Zona I customer ~Rp 2,000/km + Rp 8-10k min
//   GrabFood ~Rp 2,500/km after 4km + Rp 10,400 min
//   ShopeeFood flat ~Rp 10k/order
// City Rider drivers KEEP 100% (vs incumbents' 92% post-Perpres 27/2026,
// or 80% pre-June 2026). Customer pays roughly the same; driver earns more.

export const SUGGESTED_PARCEL_RATES: Record<Zone, {
  perKmMin: number
  minFareMin: number
  basis: string
}> = {
  I: {
    perKmMin: 2_500,
    minFareMin: 10_000,
    basis: 'Riset Mei 2026 — di bawah GrabExpress, paritas GoSend Yogya',
  },
  II: {
    perKmMin: 3_000,
    minFareMin: 15_000,
    basis: 'Riset Mei 2026 — di atas batas bawah penumpang Jabodetabek',
  },
  III: {
    perKmMin: 2_700,
    minFareMin: 11_000,
    basis: 'Riset Mei 2026 — proxy dari ojol penumpang Zona III',
  },
}

export const SUGGESTED_FOOD_RATES: Record<Zone, {
  perKmMin: number
  minFareMin: number
  basis: string
}> = {
  I: {
    perKmMin: 2_500,
    minFareMin: 12_000,
    basis: 'Riset Mei 2026 — driver dapat 100% (vs GoFood 92% pasca-Perpres 27/2026)',
  },
  II: {
    perKmMin: 2_500,
    minFareMin: 12_000,
    basis: 'Riset Mei 2026 — paritas harga konsumen GoFood Jabodetabek',
  },
  III: {
    perKmMin: 2_500,
    minFareMin: 12_000,
    basis: 'Riset Mei 2026 — sama dengan Zona I/II',
  },
}

function resolveZone(
  city: string | null | undefined,
  coords?: { lat: number; lng: number } | null,
): Zone | null {
  if (city) {
    const slug = normaliseCitySlug(city)
    if (CITY_TO_ZONE[slug]) return CITY_TO_ZONE[slug]
  }
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
    return zoneFromLatLng(coords.lat, coords.lng)
  }
  return null
}

/** Suggested per-km rate for a service in a city. Returns the legal
 *  minimum for passenger (regulated), platform-suggested minimum for
 *  parcel/food (unregulated). Falls back to lat/lng polygon when the
 *  city slug isn't curated. Null only when no zone can be inferred. */
export function suggestedPerKm(
  service: ServiceType,
  city: string | null | undefined,
  coords?: { lat: number; lng: number } | null,
): number | null {
  const zone = resolveZone(city, coords)
  if (!zone) return null
  if (service === 'person') return ZONE_TARIFFS[zone].perKmMin
  if (service === 'parcel') return SUGGESTED_PARCEL_RATES[zone].perKmMin
  if (service === 'food')   return SUGGESTED_FOOD_RATES[zone].perKmMin
  return null
}

/** Suggested minimum fare. Same pattern as suggestedPerKm. */
export function suggestedMinFee(
  service: ServiceType,
  city: string | null | undefined,
  coords?: { lat: number; lng: number } | null,
): number | null {
  const zone = resolveZone(city, coords)
  if (!zone) return null
  if (service === 'person') return ZONE_TARIFFS[zone].minFareMin
  if (service === 'parcel') return SUGGESTED_PARCEL_RATES[zone].minFareMin
  if (service === 'food')   return SUGGESTED_FOOD_RATES[zone].minFareMin
  return null
}
