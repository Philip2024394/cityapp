import { NextResponse } from 'next/server'
import { osrmRouteWithGeometry } from '@/lib/osrm/client'

// ============================================================================
// GET /api/route/polyline?fromLat=&fromLng=&toLat=&toLng=
// ----------------------------------------------------------------------------
// Returns the road-following GeoJSON polyline between two coordinates so the
// customer's map can render a real route line (with all turns) instead of
// a straight crow-flies line between pickup and dropoff. Delegates to OSRM
// via osrmRouteWithGeometry().
//
// Why a separate endpoint from /api/quote/route-distance:
//   • Distance lookups need a lean response (no geometry payload). That
//     endpoint stays as-is to keep the fare-preview path snappy.
//   • Polyline lookups are larger payloads (~1–10 KB) and only fire when
//     the map is actually going to draw a route — which is a single
//     fetch on /cari once both pickup and dropoff are set. Different
//     usage pattern, different endpoint.
//
// When OSRM is not configured (OSRM_BASE_URL env not set) the endpoint
// returns null coordinates — callers fall back to a 2-point straight
// line which is the existing behaviour. Same graceful-degradation
// pattern as /api/quote/route-distance.
// ============================================================================

const ONE_DAY_S = 24 * 60 * 60

export async function GET(req: Request) {
  const url = new URL(req.url)
  const fromLat = parseFloat(url.searchParams.get('fromLat') ?? '')
  const fromLng = parseFloat(url.searchParams.get('fromLng') ?? '')
  const toLat = parseFloat(url.searchParams.get('toLat') ?? '')
  const toLng = parseFloat(url.searchParams.get('toLng') ?? '')

  if (
    !Number.isFinite(fromLat) || !Number.isFinite(fromLng) ||
    !Number.isFinite(toLat) || !Number.isFinite(toLng)
  ) {
    return NextResponse.json(
      { error: 'fromLat, fromLng, toLat, toLng required (all numeric)' },
      { status: 400 },
    )
  }

  const result = await osrmRouteWithGeometry(
    { lat: fromLat, lng: fromLng },
    { lat: toLat, lng: toLng },
  )

  if (!result) {
    // OSRM not configured / timed out / route not found. Return a sentinel
    // so the client can detect this and fall back to the straight-line
    // rendering. 200 OK (not 500) — this is a graceful-degradation case,
    // not an error.
    return NextResponse.json({ coordinates: null }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    })
  }

  return NextResponse.json(
    {
      coordinates: result.coordinates,
      meters: result.meters,
      durationSeconds: result.durationSeconds,
    },
    {
      headers: {
        // Routes between identical coord pairs are stable for a day. The
        // edge cache short-circuits OSRM for repeat customers + the
        // /cari preview re-renders (HMR, tab focus, etc.).
        'Cache-Control': `public, max-age=${ONE_DAY_S}, s-maxage=${ONE_DAY_S}`,
      },
    },
  )
}
