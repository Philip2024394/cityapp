import { Activity, AlertTriangle, Bike, Bus, Car, CheckCircle2, Globe, KeyRound, MinusCircle, Mountain, Timer, Truck, XCircle } from 'lucide-react'
import {
  cronExpressionFor,
  getHealthSnapshot,
  KNOWN_CRON_JOBS,
  readCronJobsHealth,
  readEnvHealth,
  readRouteHealth,
  VEHICLE_TYPE_KEYS,
  type CronJobHealth,
  type CronRun,
  type DriversByVehicle,
  type EnvCheck,
  type Metric,
  type MetricStatus,
  type RouteHealthLatest,
  type VehicleTypeKey,
} from '@/lib/admin/health'
import RefreshButton from './RefreshButton'

// Lucide icon + display label per vertical. `Mountain` stands in for jeep
// (off-road / Bromo / Ijen tours — no jeep glyph in lucide).
const VEHICLE_META: Record<VehicleTypeKey, { Icon: typeof Bike; label: string }> = {
  bike:    { Icon: Bike,     label: 'Bike'    },
  car:     { Icon: Car,      label: 'Car'     },
  truck:   { Icon: Truck,    label: 'Truck'   },
  minibus: { Icon: Bus,      label: 'Minibus' },
  jeep:    { Icon: Mountain, label: 'Jeep'    },
}

// ============================================================================
// /admin/health — production-readiness observability dashboard
// ----------------------------------------------------------------------------
// Single page surfacing 10 metrics — driver presence, push delivery, deploy
// SHA, crash-free %, etc. Each metric renders the same card regardless of
// whether the data source is wired up; metrics that need follow-up
// instrumentation render in the `na` state with a one-line next-step note so
// the gap to full observability is visible at a glance.
//
// Auth: inherits requireAdmin() from src/app/admin/layout.tsx — no second
// gate here.
//
// Performance: every Supabase query is a single-row aggregate over an
// indexed column (current_location_updated_at has a btree from migration
// 0019; push_send_log doesn't exist yet, so that arm short-circuits via
// the missing-table sentinel and never hits the DB beyond the first
// probe). Snapshot should resolve in <500ms on a warm Vercel function.
//
// Refresh: server-rendered with force-dynamic. The client-side
// RefreshButton calls router.refresh() — no polling, no realtime channels,
// no extra requests.
// ============================================================================

export const dynamic = 'force-dynamic'

export default async function AdminHealthPage() {
  const [snapshot, cronJobs, routeHealth] = await Promise.all([
    getHealthSnapshot(),
    readCronJobsHealth(),
    readRouteHealth(),
  ])
  const envChecks = readEnvHealth()
  const m = snapshot.metrics

  // Fixed ordering matches Phil's brief (1..10); dbLatency added as
  // the live DB connection-health probe (audit M5).
  const tiles: Metric[] = [
    m.driversOnline,
    m.activeBookings,
    m.locationP95,
    m.pushDelivery,
    m.reconnectQueue,
    m.crashFreeSessions,
    m.lastDeploySha,
    m.apiLatency,
    m.pushFailures,
    m.appVersionDistribution,
    m.dbLatency,
  ]

  const generated = new Date(snapshot.generatedAt).toLocaleString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: 'short', year: 'numeric',
  })

  // Summary counts — at-a-glance "how much of the dashboard is live?"
  const summary = tiles.reduce<Record<MetricStatus, number>>(
    (acc, t) => { acc[t.status] += 1; return acc },
    { ok: 0, warn: 0, err: 0, na: 0 },
  )

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand" />
          Health
        </h1>
        <RefreshButton />
      </div>

      <div className="text-[12px] text-muted">
        Snapshot at <span className="font-mono">{generated}</span> ·{' '}
        <span style={{ color: '#22C55E' }}>{summary.ok} live</span> ·{' '}
        <span style={{ color: '#FACC15' }}>{summary.warn} warn</span> ·{' '}
        <span style={{ color: '#EF4444' }}>{summary.err} err</span> ·{' '}
        <span className="text-dim">{summary.na} pending</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tiles.map((t) => <Tile key={t.label} metric={t} />)}
      </div>

      <DriversByVerticalSection data={snapshot.driversByVehicle} />

      <RouteHealthSection routes={routeHealth} />

      <EnvHealthSection checks={envChecks} />

      <CronJobsSection jobs={cronJobs} />

      <div className="text-[11px] text-dim leading-relaxed">
        Server-rendered on every request. Refresh re-runs all queries — no
        polling. Pending tiles describe the smallest change needed to light
        them up; nothing here writes to the database.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cron jobs section — C5 audit. Surfaces the 8 Cloudflare cron triggers
