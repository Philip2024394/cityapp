-- ============================================================================
-- 0178_route_health.sql — synthetic uptime checks per public route
-- ----------------------------------------------------------------------------
-- Until now, the only signal that /citydrivers, /cari, /dashboard/[vehicle]
-- etc. were healthy was customer reports on WhatsApp. cron_run_log (0176)
-- captures whether scheduled jobs ran — it doesn't capture whether the
-- customer-facing pages render. This table closes that gap.
--
-- Insert path: /api/ops/route-health (called every 5 min by the Worker
-- cron). One row per route per probe — append-only.
--
-- Cardinality: ~12 routes × 288 probes/day = 3,456 rows/day. Index on
-- (route_path, checked_at desc) so the admin /admin/health "Route status"
-- panel can render the latest probe + last-N for the sparkline.
--
-- Retention: 30 days. The retention sweep cron (existing in worker-entry)
-- will be updated in a follow-up to purge route_health older than 30d.
-- ============================================================================

create table if not exists public.route_health (
  id              bigserial primary key,
  route_path      text not null,
  status_code     int,
  latency_ms      int,
  ok              boolean not null,
  error_msg       text,
  checked_at      timestamptz not null default now()
);

create index if not exists route_health_route_time_idx
  on public.route_health (route_path, checked_at desc);

create index if not exists route_health_checked_at_idx
  on public.route_health (checked_at desc);

alter table public.route_health enable row level security;

-- Admin SELECT only — service role bypasses RLS for the probe writes
-- from /api/ops/route-health.
drop policy if exists route_health_admin_read on public.route_health;
create policy route_health_admin_read on public.route_health
  for select
  using (public.is_admin());

comment on table public.route_health is
  'Synthetic uptime checks. One row per route per probe (every ~5min). '
  'Used by /admin/health "Route status" panel.';
