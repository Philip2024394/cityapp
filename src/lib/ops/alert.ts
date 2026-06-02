// ============================================================================
// fireAlert — cityrider beacon to /api/ops/alert
// ----------------------------------------------------------------------------
// Call from anywhere in cityrider client code when something is wrong:
//
//   fireAlert({
//     severity: 'critical',
//     source: 'midtrans-webhook',
//     title: 'Webhook signature mismatch',
//     detail: `payment_intent ${id} got bad signature`,
//     suggested_fix: 'Verify MIDTRANS_SERVER_KEY env on Vercel matches dashboard',
//   })
//
// Fire-and-forget, never throws. Uses sendBeacon when available so the
// post survives navigation. App admin sees it in /admin → Alerts tab.
//
// 2026-06-01 (Phase 1 Admin Dashboard):
//   * Server-side path now writes to the LOCAL Supabase `ops_alerts` table
//     (migration 0175). Previously this proxied to the streetlocal project
//     so local admins were blind to system errors.
//   * We still attempt a best-effort streetlocal mirror AFTER the local
//     insert succeeds — this preserves any external tooling that may be
//     watching the streetlocal `app_health_alerts` log. The mirror is
//     fully swallowed; it never affects the local write outcome.
// ============================================================================

export type AlertSeverity = 'critical' | 'error' | 'warning' | 'info'

// Local DB severity vocabulary: the ops_alerts CHECK constraint accepts
// info|warn|error|critical. We accept 'warning' from callers and map.
type LocalSeverity = 'info' | 'warn' | 'error' | 'critical'

function toLocalSeverity(s: AlertSeverity): LocalSeverity {
  if (s === 'warning') return 'warn'
  return s
}

const ENDPOINT = '/api/ops/alert'

export function fireAlert(args: {
  severity: AlertSeverity
  source: string
  title: string
  detail?: string
  suggested_fix?: string
  meta?: Record<string, unknown>
}): void {
  const payload = JSON.stringify(args)
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      if (navigator.sendBeacon(ENDPOINT, blob)) return
    }
    if (typeof fetch !== 'undefined') {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => { /* swallow */ })
    }
  } catch { /* swallow */ }
}

// Server-side variant — call from API routes / cron handlers when
// something fails. Writes to the LOCAL ops_alerts table via service-role
// client (bypasses RLS), with a best-effort streetlocal mirror for
// backwards-compat with any external watchers.
export async function fireAlertServer(args: {
  severity: AlertSeverity
  source: string
  title: string
  detail?: string
  suggested_fix?: string
  meta?: Record<string, unknown>
}): Promise<void> {
  // ---- 1. Local write (the new canonical destination) -----------------
  try {
    const { getAdminSupabase } = await import('@/lib/supabase/admin')
    const admin = getAdminSupabase()
    if (admin) {
      // Map the freeform payload into the ops_alerts column shape.
      // `detail` is jsonb so we pack the existing strings + meta together
      // rather than dropping anything on the floor.
      const detailJson: Record<string, unknown> = {}
      if (args.detail) detailJson.detail = args.detail
      if (args.suggested_fix) detailJson.suggested_fix = args.suggested_fix
      if (args.meta) detailJson.meta = args.meta
      await admin.from('ops_alerts').insert({
        source: args.source.slice(0, 64),
        severity: toLocalSeverity(args.severity),
        title: args.title.slice(0, 200),
        detail: Object.keys(detailJson).length ? detailJson : null,
      })
    }
  } catch { /* swallow — never break the caller */ }

  // ---- 2. Streetlocal mirror (backwards-compat, best-effort) ----------
  try {
    const { getStreetlocalAdminSupabase } = await import('@/lib/supabase/streetlocal')
    const sl = getStreetlocalAdminSupabase()
    if (sl) {
      await sl.rpc('log_app_health_alert', {
        p_severity: args.severity,
        p_app_id: 'cityrider',
        p_source: args.source,
        p_title: args.title,
        p_detail: args.detail ?? null,
        p_suggested_fix: args.suggested_fix ?? null,
        p_meta: args.meta ?? null,
      })
    }
  } catch { /* swallow */ }

  // ---- 3. Outbound email page (severity >= 'error') -------------------
  // sendOpsAlertEmail short-circuits for 'info'/'warn'. Wrapping in
  // try/catch keeps the contract intact — callers never see a paging
  // failure as a thrown error.
  try {
    const { sendOpsAlertEmail } = await import('@/lib/email/resend')
    await sendOpsAlertEmail({
      severity: toLocalSeverity(args.severity),
      source: args.source,
      title: args.title,
      detail: args.detail ?? null,
      suggestedFix: args.suggested_fix ?? null,
    })
  } catch { /* swallow */ }
}
