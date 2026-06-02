// ============================================================================
// Admin health snapshot
// ----------------------------------------------------------------------------
// Single entry-point that fetches all 10 metrics shown on /admin/health and
// returns a uniformly-shaped `HealthSnapshot`. Every metric carries its own
// status flag (`ok`/`warn`/`err`/`na`) so the UI can render a tile without
// branching on the underlying data source.
//
// Design rules — see /admin/health/page.tsx:
//   - Pure read-only; never writes.
//   - Uses the service-role Supabase client so RLS doesn't trim aggregates.
//   - Tolerates missing tables / missing env vars by degrading to `na` —
//     a metric we can't measure still renders as a card so the gap to full
//     observability is visible to the operator.
//   - Each query is a single-row aggregate over indexed columns; should
//     return in <50ms under normal load. If you see worse, add an EXPLAIN
//     and a covering index — do NOT introduce caching here.
// ============================================================================

import { getAdminSupabase } from '@/lib/supabase/admin'

export type MetricStatus = 'ok' | 'warn' | 'err' | 'na'

export interface Metric {
  /** Headline label, e.g. "Drivers online" */
  label: string
  /** Big number / string shown on the tile, or null for N/A metrics */
  value: number | string | null
  /** Lit / pending / errored / not-available */
  status: MetricStatus
  /** One-line helper text — what the value means OR what is missing */
  note?: string
  /** Optional href shown as a "Configure" link for `na` metrics */
  link?: { label: string; href: string }
}

export interface HealthSnapshot {
  /** ISO timestamp when the snapshot was taken (used by the UI footer). */
  generatedAt: string
  metrics: {
    driversOnline: Metric
    activeBookings: Metric
    locationP95: Metric
    pushDelivery: Metric
    reconnectQueue: Metric
    crashFreeSessions: Metric
    lastDeploySha: Metric
    apiLatency: Metric
    pushFailures: Metric
    appVersionDistribution: Metric
    dbLatency: Metric
  }
  /** Per-vertical driver presence breakdown — H4 audit. Always populated
   *  (zero-counts for verticals with no drivers) so the UI can render five
   *  cards in a stable order. `null` when SUPABASE_SERVICE_ROLE_KEY missing
   *  or the underlying query errors. */
  driversByVehicle: DriversByVehicle | null
}

/** Vehicle-type keys shown in the per-vertical health row. Matches the
 *  `drivers.vehicle_type` check constraint (migrations 0092 + 0162), minus
 *  `premium_car` which collapses into the `car` tile for ops display. */
export type VehicleTypeKey = 'bike' | 'car' | 'truck' | 'minibus' | 'jeep'

export const VEHICLE_TYPE_KEYS: VehicleTypeKey[] = ['bike', 'car', 'truck', 'minibus', 'jeep']

