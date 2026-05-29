-- ============================================================================
-- 0134 — Partial-day busy slots (start/end time within a date)
-- ----------------------------------------------------------------------------
-- Existing busy_dates text[] (mig 0085) marks WHOLE days as unavailable.
-- Founder ask: also let owners block specific TIME RANGES within a date
-- — e.g. "Saturday 2-5pm I'm at a wedding, but I'll still take 6-10pm
-- bookings". Without this, the only way to communicate "busy from 2"
-- was to mark the whole day busy and lose the rest of it.
--
-- New column: busy_time_slots jsonb default '[]'. Shape:
--   [
--     { date: 'YYYY-MM-DD', start_time: 'HH:MM', end_time: 'HH:MM' },
--     ...
--   ]
--
-- A date can appear in BOTH busy_dates (full day) and busy_time_slots
-- (one or more partial windows). Customer-side availability check
-- treats whole-day busy first; if not full-day, evaluates partial
-- windows for overlap with the requested booking time.
--
-- Same column added to every provider table that has busy_dates today.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists busy_time_slots jsonb default '[]'::jsonb not null;

alter table public.massage_providers
  add column if not exists busy_time_slots jsonb default '[]'::jsonb not null;

alter table public.laundry_providers
  add column if not exists busy_time_slots jsonb default '[]'::jsonb not null;

alter table public.handyman_providers
  add column if not exists busy_time_slots jsonb default '[]'::jsonb not null;

alter table public.home_clean_providers
  add column if not exists busy_time_slots jsonb default '[]'::jsonb not null;

alter table public.tour_guide_listings
  add column if not exists busy_time_slots jsonb default '[]'::jsonb not null;

alter table public.bike_rentals
  add column if not exists busy_time_slots jsonb default '[]'::jsonb not null;

-- ============================================================================
-- POST-CONDITIONS
--   • Each provider table now carries busy_time_slots (jsonb, default []).
--   • Dashboard /bookings page lets owner choose:
--       a) Mark whole day busy  → toggles entry in busy_dates
--       b) Mark time range busy → appends { date, start_time, end_time }
--          to busy_time_slots
--   • Customer-side booking calendar:
--       — Full-day busy → date appears unavailable in the picker (no time
--         options shown for that date).
--       — Partial busy → date appears available, but the time picker
--         hides slots that overlap the busy ranges.
-- ============================================================================
