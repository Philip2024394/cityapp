# Disaster Recovery Runbook

> **Audience**: CityDrivers / CityRiders operators, on-call.
> **Last reviewed**: 2026-06-02.
> **Stack**: Cloudflare Workers + Pages (`indocity`) · Supabase Postgres · Resend email.

This is the written DR plan. Every failure mode below has a concrete recovery procedure. Targets are stated explicitly. If a step here doesn't match reality, **update the doc first** — silent drift defeats the point of a runbook.

---

## 0. Data classification — read first

The platform is registered as a **directory service** under Permenhub PM 12/2019, not a ride operator. This shapes every DR decision:

| Data | Class | Retention | DR priority |
|---|---|---|---|
| `drivers` (profiles, subscriptions) | Directory listing | Indefinite | **Critical** |
| `partners` / `partner_bookings` | Commercial agreement records | Indefinite | **Critical** |
| `affiliate_referrals` / `payment_intents` | Financial ledger | 5 years (PSE rules) | **Critical** |
| `vendor_orders` (beautician / laundry / etc.) | Commercial transaction | 5 years | **Critical** |
| `connection_intent` (WhatsApp tap log) | Telemetry — **NOT a dispatch record** | 90 days rolling | High |
| `wa_click_events` / `provider_profile_views` | Anonymous analytics | 90 days rolling | Medium |
| `ops_alerts` / `cron_run_log` | Internal ops | 1 year | Low |

**Do not restore in a way that re-creates a `trips` or dispatch table.** Migration `0010_remove_trips_workflow.sql` removed that intentionally for compliance. Any restore from before `0010` must be replayed forward through current migrations before serving traffic.

---

## 1. Recovery targets

| Metric | Target | Notes |
|---|---|---|
| **RTO** — directory + WhatsApp handoff online | **30 min** | Customer must be able to find a driver and tap WhatsApp |
| **RTO** — admin dashboard online | **2 h** | Internal use, lower priority |
| **RTO** — paid-cart verticals (beautician etc.) | **1 h** | Payment + order capture restored |
| **RPO** — production data loss tolerance | **24 h max**, **1 h target** | Supabase daily PITR baseline; in-flight tx may be lost |

If you cannot hit the 30-min RTO, post a status page notice (Cloudflare → `status.cityriders.id` if configured, else pin a notice at the top of `/`).

---

## 2. Backup strategy (per layer)

### 2.1 Supabase Postgres
- **Daily automatic backups** — Supabase Pro tier, 7-day retention. No action required.
- **Point-in-time recovery (PITR)** — Pro tier, last 7 days, RPO ~2 min. Enabled by default; verify in Supabase dashboard → Project Settings → Backups.
- **Weekly off-site snapshot** — `pg_dump` to Cloudflare R2, kept 90 days. Run from a GitHub Action on Mondays 00:00 UTC. **(Status: not yet automated — manual fallback below.)**
- **Manual dump** (if R2 cron not yet configured):
  ```bash
  pg_dump "$DATABASE_URL" --no-owner --no-acl --format=custom \
    > "backup-$(date -u +%Y%m%d).dump"
  ```
  Store in `1Password → Engineering → CityDrivers DR`.

### 2.2 Cloudflare Workers (app code)
- **Deployment history** — Cloudflare retains the last 100 Worker deployments. View at `dash.cloudflare.com → Workers → indocity → Deployments`.
- **Git tags** — every release branch in GitHub is the source of truth. `git tag -l` for the list.
- **Asset rollback** — `.open-next/assets` are part of the Worker deployment, so rollback is a single click in the Cloudflare dashboard.

### 2.3 Supabase Storage (driver banners, KTP screenshots until 2026-05-29, payment screenshots)
- **Bucket-level retention** — set per bucket in `supabase/storage/buckets.sql`.
- **Weekly export** — `supabase storage cp` to R2 cold tier. **(Status: not yet automated.)**

### 2.4 Resend / Twilio / Midtrans config
- All keys live in `1Password → Engineering → CityDrivers Production`.
- Rotation log: `docs/secret-rotation.md`. Rotate every 90 days.

---

## 3. Failure-mode playbook

### 3.1 Cloudflare Workers deployment is bad

**Symptom**: 5xx rate spike in `/admin/health`, ops_alerts email storm, user reports on WhatsApp.

**Procedure** (target: 5 min):
1. `dash.cloudflare.com → Workers → indocity → Deployments` → click the last known-good deployment → **Rollback**.
2. Confirm `/admin/health` returns 200 and recent cron rows in `cron_run_log` flip back to `ok`.
3. Open a GitHub issue tagging the suspect commit. **Do not** force-push or revert in main — diagnose first.