export interface DriversByVehicle {
  total: number
  by_vehicle_type: Record<VehicleTypeKey, { online: number; total: number; signups_7d: number }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const na = (label: string, note: string, link?: Metric['link']): Metric => ({
  label,
  value: null,
  status: 'na',
  note,
  link,
})

const err = (label: string, note: string): Metric => ({
  label,
  value: null,
  status: 'err',
  note,
})

/** Detect a "table does not exist" Postgres error so we can degrade to N/A
 *  rather than blowing up the whole page when a follow-up migration is
 *  pending. Postgres returns SQLSTATE 42P01 for undefined_table. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === '42P01') return true
  return /does not exist|undefined_table/i.test(error.message ?? '')
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  const admin = getAdminSupabase()
  const generatedAt = new Date().toISOString()

  if (!admin) {
    const offline = err('—', 'SUPABASE_SERVICE_ROLE_KEY missing — health checks cannot run')
    return {
      generatedAt,
      metrics: {
        driversOnline:          { ...offline, label: 'Drivers online' },
        activeBookings:         { ...offline, label: 'Active bookings' },
        locationP95:            { ...offline, label: 'Location POST p95' },
        pushDelivery:           { ...offline, label: 'Notification delivery' },
        reconnectQueue:         { ...offline, label: 'Reconnect queue depth' },
        crashFreeSessions:      { ...offline, label: 'Crash-free sessions' },
        lastDeploySha:          { ...offline, label: 'Last deploy SHA' },
        apiLatency:             { ...offline, label: 'API response latency' },
        pushFailures:           { ...offline, label: 'Push failures (24h)' },
        appVersionDistribution: { ...offline, label: 'App version distribution' },
        dbLatency:              { ...offline, label: 'DB round-trip latency' },
      },
      driversByVehicle: null,
    }
  }

  // DB round-trip latency — cheapest probe that exercises the connection
  // pool + planner: a HEAD-only count over a tiny indexed table. Times
  // the wall-clock from initiation to first byte. Anything <100ms is
  // green; 100-500ms is warn (often pool contention or noisy neighbour);
  // >500ms is red (likely the DB is in trouble — see DR runbook §3.2).
  let dbLatency: Metric
  {
    const startedAt = Date.now()
    const { error } = await admin
      .from('cron_run_log')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    const elapsed = Date.now() - startedAt
    if (error && !isMissingTable(error)) {
      dbLatency = err('DB round-trip latency', error.message)
    } else {
      const status: MetricStatus = elapsed < 100 ? 'ok' : elapsed < 500 ? 'warn' : 'err'
      const note = status === 'ok'
        ? 'HEAD count on cron_run_log — connection pool + planner round-trip.'
        : status === 'warn'
          ? 'Elevated round-trip. Likely pool contention or noisy neighbour. See DR runbook §3.2.'
          : 'Slow DB round-trip. Connection pool may be exhausted. Check Supabase project metrics + DR runbook §3.2.'
      dbLatency = {
        label: 'DB round-trip latency',
        value: `${elapsed} ms`,
        status,
        note,
      }
    }
  }

  // Drivers online — pinged in the last 5 minutes AND availability != offline.
  // We don't use a hypothetical `is_online` column (schema uses the three-
  // state `availability` enum: online/busy/offline). Driver who toggled
  // "offline" but happens to still have a fresh ping doesn't count.
  let driversOnline: Metric
  {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    const { count, error } = await admin
      .from('drivers')
      .select('user_id', { count: 'exact', head: true })
      .gt('current_location_updated_at', fiveMinAgo)
      .in('availability', ['online', 'busy'])
    if (error) {
      driversOnline = err('Drivers online', error.message)
    } else {
      const n = count ?? 0
      driversOnline = {
        label: 'Drivers online',
        value: n,
        status: 'ok',
        note: n === 0 ? 'No drivers pinged in the last 5 minutes.' : 'Fresh GPS ping in last 5 min, availability online or busy.',
      }
    }
  }

  // Active bookings — CityDrivers is a directory product. Permenhub PM 12/2019
  // forbids platform-side dispatch; bookings happen on WhatsApp after the
  // customer taps a Contact button. The trips/bookings tables were removed
  // in migration 0010 — see supabase/migrations/0010_remove_trips_workflow.sql.
  const activeBookings: Metric = na(
    'Active bookings',
    'Directory model — bookings happen over WhatsApp. WA Contact taps live in wa_click_events.',
  )

  // Location POST p95 latency — no sampling pipeline exists yet. Cheapest
  // path: append a `Server-Timing` header in src/app/api/drivers/location/route.ts
  // and persist a sampled row (~1%) to a future `latency_samples` table.
  // Until then this tile stays in `awaiting` mode.
  const locationP95: Metric = na(
    'Location POST p95',
    'Awaiting samples. Add Server-Timing to /api/drivers/location and a 1% sample writer into a latency_samples table.',
  )

  // Notification delivery success % — needs a push_send_log table.
  // /api/drivers/* sends via FCM; today we just await the FCM HTTP call
  // and don't persist the response. To light this up: insert a row per
  // send with { token, status, error_code, created_at }.
  let pushDelivery: Metric
  let pushFailures: Metric
  {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
    const { count: total, error: totalErr } = await admin
      .from('push_send_log')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', oneDayAgo)
    if (totalErr && isMissingTable(totalErr)) {
      pushDelivery = na(
        'Notification delivery',
        'Schema not yet present. Create push_send_log { token, status, error_code, created_at } and write one row per FCM send.',
      )
      pushFailures = na(
        'Push failures (24h)',
        'Schema not yet present. Same push_send_log table as above; count where status != delivered.',
      )
    } else if (totalErr) {
      pushDelivery = err('Notification delivery', totalErr.message)
      pushFailures = err('Push failures (24h)', totalErr.message)
    } else {
      const totalN = total ?? 0
      // Run delivered/failed counts in parallel — only when the table exists.
      const [{ count: delivered, error: dErr }, { count: failed, error: fErr }] = await Promise.all([
        admin.from('push_send_log').select('id', { count: 'exact', head: true })
          .gt('created_at', oneDayAgo).eq('status', 'delivered'),
        admin.from('push_send_log').select('id', { count: 'exact', head: true })
          .gt('created_at', oneDayAgo).neq('status', 'delivered'),
      ])
      if (dErr) {
        pushDelivery = err('Notification delivery', dErr.message)
      } else if (totalN === 0) {
        pushDelivery = {
          label: 'Notification delivery',
          value: 'No sends',
          status: 'ok',
          note: 'No push sends in the last 24h.',
        }
      } else {
        const pct = ((delivered ?? 0) * 100) / totalN
        pushDelivery = {
          label: 'Notification delivery',
          value: `${pct.toFixed(1)}%`,
          status: pct >= 95 ? 'ok' : pct >= 85 ? 'warn' : 'err',
          note: `${delivered ?? 0} / ${totalN} delivered in 24h.`,
        }
      }
      if (fErr) {
        pushFailures = err('Push failures (24h)', fErr.message)
      } else {
        const f = failed ?? 0
        pushFailures = {
          label: 'Push failures (24h)',
          value: f,
          status: totalN === 0 ? 'ok' : f === 0 ? 'ok' : f < 10 ? 'warn' : 'err',
          note: totalN === 0 ? 'No push sends to evaluate.' : 'Rows in push_send_log with status != delivered.',
        }
      }
    }
  }

  // Reconnect queue depth — lives on the driver's device, not the server.
  // Surfacing it would require a small telemetry endpoint the client POSTs
  // its in-memory queue depth to on a heartbeat. Out of scope here.
  const reconnectQueue: Metric = na(
    'Reconnect queue depth',
    'Driver-side metric. Requires a /api/telemetry/reconnect endpoint that accepts {driverId, queueDepth} on each heartbeat.',
  )

  // Crash-free session % — Sentry data. We don't proxy it through the
  // server unless SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT are set,
  // because the Sentry REST call needs an auth token and we don't want a
  // failed fetch to swallow the rest of the page. Surface the dashboard
  // URL instead so the operator can jump straight there.
  let crashFreeSessions: Metric
  {
    const authToken = process.env.SENTRY_AUTH_TOKEN
    const org = process.env.SENTRY_ORG
    const project = process.env.SENTRY_PROJECT
    if (!authToken || !org || !project) {
      const sentryUrl = org && project
        ? `https://${org}.sentry.io/projects/${project}/`
        : 'https://sentry.io/'
      crashFreeSessions = na(
        'Crash-free sessions',
        'Set SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT to surface live %, or read it on the Sentry dashboard.',
        { label: 'Open Sentry', href: sentryUrl },
      )
    } else {
      try {
        // Sentry Sessions API — last 24h, single number aggregate.
        // Docs: https://docs.sentry.io/api/discover/query-events-in-organization/
        const url = `https://sentry.io/api/0/organizations/${org}/sessions/` +
          `?project=${encodeURIComponent(project)}&field=crash_free_rate%28session%29&statsPeriod=24h&interval=24h`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${authToken}` },
          // No revalidate — this page is force-dynamic.
          cache: 'no-store',
        })
        if (!res.ok) {
          crashFreeSessions = err('Crash-free sessions', `Sentry ${res.status}`)
        } else {
          const json = (await res.json()) as { groups?: { totals?: Record<string, number> }[] }
          const rate = json.groups?.[0]?.totals?.['crash_free_rate(session)']
          if (typeof rate !== 'number') {
            crashFreeSessions = na('Crash-free sessions', 'Sentry returned no sessions for the last 24h.')
          } else {
            const pct = rate * 100
            crashFreeSessions = {
              label: 'Crash-free sessions',
              value: `${pct.toFixed(2)}%`,
              status: pct >= 99 ? 'ok' : pct >= 97 ? 'warn' : 'err',
              note: 'Source: Sentry Sessions API, last 24h.',
            }
          }
        }
      } catch (e: unknown) {
        crashFreeSessions = err('Crash-free sessions', e instanceof Error ? e.message : 'Sentry fetch failed')
      }
    }
  }

  // Last deploy SHA — Vercel auto-populates VERCEL_GIT_COMMIT_SHA at build
  // time, mirrored to the runtime env. NEXT_PUBLIC_BUILD_SHA is the manual
  // fallback you'd set from CI for non-Vercel deploys.
  let lastDeploySha: Metric
  {
    const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_SHA
    if (!sha) {
      lastDeploySha = {
        label: 'Last deploy SHA',
        value: 'unknown',
        status: 'warn',
        note: 'Neither VERCEL_GIT_COMMIT_SHA nor NEXT_PUBLIC_BUILD_SHA is set in this environment.',
      }
    } else {
      lastDeploySha = {
        label: 'Last deploy SHA',
        value: sha.slice(0, 7),
        status: 'ok',
        note: `Full: ${sha}`,
      }
    }
  }

  // API response latency — no APM in place. Vercel Speed Insights / Analytics
  // would surface this for free; until configured we can't show it here
  // without building our own sampling pipeline (which is its own project).
  const apiLatency: Metric = na(
    'API response latency',
    'Requires APM. Recommend enabling Vercel Speed Insights + Analytics (free tier) on the project.',
  )

  // App version distribution — driver-side metric. No client → server
  // version reporting exists today (grep app_version / client_version
  // returned no hits other than this file). Same fix as reconnect queue:
  // a small telemetry endpoint, or piggyback on the existing location
  // POST by adding `app_version` to the request body + a column on drivers.
  const appVersionDistribution: Metric = na(
    'App version distribution',
    'Driver-side metric. Add app_version to /api/drivers/location body + a column on drivers, then group-by here.',
  )

  // Per-vehicle-type driver breakdown (H4) — drives the "Drivers by
  // vertical" section. One read of (vehicle_type, availability,
  // last_active_at, created_at) for every active driver row; aggregation
  // happens in JS because PostgREST has no GROUP BY surface and we don't
  // want to add a Postgres function just for an admin tile. The drivers
  // table is in the low thousands, this stays well under 50ms.
  let driversByVehicle: DriversByVehicle | null = null
  {
    const fiveMinAgoMs = Date.now() - 5 * 60_000
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60_000
    const { data, error } = await admin
      .from('drivers')
      .select('vehicle_type, availability, last_active_at, created_at')
      .eq('status', 'active')
    if (error || !data) {
      driversByVehicle = null
    } else {
      const empty = (): DriversByVehicle['by_vehicle_type'][VehicleTypeKey] => ({
        online: 0, total: 0, signups_7d: 0,
      })
      const acc: DriversByVehicle['by_vehicle_type'] = {
        bike: empty(), car: empty(), truck: empty(), minibus: empty(), jeep: empty(),
      }
      let total = 0
      for (const row of data as Array<{
        vehicle_type: string | null
        availability: string | null
        last_active_at: string | null
        created_at: string | null
      }>) {
        // premium_car collapses into 'car' for the ops display so the row
        // stays at five tiles. Any unknown type is ignored — better to
        // under-report than show a "???" bucket.
        const raw = row.vehicle_type ?? 'bike'
        const key: VehicleTypeKey | null =
          raw === 'bike' ? 'bike' :
          raw === 'car' || raw === 'premium_car' ? 'car' :
          raw === 'truck' ? 'truck' :
          raw === 'minibus' ? 'minibus' :
          raw === 'jeep' ? 'jeep' : null
        if (!key) continue
        total += 1
        acc[key].total += 1
        const lastActive = row.last_active_at ? Date.parse(row.last_active_at) : NaN
        if (
          Number.isFinite(lastActive) &&
          lastActive > fiveMinAgoMs &&
          row.availability === 'online'
        ) {
          acc[key].online += 1
        }
        const created = row.created_at ? Date.parse(row.created_at) : NaN
        if (Number.isFinite(created) && created > sevenDaysAgoMs) {
          acc[key].signups_7d += 1
        }
      }
      driversByVehicle = { total, by_vehicle_type: acc }
    }
  }

  return {
    generatedAt,
    metrics: {
      driversOnline,
      activeBookings,
      locationP95,
      pushDelivery,
      reconnectQueue,
      crashFreeSessions,
      lastDeploySha,
      apiLatency,
      pushFailures,
      appVersionDistribution,
      dbLatency,
    },
    driversByVehicle,
  }
}

// ============================================================================
// Cron jobs health — last-run-per-job summary for the /admin/health panel
// ----------------------------------------------------------------------------
// Reads from cron_run_log (created in migration 0176). Cloudflare crons fire
// 8 jobs across the week (see wrangler.jsonc:34-43); each cron writes a row
// before dispatch (status='running') and patches it on completion. This
// helper rolls those rows up into "for each job: last run + 5 recent runs"
// so the dashboard can render a compact table.
//
// Defensive against the migration not being applied yet: if cron_run_log is
// missing we return [] so the UI can render its empty state instead of
// throwing. Same pattern as the push_send_log degradation above.
// ============================================================================

export interface CronRun {
  id: string
  scheduled_at: string
  started_at: string
  finished_at: string | null
  status: 'running' | 'ok' | 'error'
  duration_ms: number | null
  error_msg: string | null
}

export interface CronJobHealth {
  job_name: string
  last_started_at: string
  last_status: 'running' | 'ok' | 'error'
  last_duration_ms: number | null
  last_error: string | null
  recent_runs: CronRun[]
}

// Cron expression -> human cron schedule, kept in sync with worker-entry.mjs
// CRON_TO_JOB. We use it to render the "Next scheduled" column without
// reaching into wrangler.jsonc at runtime.
const JOB_TO_CRON: Record<string, string> = {
  'payouts-aggregate':       '0 1 * * 1',
  'subscription-expire':     '0 18 * * *',
  'retention-sweep':         '0 19 * * *',
  'b2b-recompute-scores':    '0 20 * * *',
  'payment-intents-expire':  '0 21 * * *',
  'reminders-payments':      '0 1 * * *',
  'pdp-overdue':             '0 2 * * *',
  'partner-suspend':         '0 * * * *',
  'route-health':            '*/5 * * * *',
}

