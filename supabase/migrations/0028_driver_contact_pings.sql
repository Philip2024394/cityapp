-- ============================================================================
-- 0028_driver_contact_pings.sql
-- ----------------------------------------------------------------------------
-- One row per Contact-button tap on /business or /cari/rider.
--
-- LIFE CYCLE:
--   1. Customer taps Contact on the directory  →  row INSERTED + push fired
--   2. Driver opens the app and taps "Got it"  →  row UPDATED with ack stamp
--
-- USES:
--   • B2B score: median response_time across last 30 days → "freshness" factor
--   • Driver dashboard analytics: "today: 14 pings · 9 ack'd · avg 22s"
--   • Anti-spam: rate-limit on (driver_user_id, customer_anon_id, last 10 min)
--
-- PRIVACY POSTURE (UU PDP):
--   • We do NOT store customer identity — only an anonymous session cookie
--   • We do NOT store message content — only the click event
--   • We do NOT show customer who pinged whom — only counts/timestamps
--
-- DIRECTORY POSTURE (PM 12/2019):
--   • Recording a click event on our own page is platform analytics, NOT
--     trip telemetry. No transport contract is captured here.
--   • We never notify the customer of the acknowledgement — the ack is a
--     PRIVATE platform event between driver and us.
-- ============================================================================

create table if not exists public.driver_contact_pings (
  id                  uuid primary key default gen_random_uuid(),
  driver_user_id      uuid not null references public.profiles(id) on delete cascade,
  customer_anon_id    text,                       -- anonymous cookie / device fingerprint, never PII
  source_page         text not null
                      check (source_page in ('cari_rider','business','profile_card','other')),
  pinged_at           timestamptz not null default now(),
  acknowledged_at     timestamptz,
  acknowledged_via    text
                      check (acknowledged_via is null or acknowledged_via in ('app_button','app_foreground','wa_opened'))
);

create index if not exists driver_contact_pings_driver_idx
  on public.driver_contact_pings(driver_user_id, pinged_at desc);

create index if not exists driver_contact_pings_anon_idx
  on public.driver_contact_pings(customer_anon_id, driver_user_id, pinged_at desc)
  where customer_anon_id is not null;

alter table public.driver_contact_pings enable row level security;

-- Driver reads their own pings (powers dashboard analytics + B2B score view).
create policy "Driver read own pings"
  on public.driver_contact_pings for select
  using (auth.uid() = driver_user_id or public.is_admin());

-- Anonymous customers INSERT through the /api/contact/ping route — that
-- endpoint uses the service-role key after performing its own validation
-- (driver exists, rate-limit ok). No direct anon-key insert.
create policy "Admin write pings"
  on public.driver_contact_pings for all
  using (public.is_admin())
  with check (public.is_admin());
