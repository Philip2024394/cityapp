// Custom Worker entrypoint that wraps the OpenNext-generated worker so we
// can attach a `scheduled` event handler (Cloudflare Cron Triggers).
//
// Why this file exists:
//   - OpenNext's generated `.open-next/worker.js` only exports a `fetch`
//     handler. Cloudflare Cron Triggers fire a `scheduled` event, which
//     OpenNext does NOT handle out of the box.
//   - Re-exporting the OpenNext default and adding our own `scheduled`
//     lets us keep all existing API routes intact while dispatching crons
//     to the proper Next.js handlers via the WORKER_SELF_REFERENCE service
//     binding (declared in wrangler.jsonc).
//
// Build flow:
//   1. `opennextjs-cloudflare build` writes `.open-next/worker.js`
//   2. wrangler bundles starting from this file (`main` in wrangler.jsonc)
//   3. esbuild resolves the relative import below to the OpenNext output
//
// Kept as .mjs (not .ts) so TypeScript doesn't try to typecheck a path
// that only exists post-build.
//
// Cron -> route mapping must stay in sync with `triggers.crons` in
// wrangler.jsonc. The cron expression Cloudflare passes in
// `controller.cron` is the EXACT string from that array, so we key on it.

import openNextWorker from './.open-next/worker.js'

// Re-export Durable Object classes that OpenNext expects to be on the
// Worker (queue + sharded tag cache + bucket purge). If we drop these,
// any DO binding declared in wrangler.jsonc will fail to resolve.
export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from './.open-next/worker.js'

// Map each cron expression to the route it should hit AND the friendly
// job_name used in cron_run_log. Keep both columns identical to what
// vercel.json used to declare so the behaviour is byte-for-byte
// equivalent across the move.
//
// `job_name` is what the /admin/health "Cron jobs" panel groups by — keep
// it short, lowercase, hyphen-separated, and stable (changing it later
// breaks the historical chart for that job).
const CRON_TO_JOB = {
  '0 1 * * 1':   { path: '/api/admin/payouts/aggregate',       job: 'payouts-aggregate' },       // weekly Mon 01:00 UTC
  '0 18 * * *':  { path: '/api/admin/subscriptions/expire',    job: 'subscription-expire' },     // daily 18:00 UTC (01:00 WIB)
  '0 19 * * *':  { path: '/api/admin/retention/sweep',         job: 'retention-sweep' },         // daily 19:00 UTC
  '0 20 * * *':  { path: '/api/admin/b2b/recompute-scores',    job: 'b2b-recompute-scores' },    // daily 20:00 UTC
  '0 21 * * *':  { path: '/api/admin/payment-intents/expire',  job: 'payment-intents-expire' },  // daily 21:00 UTC
  '0 1 * * *':   { path: '/api/admin/reminders/payments',      job: 'reminders-payments' },      // daily 01:00 UTC (08:00 WIB)
  '0 2 * * *':   { path: '/api/admin/pdp/overdue',             job: 'pdp-overdue' },             // daily 02:00 UTC
  '0 * * * *':   { path: '/api/cron/partner-suspend',          job: 'partner-suspend' },         // hourly
  '*/5 * * * *': { path: '/api/ops/route-health',              job: 'route-health' },            // every 5 min — synthetic uptime probe
}

// ---------------------------------------------------------------------------
// cron_run_log helpers
// ---------------------------------------------------------------------------
// These call the Supabase REST API directly (no @supabase/supabase-js) so we
// keep the Worker bundle small and avoid pulling another import path through
// esbuild for a single insert + single patch per cron.
//
// Defensive rules — the actual cron MUST still run even if logging fails:
//   - Every helper swallows all errors.
//   - Inserting the "running" row is best-effort. If it fails we return
//     `null` and the finish-helper short-circuits cleanly.
//   - Failing to write the "finish" row is logged to console only.
// ---------------------------------------------------------------------------

function supabaseRestHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function logCronStart(env, job, scheduledIso) {
  try {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cron_run_log`, {
      method: 'POST',
      headers: { ...supabaseRestHeaders(env), Prefer: 'return=representation' },
      body: JSON.stringify({
        job_name: job,
        scheduled_at: scheduledIso,
        status: 'running',
      }),
    })
    if (!res.ok) {
      console.error('[cron-log] insert failed', res.status, (await res.text()).slice(0, 200))
      return null
    }
    const rows = await res.json().catch(() => null)
    return Array.isArray(rows) && rows[0]?.id ? rows[0].id : null
  } catch (e) {
    console.error('[cron-log] insert threw', e)
    return null
  }
}

async function logCronFinish(env, rowId, { status, startedAtMs, errorMsg, result }) {
  if (!rowId) return
  try {
    const durationMs = Date.now() - startedAtMs
    const patch = {
      finished_at: new Date().toISOString(),
      status,
      duration_ms: durationMs,
      error_msg: errorMsg ?? null,
      result_json: result ?? null,
    }
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cron_run_log?id=eq.${encodeURIComponent(rowId)}`,
      {
        method: 'PATCH',
        headers: supabaseRestHeaders(env),
        body: JSON.stringify(patch),
      },
    )
    if (!res.ok) {
      console.error('[cron-log] patch failed', res.status, (await res.text()).slice(0, 200))
    }
  } catch (e) {
    console.error('[cron-log] patch threw', e)
  }
}

