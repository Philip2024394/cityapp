'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Info, RefreshCw } from 'lucide-react'
import type { OpsAlertRow } from '@/app/api/admin/alerts/route'

// ============================================================================
// AlertsClient — interactive island for /admin/alerts
// ----------------------------------------------------------------------------
// Receives an initial server-rendered snapshot, then re-fetches /api/admin/alerts
// every 30s. Each row exposes an Acknowledge button and an expandable JSON
// detail block.
//
// Filter pill pattern mirrors src/app/admin/drivers/page.tsx (yellow active,
// white-on-transparent inactive). Severity chips: yellow=warn, red=error,
// dark-red=critical, gray=info. WCAG: 13px text floor, 44px tap targets.
// ============================================================================

type Filter = 'all' | 'unacked' | 'critical' | 'error' | 'warn'

const REFRESH_MS = 30_000

export default function AlertsClient({
  initialAlerts,
  initialUnacked,
}: {
  initialAlerts: OpsAlertRow[]
  initialUnacked: number
}) {
  const [alerts, setAlerts] = useState<OpsAlertRow[]>(initialAlerts)
  const [unacked, setUnacked] = useState<number>(initialUnacked)
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [acking, setAcking] = useState<Set<string>>(new Set())
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const r = await fetch('/api/admin/alerts?limit=100', { cache: 'no-store' })
      if (!r.ok) return
      const json = (await r.json()) as { alerts: OpsAlertRow[]; total_unacked: number }
      if (!mounted.current) return
      setAlerts(json.alerts ?? [])
      setUnacked(json.total_unacked ?? 0)
    } catch { /* swallow */ }
    finally {
      if (mounted.current) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const id = setInterval(refresh, REFRESH_MS)
    return () => {
      mounted.current = false
      clearInterval(id)
    }
  }, [refresh])

  const acknowledge = useCallback(async (id: string) => {
    setAcking((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    try {
      const r = await fetch(`/api/admin/alerts/${id}/acknowledge`, { method: 'POST' })
      if (!r.ok) return
      // Optimistic: stamp the local row so the UI feels instant.
      const ackAt = new Date().toISOString()
      setAlerts((rows) => rows.map((row) => row.id === id && !row.acknowledged_at
        ? { ...row, acknowledged_at: ackAt }
        : row))
      setUnacked((n) => Math.max(0, n - 1))
    } catch { /* swallow */ }
    finally {
      setAcking((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return alerts
    if (filter === 'unacked') return alerts.filter((a) => !a.acknowledged_at)
    if (filter === 'critical') return alerts.filter((a) => a.severity === 'critical')
    if (filter === 'error') return alerts.filter((a) => a.severity === 'error')
    if (filter === 'warn') return alerts.filter((a) => a.severity === 'warn')
    return alerts
  }, [alerts, filter])

  return (
    <>
      {/* ============== Filter pills + manual refresh ============== */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 flex-1">
          {(['all','unacked','critical','error','warn'] as Filter[]).map((f) => (
            <FilterPill
              key={f}
              label={labelForFilter(f, unacked)}
              active={filter === f}
              onClick={() => setFilter(f)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="shrink-0 flex items-center gap-1.5 px-3 rounded-full text-[13px] font-bold border min-h-[44px]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.75)',
            borderColor: 'rgba(255,255,255,0.10)',
          }}
          aria-label="Refresh alerts now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ============== List ============== */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">
          {alerts.length === 0
            ? 'No alerts yet — the pipeline is quiet.'
            : 'No alerts match this filter.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              expanded={expanded.has(a.id)}
              acking={acking.has(a.id)}
              onToggle={() => toggleExpand(a.id)}
              onAcknowledge={() => acknowledge(a.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function FilterPill({
  label, active, onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-3 rounded-full text-[13px] font-bold border whitespace-nowrap transition min-h-[44px]"
      style={{
        background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
        color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
        borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.10)',
      }}
    >
      {label}
    </button>
  )
}

function AlertRow({
  alert, expanded, acking, onToggle, onAcknowledge,
}: {
  alert: OpsAlertRow
  expanded: boolean
  acking: boolean
  onToggle: () => void
  onAcknowledge: () => void
}) {
  const isAcked = Boolean(alert.acknowledged_at)
  const sev = severityStyle(alert.severity)
  const detailJson = alert.detail ? JSON.stringify(alert.detail, null, 2) : null
  const Caret = expanded ? ChevronDown : ChevronRight

  return (
    <div className="card p-3" style={isAcked ? { opacity: 0.55 } : undefined}>
      <div className="flex items-start gap-3">
        {/* Severity chip + icon */}
        <span
          className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] font-extrabold uppercase tracking-wider"
          style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}
          aria-label={`severity ${alert.severity}`}
        >
          <sev.Icon className="w-3.5 h-3.5" />
          {alert.severity}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-[14px] leading-tight">{alert.title}</span>
          </div>
          <div className="text-[13px] text-muted mt-0.5 leading-snug truncate">
            <span className="font-mono">{alert.source}</span>
            <span aria-hidden> · </span>
            <span>{formatTimestamp(alert.created_at)}</span>
            {isAcked && (
              <>
                <span aria-hidden> · </span>
                <span className="text-[13px]" style={{ color: '#22C55E' }}>acked {formatTimestamp(alert.acknowledged_at!)}</span>
              </>
            )}
          </div>
        </div>

        {/* Acknowledge button (hidden when already acked) */}
        {!isAcked && (
          <button
            type="button"
            onClick={onAcknowledge}
            disabled={acking}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg text-[13px] font-extrabold transition min-h-[44px]"
            style={{
              background: acking ? 'rgba(250,204,21,0.55)' : '#FACC15',
              color: '#0A0A0A',
              borderColor: '#FACC15',
            }}
            aria-label="Acknowledge alert"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {acking ? 'Acking…' : 'Acknowledge'}
          </button>
        )}
      </div>

      {/* Detail toggle */}
      {detailJson && (
        <div className="mt-2">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 text-[13px] font-bold text-muted hover:text-ink min-h-[44px] px-1"
            aria-expanded={expanded}
          >
            <Caret className="w-3.5 h-3.5" />
            {expanded ? 'Hide detail' : 'Show detail'}
          </button>
          {expanded && (
            <pre
              className="mt-1 p-3 rounded-lg text-[13px] leading-snug overflow-x-auto"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.85)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              {detailJson}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function labelForFilter(f: Filter, unacked: number): string {
  switch (f) {
    case 'all':      return 'All'
    case 'unacked':  return `Unacked${unacked > 0 ? ` (${unacked})` : ''}`
    case 'critical': return 'Critical'
    case 'error':    return 'Errors'
    case 'warn':     return 'Warnings'
  }
}

function severityStyle(sev: OpsAlertRow['severity']): {
  bg: string; color: string; border: string; Icon: React.ComponentType<{ className?: string }>
} {
  if (sev === 'critical') {
    return {
      bg: 'rgba(220,38,38,0.15)',
      color: '#FCA5A5',
      border: 'rgba(220,38,38,0.45)',
      Icon: AlertTriangle,
    }
  }
  if (sev === 'error') {
    return {
      bg: 'rgba(239,68,68,0.10)',
      color: '#EF4444',
      border: 'rgba(239,68,68,0.35)',
      Icon: AlertTriangle,
    }
  }
  if (sev === 'warn') {
    return {
      bg: 'rgba(250,204,21,0.10)',
      color: '#FACC15',
      border: 'rgba(250,204,21,0.35)',
      Icon: AlertTriangle,
    }
  }
  return {
    bg: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.75)',
    border: 'rgba(255,255,255,0.15)',
    Icon: Info,
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}
