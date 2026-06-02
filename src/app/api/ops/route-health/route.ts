import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/ops/route-health?secret=<CRON_SECRET>
// ----------------------------------------------------------------------------
// Synthetic uptime probe. Fetches each public route in PROBE_ROUTES and
// records the result in route_health (migration 0178).
//
// Triggered by Cloudflare Worker cron (worker-entry.mjs CRON_TO_JOB).
// Admin reads via /admin/health.
//
// Latency budget: routes that exceed 8s are recorded as 'ok=false' with
// error 'timeout' — we don't wait forever for a stuck route to drag the
// whole probe pass down.
//
// Failure surfacing: a probe that returns 5xx OR throws inserts ok=false.
// The Worker observes the overall result via the JSON response, but the
// canonical record is the per-route row in the DB.
// ============================================================================

export const dynamic = 'force-dynamic'

const PROBE_ROUTES = [
  '/',
  '/citydrivers',
  '/cityriders',
  '/cari',
  '/drivers',
  '/r',
  '/manifest.webmanifest',
] as const

const PROBE_TIMEOUT_MS = 8000

// OSRM probe — a real /route query between two Indonesian city centres
// (Yogyakarta → Denpasar Bali, ~370km road). If OSRM is up + healthy,
// the response is JSON with `code: "Ok"`. Anything else (timeout, 5xx,
// JSON without Ok) flips the probe to ok=false. Without this probe,
// OSRM downtime is invisible — /api/quote/route-distance silently
// falls back to haversine × 1.3 and never tells anyone.
const OSRM_PROBE_FROM = { lng: 110.3695, lat: -7.7956 }   // Yogyakarta
const OSRM_PROBE_TO   = { lng: 115.1889, lat: -8.6705 }   // Denpasar (Bali)
const OSRM_PROBE_ROUTE_PATH = 'osrm:/route/v1/driving'

type ProbeResult = {
  route_path: string
  status_code: number | null
  latency_ms: number
  ok: boolean
  error_msg: string | null
}

async function probeOne(origin: string, path: string): Promise<ProbeResult> {
  const url = `${origin}${path}`
  const startedAt = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: { 'User-Agent': 'indocity-route-health-probe/1.0' },
      signal: ctrl.signal,
    })
    const latency = Date.now() - startedAt
    // 2xx and 3xx are "up" — 3xx is expected on routes that redirect
    // (e.g. /drivers might redirect to /signup/driver). 4xx and 5xx are
    // failures from a uptime POV.
    const ok = res.status >= 200 && res.status < 400
    return {
      route_path: path,
      status_code: res.status,
      latency_ms: latency,
      ok,
      error_msg: ok ? null : `HTTP ${res.status}`,
    }
  } catch (e) {
    return {
      route_path: path,
      status_code: null,
      latency_ms: Date.now() - startedAt,
      ok: false,
      error_msg: e instanceof Error ? e.message.slice(0, 200) : 'probe_failed',
    }
  } finally {
    clearTimeout(timer)
  }
}

async function probeOsrm(): Promise<ProbeResult | null> {
  const base = process.env.OSRM_BASE_URL
  if (!base) {
    // Not configured — emit a sentinel row so /admin/health surfaces it
    // as "missing config" rather than silently dropping the probe.
    return {
      route_path: OSRM_PROBE_ROUTE_PATH,
      status_code: null,
      latency_ms: 0,
      ok: false,
      error_msg: 'OSRM_BASE_URL unset — distances fall back to haversine × 1.3',
    }
  }
  const from = `${OSRM_PROBE_FROM.lng},${OSRM_PROBE_FROM.lat}`
  const to   = `${OSRM_PROBE_TO.lng},${OSRM_PROBE_TO.lat}`
  const url  = `${base.replace(/\/$/, '')}/route/v1/driving/${from};${to}?overview=false&alternatives=false&steps=false`
  const startedAt = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'User-Agent': 'indocity-osrm-probe/1.0' },
      signal: ctrl.signal,
    })
    const latency = Date.now() - startedAt
    if (!res.ok) {
      return {
        route_path: OSRM_PROBE_ROUTE_PATH,
        status_code: res.status,
        latency_ms: latency,
        ok: false,
        error_msg: `HTTP ${res.status}`,
      }
    }
    // OSRM healthy response shape: { code: 'Ok', routes: [{ distance, duration, ... }] }
    type OsrmResponse = { code?: string; routes?: Array<{ distance?: number; duration?: number }> }
    const body = (await res.json()) as OsrmResponse
    const ok = body?.code === 'Ok' && Array.isArray(body.routes) && body.routes.length > 0
    return {
      route_path: OSRM_PROBE_ROUTE_PATH,
      status_code: res.status,
      latency_ms: latency,
      ok,
      error_msg: ok ? null : `OSRM code=${body?.code ?? 'missing'}`,
    }
  } catch (e) {
    return {
      route_path: OSRM_PROBE_ROUTE_PATH,
      status_code: null,
      latency_ms: Date.now() - startedAt,
      ok: false,
      error_msg: e instanceof Error ? e.message.slice(0, 200) : 'osrm_probe_failed',
    }
  } finally {
    clearTimeout(timer)
  }
}

function gateAuthorized(req: Request): boolean {
  const url = new URL(req.url)
  const provided = url.searchParams.get('secret')
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return provided === expected
}

function originFromRequest(req: Request): string {
  const url = new URL(req.url)
  // In Worker self-fetch the host is 'internal'; prefer x-forwarded headers
  // when present so the probe hits the real public origin.
  const fwdHost = req.headers.get('x-forwarded-host')
  const fwdProto = req.headers.get('x-forwarded-proto')
  if (fwdHost && fwdProto) return `${fwdProto}://${fwdHost}`
  // Fallback: the route is hit via WORKER_SELF_REFERENCE; rewrite to the
  // public origin via an env var so the probes hit prod, not the internal
  // binding.
  const publicOrigin = process.env.PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL
  if (publicOrigin) return publicOrigin.replace(/\/$/, '')
  return url.origin
}

export async function GET(req: Request) {
  if (!gateAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const origin = originFromRequest(req)
  const [routeResults, osrmResult] = await Promise.all([
    Promise.all(PROBE_ROUTES.map((p) => probeOne(origin, p))),
    probeOsrm(),
  ])
  const results = osrmResult ? [...routeResults, osrmResult] : routeResults

  // Persist (best-effort — a failure here must not block the probe pass).
  try {
    const admin = getAdminSupabase()
    if (admin) {
      await admin.from('route_health').insert(results.map((r) => ({
        route_path: r.route_path,
        status_code: r.status_code,
        latency_ms: r.latency_ms,
        ok: r.ok,
        error_msg: r.error_msg,
      })))
    }
  } catch (e) {
    // Swallow — the probe still ran, the JSON response below tells the
    // Worker what happened, and the cron_run_log will record the dispatch.
    console.error('[route-health] persist failed', e)
  }

  const downCount = results.filter((r) => !r.ok).length
  return NextResponse.json({
    origin,
    probed: results.length,
    down: downCount,
    results,
  }, {
    status: downCount === 0 ? 200 : 207, // 207 multi-status: some failed.
    headers: { 'Cache-Control': 'no-store' },
  })
}