// fireAlertServer — inlined Worker variant that posts to streetlocal RPC.
// Mirrors src/lib/ops/alert.ts:fireAlertServer but uses fetch directly
// (the src/ helper depends on @supabase/supabase-js + dynamic import
// machinery we don't want in the cron path). Fire-and-forget.
async function fireAlertServer(env, args) {
  try {
    if (!env.STREETLOCAL_SUPABASE_URL || !env.STREETLOCAL_SUPABASE_SERVICE_KEY) return
    await fetch(`${env.STREETLOCAL_SUPABASE_URL}/rest/v1/rpc/log_app_health_alert`, {
      method: 'POST',
      headers: {
        apikey: env.STREETLOCAL_SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.STREETLOCAL_SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_severity: args.severity,
        p_app_id: 'cityrider',
        p_source: args.source,
        p_title: args.title,
        p_detail: args.detail ?? null,
        p_suggested_fix: args.suggested_fix ?? null,
        p_meta: args.meta ?? null,
      }),
    })
  } catch { /* swallow — alert is best-effort */ }
}

// sendCronAlertEmail — direct Resend HTTP call from the Worker. The
// /api/ops/alert route also sends email (via src/lib/email/resend.ts),
// but if the Next.js app itself is down (the likeliest reason a cron
// failed to return 2xx), that path won't fire. Calling Resend directly
// from the Worker means the page still lands.
//
// Severity filter: only 'critical' and 'error' page out. 'warn' and
// 'info' stay in-dashboard. Recipients come from OPS_ALERT_EMAIL_TO
// (comma-separated), falling back to RESEND_REPLY_TO and finally to
// streetlocallive@gmail.com so the page always has somewhere to land.
async function sendCronAlertEmail(env, args) {
  try {
    if (!env.RESEND_API_KEY) return
    if (args.severity !== 'critical' && args.severity !== 'error') return
    const raw = env.OPS_ALERT_EMAIL_TO || env.RESEND_REPLY_TO || 'streetlocallive@gmail.com'
    const to = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (to.length === 0) return
    const sevTag = args.severity === 'critical' ? '[CRITICAL]' : '[ERROR]'
    const subject = `${sevTag} ${args.source} — ${args.title}`.slice(0, 200)
    const safeDetail = args.detail ? String(args.detail).slice(0, 4000) : ''
    const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0a0a0c;background:#f5f5f6;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,.06);overflow:hidden">
<div style="background:#0a0a0c;color:#FACC15;padding:14px 20px;font-weight:800;font-size:14px;letter-spacing:.04em;text-transform:uppercase">${sevTag} ${escapeHtmlBasic(args.source)}</div>
<div style="padding:20px">
<h2 style="margin:0 0 12px;font-size:18px;font-weight:800">${escapeHtmlBasic(args.title)}</h2>
${safeDetail ? `<pre style="margin:0 0 12px;padding:12px;background:#0a0a0c;color:#FACC15;border-radius:8px;font-size:12px;line-height:1.45;white-space:pre-wrap;word-break:break-word">${escapeHtmlBasic(safeDetail)}</pre>` : ''}
${args.suggested_fix ? `<p style="margin:0 0 12px;font-size:13px;color:#374151"><strong>Suggested fix:</strong> ${escapeHtmlBasic(args.suggested_fix)}</p>` : ''}
<p style="margin:0;font-size:12px;color:#6b7280">Open /admin/alerts to acknowledge.</p>
</div></div></body></html>`
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || 'Kita2u <reminders@streetlocal.live>',
        to,
        subject,
        html,
        reply_to: env.RESEND_REPLY_TO || 'streetlocallive@gmail.com',
      }),
    })
  } catch { /* swallow — page-out is best-effort */ }
}

function escapeHtmlBasic(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;' :
    c === '>' ? '&gt;' :
    c === '"' ? '&quot;' : '&#39;'
  ))
}

// insertLocalOpsAlert — writes the same alert into the LOCAL ops_alerts
// table (migration 0175) so /admin/alerts can render it. fireAlertServer
// only posts to streetlocal; without this mirror, local admins stay blind
// to cron failures even though the Worker noticed them.
//
// Direct REST insert (not via /api/ops/alert) because the Next.js app may
// be the very thing that's down when a cron fails — Supabase is more
// likely to be reachable. Severity is normalised to the local CHECK
// constraint ('info'|'warn'|'error'|'critical').
async function insertLocalOpsAlert(env, args) {
  try {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return
    const detailJson = {}
    if (args.detail) detailJson.detail = args.detail
    if (args.suggested_fix) detailJson.suggested_fix = args.suggested_fix
    if (args.meta != null) detailJson.meta = args.meta
    const severity = args.severity === 'warning' ? 'warn' : args.severity
    await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ops_alerts`, {
      method: 'POST',
      headers: supabaseRestHeaders(env),
      body: JSON.stringify({
        source: String(args.source || 'cron').slice(0, 64),
        severity,
        title: String(args.title || 'Untitled alert').slice(0, 200),
        detail: Object.keys(detailJson).length ? detailJson : null,
      }),
    })
  } catch { /* swallow — alert is best-effort */ }
}

