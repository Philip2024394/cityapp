-- ============================================================================
-- 0169_driver_service_rates.sql
-- ----------------------------------------------------------------------------
-- Adds the per-service rate-override jsonb column on `public.drivers` (and the
-- mirror demo table `public.mock_drivers`) so truck and minibus drivers can
-- publish per-service rate charts on their public profile.
--
-- Shape (TypeScript):
--   service_rates: {
--     [service_id: string]: { rates: { label: string; idr: number; per?: string }[] }
--   }
--
--   - `service_id` is one of the ids in src/lib/drivers/serviceOfferings.ts
--     (TRUCK_SERVICE_OFFERINGS / BUS_SERVICE_OFFERINGS).
--   - Missing keys / empty `rates[]` → public profile falls back to the
--     catalog `default_rates` for that service. No backfill needed.
--   - Driver-overridable from /dashboard/{truck,bus}/rates.
--
-- COMPLIANCE: CityDrivers is a software directory under PM 12/2019. Every
-- value stored here is driver-self-published. The platform never sets,
-- computes, modifies, or appoints these rates.
-- ============================================================================

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS service_rates jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.mock_drivers
  ADD COLUMN IF NOT EXISTS service_rates jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.drivers.service_rates IS
  'Per-service rate overrides for truck/minibus drivers. Shape: { [service_id]: { rates: { label, idr, per? }[] } }. Empty/missing keys → public profile falls back to catalog default_rates (src/lib/drivers/serviceOfferings.ts). Driver-self-published per PM 12/2019.';

COMMENT ON COLUMN public.mock_drivers.service_rates IS
  'Mirror of drivers.service_rates for the demo dataset. Same shape, same fallback rules.';
