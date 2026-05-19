// ============================================================================
// Supported cities — single source of truth for centroid coordinates +
// human labels. Used for nearest-city detection on the public driver
// page (city mismatch detection) and for any future city pickers.
// ============================================================================

import { haversineKm } from '@/lib/geo/haversine'

export type SupportedCity = {
  slug: string
  label: string
  lat: number
  lng: number
}

export const SUPPORTED_CITIES: SupportedCity[] = [
  { slug: 'yogyakarta',  label: 'Yogyakarta',   lat: -7.7956, lng: 110.3695 },
  { slug: 'jakarta',     label: 'Jakarta',      lat: -6.2088, lng: 106.8456 },
  { slug: 'bandung',     label: 'Bandung',      lat: -6.9175, lng: 107.6191 },
  { slug: 'surabaya',    label: 'Surabaya',     lat: -7.2575, lng: 112.7521 },
  { slug: 'denpasar',    label: 'Denpasar',     lat: -8.6500, lng: 115.2167 },
  { slug: 'medan',       label: 'Medan',        lat:  3.5952, lng:  98.6722 },
  { slug: 'semarang',    label: 'Semarang',     lat: -6.9667, lng: 110.4167 },
  { slug: 'makassar',    label: 'Makassar',     lat: -5.1477, lng: 119.4327 },
  { slug: 'malang',      label: 'Malang',       lat: -7.9666, lng: 112.6326 },
  { slug: 'solo',        label: 'Solo',         lat: -7.5755, lng: 110.8243 },
  { slug: 'bogor',       label: 'Bogor',        lat: -6.5950, lng: 106.7917 },
  { slug: 'depok',       label: 'Depok',        lat: -6.4025, lng: 106.7942 },
  { slug: 'bekasi',      label: 'Bekasi',       lat: -6.2349, lng: 107.0064 },
  { slug: 'tangerang',   label: 'Tangerang',    lat: -6.1700, lng: 106.6300 },
  { slug: 'palembang',   label: 'Palembang',    lat: -2.9909, lng: 104.7565 },
  { slug: 'padang',      label: 'Padang',       lat: -0.9492, lng: 100.3543 },
  { slug: 'manado',      label: 'Manado',       lat:  1.4748, lng: 124.8421 },
  { slug: 'balikpapan',  label: 'Balikpapan',   lat: -1.2654, lng: 116.8312 },
  { slug: 'pontianak',   label: 'Pontianak',    lat: -0.0263, lng: 109.3425 },
  { slug: 'banjarmasin', label: 'Banjarmasin',  lat: -3.3193, lng: 114.5904 },
]

export function citySlugLabel(slug: string): string {
  return SUPPORTED_CITIES.find((c) => c.slug === slug)?.label ?? slug
}

// Returns the supported city whose centroid is closest to (lat, lng).
// Use a hard cap (kmCap) to treat "really far away" as no-match instead
// of forcing a wrong city pick — important for users outside Indonesia.
export function nearestCity(
  lat: number,
  lng: number,
  kmCap = 80,
): { city: SupportedCity; km: number } | null {
  let best: { city: SupportedCity; km: number } | null = null
  for (const c of SUPPORTED_CITIES) {
    const km = haversineKm({ lat, lng }, { lat: c.lat, lng: c.lng })
    if (!best || km < best.km) best = { city: c, km }
  }
  if (!best || best.km > kmCap) return null
  return best
}