/** Public list of jobs we expect to see in cron_run_log. Order is stable
 *  but the page re-sorts (errors first, then alpha). */
export const KNOWN_CRON_JOBS = Object.keys(JOB_TO_CRON)

export function cronExpressionFor(job: string): string | null {
  return JOB_TO_CRON[job] ?? null
}

export async function readCronJobsHealth(): Promise<CronJobHealth[]> {
  const admin = getAdminSupabase()
  if (!admin) return []

  // Pull the most recent 200 rows across all jobs (8 jobs * ~25 days worst
  // case for the hourly partner-suspend). We over-fetch so the "5 recent
  // runs per job" stays accurate even when one chatty job dominates.
  const { data, error } = await admin
    .from('cron_run_log')
    .select('id, job_name, scheduled_at, started_at, finished_at, status, duration_ms, error_msg')
    .order('started_at', { ascending: false })
    .limit(200)

  if (error) {
    if (isMissingTable(error)) return []
    // Other errors — surface as empty so the page renders the
    // "no runs logged yet" state rather than 500'ing the whole dashboard.
    return []
  }

  const byJob = new Map<string, CronRun[]>()
  for (const row of (data ?? []) as Array<{
    id: string
    job_name: string
    scheduled_at: string
    started_at: string
    finished_at: string | null
    status: 'running' | 'ok' | 'error'
    duration_ms: number | null
    error_msg: string | null
  }>) {
    const list = byJob.get(row.job_name) ?? []
    if (list.length < 5) {
      list.push({
        id: row.id,
        scheduled_at: row.scheduled_at,
        started_at: row.started_at,
        finished_at: row.finished_at,
        status: row.status,
        duration_ms: row.duration_ms,
        error_msg: row.error_msg,
      })
    }
    byJob.set(row.job_name, list)
  }

  const out: CronJobHealth[] = []
  for (const [job_name, runs] of byJob.entries()) {
    const last = runs[0]
    if (!last) continue
    out.push({
      job_name,
      last_started_at: last.started_at,
      last_status: last.status,
      last_duration_ms: last.duration_ms,
      last_error: last.error_msg,
      recent_runs: runs,
    })
  }
  return out
}

