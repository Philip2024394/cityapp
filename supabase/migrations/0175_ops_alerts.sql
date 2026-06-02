-- ============================================================================
-- 0175_ops_alerts.sql — local ops-alert pipeline
-- ----------------------------------------------------------------------------
-- Before this migration, /api/ops/alert + fireAlertServer() proxied alerts
-- across to the streetlocal Supabase project. That meant local admins
-- never saw a single error — they were entirely blind to webhook/cron
-- failures originating inside this codebase.
--
-- This table is the local landing zone. Every server-side alert (payment
-- webhook, cron job, API error, etc.) now lands here, and /admin/alerts
-- renders + lets the operator acknowledge.
--
-- Cardinality: low — we expect <100 alerts/week in steady state. No
-- partitioning needed. We retain everything for forensics.
-- ============================================================================

CREATE TABLE ops_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  source          text NOT NULL,                                       -- 'payment_webhook' | 'cron_job' | 'api_error' | etc.
  severity        text NOT NULL CHECK (severity IN ('info','warn','error','critical')),
  title           text NOT NULL,
  detail          jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_ops_alerts_created_at ON ops_alerts (created_at DESC);
CREATE INDEX idx_ops_alerts_unacked    ON ops_alerts (created_at DESC) WHERE acknowledged_at IS NULL;

-- Admin-only RLS. The existing public.is_admin() helper (defined in
-- 0002_rls_policies.sql) returns true when auth.uid() points at a
-- profile with role='admin'. Service-role inserts from fireAlertServer()
-- bypass RLS, so we only need a single policy for end-user JWTs.
ALTER TABLE ops_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY ops_alerts_admin_all ON ops_alerts
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
