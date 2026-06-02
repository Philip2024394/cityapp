import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/retention/sweep?secret=$CRON_SECRET
// ----------------------------------------------------------------------------
// Daily Vercel cron. Enforces the retention claims in the privacy policy:
//
//   1. Drivers cancelled > 30 days ago → DELETE driver row (cascades to
//      related tables via ON DELETE CASCADE). The cancellation grace
//      window matches the privacy promise "retained while subscription
//      is active + 30 days after cancellation".
//
//   2. audit_log rows > 90 days old → DELETE. Matches "logs: 90 days
//      for security + debugging".
//
// Conservatively skips:
//   • payment_intents — kept indefinitely for tax/audit retention
//     (Indonesian commercial bookkeeping baseline of 10 years).
//   • driver_rides_log — driver's own bookkeeping, owner-managed
//     deletion (out of platform scope).
//
// Returns a JSON summary of rows touched for cron logs.
// ============================================================================

const DRIVER_RETENTION_DAYS = 30
const AUDIT_LOG_RETENTION_DAYS = 90
const WA_CLICK_RETENTION_DAYS = 90        // commitment in mig 0041
const SHARE_CLICK_RETENTION_DAYS = 90     // commitment in mig 0177
const ROUTE_HEALTH_RETENTION_DAYS = 30    // commitment in mig 0178
const OPS_ALERTS_RETENTION_DAYS = 365     // DR runbook §0 + audit M7

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return runSweep()
}

// Admin manual trigger uses the same gate.
export async function POST(req: Request) {
  return GET(req)
}

async function runSweep() {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const now = new Date()
  const cutoff = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()
  const driverCutoff      = cutoff(DRIVER_RETENTION_DAYS)
  const auditCutoff       = cutoff(AUDIT_LOG_RETENTION_DAYS)
  const waClickCutoff     = cutoff(WA_CLICK_RETENTION_DAYS)
  const shareClickCutoff  = cutoff(SHARE_CLICK_RETENTION_DAYS)
  const routeHealthCutoff = cutoff(ROUTE_HEALTH_RETENTION_DAYS)
  const opsAlertsCutoff   = cutoff(OPS_ALERTS_RETENTION_DAYS)

  // ────────────────────────────────────────────────────────────────
  // Pass 1 — cancelled drivers past the grace window
  // ────────────────────────────────────────────────────────────────
  // Find subscription rows that have been 'canceled' AND not touched for
  // > 30 days. subscriptions.updated_at is set whenever the status
  // changes, so a row sitting at 'canceled' for 30+ days means the
  // driver hasn't returned. Safe to purge.
  const { data: cancelledSubs, error: e1 } = await admin
    .from('subscriptions')
    .select('driver_id, updated_at')
    .eq('status', 'canceled')
    .lt('updated_at', driverCutoff)
  if (e1) return NextResponse.json({ error: e1.message, step: 'fetch-cancelled' }, { status: 500 })

  const driverIdsToPurge = (cancelledSubs ?? []).map((s) => s.driver_id).filter(Boolean)
  let driversDeleted = 0
  if (driverIdsToPurge.length > 0) {
    // Delete the driver row — ON DELETE CASCADE handles related rows
    // (subscriptions, driver_buddies, driver_referral_rewards, etc.).
    // We do NOT delete the profile row (profiles.id is the auth user
    // anchor; auth deletion is a separate flow gated on admin).
    const { data: deleted, error: e2 } = await admin
      .from('drivers')
      .delete()
      .in('user_id', driverIdsToPurge)
      .select('user_id')
    if (e2) return NextResponse.json({ error: e2.message, step: 'delete-drivers' }, { status: 500 })
    driversDeleted = (deleted ?? []).length
  }

  // ────────────────────────────────────────────────────────────────
  // Pass 2 — audit_log rows older than 90 days
  // ────────────────────────────────────────────────────────────────
  const { data: auditDeleted, error: e3 } = await admin
    .from('audit_log')
    .delete()
    .lt('created_at', auditCutoff)
    .select('id')
  if (e3) return NextResponse.json({ error: e3.message, step: 'delete-audit-log' }, { status: 500 })

  // ────────────────────────────────────────────────────────────────
  // Pass 3 — telemetry retention (anonymous click + share + uptime probes)
  // ────────────────────────────────────────────────────────────────
  // wa_click_events (PDP — hashed IP only, but still anonymous-cohort
  // worth keeping cardinality low): 90d.
  // profile_share_events (same posture): 90d.
  // route_health (operational): 30d — we don't need history beyond that.
  //
  // Each delete swallows its own error to a per-pass field so a single
  // failure (e.g. table doesn't exist yet on a fresh DB) doesn't abort
  // the whole sweep. The sweep still returns 200 so the cron logs
  // success — but the response payload tells the operator what happened.
  // Capture the narrowed admin client so the closure below doesn't trip
  // the strictNullChecks narrowing rule (the outer guard at line 45 is
  // not preserved across closure boundaries by the inference).
  const adminClient = admin
  async function deleteBy(table: string, column: string, before: string): Promise<{ purged: number; error: string | null }> {
    try {
      const { data, error } = await adminClient
        .from(table)
        .delete()
        .lt(column, before)
        .select('id')
      if (error) return { purged: 0, error: error.message }
      return { purged: (data ?? []).length, error: null }
    } catch (e) {
      return { purged: 0, error: e instanceof Error ? e.message : 'unknown' }
    }
  }

  const [waClickRes, shareClickRes, routeHealthRes, opsAlertsRes] = await Promise.all([
    deleteBy('wa_click_events',      'occurred_at', waClickCutoff),
    deleteBy('profile_share_events', 'occurred_at', shareClickCutoff),
    deleteBy('route_health',         'checked_at',  routeHealthCutoff),
    deleteBy('ops_alerts',           'created_at',  opsAlertsCutoff),
  ])

  return NextResponse.json({
    ok: true,
    ran_at: now.toISOString(),
    cancelled_drivers_purged: driversDeleted,
    audit_log_rows_purged: (auditDeleted ?? []).length,
    wa_click_events_purged: waClickRes.purged,
    profile_share_events_purged: shareClickRes.purged,
    route_health_purged: routeHealthRes.purged,
    ops_alerts_purged: opsAlertsRes.purged,
    pass3_errors: {
      wa_click_events: waClickRes.error,
      profile_share_events: shareClickRes.error,
      route_health: routeHealthRes.error,
      ops_alerts: opsAlertsRes.error,
    },
    cutoffs: {
      drivers_before: driverCutoff,
      audit_log_before: auditCutoff,
      wa_click_events_before: waClickCutoff,
      profile_share_events_before: shareClickCutoff,
      route_health_before: routeHealthCutoff,
      ops_alerts_before: opsAlertsCutoff,
    },
  })
}
