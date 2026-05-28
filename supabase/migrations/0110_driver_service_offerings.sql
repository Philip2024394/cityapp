-- 0110 — Drivers: service_offerings (City Service / Daily Hire / Hourly Hire / etc)
-- ----------------------------------------------------------------------------
-- Adds a `service_offerings text[]` column to both `drivers` (real) and
-- `mock_drivers` (demo seed). Stores the canonical offering ids defined in
-- `src/lib/drivers/serviceOfferings.ts`. Customers see these as yellow-tint
-- badges on the /car/[slug] and /r/[slug] profile pages; drivers pick which
-- ones they offer from a toggle-pill grid in the car + bike dashboards.
--
-- IDEMPOTENT — uses `add column if not exists`, safe to re-run.
-- ----------------------------------------------------------------------------

alter table public.drivers
  add column if not exists service_offerings text[] not null default '{}'::text[];

alter table public.mock_drivers
  add column if not exists service_offerings text[] not null default '{}'::text[];

comment on column public.drivers.service_offerings is
  'Driver-selected trip-type tags. Allowed ids: city_service, daily_hire, hourly_hire, airport_pickup, tour_destinations, private_charter, wedding_event, cargo_parcel. See src/lib/drivers/serviceOfferings.ts for the canonical catalog.';

comment on column public.mock_drivers.service_offerings is
  'Driver-selected trip-type tags (demo seed). Allowed ids: city_service, daily_hire, hourly_hire, airport_pickup, tour_destinations, private_charter, wedding_event, cargo_parcel. See src/lib/drivers/serviceOfferings.ts.';