// (see wrangler.jsonc:34-43) so ops sees which job ran last, when, and
// whether it succeeded. Data comes from cron_run_log (migration 0176),
// written by worker-entry.mjs around each dispatch.
//
// Sort order: errors first, then alpha — so a red row never hides below a
// dozen healthy ones. Stale jobs (no run in >25h) and missing jobs render
// in yellow because the cadence dictates we should have seen at least one
// run in the last day (the longest cron is weekly Mon, but on any other
// day of the week we still expect at least one row from the daily/hourly
// jobs to confirm the dispatcher is alive).
// ---------------------------------------------------------------------------

const STALE_THRESHOLD_MS = 25 * 60 * 60 * 1000 // 25h

function CronJobsSection({ jobs }: { jobs: CronJobHealth[] }) {
  // Merge real rows with placeholders for any KNOWN_CRON_JOBS that
  // haven't logged yet — operator should see "no runs logged yet" rather
  // than the job being silently absent from the table.
  const byName = new Map(jobs.map((j) => [j.job_name, j]))
  const rows: Array<CronJobHealth | { job_name: string; missing: true }> = KNOWN_CRON_JOBS.map(
    (name) => byName.get(name) ?? { job_name: name, missing: true },
  )

  // Sort: errors first, then stale, then alpha. Missing/never-run jobs
  // count as stale (yellow warn) — same as a >25h-old success.
  rows.sort((a, b) => {
    const aRank = rankFor(a)
    const bRank = rankFor(b)
    if (aRank !== bRank) return aRank - bRank
    return a.job_name.localeCompare(b.job_name)
  })

  const allEmpty = jobs.length === 0

  return (
    <section className="space-y-2">
      <h2 className="text-[13px] uppercase tracking-wider font-extrabold text-dim flex items-center gap-2">
        <Timer className="w-3.5 h-3.5" />
        Cron jobs
      </h2>

      {allEmpty ? (
        <div className="card p-4 text-[13px] text-muted">
          No runs logged yet. Cron dispatchers in <span className="font-mono">worker-entry.mjs</span> write
          to <span className="font-mono">cron_run_log</span> on every invocation — the next scheduled job
          will populate this table.
        </div>
      ) : null}

      <div className="card overflow-hidden" style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-dim border-b border-white/10">
                <th className="text-left font-extrabold px-3 py-2">Job</th>
                <th className="text-left font-extrabold px-3 py-2">Last run</th>
                <th className="text-left font-extrabold px-3 py-2">Status</th>
                <th className="text-left font-extrabold px-3 py-2">Duration</th>
                <th className="text-left font-extrabold px-3 py-2">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <CronRow key={row.job_name} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function rankFor(row: CronJobHealth | { job_name: string; missing: true }): number {
  if ('missing' in row) return 1 // stale
  if (row.last_status === 'error') return 0
  const ageMs = Date.now() - Date.parse(row.last_started_at)
  if (Number.isFinite(ageMs) && ageMs > STALE_THRESHOLD_MS) return 1
  return 2 // healthy
}

function CronRow({
  row,
}: {
  row: CronJobHealth | { job_name: string; missing: true }
}) {
  const schedule = cronExpressionFor(row.job_name) ?? '—'

  if ('missing' in row) {
    return (
      <tr className="border-b border-white/5">
        <td className="px-3 py-2 font-mono text-[13px]">{row.job_name}</td>
        <td className="px-3 py-2 text-muted" colSpan={3}>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider"
            style={{ color: '#FACC15' }}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            no runs logged yet
          </span>
        </td>
        <td className="px-3 py-2 font-mono text-dim">{schedule}</td>
      </tr>
    )
  }

  const ageMs = Date.now() - Date.parse(row.last_started_at)
  const isStale = Number.isFinite(ageMs) && ageMs > STALE_THRESHOLD_MS
  const statusColor =
    row.last_status === 'error' ? '#EF4444' :
    row.last_status === 'running' ? '#FACC15' :
    isStale ? '#FACC15' : '#22C55E'
  const StatusIcon =
    row.last_status === 'error' ? XCircle :
    row.last_status === 'running' ? Timer :
    isStale ? AlertTriangle : CheckCircle2
  const statusLabel =
    row.last_status === 'error' ? 'error' :
    row.last_status === 'running' ? 'running' :
    isStale ? 'stale' : 'ok'

  return (
    <>
      <tr className="border-b border-white/5">
        <td className="px-3 py-2 font-mono">{row.job_name}</td>
        <td className="px-3 py-2 text-muted whitespace-nowrap">
          {formatRelativeAndAbsolute(row.last_started_at)}
        </td>
        <td className="px-3 py-2">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider"
            style={{ color: statusColor }}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusLabel}
          </span>
        </td>
        <td className="px-3 py-2 font-mono text-muted">
          {row.last_duration_ms !== null ? `${row.last_duration_ms} ms` : '—'}
        </td>
        <td className="px-3 py-2 font-mono text-dim">{schedule}</td>
      </tr>
      <tr>
        <td colSpan={5} className="px-3 pb-2">
          <details className="text-[12px]">
            <summary className="cursor-pointer text-dim hover:text-muted select-none">
              {row.recent_runs.length} recent run{row.recent_runs.length === 1 ? '' : 's'}
              {row.last_error ? ' · last error attached' : ''}
            </summary>
            <div className="mt-2 space-y-1">
              {row.recent_runs.map((r) => <RecentRun key={r.id} run={r} />)}
            </div>
            {row.last_error ? (
              <pre
                className="mt-2 text-[12px] font-mono whitespace-pre-wrap break-words leading-snug p-2"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.30)',
                  borderRadius: 4,
                  color: '#EF4444',
                }}
              >
                {row.last_error}
              </pre>
            ) : null}
          </details>
        </td>
      </tr>
    </>
  )
}

