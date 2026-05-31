-- =============================================================================
-- 0162 — drivers.vehicle_type: add 'jeep'
-- =============================================================================
-- Founder decision 2026-05-31: jeep is its own vertical, parallel to car /
-- truck / minibus / bike. Off-road tours, sunrise trips, volcano adventures
-- and similar adventure-charter use cases sit on /jeep marketplace + the
-- /dashboard/jeep onboarding stack.
--
-- The same constraint is checked on mock_drivers via 0093 — that table
-- has no explicit check (uses text); seeded mock 'jeep' rows can land
-- there without schema changes.
-- =============================================================================

alter table public.drivers
  drop constraint if exists drivers_vehicle_type_check;

alter table public.drivers
  add constraint drivers_vehicle_type_check
  check (vehicle_type in ('bike','car','truck','premium_car','minibus','jeep'));

-- Subscription_payments table also has a vehicle_type CHECK (see 0094). Update
-- it so jeep drivers can record payments under their own vertical without
-- triggering a constraint violation.
alter table public.subscription_payments
  drop constraint if exists subscription_payments_vehicle_type_check;

alter table public.subscription_payments
  add constraint subscription_payments_vehicle_type_check
  check (vehicle_type in ('bike','car','truck','premium_car','minibus','jeep'));
