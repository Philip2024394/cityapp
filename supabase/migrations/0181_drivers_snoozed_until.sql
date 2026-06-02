-- ============================================================================
-- 0181_drivers_snoozed_until.sql — driver-initiated 48h self-snooze
-- ----------------------------------------------------------------------------
-- LEGAL POSTURE (Permenhub PM 12/2019 + 118/2018):
--   This column is set ONLY by the driver themselves (via /api/dashboard/me/snooze).
--   It is NOT set by the platform in response to a customer WhatsApp tap,
--   a "decline", or any dispatched-job concept — none of those exist on
--   this platform. It is a driver-controlled availability flag and the
--   listing query treats snoozed drivers as "lower priority in randomised
--   ordering" until the flag expires. Admin can CLEAR a snooze (to bring
--   a driver back into rotation by request) but cannot SET one — the
--   driver must always be the one to mark themselves unavailable.
--
-- Why a nullable timestamptz, not a boolean:
--   - Encodes both "am I snoozed" and "until when" in one column.
--   - Null = not snoozed (the common case).
--   - A value in the past = expired snooze, treated as null by the sort
--     query — no cron sweep needed to "clear" it.
--   - A value in the future = active snooze, drops driver to the bottom
--     of randomised listings.
-- ============================================================================

alter table public.drivers
  add column if not exists snoozed_until timestamptz;

-- Partial index — most drivers will have null. Index only the small set
-- with an active snooze so the listing query can short-circuit when the
-- snooze population is empty.
create index if not exists drivers_snoozed_until_idx
  on public.drivers (snoozed_until)
  where snoozed_until is not null;

comment on column public.drivers.snoozed_until is
  'Driver-initiated self-snooze. Null = available for randomised listing. '
  'Value in the future = driver opted out for ~48h; listing sort puts '
  'them last. Set ONLY by /api/dashboard/me/snooze (driver-auth). Admin '
  'may clear via /api/admin/drivers/[id] but never set — see '
  'feedback_cityriders_no_dispatch_ever for the regulatory rationale.';