function RecentRun({ run }: { run: CronRun }) {
  const color =
    run.status === 'error' ? '#EF4444' :
    run.status === 'running' ? '#FACC15' :
    '#22C55E'
  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="font-mono text-muted whitespace-nowrap">
        {formatRelativeAndAbsolute(run.started_at)}
      </span>
      <span className="font-mono text-dim">
        {run.duration_ms !== null ? `${run.duration_ms} ms` : '—'}
      </span>
      <span className="text-dim uppercase tracking-wider" style={{ color }}>
        {run.status}
      </span>
    </div>
  )
}

function formatRelativeAndAbsolute(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  const diffSec = Math.round((Date.now() - ms) / 1000)
  let rel: string
  if (diffSec < 60) rel = `${diffSec}s ago`
  else if (diffSec < 3600) rel = `${Math.round(diffSec / 60)}m ago`
  else if (diffSec < 86400) rel = `${Math.round(diffSec / 3600)}h ago`
  else rel = `${Math.round(diffSec / 86400)}d ago`
  const abs = new Date(ms).toLocaleString('en-GB', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: 'short',
  })
  return `${rel} · ${abs}`
}

// ---------------------------------------------------------------------------
// Drivers by vertical — H4 audit. One small card per vehicle_type so ops can
// see which vertical is alive vs which is starving for drivers. Online count
// uses the brand yellow accent; empty verticals render greyed out.
// ---------------------------------------------------------------------------

function DriversByVerticalSection({ data }: { data: DriversByVehicle | null }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] uppercase tracking-wider font-extrabold text-dim">
        Drivers by vertical
      </h2>
      {data === null ? (
        <div className="card p-4 text-[13px] text-muted">
          Per-vertical breakdown unavailable — Supabase service role missing or
          query failed.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {VEHICLE_TYPE_KEYS.map((key) => (
            <VerticalCard key={key} vehicle={key} stats={data.by_vehicle_type[key]} />
          ))}
        </div>
      )}
    </section>
  )
}

