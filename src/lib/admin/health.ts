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
  }
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
      },
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

  // Active bookings — City Rider is a directory product. Permenhub PM 12/2019
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
    },
  }
}
