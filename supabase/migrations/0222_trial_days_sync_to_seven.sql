-- ============================================================================
-- 0222 — Sync TRIAL_DAYS to 7 across the platform.
-- ----------------------------------------------------------------------------
-- Mig 0174 set drivers.paid_until default to current_date + 30 days, which
-- contradicted the landing pricing teaser + signup API (both 7 days). The
-- constants file at src/lib/pricing/constants.ts now exports
-- TRIAL_DAYS = 7 — this migration brings the column default in line so the
-- marketplace gate (paid_until) and the dashboard trial banner
-- (trial_ends_at) agree about when the trial ended.
--
-- Effect: only new driver signups get the 7-day default. Existing rows are
-- NOT backfilled (they keep whatever paid_until value they were issued at
-- the time — fair to existing users mid-trial).
--
-- Founder direction 2026-06-09: align everything to the "7 days free,
-- cancel in one tap" landing positioning that the audit identified as the
-- highest-converting trial copy.
-- ============================================================================

alter table public.drivers
  alter column paid_until set default (current_date + interval '7 days');
