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

// Map each cron expression to the route it should hit. Keep both columns
// (schedule + path) identical to what vercel.json used to declare so the
// behaviour is byte-for-byte equivalent across the move.
const CRON_TO_PATH = {
  '0 1 * * 1': '/api/admin/payouts/aggregate',       // weekly Mon 01:00 UTC
  '0 18 * * *': '/api/admin/subscriptions/expire',   // daily 18:00 UTC (01:00 WIB)
  '0 19 * * *': '/api/admin/retention/sweep',        // daily 19:00 UTC
  '0 20 * * *': '/api/admin/b2b/recompute-scores',   // daily 20:00 UTC
  '0 21 * * *': '/api/admin/payment-intents/expire', // daily 21:00 UTC
  '0 1 * * *': '/api/admin/reminders/payments',      // daily 01:00 UTC (08:00 WIB)
  '0 2 * * *': '/api/admin/pdp/overdue',             // daily 02:00 UTC
  '0 3 * * 1': '/api/cron/partner-suspend',          // weekly Mon 03:00 UTC
}

export default {
  fetch: openNextWorker.fetch,

  async scheduled(controller, env, ctx) {
    const path = CRON_TO_PATH[controller.cron]
    if (!path) {
      // Unknown cron — silently no-op rather than throwing. Throwing would
      // mark the cron invocation failed in Cloudflare logs even though the
      // misconfiguration is on our side and re-running won't help.
      console.warn('[cron] no handler mapped for', controller.cron)
      return
    }

    if (!env.CRON_SECRET) {
      console.error('[cron] CRON_SECRET not set — refusing to fire', path)
      return
    }

    // Self-fetch via the WORKER_SELF_REFERENCE service binding so we hit
    // the Next.js route handler. The host portion of the URL is ignored
    // by service bindings (it's a direct invocation, not DNS), but a
    // valid origin is required by the Request constructor.
    const url = `https://internal${path}?secret=${encodeURIComponent(env.CRON_SECRET)}`
    const req = new Request(url, { method: 'GET' })

    ctx.waitUntil(
      env.WORKER_SELF_REFERENCE.fetch(req)
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.text().catch(() => '')
            console.error('[cron] non-2xx from', path, res.status, body.slice(0, 500))
          }
        })
        .catch((err) => {
          console.error('[cron] fetch failed for', path, err)
        }),
    )
  },
}
