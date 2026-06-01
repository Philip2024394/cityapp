-- ============================================================================
-- 0174_free_trial_30_days.sql — launch promo: 30-day free trial for new drivers
-- ----------------------------------------------------------------------------
-- Founder direction (2026-06-02): every NEW driver gets the first 30 days
-- free. Applies to all 5 vehicle verticals (car, bike, truck, bus, jeep)
-- since they share the `drivers` table.
--
-- Strict "new only" scope: no backfill. Existing rows (paid + unpaid) are
-- left alone. Only INSERTs from this point forward auto-set paid_until.
--
-- To remove the promo later (another migration):
--   ALTER TABLE drivers ALTER COLUMN paid_until DROP DEFAULT;
-- Drivers who already got the trial keep it; only future signups stop
-- getting the free 30 days. The subscription-payment API still extends
-- paid_until by 30 days on each successful payment.
-- ============================================================================

ALTER TABLE drivers
ALTER COLUMN paid_until SET DEFAULT (current_date + interval '30 days')::date;
