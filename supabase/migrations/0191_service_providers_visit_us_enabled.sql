-- ============================================================================
-- 0191_service_providers_visit_us_enabled.sql
-- ----------------------------------------------------------------------------
-- Extends the Visit Us → CityDrivers ride card (mig 0190, beautician_providers)
-- to the other "customer-comes-to-merchant" service verticals:
--
--   massage_providers   — massage parlours, spas
--   facial_providers    — facial / clinic
--   skincare_providers  — skincare studios
--
-- Excluded on purpose (the merchant goes TO the customer, so no ride card
-- needed): handyman_providers, home_clean_providers, laundry_providers,
-- tour_guide_listings, bike_rentals.
--
-- All three additions are boolean, default false. Public pages already
-- carry latitude/longitude columns (verified mig 0079 + later), so the
-- deep link has somewhere to fill in once a provider toggles it on.
--
-- PM 12/2019 directory posture stays intact (see memory
-- project_kita2u_to_citydrivers_handoff.md). Customer picks the driver
-- explicitly on /cari, per-driver published rate × distance shown,
-- WhatsApp handoff for the booking, no DB booking record.
-- ============================================================================

alter table public.massage_providers
  add column if not exists visit_us_enabled boolean not null default false;

alter table public.facial_providers
  add column if not exists visit_us_enabled boolean not null default false;

alter table public.skincare_providers
  add column if not exists visit_us_enabled boolean not null default false;

comment on column public.massage_providers.visit_us_enabled is
  'When true, /massage/[slug] renders a "Visit us / Get a ride" card with Bike + Car CTAs deep-linking to /cari/rider with the salon address pre-filled as dropoff. Owner-controlled.';
comment on column public.facial_providers.visit_us_enabled is
  'When true, /facial/[slug] renders the same Visit Us → CityDrivers ride card. Owner-controlled.';
comment on column public.skincare_providers.visit_us_enabled is
  'When true, /skincare/[slug] renders the same Visit Us → CityDrivers ride card. Owner-controlled.';
