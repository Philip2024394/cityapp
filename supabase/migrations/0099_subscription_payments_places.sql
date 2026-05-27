-- ============================================================================
-- 0099 — Allow 'place' as a listing_type on subscription_payments
-- ----------------------------------------------------------------------------
-- The /dashboard/place owner dashboard ships in this phase with the same
-- QRIS receipt flow that vehicles use:
--   1. Place owner uploads a screenshot of their 38,000 IDR / month
--      QRIS transfer to /api/dashboard/subscription-payment
--   2. The API extends places.paid_until = max(today, paid_until) + 30d
--      (optimistic activation — listing surfaces immediately on /places)
--   3. Admin verifies via /admin/subscriptions later and can reject
--
-- The subscription_payments table already exists (migration 0094). Its
-- check constraint currently allows only vehicle types — this migration
-- expands the allowed set to include 'place' so the same table backs
-- both flows. Renaming the column to listing_type would be cleaner
-- semantically but blasts every caller; keeping the existing column
-- name and just widening the constraint is the minimal-risk path.
-- ============================================================================

-- 1. Drop + re-add the CHECK constraint with 'place' included.
--    Postgres doesn't let us ALTER a CHECK constraint in-place.
alter table public.subscription_payments
  drop constraint if exists subscription_payments_vehicle_type_check;

alter table public.subscription_payments
  add constraint subscription_payments_vehicle_type_check
  check (vehicle_type in ('bike','car','truck','premium_car','minibus','place'));

-- 2. Comment refresh so the schema viewer doesn't lie.
comment on column public.subscription_payments.vehicle_type is
  'Listing type the payment activates. Allowed values: bike, car, '
  'truck, premium_car, minibus (drivers.paid_until target) — or place '
  '(places.paid_until target). Despite the column name, this is a '
  'generalised listing_type discriminator; rename was deferred to keep '
  'the change minimal-risk.';

-- 3. (Optional) helper index for the admin-queue place filter once
--    place payments start arriving. The existing
--    idx_subscription_payments_status_submitted already covers the
--    main pending-queue query — this is just a hint for future
--    /admin/subscriptions filtering by listing-type.
create index if not exists idx_subscription_payments_vehicle_type
  on public.subscription_payments (vehicle_type);
