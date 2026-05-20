-- ============================================================================
-- 0027_driver_push_tokens.sql
-- ----------------------------------------------------------------------------
-- Per-device push notification tokens for drivers (FCM / APNS / Web Push).
--
-- Driver may have multiple devices (phone + tablet + PWA on laptop) — one
-- row per (driver, device-token). On reinstall the OS issues a new token,
-- which the app re-registers; we upsert on (token) so the same string
-- never collides across drivers (would only happen if a phone was sold
-- without factory-reset, in which case the new owner becomes the rightful
-- owner of that token).
--
-- The server uses tokens with `last_seen_at < now() - interval '90 days'`
-- as garbage-collectable. A nightly job (out-of-scope here) can prune.
--
-- DIRECTORY-POSTURE (PM 12/2019): notifying our own user about platform
-- activity (a customer tapped Contact) is platform-internal communication
-- — does not constitute brokering a transport contract.
-- ============================================================================

create table if not exists public.driver_push_tokens (
  id              uuid primary key default gen_random_uuid(),
  driver_user_id  uuid not null references public.profiles(id) on delete cascade,
  platform        text not null check (platform in ('android','ios','web')),
  token           text not null,
  device_label    text,                                -- optional: 'Samsung A52', 'iPhone 14', 'Chrome desktop'
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique(token)
);

create index if not exists driver_push_tokens_driver_idx
  on public.driver_push_tokens(driver_user_id);

create index if not exists driver_push_tokens_last_seen_idx
  on public.driver_push_tokens(last_seen_at desc);

-- ─── Driver consent flag on profile ───────────────────────────────────
-- Separate from "do you have a token registered" because a driver may
-- consent (turn the toggle on) before granting OS-level permission, or
-- revoke consent in our UI without uninstalling the app. Sending pushes
-- requires both flags: consent = true AND at least one fresh token.
alter table public.drivers
  add column if not exists booking_alerts_enabled boolean not null default false,
  add column if not exists booking_alerts_consented_at timestamptz;

-- ─── RLS ──────────────────────────────────────────────────────────────
alter table public.driver_push_tokens enable row level security;

-- Driver reads their own tokens (so dashboard can show "3 devices registered").
create policy "Driver read own push tokens"
  on public.driver_push_tokens for select
  using (auth.uid() = driver_user_id or public.is_admin());

-- Driver inserts their own tokens (from /api/drivers/me/push-token,
-- which authenticates the user first and stamps driver_user_id from
-- auth.uid() — never trusts client-supplied driver_user_id).
create policy "Driver write own push tokens"
  on public.driver_push_tokens for insert
  with check (auth.uid() = driver_user_id);

-- Driver updates their own tokens (last_seen_at refresh on every app
-- foreground).
create policy "Driver update own push tokens"
  on public.driver_push_tokens for update
  using (auth.uid() = driver_user_id)
  with check (auth.uid() = driver_user_id);

-- Driver deletes their own (sign-out from a device should remove its token).
create policy "Driver delete own push tokens"
  on public.driver_push_tokens for delete
  using (auth.uid() = driver_user_id or public.is_admin());
