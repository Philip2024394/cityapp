import { NextResponse } from 'next/server'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'

// ============================================================================
// POST /api/ops/alert
// ----------------------------------------------------------------------------
// Public ops-alert ingest. Cityrider components fire here when something
// goes wrong; we proxy to the streetlocal Supabase (where the admin lives)
// via the cross-Supabase service-role client added in Session 4.
//
// Body: { severity, source, title, detail?, suggested_fix?, meta? }
//   severity: 'critical' | 'error' | 'warning' | 'info'
//   source:   short tag — 'midtrans-webhook' / 'cron:reminders' / 'checkout'
//
// app_id is hardcoded to 'cityrider' here. Other apps (landing,
// food-basic) write directly to streetlocal Supabase via their own
// anon client + a fireAlert helper.
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

  const sl = getStreetlocalAdminSupabase()
  if (!sl) {
    // No streetlocal env → swallow silently (dev case); never break
    // the calling app's flow.
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    await sl.rpc('log_app_health_alert', {
      p_severity: severity,
      p_app_id: 'cityrider',
      p_source: source,
      p_title: title,
      p_detail: detail,
      p_suggested_fix: fix,
      p_meta: meta,
    })
  } catch { /* swallow */ }

  return new Response(null, { status: 204, headers: CORS })
}