### 3.2 Supabase is degraded / down

**Symptom**: every API route returns 500; `/admin/alerts` shows `db connection` errors.

**Procedure** (target: 60 min):
1. Check `status.supabase.com` — is it region-wide?
2. If region-wide:
   - Post status notice (see §1).
   - Enable static fallback: Cloudflare Pages can serve `/citydrivers` cached HTML for read-only browsing while DB is down.
3. If project-specific (RLS error, exhausted connections):
   - Pause non-essential crons via Cloudflare: `wrangler cron triggers delete` (keep `partner-suspend` if billing-critical).
   - Open Supabase support ticket with project ref.

### 3.3 Supabase data corruption / accidental destructive migration

**Symptom**: counts drop unexpectedly; admins report missing drivers / partners; recent ops alert from a destructive SQL.

**Procedure** (target: 2 h):
1. **Stop writes immediately**: Cloudflare → Workers → `indocity` → **Trigger maintenance mode**. (If not configured, switch the Worker to a static "maintenance" Response in code and redeploy.)
2. Identify the bad migration: `supabase migration list --linked`.
3. PITR restore to T-5 min before the destructive event:
   - Supabase dashboard → Backups → Point in time recovery → pick timestamp → Restore to new project.
   - Verify the new project: row counts, recent rows in `drivers`, `partners`, `payment_intents`.
4. Repoint `DATABASE_URL` and Supabase env vars to the restored project. Cloudflare secrets updated via `wrangler secret put`.
5. Re-enable Workers. Diff the migrations folder against the restored DB and replay forward only the migrations that were NOT the destructive one. **Always preserve the `0010_remove_trips_workflow` boundary — never restore a trips table.**

### 3.4 Cron job stuck / not firing

**Symptom**: `cron_run_log` has no row for an expected job within its window; `/admin/health` shows job `stale`.

**Procedure** (target: 15 min):
1. Check Cloudflare Workers cron dashboard for the next-scheduled-at time. If skewed, redeploy with `wrangler deploy`.
2. Manually fire the job to drain backlog:
   ```bash
   curl "https://cityriders.id<path>?secret=$CRON_SECRET"
   ```
   where `<path>` is from `worker-entry.mjs:CRON_TO_JOB`.
3. Confirm a fresh `cron_run_log` row appears.

### 3.5 Payment webhook outage (Midtrans signature mismatch storm)

**Symptom**: ops_alerts emails titled `Cron payments-reconcile threw` or `midtrans-webhook` critical alerts.

**Procedure** (target: 30 min):
1. Verify `MIDTRANS_SERVER_KEY` rotation — was it rotated in the last 24h?
2. If yes, redeploy after confirming the new key is in Cloudflare secrets.
3. Replay missed webhooks from Midtrans dashboard (Settings → Configuration → Notification URL → Resend) for the affected window.

### 3.6 Email delivery (Resend) down

**Symptom**: ops alert emails stop landing; `ops_alerts` table still receives rows.

**Procedure** (target: 1 h):
1. Check `status.resend.com`.
2. Fallback: `/admin/alerts` is canonical — operators can still triage in-dashboard.
3. For sustained outage, swap to a backup provider (SES/Postmark). One env var (`RESEND_API_KEY`) is the only thing to rotate; `sendEmail()` is the single call site.

---

## 4. Quarterly DR drill

Once per quarter (first Tuesday of Jan/Apr/Jul/Oct):
1. Spin up a Supabase branch from yesterday's backup.
2. Time the restore. Update §1 RTO if it has drifted.
3. Trigger a Worker rollback on a staging deployment. Time it.
4. Send a synthetic ops alert at `severity=critical` from `/api/ops/alert` and confirm email lands within 5 min.
5. Log the drill in `docs/dr-drills/YYYY-Q{1,2,3,4}.md`.

---

## 5. What this runbook does NOT cover

- **Reset CityDrivers App from the admin dashboard** — there is no such button. Recovery routes through Cloudflare Workers deployment rollback (§3.1), not an in-app control. Building an in-app reset would require immutable release archives + a deploy-replay API and is not currently planned.
- **Re-introducing dispatch tables** — out of scope by regulatory design. See §0.
- **Customer PII export under PDP law** — separate runbook (`docs/pdp-data-subject-request.md`).

---

## 6. Open items

| Item | Owner | Target |
|---|---|---|
| Automate weekly pg_dump → R2 | infra | 2026-Q3 |
| Automate weekly storage → R2 cold tier | infra | 2026-Q3 |
| Maintenance-mode flag in Worker | platform | 2026-Q3 |
| Status page (`status.cityriders.id`) | platform | 2026-Q3 |
| First DR drill | platform | 2026-07 |
