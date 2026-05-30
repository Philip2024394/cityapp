import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/security/rateLimit'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

// ============================================================================
// POST /api/drivers/location/batch
// ----------------------------------------------------------------------------
// Catch-up endpoint paired with src/lib/capacitor/locationQueue.ts. The
// native Android bridge persists failed pings while offline, then drains
// up to 5 queued pings per successful live POST through this route.
//
// CONTRACT (mirrors the single-ping route at ../route.ts):
//   • Same auth: session cookie via getServerSupabase().
//   • Same rate limit posture: per-user, but a slightly wider window so
//     a 50-ping backlog can drain across ~10 ticks without 429s. Each
//     batch counts as a single call to the limiter — the body cost is
//     bounded by MAX_BATCH below.
//   • Same Indonesia bounding-box validation as a sanity check.
//   • Same admin client to write through RLS.
//
// SCHEMA / FUTURE WORK:
//   We only persist the LATEST (lat, lng) onto drivers.current_lat/lng
//   today — drift control + matching the live endpoint's contract. The
//   full backlog is logged for later analytics but NOT persisted
//   anywhere yet. When `driver_location_history` lands we'll do the
//   bulk insert here. See TODO below.
// ============================================================================

const MAX_BATCH = 50

type IncomingPing = {
  lat: number
  lng: number
  capturedAt: number
}

function isValidPing(v: unknown): v is IncomingPing {
  if (!v || typeof v !== 'object') return false
  const p = v as Record<string, unknown>
  if (typeof p.lat !== 'number' || !Number.isFinite(p.lat)) return false
  if (typeof p.lng !== 'number' || !Number.isFinite(p.lng)) return false
  if (typeof p.capturedAt !== 'number' || !Number.isFinite(p.capturedAt)) return false
  // Indonesia bounding box (very rough — sanity check only)
  if (p.lat < -11 || p.lat > 6 || p.lng < 95 || p.lng > 142) return false
  return true
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // Per-user throttle. Live route allows 4 calls / 60s. Batches piggy-
  // back on those — they share the same 30s ping cadence — so a matching
  // 4 calls / 60s ceiling here keeps the dual-endpoint pattern under
  // 8 req/min total per driver, well under any sane abuse threshold.
  const limit = rateLimit(`loc-batch:${user.id}`, 4, 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many batch posts — slow down' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetMs / 1000)) } },
    )
  }

  let body: { pings?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.pings)) {
    return NextResponse.json({ error: 'pings[] required' }, { status: 400 })
  }
  if (body.pings.length === 0) {
    return NextResponse.json({ ok: true, accepted: 0 })
  }
  if (body.pings.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `pings[] too long — max ${MAX_BATCH}` },
      { status: 400 },
    )
  }

  const valid = body.pings.filter(isValidPing)
  if (valid.length === 0) {
    return NextResponse.json({ error: 'No valid pings in payload' }, { status: 400 })
  }

  // Latest = highest capturedAt. We update `drivers.current_*` with this
  // single fix — the backfill IS the whole point of the queue, so
  // freshness matters more than chronological replay.
  const latest = valid.reduce((acc, p) => (p.capturedAt > acc.capturedAt ? p : acc), valid[0])

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  // Read prior state — only needed to backfill session_started_at.
  // Mirrors ../route.ts exactly so behaviour stays in lock-step.
  const { data: prior } = await admin
    .from('drivers')
    .select('availability, session_started_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const nowIso = new Date().toISOString()

  const update: TableUpdate<'drivers'> = {
    current_lat: latest.lat,
    current_lng: latest.lng,
    current_location_updated_at: nowIso,
    last_active_at: nowIso,
  }

  if (prior && (prior.availability === 'online' || prior.availability === 'busy')
      && !prior.session_started_at) {
    update.session_started_at = nowIso
  }

  const { error } = await admin
    .from('drivers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // TODO(driver_location_history): once the history table ships, replace
  // this console.log with a bulk insert of `valid` so we keep the full
  // backlog for analytics (heat-maps, time-of-day demand, etc.).
  // For now we log so the hook is visible in production tail logs and
  // we can size the future table from real backlog volume.
  console.log(
    '[location-batch] backfill received',
    JSON.stringify({ user: user.id, count: valid.length, latestAt: latest.capturedAt }),
  )

  return NextResponse.json({
    ok: true,
    accepted: valid.length,
    availability: prior?.availability ?? null,
  })
}
