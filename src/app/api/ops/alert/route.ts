import { getAdminSupabase } from '@/lib/supabase/admin'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'
import { sendOpsAlertEmail } from '@/lib/email/resend'

// ============================================================================
// POST /api/ops/alert
// ----------------------------------------------------------------------------
// Public ops-alert ingest. Cityrider components fire here when something
// goes wrong.
//
// 2026-06-01 (Phase 1 Admin Dashboard):
//   * Primary destination is now the LOCAL Supabase `ops_alerts` table
//     (migration 0175). Local admins can finally see the alerts they
//     were previously blind to.
//   * We still mirror to streetlocal best-effort so any external watcher
//     that was reading `app_health_alerts` keeps working. The mirror is
//     swallowed; it never gates the local write or the 204 response.
//
// Body: { severity, source, title, detail?, suggested_fix?, meta? }
//   severity: 'critical' | 'error' | 'warning' | 'info'
//   source:   short tag — 'midtrans-webhook' / 'cron:reminders' / 'checkout'
//
// CORS open + 204 fast so beacons survive navigation. Never throws.
// ============================================================================

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '600',
}

const VALID_SEVERITY = new Set(['critical', 'error', 'warning', 'info'])

// Local DB CHECK constraint accepts info|warn|error|critical.
function toLocalSeverity(s: string): 'info' | 'warn' | 'error' | 'critical' {
  if (s === 'warning') return 'warn'
  if (s === 'critical' || s === 'error' || s === 'info') return s
  return 'error'
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(req: Request) {
  let body: { severity?: string; source?: string; title?: string; detail?: string; suggested_fix?: string; meta?: unknown }
  try { body = (await req.json()) as typeof body }
  catch { return new Response(null, { status: 204, headers: CORS }) }

  const severity = body.severity && VALID_SEVERITY.has(body.severity) ? body.severity : 'error'
  const source = String(body.source || 'unknown').slice(0, 64)
  const title  = String(body.title || 'Untitled alert').slice(0, 200)
  const detail = body.detail ? String(body.detail).slice(0, 4000) : null
  const fix    = body.suggested_fix ? String(body.suggested_fix).slice(0, 1000) : null
  const meta   = body.meta ?? null

  // ---- 1. Local write (canonical) ----
  try {
    const admin = getAdminSupabase()
    if (admin) {
      const detailJson: Record<string, unknown> = {}
      if (detail) detailJson.detail = detail
      if (fix) detailJson.suggested_fix = fix
      if (meta != null) detailJson.meta = meta
      await admin.from('ops_alerts').insert({
        source,
        severity: toLocalSeverity(severity),
        title,
        detail: Object.keys(detailJson).length ? detailJson : null,
      })
    }
  } catch { /* swallow */ }

  // ---- 2. Streetlocal mirror (backwards-compat, best-effort) ----
  try {
    const sl = getStreetlocalAdminSupabase()
    if (sl) {
      await sl.rpc('log_app_health_alert', {
        p_severity: severity,
        p_app_id: 'cityrider',
        p_source: source,
        p_title: title,
        p_detail: detail,
        p_suggested_fix: fix,
        p_meta: meta,
      })
    }
  } catch { /* swallow */ }

  // ---- 3. Outbound email (severity >= 'error') ----
  // Pages the on-call inbox so admins don't have to be looking at the
  // dashboard to know something broke. sendOpsAlertEmail() short-circuits
  // for 'info'/'warn', so signup/info noise stays in-dashboard only.
  try {
    await sendOpsAlertEmail({
      severity: toLocalSeverity(severity),
      source,
      title,
      detail,
      suggestedFix: fix,
    })
  } catch { /* swallow */ }

  return new Response(null, { status: 204, headers: CORS })
}
