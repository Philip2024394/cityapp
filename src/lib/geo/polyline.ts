// ============================================================================
// Polyline split utility
// ----------------------------------------------------------------------------
// Splits a [[lng, lat], ...] polyline at a fractional position along its
// total length. Returns the two halves so the map can colour the
// "completed" portion (driver has passed through it) differently from
// the "remaining" portion.
//
// Used by the live trip simulation on /cari — as the demo driver
// progresses (0.0 → 1.0), the front of the polyline turns black while
// the back stays yellow, visualising journey progress.
//
// Pure haversine distance — no projection, no extra deps. The OSRM
// overview polyline is dense enough (typically 50–500 points for a
// city trip) that great-circle interpolation between adjacent points
// matches what the customer's eye actually sees.
// ============================================================================

export type LngLat = [number, number]

const R_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function haversineKm(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const aa =
    sinDLat * sinDLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
  return R_KM * c
}

// Linear interpolation between two coordinates. For sub-kilometre
// distances at typical city latitudes the linear-blend error is well
// under 1m — invisible at the zoom levels the map renders.
function lerp(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export type PolylineSplit = {
  completed: LngLat[]   // start → split point (driver has passed through)
  remaining: LngLat[]   // split point → end (still ahead of the driver)
  splitPoint: LngLat    // exact coord where the driver currently is
}

/**
 * Split a polyline at a fractional position along its length.
 *
 * @param coords - The full route as an array of [lng, lat] pairs (≥2).
 * @param fraction - 0.0 (start, nothing completed) to 1.0 (end, all completed).
 * @returns Two polylines + the exact split point. Both halves always
 *          contain the split point so the seam is invisible on the map.
 */
export function splitPolylineAtFraction(
  coords: LngLat[],
  fraction: number,
): PolylineSplit {
  if (coords.length < 2) {
    return { completed: [], remaining: coords.slice(), splitPoint: coords[0] ?? [0, 0] }
  }
  const clamped = Math.max(0, Math.min(1, fraction))
  if (clamped === 0) {
    return { completed: [coords[0]], remaining: coords.slice(), splitPoint: coords[0] }
  }
  if (clamped === 1) {
    const last = coords[coords.length - 1]
    return { completed: coords.slice(), remaining: [last], splitPoint: last }
  }

  // Walk the polyline accumulating segment lengths until we cross the
  // target distance. The target is `fraction * totalLength`; we lerp the
  // last partial segment to find the exact split point.
  let totalKm = 0
  for (let i = 1; i < coords.length; i++) {
    totalKm += haversineKm(coords[i - 1], coords[i])
  }
  const targetKm = totalKm * clamped

  let walkedKm = 0
  for (let i = 1; i < coords.length; i++) {
    const segKm = haversineKm(coords[i - 1], coords[i])
    if (walkedKm + segKm >= targetKm) {
      const within = segKm > 0 ? (targetKm - walkedKm) / segKm : 0
      const splitPoint = lerp(coords[i - 1], coords[i], within)
      const completed = coords.slice(0, i)
      completed.push(splitPoint)
      const remaining = [splitPoint, ...coords.slice(i)]
      return { completed, remaining, splitPoint }
    }
    walkedKm += segKm
  }

  // Shouldn't be reachable since clamped < 1 is handled above, but
  // fall through safely if floating-point lands us here.
  const last = coords[coords.length - 1]
  return { completed: coords.slice(), remaining: [last], splitPoint: last }
}
