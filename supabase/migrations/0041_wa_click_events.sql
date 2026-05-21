-- ============================================================================
-- 0041_wa_click_events.sql
-- ----------------------------------------------------------------------------
-- Append-only audit of every "Contact via WhatsApp" tap across the
-- StreetLocal product family. Powers the admin Activity dashboard:
--   - "How many WA buttons fire per day, per app?"
--   - "Which contexts (driver profile / rental card / vendor card)
--     actually convert?"
--   - "Did this listing's WA button ever get clicked since launch?"
--
-- LEGAL POSTURE (PDP / UU 27/2022):
--   - Phone numbers are SHA-256 hashed before insert so we count + match
--     without storing PII. Same for IP (analytics, not surveillance).
--   - user_id is nullable — anonymous customers don't get tagged.
--   - 90-day retention — the nightly retention cron in vercel.json
--     should sweep rows older than that (added in a follow-up).
--
-- Schema-wise it's keep-it-simple: one wide row per event, never updated.
-- ============================================================================

create table if not exists public.wa_click_events (
  id              bigserial primary key,
  occurred_at     timestamptz not null default now(),

  -- Which app fired this event (cityrider / donut / food-basic /
  -- landing / affiliate). String, not enum, so adding a new app is
  -- a zero-migration change.
  app_id          text not null,

  -- Where in the app (driver_profile / rental_card / tour_guide_detail /
  -- vendor_card / business_directory / pending_page / etc).
  context         text not null,

  -- SHA-256 hex hash of the +E164 phone number the user was sent to.
  -- Lets us cohort by destination without storing the number.
  target_phone_hash text,

  -- Optional: the user_id of the customer who tapped, if signed in.
  user_id         uuid references auth.users(id) on delete set null,

  -- Geo / fingerprint (PDP-safe).
  ip_hash         text,
  country         text,
  city            text,

  -- referrer URL (helps debug "is /r/[slug] performing?")
  referrer        text,

  -- Free-form metadata for app-specific fields.
  meta            jsonb
);

create index if not exists wac_app_occurred_idx on public.wa_click_events (app_id, occurred_at desc);
create index if not exists wac_context_idx      on public.wa_click_events (context, occurred_at desc);
create index if not exists wac_user_idx         on public.wa_click_events (user_id, occurred_at desc) where user_id is not null;

alter table public.wa_click_events enable row level security;

-- Public-anon insert via the /api/track/wa-click endpoint. The endpoint
-- uses the service role so this policy is belt-and-braces in case a
-- future hook calls from the anon client.
drop policy if exists "wac_anon_insert" on public.wa_click_events;
create policy "wac_anon_insert"
  on public.wa_click_events for insert
  with check (true);

-- No SELECT policy — admin reads via service role from gateway routes.
