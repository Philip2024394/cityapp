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
  const driverCutoff = new Date(now.getTime() - DRIVER_RETENTION_DAYS * 86_400_000).toISOString()
  const auditCutoff  = new Date(now.getTime() - AUDIT_LOG_RETENTION_DAYS * 86_400_000).toISOString()

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

  return NextResponse.json({
    ok: true,
    ran_at: now.toISOString(),
    cancelled_drivers_purged: driversDeleted,
    audit_log_rows_purged: (auditDeleted ?? []).length,
    cutoffs: {
      drivers_before: driverCutoff,
      audit_log_before: auditCutoff,
    },
  })
}
