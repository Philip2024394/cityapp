# Cron migration: Vercel -> Cloudflare Workers

This project deploys on Cloudflare Workers via `@opennextjs/cloudflare`, but
its eight cron jobs were declared in `vercel.json` — a file Cloudflare does
not read. Result: every scheduled sweep had been silently dead.

This doc records what was changed, what still needs to be done on the
Cloudflare side, and how to verify the crons actually fire.

## What changed in the repo

1. `worker-entry.mjs` (new) — custom Worker entrypoint that re-exports the
   OpenNext-generated `fetch` handler and adds a `scheduled` handler. The
   scheduled handler maps each cron expression to its API route and calls
   back into the Worker via the `WORKER_SELF_REFERENCE` service binding,
   appending `?secret=$CRON_SECRET` so the existing route-level guard
   accepts the call unchanged.
2. `wrangler.jsonc` — `main` repointed to `worker-entry.mjs`, plus a
   `triggers.crons` block with all eight schedules.
3. `vercel.json` — deleted. It only held the (dead) cron config and a
   build command; everything live now flows through `wrangler.jsonc` and
   `package.json#scripts.cf:*`.

## Cron -> route map

| Schedule (UTC)  | Route                                  | Cadence           |
|-----------------|----------------------------------------|-------------------|
| `0 1 * * 1`     | `/api/admin/payouts/aggregate`         | weekly Mon 01:00  |
| `0 18 * * *`    | `/api/admin/subscriptions/expire`      | daily             |
| `0 19 * * *`    | `/api/admin/retention/sweep`           | daily             |
| `0 20 * * *`    | `/api/admin/b2b/recompute-scores`      | daily             |
| `0 21 * * *`    | `/api/admin/payment-intents/expire`    | daily             |
| `0 1 * * *`     | `/api/admin/reminders/payments`        | daily 08:00 WIB   |
| `0 2 * * *`     | `/api/admin/pdp/overdue`               | daily             |
| `0 3 * * 1`     | `/api/cron/partner-suspend`            | weekly Mon 03:00  |

All eight routes already validate `?secret=$CRON_SECRET` against
`process.env.CRON_SECRET`, so no per-route code changes were needed.

## Operator checklist (run once)

1. **Set the Worker secret** (production deploy environment):
   ```bash
   npx wrangler secret put CRON_SECRET
   ```
   Use the same value the routes expect. If the secret is missing the
   scheduled handler logs a warning and exits without firing — better
   than calling the route and getting a 403.

2. **Deploy** with the new entrypoint:
   ```bash
   npm run cf:deploy
   ```
   `opennextjs-cloudflare build` writes `.open-next/worker.js` first, then
   wrangler bundles starting at `worker-entry.mjs` (which imports that
   built file relatively).

3. **Confirm Cron Triggers attached**:
   ```bash
   npx wrangler deployments list
   npx wrangler triggers list
   ```
   Or in the Cloudflare dashboard: Workers > indocity > Triggers > Cron
   Triggers — should show all eight schedules.

## How to verify a cron actually fires

`wrangler tail` streams logs from the deployed Worker in real time:

```bash
npx wrangler tail indocity --format pretty
```

Cron invocations show up with `"scheduled"` in the trigger field. The
wrapper logs `[cron] non-2xx from <path> <status>` if a route returns an
error, so failures are visible in tail output without needing to dig into
Logpush or Analytics Engine.

You can also force-trigger a scheduled invocation locally:

```bash
npm run cf:preview
# in another shell:
curl "http://localhost:8787/__scheduled?cron=0+18+*+*+*"
```

(The `__scheduled` path is wrangler-dev only; production fires via the
Cloudflare cron system itself.)

## Known caveats

- The wrapper imports `./.open-next/worker.js` as a relative path. That
  file is a build artifact, so the import will fail to resolve if you
  point wrangler at the entrypoint without running `cf:build` first. The
  `cf:deploy` / `cf:preview` scripts already chain build first; if you
  invoke `wrangler` directly, run `opennextjs-cloudflare build` first.
- `WORKER_SELF_REFERENCE` requires the service binding's `service` name
  to match the worker's own `name`. Both are `"indocity"` in
  `wrangler.jsonc` today; if you ever rename the worker, update both
  fields together.
- Cron Triggers only fire on the production environment of a Worker. If
  you use `wrangler.jsonc` `env.*` blocks for staging later, you must
  also copy the `triggers.crons` block into each env that should have
  crons.