// ============================================================================
// Route health — synthetic-uptime probe results (migration 0178)
// ----------------------------------------------------------------------------
// Returns the latest probe per route plus a small recent series for a
// micro-sparkline. The /api/ops/route-health cron writes one row per
// route per probe (~every 5 min); this read aggregates to the latest
// observation per route_path so the admin sees one row per route.
// ============================================================================

export interface RouteHealthLatest {
  route_path: string
  status_code: number | null
  latency_ms: number | null
  ok: boolean
  error_msg: string | null
  checked_at: string
  /** Last 12 probes (1h-ish window) — newest first. */
  recent: Array<{ ok: boolean; latency_ms: number | null; checked_at: string }>
}

export async function readRouteHealth(): Promise<RouteHealthLatest[]> {
  const admin = getAdminSupabase()
  if (!admin) return []

  // Pull the most recent 200 probes globally. With ~7 routes × 12 probes/hr
  // = 84 rows/hour, 200 covers ~2.5 hours — enough for the per-route latest
  // + a 12-deep recent series.
  const { data, error } = await admin
    .from('route_health')
    .select('id, route_path, status_code, latency_ms, ok, error_msg, checked_at')
    .order('checked_at', { ascending: false })
    .limit(200)

  if (error) {
    if (isMissingTable(error)) return []
    return []
  }

  const byRoute = new Map<string, RouteHealthLatest>()
  for (const row of (data ?? []) as Array<{
    route_path: string
    status_code: number | null
    latency_ms: number | null
    ok: boolean
    error_msg: string | null
    checked_at: string
  }>) {
    const existing = byRoute.get(row.route_path)
    if (!existing) {
      byRoute.set(row.route_path, {
        route_path: row.route_path,
        status_code: row.status_code,
        latency_ms: row.latency_ms,
        ok: row.ok,
        error_msg: row.error_msg,
        checked_at: row.checked_at,
        recent: [{ ok: row.ok, latency_ms: row.latency_ms, checked_at: row.checked_at }],
      })
    } else if (existing.recent.length < 12) {
      existing.recent.push({ ok: row.ok, latency_ms: row.latency_ms, checked_at: row.checked_at })
    }
  }
  return Array.from(byRoute.values()).sort((a, b) => a.route_path.localeCompare(b.route_path))
}

