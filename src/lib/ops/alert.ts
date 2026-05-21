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
// post survives navigation. App admin sees it in /admin → Ops tab with
// sound on critical.
// ============================================================================

export type AlertSeverity = 'critical' | 'error' | 'warning' | 'info'

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
// something fails. Uses the existing cross-Supabase admin client.
export async function fireAlertServer(args: {
  severity: AlertSeverity
  source: string
  title: string
  detail?: string
  suggested_fix?: string
  meta?: Record<string, unknown>
}): Promise<void> {
  try {
    const { getStreetlocalAdminSupabase } = await import('@/lib/supabase/streetlocal')
    const sl = getStreetlocalAdminSupabase()
    if (!sl) return
    await sl.rpc('log_app_health_alert', {
      p_severity: args.severity,
      p_app_id: 'cityrider',
      p_source: args.source,
      p_title: args.title,
      p_detail: args.detail ?? null,
      p_suggested_fix: args.suggested_fix ?? null,
      p_meta: args.meta ?? null,
    })
  } catch { /* swallow */ }
}
