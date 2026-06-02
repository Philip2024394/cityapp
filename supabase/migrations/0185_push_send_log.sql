-- ============================================================================
-- 0185_push_send_log.sql
-- ----------------------------------------------------------------------------
-- Per-send log for the FCM / web-push pipeline. Backs two metrics on
-- /admin/health:
--   * Notification delivery %   = delivered / total in last 24h
--   * Push failures (24h)        = total non-delivered in last 24h
--
-- Until this table existed, both metrics short-circuited to "N/A" with a
-- "schema not yet present" note (see src/lib/admin/health.ts:215). Adding
-- it lights up the widgets the moment the first send writes a row.
--
-- Write path: any server route that fires a push (e.g. /api/connect-intent
-- → sendDriverWebPush) should `insert({ token, status, error_code })` once
-- per attempt. Token is the FCM/web-push endpoint string — never PII.
-- status: 'delivered' | 'failed' | 'invalid_token' | 'rate_limited' …
-- ============================================================================

create table if not exists public.push_send_log (
  id           uuid primary key default gen_random_uuid(),
  token        text not null,
  status       text not null,
  error_code   text,
  created_at   timestamptz not null default now()
);

-- Health page queries the last 24h by created_at — index covers it.
create index if not exists push_send_log_created_at_idx
  on public.push_send_log (created_at desc);

-- For the failure breakdown widget — narrow by status.
create index if not exists push_send_log_status_idx
  on public.push_send_log (status, created_at desc);

-- RLS: admin reads via /admin/health; service-role bypasses RLS for inserts.
-- No anon / authenticated SELECT — telemetry is admin-only.
alter table public.push_send_log enable row level security;

create policy push_send_log_admin_read
  on public.push_send_log
  for select
  using (public.is_admin());

comment on table  public.push_send_log is 'One row per push attempt. Backs /admin/health delivery + failures widgets.';
comment on column public.push_send_log.token      is 'FCM token or web-push endpoint URL. Not PII.';
comment on column public.push_send_log.status     is 'delivered | failed | invalid_token | rate_limited | …';
comment on column public.push_send_log.error_code is 'Provider error code when status != delivered.';
