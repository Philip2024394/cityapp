-- ============================================================================
-- 0031_subscription_yearly.sql
-- ----------------------------------------------------------------------------
-- Allow 'subscription_yearly' as a payment_intents.product so drivers can
-- self-renew for a year at Rp 350.000 via Midtrans Snap.
-- Same trigger (extend_subscription_on_payment) handles the period
-- extension via the row's extends_days (365 for yearly).
-- ============================================================================

alter table public.payment_intents
  drop constraint if exists payment_intents_product_check;

alter table public.payment_intents
  add constraint payment_intents_product_check
  check (product in ('subscription','subscription_yearly','verified'));
