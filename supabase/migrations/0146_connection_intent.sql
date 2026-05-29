-- ============================================================================
-- 0146 — Connection intent log + push subscriptions for CityRiders alerts
-- ----------------------------------------------------------------------------
-- The CityRiders driver-alert system uses INTENT INTERCEPT: when a
-- customer taps the WhatsApp button on /cari, /r/[slug], or /car/[slug],
-- the client POSTs /api/connect-intent BEFORE redirecting to wa.me. The
-- server logs the intent here and broadcasts a Supabase Realtime event
-- on channel `driver:<id>` so the driver's PWA shows a popup + plays the
-- alert sound.
--
-- We intentionally store NO content from the WhatsApp conversation, NO
-- pickup/dropoff details, NO fare. This row says only "a customer
-- pressed your WhatsApp button at this time, from this surface" — a
-- heads-up. The actual ride is arranged privately between customer and
-- driver on WhatsApp. This keeps the platform on the right side of
-- Permenhub 118/2018 (no aplikator role).
--
-- push_subscriptions stores Web Push (VAPID) endpoints so we can wake
-- the driver's PWA when it isn't foregrounded.
-- ============================================================================

create table if not exists public.connection_intent (
  id              bigserial primary key,
  driver_id       uuid not null references public.drivers(user_id) on delete cascade,
  source          text not null check (source in ('cari', 'rider_profile', 'car_profile', 'other')),
  ip_hash         text,                       -- sha256 of (ip + day-salt), nullable
  user_agent      text,
  occurred_at     timestamptz not null default now()
);

create index if not exists connection_intent_driver_time_idx
  on public.connection_intent (driver_id, occurred_at desc);

alter table public.connection_intent enable row level security;

drop policy if exists connection_intent_own_read on public.connection_intent;
create policy connection_intent_own_read on public.connection_intent
  for select to authenticated
  using (driver_id = auth.uid());

comment on table public.connection_intent is
  'Heads-up log: customer pressed WhatsApp button on a driver surface. '
  'No PII, no booking details. Permenhub 118/2018 compliance: directory '
  'only, not a dispatch system.';

-- ----------------------------------------------------------------------------
-- push_subscriptions — Web Push (VAPID) endpoints per driver device.
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id              bigserial primary key,
  driver_id       uuid not null references public.drivers(user_id) on delete cascade,
  endpoint        text not null,
  p256dh          text not null,
  auth_key        text not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);

create unique index if not exists push_subscriptions_endpoint_uniq
  on public.push_subscriptions (endpoint);

create index if not exists push_subscriptions_driver_idx
  on public.push_subscriptions (driver_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own_read on public.push_subscriptions;
create policy push_subscriptions_own_read on public.push_subscriptions
  for select to authenticated
  using (driver_id = auth.uid());

drop policy if exists push_subscriptions_own_delete on public.push_subscriptions;
create policy push_subscriptions_own_delete on public.push_subscriptions
  for delete to authenticated
  using (driver_id = auth.uid());

comment on table public.push_subscriptions is
  'VAPID Web Push subscriptions. One row per device per driver. '
  'Inserted/refreshed by /api/dashboard/push/subscribe.';

-- ============================================================================
-- POST-CONDITIONS
--   • Empty tables — populated on first customer tap + first device subscribe.
--   • RLS: drivers SELECT only their own rows; service role writes.
-- ============================================================================
