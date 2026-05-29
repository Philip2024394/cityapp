-- ============================================================================
-- 0145 — Social-share quota tracker for drivers
-- ----------------------------------------------------------------------------
-- Phase A of the driver-side "social posts" growth feature: each driver
-- gets 20 banner downloads/shares per calendar month, free with their
-- Rp 38.000/month subscription. This table is the per-driver monthly
-- counter that gates the composer page.
--
-- One row per (driver_user_id, month). Reset on the 1st of every month
-- by simply having a new row appear (we never delete history — useful
-- for analytics).
-- ============================================================================

create table if not exists public.social_share_quota (
  id                  bigserial primary key,
  driver_user_id      uuid not null references auth.users(id) on delete cascade,
  month_yyyy_mm       text not null check (month_yyyy_mm ~ '^[0-9]{4}-[0-9]{2}$'),
  count               integer not null default 0 check (count >= 0),
  last_banner_id      text,
  last_platform       text,
  last_shared_at      timestamptz,
  created_at          timestamptz not null default now()
);

create unique index if not exists social_share_quota_driver_month_uniq
  on public.social_share_quota (driver_user_id, month_yyyy_mm);

create index if not exists social_share_quota_driver_idx
  on public.social_share_quota (driver_user_id, last_shared_at desc);

-- RLS — driver can read their own row; only the service role (via
-- /api/dashboard/social/track) writes.
alter table public.social_share_quota enable row level security;

drop policy if exists social_share_quota_own_read on public.social_share_quota;
create policy social_share_quota_own_read on public.social_share_quota
  for select to authenticated
  using (driver_user_id = auth.uid());

comment on table public.social_share_quota is
  'Per-driver per-month counter for the social-post composer feature. '
  'Cap: 20 shares/month, enforced by /api/dashboard/social/track.';

-- ============================================================================
-- POST-CONDITIONS
--   • Empty table — drivers get a fresh row created on first share.
--   • RLS: drivers SELECT only their own row, no writes.
-- ============================================================================
