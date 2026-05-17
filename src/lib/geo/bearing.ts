// Compass bearing from `from` → `to`, in degrees (0=N, 90=E, 180=S, 270=W).
// Standard great-circle initial-bearing formula. Accurate enough for the
// "rider is north-east of you" radar UI.
export function bearingDeg(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI

  const φ1 = toRad(from.lat)
  const φ2 = toRad(to.lat)
  const Δλ = toRad(to.lng - from.lng)

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

// Map a compass bearing + distance into SVG (x, y) offsets from a center.
// Note SVG Y is inverted (down is positive), hence the `-cos`.
export function bearingToSvgOffset(bearingDegrees: number, radius: number) {
  const θ = (bearingDegrees * Math.PI) / 180
  return {
    dx:  Math.sin(θ) * radius,
    dy: -Math.cos(θ) * radius,
  }
}

// Indonesian city-traffic motorbike avg ≈ 25 km/h.
// Add a small "leave now" buffer so the ETA feels grounded, not optimistic.
const AVG_SPEED_KMH = 25
const BUFFER_MIN = 2

export function estimateEtaMin(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60) + BUFFER_MIN)
}

// "North-east" / "South" / "South-west" — 8 compass labels for the radar.
const CARDINAL_LABELS = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'] as const

export function cardinalLabel(bearingDegrees: number): string {
  const idx = Math.round(bearingDegrees / 45) % 8
  return CARDINAL_LABELS[idx]!
}