function VerticalCard({
  vehicle,
  stats,
}: {
  vehicle: VehicleTypeKey
  stats: { online: number; total: number; signups_7d: number }
}) {
  const { Icon, label } = VEHICLE_META[vehicle]
  const empty = stats.total === 0
  return (
    <div
      className="card p-3 min-h-[88px]"
      style={{
        background: empty ? 'rgba(255,255,255,0.02)' : undefined,
        opacity: empty ? 0.6 : 1,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: empty ? 'rgba(255,255,255,0.45)' : '#FACC15' }} />
        <span className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className="text-[22px] font-extrabold leading-none"
          style={{ color: empty ? 'rgba(255,255,255,0.45)' : '#FACC15' }}
        >
          {stats.online}
        </span>
        <span className="text-[13px] text-muted font-mono">/ {stats.total}</span>
      </div>
      <div className="text-[12px] text-muted mt-1.5 leading-relaxed">
        online · <span className="text-dim">+{stats.signups_7d} new (7d)</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

function Tile({ metric }: { metric: Metric }) {
  const { color, bg, border, Icon, statusLabel } = styleFor(metric.status)
  const display =
    metric.value === null
      ? 'N/A'
      : typeof metric.value === 'number'
        ? Intl.NumberFormat('en-GB').format(metric.value)
        : metric.value
  return (
    <div
      className="card p-4"
      style={{ background: bg, borderColor: border }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wider font-extrabold text-dim">
          {metric.label}
        </div>
        <div
          className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider"
          style={{ color }}
        >
          <Icon className="w-3.5 h-3.5" />
          {statusLabel}
        </div>
      </div>
      <div
        className="text-[28px] font-extrabold mt-2 leading-none break-words"
        style={{ color: metric.value === null ? 'rgba(255,255,255,0.45)' : undefined }}
      >
        {display}
      </div>
      {metric.note && (
        <div className="text-[12px] text-muted mt-2 leading-relaxed">
          {metric.note}
        </div>
      )}
      {metric.link && (
        <a
          href={metric.link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-extrabold mt-2 inline-block underline decoration-dotted"
          style={{ color }}
        >
          {metric.link.label} →
        </a>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status styling
// ---------------------------------------------------------------------------

function styleFor(status: MetricStatus) {
  switch (status) {
    case 'ok':
      return {
        color: '#22C55E',
        bg: 'rgba(34,197,94,0.04)',
        border: 'rgba(34,197,94,0.25)',
        Icon: CheckCircle2,
        statusLabel: 'live',
      }
    case 'warn':
      return {
        color: '#FACC15',
        bg: 'rgba(250,204,21,0.06)',
        border: 'rgba(250,204,21,0.30)',
        Icon: AlertTriangle,
        statusLabel: 'warn',
      }
    case 'err':
      return {
        color: '#EF4444',
        bg: 'rgba(239,68,68,0.06)',
        border: 'rgba(239,68,68,0.30)',
        Icon: XCircle,
        statusLabel: 'error',
      }
    case 'na':
    default:
      return {
        color: 'rgba(255,255,255,0.55)',
        bg: 'rgba(255,255,255,0.02)',
        border: 'rgba(255,255,255,0.10)',
        Icon: MinusCircle,
        statusLabel: 'pending',
      }
  }
}

// ---------------------------------------------------------------------------
// Route health section — synthetic uptime probes (migration 0178).
// Cron `*/5 * * * *` (worker-entry.mjs → /api/ops/route-health) hits each
// public route and records status_code / latency / ok. We render one row
// per route with the latest probe and a micro-strip of the last 12.
// ---------------------------------------------------------------------------

function RouteHealthSection({ routes }: { routes: RouteHealthLatest[] }) {
  const downCount = routes.filter((r) => !r.ok).length

  return (
    <section className="space-y-2">
      <h2 className="text-[13px] uppercase tracking-wider font-extrabold text-dim flex items-center gap-2">
        <Globe className="w-3.5 h-3.5" />
        Route status
        {downCount > 0 ? (
          <span
            className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold"
            style={{ background: 'rgba(239,68,68,0.18)', color: '#F87171' }}
          >
            {downCount} down
          </span>
        ) : null}
      </h2>

      {routes.length === 0 ? (
        <div className="card p-4 text-[13px] text-muted">
          No probes logged yet. The <span className="font-mono">route-health</span> cron
          (<span className="font-mono">*/5 * * * *</span>) writes to{' '}
          <span className="font-mono">route_health</span> on every run. First row appears
          within 5 min of deploy.
        </div>
      ) : (
        <div className="card overflow-hidden" style={{ padding: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-dim border-b border-white/10">
                  <th className="text-left font-extrabold px-3 py-2">Route</th>
                  <th className="text-left font-extrabold px-3 py-2">Status</th>
                  <th className="text-right font-extrabold px-3 py-2">Latency</th>
                  <th className="text-left font-extrabold px-3 py-2">Last 12</th>
                  <th className="text-left font-extrabold px-3 py-2">Checked</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r) => (
                  <RouteRow key={r.route_path} route={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Environment health section — surfaces which secrets are wired.
// Catches the silent-Sentry-DSN-missing case the audit flagged (and any
// future paging/payment misconfigs). NEVER prints values, only set/unset.
// ---------------------------------------------------------------------------

function EnvHealthSection({ checks }: { checks: EnvCheck[] }) {
  const missing = checks.filter((c) => !c.set)
  const missingRequired = missing.filter((c) => c.severity === 'required')
  const okColor = '#22C55E'
  const warnColor = '#FACC15'
  const errColor = '#EF4444'

  return (
    <section className="space-y-2">
      <h2 className="text-[13px] uppercase tracking-wider font-extrabold text-dim flex items-center gap-2">
        <KeyRound className="w-3.5 h-3.5" />
        Environment
        {missingRequired.length > 0 ? (
          <span
            className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold"
            style={{ background: 'rgba(239,68,68,0.18)', color: errColor }}
          >
            {missingRequired.length} required missing
          </span>
        ) : missing.length > 0 ? (
          <span
            className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold"
            style={{ background: 'rgba(250,204,21,0.16)', color: warnColor }}
          >
            {missing.length} recommended missing
          </span>
        ) : (
          <span
            className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold"
            style={{ background: 'rgba(34,197,94,0.16)', color: okColor }}
          >
            all set
          </span>
        )}
      </h2>

      <div className="card overflow-hidden" style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-dim border-b border-white/10">
                <th className="text-left font-extrabold px-3 py-2">Variable</th>
                <th className="text-left font-extrabold px-3 py-2">Status</th>
                <th className="text-left font-extrabold px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => {
                const color = c.set ? okColor : c.severity === 'required' ? errColor : warnColor
                const bg = c.set
                  ? 'rgba(34,197,94,0.16)'
                  : c.severity === 'required'
                    ? 'rgba(239,68,68,0.18)'
                    : 'rgba(250,204,21,0.16)'
                return (
                  <tr key={c.name} className="border-t border-line/40">
                    <td className="px-3 py-2 align-middle font-mono text-ink/85">{c.name}</td>
                    <td className="px-3 py-2 align-middle">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider"
                        style={{ background: bg, color, border: `1px solid ${color}33` }}
                      >
                        {c.set ? 'set' : c.severity === 'required' ? 'unset (required)' : 'unset (recommended)'}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle text-muted text-[12px]">{c.note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function RouteRow({ route }: { route: RouteHealthLatest }) {
  const okColor = '#22C55E'
  const downColor = '#EF4444'
  return (
    <tr className="border-t border-line/40">
      <td className="px-3 py-2 align-middle">
        <span className="font-mono text-ink/85">{route.route_path}</span>
      </td>
      <td className="px-3 py-2 align-middle">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold"
          style={{
            background: route.ok ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.18)',
            color: route.ok ? okColor : downColor,
            border: `1px solid ${(route.ok ? okColor : downColor) + '33'}`,
          }}
        >
          {route.status_code ?? 'ERR'} {route.ok ? 'OK' : 'DOWN'}
        </span>
        {route.error_msg ? (
          <div className="text-[11px] text-dim mt-1 truncate max-w-[280px]" title={route.error_msg}>
            {route.error_msg}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-2 align-middle text-right tabular-nums">
        {route.latency_ms != null ? `${route.latency_ms}ms` : '—'}
      </td>
      <td className="px-3 py-2 align-middle">
        <div className="inline-flex items-center gap-0.5">
          {/* Newest on the right matches the cron-run strip on this page. */}
          {route.recent.slice().reverse().map((p, i) => (
            <span
              key={i}
              title={`${p.ok ? 'OK' : 'DOWN'} ${p.latency_ms ?? '—'}ms · ${p.checked_at}`}
              className="inline-block"
              style={{
                width: 6,
                height: 14,
                borderRadius: 2,
                background: p.ok ? okColor : downColor,
                opacity: 0.85,
              }}
            />
          ))}
        </div>
      </td>
      <td className="px-3 py-2 align-middle text-muted">
        <time dateTime={route.checked_at}>
          {new Date(route.checked_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </time>
      </td>
    </tr>
  )
}
