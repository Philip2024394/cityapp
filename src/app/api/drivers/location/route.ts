import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/security/rateLimit'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

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
// AVAILABILITY MODEL (PM 12/2019 posture — 2026-05 audit):
// The rider alone owns `availability`. We never auto-flip between
// 'online' and 'busy' based on inferred movement — that would imply
// dispatch orchestration. The 'busy' state still exists in the schema
// for drivers who want to manually set it from the dashboard, but
// movement-based inference has been removed.
// ============================================================================

type DriverLocRow = {
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

  // Read prior state — only needed to backfill session_started_at.
  // We deliberately do NOT compare positions to flip availability.
  const { data: prior } = await admin
    .from('drivers')
    .select('availability, session_started_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const nowIso = new Date().toISOString()

  const update: TableUpdate<'drivers'> = {
    current_lat: lat,
    current_lng: lng,
    current_location_updated_at: nowIso,
    last_active_at: nowIso,
  }

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
    availability: prior?.availability ?? null,
  })
}
