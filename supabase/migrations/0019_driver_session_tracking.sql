-- ============================================================================
-- 0019_driver_session_tracking.sql
-- ----------------------------------------------------------------------------
-- Adds session_started_at to drivers — tracks when the driver most recently
-- transitioned from offline → online. Cleared when they go back offline.
--
-- DIRECTORY-POSTURE NOTE (PM 12/2019):
-- This is DRIVER-SELF telemetry only. We never record customer requests or
-- driver responses on the server (see migration 0010). This column is set
-- by the driver's own availability toggle and location ping — same surface
-- that already writes last_active_at. No customer-facing booking events
-- are recorded.
--
-- The column powers the "Active now" / "Online 2h" presence badges on the
-- public marketplace + pending screens, and lets the queries order by
-- freshness (most recently active drivers float to the top within their
-- availability bucket).
-- ============================================================================

alter table public.drivers
  add column if not exists session_started_at timestamptz;

-- Index supports the new ranking: availability ASC, last_active_at DESC.
-- Drivers who went online hours ago and stopped pinging will fall down
-- the list even if availability is still 'online'.
create index if not exists drivers_last_active_idx
  on public.drivers (status, availability, last_active_at desc)
  where status = 'active';
