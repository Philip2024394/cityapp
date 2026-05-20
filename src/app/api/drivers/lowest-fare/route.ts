import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { haversineKm } from '@/lib/geo/haversine'

// ============================================================================
// GET /api/drivers/lowest-fare?lat=&lng=&radiusKm=&city=
// ----------------------------------------------------------------------------
// Returns the lowest published minimum fare + count across ONLINE drivers,
// optionally narrowed by geographic radius or city. Pure aggregation of
// what drivers themselves listed — we never set or calculate a price.
// This keeps the customer-facing "Starting from Rp X" banner safely inside
// PM 12/2019 directory safe-harbour: the number is a driver's own published
// rate, not ours.
//
// Filters:
//   • drivers.status = 'active' AND availability = 'online'
//   • subscriptions.status IN ('trial', 'active') — past_due drivers are
//     hidden from /cari/rider, so excluding them here keeps the banner
//     honest (no "Rp X from Driver Y" if Driver Y isn't bookable).
//   • Optional lat/lng/radius — defaults to 30km when lat/lng provided.
//   • Optional city — used only when lat/lng absent.
// ============================================================================

export async function GET(req: Request) {
  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get('lat') ?? '')
  const lng = parseFloat(url.searchParams.get('lng') ?? '')
  const radiusKm = parseFloat(url.searchParams.get('radiusKm') ?? '30')
  const city = (url.searchParams.get('city') ?? '').trim()
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  let q = admin
    .from('drivers')
    .select('min_fee, current_lat, current_lng, service_zone_center_lat, service_zone_center_lng, subscriptions(status)')
    .eq('status', 'active')
    .eq('availability', 'online')
    .not('min_fee', 'is', null)
    .gt('min_fee', 0)
  if (city && !hasCoords) q = q.eq('city', city.slice(0, 60))

  const { data, error } = await q.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = {
    min_fee: number | null
    current_lat: number | null
    current_lng: number | null
    service_zone_center_lat: number | null
    service_zone_center_lng: number | null
    subscriptions: { status: string | null } | { status: string | null }[] | null
  }

  function subActive(s: Row['subscriptions']): boolean {
    const row = Array.isArray(s) ? s[0] : s
    const st = row?.status ?? null
    return st === 'trial' || st === 'active'
  }

  let lowest: number | null = null
  let count = 0
  for (const raw of (data ?? []) as Row[]) {
    if (!subActive(raw.subscriptions)) continue
    const n = typeof raw.min_fee === 'number' ? raw.min_fee : null
    if (n === null || !Number.isFinite(n) || n <= 0) continue

    if (hasCoords) {
      const dLat = raw.current_lat ?? raw.service_zone_center_lat
      const dLng = raw.current_lng ?? raw.service_zone_center_lng
      if (dLat == null || dLng == null) continue
      const km = haversineKm({ lat, lng }, { lat: dLat, lng: dLng })
      if (km > radiusKm) continue
    }

    count++
    if (lowest === null || n < lowest) lowest = n
  }

  return NextResponse.json(
    { lowestFareIdr: lowest, driverCount: count },
    {
      headers: {
        // Short edge cache — fares don't churn second-by-second. 60s
        // keeps the banner snappy without hammering the DB.
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    },
  )
}
