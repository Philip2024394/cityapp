-- ============================================================================
-- 0171_bus_passenger_cost_rule.sql
-- ----------------------------------------------------------------------------
-- Adds a per-driver overridable text for the "passenger-cost extras" rule
-- shown on the bus public profile's per-service rate panel (toll bridges,
-- parking, meals for the driver, etc.). When NULL the public profile falls
-- back to the hardcoded English default copy in VehicleProfileShell.
--
-- Scope is intentionally minimal — single text column. Driver fills it
-- from the bus dashboard so they can localise / shorten / extend the
-- standard rule without us shipping a UI change every time.
-- ============================================================================

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS passenger_cost_rule text;

ALTER TABLE public.mock_drivers
  ADD COLUMN IF NOT EXISTS passenger_cost_rule text;

-- Seed the demo Hiace mock with a sample override so the public profile
-- visibly demonstrates the driver-can-edit path.
UPDATE public.mock_drivers
   SET passenger_cost_rule = 'Toll bridges, parking, and driver meals are on you. Tip optional.'
 WHERE slug = 'rahmat-hiace-jogja-charter'
   AND passenger_cost_rule IS NULL;