export default {
  fetch: openNextWorker.fetch,

  async scheduled(controller, env, ctx) {
    const entry = CRON_TO_JOB[controller.cron]
    if (!entry) {
      // Unknown cron — silently no-op rather than throwing. Throwing would
      // mark the cron invocation failed in Cloudflare logs even though the
      // misconfiguration is on our side and re-running won't help.
      console.warn('[cron] no handler mapped for', controller.cron)
      return
    }
    const { path, job } = entry

    if (!env.CRON_SECRET) {
      console.error('[cron] CRON_SECRET not set — refusing to fire', path)
      return
    }

    const scheduledIso = new Date(controller.scheduledTime ?? Date.now()).toISOString()
    const startedAtMs = Date.now()

    // Self-fetch via the WORKER_SELF_REFERENCE service binding so we hit
    // the Next.js route handler. The host portion of the URL is ignored
    // by service bindings (it's a direct invocation, not DNS), but a
    // valid origin is required by the Request constructor.
    const url = `https://internal${path}?secret=${encodeURIComponent(env.CRON_SECRET)}`
    const req = new Request(url, { method: 'GET' })

    // Wrap the entire dispatch in a logging shell. Logging failures must
    // NEVER block the actual job — every cron_run_log helper swallows
    // its own errors, and we still kick off the fetch even if the start
    // row never made it into the table.
    ctx.waitUntil((async () => {
      const rowId = await logCronStart(env, job, scheduledIso)
      try {
        const res = await env.WORKER_SELF_REFERENCE.fetch(req)
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          const snippet = body.slice(0, 500)
          console.error('[cron] non-2xx from', path, res.status, snippet)
          await logCronFinish(env, rowId, {
            status: 'error',
            startedAtMs,
            errorMsg: `HTTP ${res.status}: ${snippet}`,
            result: { http_status: res.status },
          })
          const httpAlert = {
            severity: 'error',
            source: `cron:${job}`,
            title: `Cron ${job} returned ${res.status}`,
            detail: snippet,
            suggested_fix: `Check the route handler at ${path} and the Cloudflare Worker tail logs.`,
            meta: { job, path, http_status: res.status, cron: controller.cron },
          }
          await fireAlertServer(env, httpAlert)
          await insertLocalOpsAlert(env, httpAlert)
          await sendCronAlertEmail(env, httpAlert)
        } else {
          // Try to capture a small JSON result if the route returned one —
          // useful for "how many rows did the sweep touch?" diagnostics.
          // Bounded to ~2KB to keep the log table compact.
          let result = null
          try {
            const text = await res.text()
            if (text && text.length < 2000) {
              try { result = JSON.parse(text) } catch { result = { raw: text.slice(0, 500) } }
            }
          } catch { /* ignore body read failure */ }
          await logCronFinish(env, rowId, {
            status: 'ok',
            startedAtMs,
            errorMsg: null,
            result,
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[cron] fetch failed for', path, err)
        await logCronFinish(env, rowId, {
          status: 'error',
          startedAtMs,
          errorMsg: msg,
          result: null,
        })
        const throwAlert = {
          severity: 'error',
          source: `cron:${job}`,
          title: `Cron ${job} dispatch threw`,
          detail: msg,
          suggested_fix: `Check that WORKER_SELF_REFERENCE service binding resolves and ${path} exists.`,
          meta: { job, path, cron: controller.cron },
        }
        await fireAlertServer(env, throwAlert)
        await insertLocalOpsAlert(env, throwAlert)
        await sendCronAlertEmail(env, throwAlert)
      }
    })())
  },
}