// ============================================================================
// Environment health — config probe for critical env vars
// ----------------------------------------------------------------------------
// Surfaces which secrets are wired up in the current runtime. We only
// report set/unset state — never the value — so the rendered page is safe
// to view even when shared. This caught the Sentry-DSN-missing case the
// audit flagged: errors were being captured by Sentry SDK calls but the
// SDK silently no-ops when DSN is empty, so nothing reached the project.
//
// Severity rules:
//   - 'required' env vars unset → status 'err' (red)
//   - 'recommended' env vars unset → status 'warn' (yellow)
//   - all set → status 'ok' (green)
// ============================================================================

export type EnvCheckSeverity = 'required' | 'recommended'

export interface EnvCheck {
  name: string
  set: boolean
  severity: EnvCheckSeverity
  note: string
}

export function readEnvHealth(): EnvCheck[] {
  // Reading env vars at module init would tree-shake out — we read at call
  // time so the smoke is honest about what the running process sees.
  const has = (name: string): boolean => {
    const v = process.env[name]
    return typeof v === 'string' && v.length > 0
  }

  return [
    // Errors / observability
    {
      name: 'SENTRY_DSN',
      set: has('SENTRY_DSN') || has('NEXT_PUBLIC_SENTRY_DSN'),
      severity: 'required',
      note: 'Server + client error capture. Without a DSN, Sentry SDK silently drops every event.',
    },
    {
      name: 'NEXT_PUBLIC_SENTRY_DSN',
      set: has('NEXT_PUBLIC_SENTRY_DSN'),
      severity: 'recommended',
      note: 'Client-side error capture. May share value with SENTRY_DSN.',
    },

    // Ops alert paging
    {
      name: 'RESEND_API_KEY',
      set: has('RESEND_API_KEY'),
      severity: 'required',
      note: 'Outbound email — transactional + ops alert paging.',
    },
    {
      name: 'OPS_ALERT_EMAIL_TO',
      set: has('OPS_ALERT_EMAIL_TO'),
      severity: 'recommended',
      note: 'Comma-separated paging recipients. Falls back to RESEND_REPLY_TO if unset.',
    },

    // Cron + ops
    {
      name: 'CRON_SECRET',
      set: has('CRON_SECRET'),
      severity: 'required',
      note: 'Gates /api/cron/* and /api/ops/route-health. Worker refuses to fire crons without it.',
    },

    // PDP / privacy
    {
      name: 'IP_SALT',
      set: has('IP_SALT'),
      severity: 'required',
      note: 'Salt for SHA-256 hashing of visitor IPs in wa_click_events / profile_share_events.',
    },

    // Payments
    {
      name: 'MIDTRANS_SERVER_KEY',
      set: has('MIDTRANS_SERVER_KEY'),
      severity: 'required',
      note: 'Payment webhook signature verification.',
    },

    // Affiliate
    {
      name: 'AFFILIATE_SESSION_SECRET',
      set: has('AFFILIATE_SESSION_SECRET'),
      severity: 'required',
      note: 'Signs the affiliate session cookie.',
    },

    // Supabase service role
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      set: has('SUPABASE_SERVICE_ROLE_KEY'),
      severity: 'required',
      note: 'Admin reads / ops writes. Most of /admin/* and /api/admin/* fall back to errors without it.',
    },
  ]
}
