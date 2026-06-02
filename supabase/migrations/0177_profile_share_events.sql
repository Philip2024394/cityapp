-- ============================================================================
-- 0177_profile_share_events.sql — per-visitor share-click telemetry
-- ----------------------------------------------------------------------------
-- Until now, when a visitor opens SocialShareSheet on a driver profile and
-- taps WhatsApp / Facebook / Copy link / QR, we logged NOTHING. The button
-- fired wa.me / sharer.php / clipboard and we couldn't tell which platform
-- visitors actually use, or which drivers are getting shared.
--
-- This table captures one row per share tap. Mirrors the wa_click_events
-- pattern (0041) — append-only, PDP-safe (hashed IP), anonymous-friendly
-- (nullable user_id). 90-day retention will be added once the retention
-- cron is updated to sweep this table too.
--
-- LEGAL POSTURE (PDP / UU 27/2022):
--   - IP is SHA-256 hashed with IP_SALT before insert.
--   - user_id nullable — visitors are typically anonymous.
--   - Platform names are a fixed enum so we cannot accidentally leak
--     visitor-typed content into the column.
--   - This is share-INTENT telemetry, not "who messaged whom". We never
--     know what the visitor pasted next, only that they opened the
--     share intent.
-- ============================================================================

create table if not exists public.profile_share_events (
  id              bigserial primary key,
  occurred_at     timestamptz not null default now(),

  -- Which profile was being shared. Same enum as provider_profile_views
  -- (mig 0072) so we can join cleanly later.
  provider_type   text not null check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean'
  )),
  provider_id     uuid not null,

  -- Which share target the visitor tapped.
  platform        text not null check (platform in (
    'whatsapp', 'facebook', 'copy_link', 'qr_view', 'qr_download'
  )),

  -- Visitor fingerprint (PDP-safe).
  ip_hash         text,
  country         text,
  city            text,

  -- Optional auth-user id if the sharer is logged in (rare — most
  -- profile-page visitors are not signed in).
  user_id         uuid references auth.users(id) on delete set null,

  -- Anon session id (sessionStorage on the client) — lets us count
  -- distinct sharers per provider without storing PII.
  anon_session_id text,

  -- Referrer page (where the share button was tapped from).
  referrer        text,

  -- Free-form metadata for future fields.
  meta            jsonb
);

create index if not exists pse_provider_occurred_idx
  on public.profile_share_events (provider_type, provider_id, occurred_at desc);

create index if not exists pse_platform_occurred_idx
  on public.profile_share_events (platform, occurred_at desc);

create index if not exists pse_occurred_idx
  on public.profile_share_events (occurred_at desc);

alter table public.profile_share_events enable row level security;

-- Public-anon insert via /api/track/share-click. The endpoint uses the
-- service role; this policy is belt-and-braces in case a future client
-- calls direct from the anon SDK.
drop policy if exists "pse_anon_insert" on public.profile_share_events;
create policy "pse_anon_insert"
  on public.profile_share_events for insert
  with check (true);

-- No SELECT policy — admin reads via service role from gateway routes.
-- (Same pattern as wa_click_events.)
