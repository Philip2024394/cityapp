-- ============================================================================
-- 0176_cron_run_log.sql — health log for Cloudflare cron triggers
-- ----------------------------------------------------------------------------
-- Cloudflare Workers fire 8 cron jobs (see wrangler.jsonc:34-43). Until now,
-- nobody saw if they failed — the only signal was a `console.error` in the
-- Worker log. This table captures one row per scheduled invocation so the
-- /admin/health page can render last-run status, duration, and the most
-- recent error per job.
--
-- Insert path: worker-entry.mjs writes via the service-role admin client.
-- Read path: /admin/health reads via the same service-role client; UI gates
-- on requireAdmin() so we also expose a SELECT policy for `is_admin()` users
-- in case anything reads with an end-user JWT later.
--
-- Cardinality: 8 jobs * 365 days = ~3k rows/year. No partitioning needed.
-- We keep all history for now (cheap, useful for the next post-mortem).
-- ============================================================================

CREATE TABLE cron_run_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name     text NOT NULL,                     -- e.g. 'partner-suspend', 'subscription-expire'
  scheduled_at timestamptz NOT NULL,              -- the schedule moment
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  status       text NOT NULL CHECK (status IN ('running','ok','error')),
  duration_ms  integer,
  error_msg    text,
  result_json  jsonb
);

CREATE INDEX idx_cron_run_log_job_started ON cron_run_log (job_name, started_at DESC);
CREATE INDEX idx_cron_run_log_recent      ON cron_run_log (started_at DESC);

ALTER TABLE cron_run_log ENABLE ROW LEVEL SECURITY;

-- Admin read-only: service-role bypasses RLS for inserts/updates from
-- worker-entry.mjs, so we only need a SELECT policy here.
CREATE POLICY cron_run_log_admin_read ON cron_run_log FOR SELECT
  USING (public.is_admin());
