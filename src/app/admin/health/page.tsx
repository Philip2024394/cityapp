import { Activity, AlertTriangle, CheckCircle2, MinusCircle, XCircle } from 'lucide-react'
import { getHealthSnapshot, type Metric, type MetricStatus } from '@/lib/admin/health'
import RefreshButton from './RefreshButton'

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
  const snapshot = await getHealthSnapshot()
  const m = snapshot.metrics

  // Fixed ordering matches Phil's brief (1..10).
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

      <div className="text-[11px] text-dim leading-relaxed">
        Server-rendered on every request. Refresh re-runs all queries — no
        polling. Pending tiles describe the smallest change needed to light
        them up; nothing here writes to the database.
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
