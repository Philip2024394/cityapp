// Shared ETA helper — one constant, one formula, used everywhere we need
// to convert haversine distance into a time estimate. When the routing
// layer (OSRM / Mapbox) is wired up, swap this for a real driving-time
// lookup; the call sites stay unchanged.

// Average sustained delivery-bike speed in Indonesian city traffic,
// blended across stop-light idling, gang/alley creep, and open-road
// sections. 22 km/h matches what Yogyakarta couriers report.
export const AVG_SPEED_KMH = 22

export function etaMinutes(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return 1
  return Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60))
}
