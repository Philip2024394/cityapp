import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { haversineKm } from '@/lib/geo/haversine'
import { rateLimit } from '@/lib/security/rateLimit'

// ============================================================================
// POST /api/drivers/location
// ----------------------------------------------------------------------------
// Online rider's browser pings their GPS location every ~30 seconds.
// We update current_lat/current_lng/current_location_updated_at and bump
// last_active_at. Used by /cari + /r/[slug] so customers can see where
// independent riders are listed in the directory. Not used for any
// trip tracking — the platform does not record trips (see migration
// 0010 and /legal page for the directory-vs-operator posture).
//
// AUTO-STATUS RULE
// ----------------
// If the rider is currently 'online' or 'busy' (i.e. they've toggled on
// from /dashboard):
//   • If they moved ≥10m in the last ≤45s window → availability='busy'.
//   • Otherwise (stationary) → availability='online'.
// If the rider is currently 'offline', we DO NOT touch availability —
// manual offline is the user's authoritative intent and shouldn't be
// overridden by a stray late-firing ping.
//
// The 10m threshold sits above typical urban GPS jitter (~5m on phones)
// so a stationary rider isn't constantly toggled. The 45s window is
// 30s expected + 15s tolerance for slow networks or short browser tab
// freezes.
// ============================================================================
const MOVEMENT_THRESHOLD_M = 10
const MOVEMENT_WINDOW_MS = 45_000

type DriverLocRow = {
  current_lat: number | null
  current_lng: number | null
  current_location_updated_at: string | null
  availability: 'online' | 'busy' | 'offline'
  session_started_at: string | null
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // Per-user throttle. The legitimate client pings every ~30s, so 4
  // calls per 60s window leaves comfortable headroom for retries +
  // race conditions while stopping a runaway loop from punishing the DB.
  const limit = rateLimit(`loc:${user.id}`, 4, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many location pings — slow down' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetMs / 1000)) } },
    )
  }

  let body: { lat?: number; lng?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const lat = typeof body.lat === 'number' ? body.lat : NaN
  const lng = typeof body.lng === 'number' ? body.lng : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng required as numbers' }, { status: 400 })
  }
  // Indonesia bounding box (very rough — sanity check only)
  if (lat < -11 || lat > 6 || lng < 95 || lng > 142) {
    return NextResponse.json({ error: 'Coordinates outside expected region' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  // Read prior state so we can decide whether to flip availability.
  // Cheap single-row lookup gated by user_id.
  const { data: prior } = await admin
    .from('drivers')
    .select('current_lat, current_lng, current_location_updated_at, availability, session_started_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const now = new Date()
  const nowIso = now.toISOString()

  let nextAvailability: 'online' | 'busy' | undefined
  let moving = false
  if (prior) {
    const p = prior as DriverLocRow
    // Only auto-flip while the driver is in an operational state.
    // Manual 'offline' is sacrosanct.
    if (p.availability === 'online' || p.availability === 'busy') {
      if (p.current_lat != null && p.current_lng != null && p.current_location_updated_at) {
        const lastTs = Date.parse(p.current_location_updated_at)
        const ageMs = now.getTime() - lastTs
        if (Number.isFinite(lastTs) && ageMs > 0 && ageMs <= MOVEMENT_WINDOW_MS) {
          const movedM = haversineKm(
            { lat: p.current_lat, lng: p.current_lng },
            { lat, lng },
          ) * 1000
          moving = movedM >= MOVEMENT_THRESHOLD_M
        }
      }
      nextAvailability = moving ? 'busy' : 'online'
    }
  }

  const update: Record<string, unknown> = {
    current_lat: lat,
    current_lng: lng,
    current_location_updated_at: nowIso,
    last_active_at: nowIso,
  }
  if (nextAvailability) update.availability = nextAvailability

  // Backfill session_started_at for drivers who were already online when
  // this column shipped — their availability is 'online'/'busy' but the
  // session timestamp is null. Don't overwrite an existing value.
  if (prior && (prior.availability === 'online' || prior.availability === 'busy')
      && !prior.session_started_at) {
    update.session_started_at = nowIso
  }

  const { error } = await admin
    .from('drivers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    availability: nextAvailability ?? prior?.availability ?? null,
    moving,
  })
}
