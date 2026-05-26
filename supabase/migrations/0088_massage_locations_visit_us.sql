-- ============================================================================
-- Massage: service_locations + Visit Us physical location
-- ----------------------------------------------------------------------------
-- Mirrors beautician migrations 0079 (Visit Us) + 0086 (service_locations).
-- Massage therapists already work the home / hotel / villa outcall model,
-- so the same column set + UI applies cleanly. Tour-guide / laundry /
-- handyman / home-clean intentionally stay out — their service models
-- don't map to those three locations.
-- ============================================================================

-- Subset of {home, hotel, villa} the therapist is willing to travel to.
-- Empty array = none shown (UI hides the icon row entirely).
alter table public.massage_providers
  add column if not exists service_locations text[] default '{home,hotel,villa}'::text[];

update public.massage_providers
   set service_locations = '{home,hotel,villa}'::text[]
 where service_locations is null;

alter table public.massage_providers
  drop constraint if exists massage_service_locations_allowlist;
alter table public.massage_providers
  add constraint massage_service_locations_allowlist
  check (
    service_locations is null
    or service_locations <@ array['home','hotel','villa']::text[]
  );

comment on column public.massage_providers.service_locations is
  'Subset of {home, hotel, villa} — locations the therapist accepts bookings at. Drives the Home/Hotel/Villa icon row on the public profile + marketplace card.';

-- Optional physical studio / spa location for therapists who also take
-- walk-ins. Defaults off; lat/lng stay null unless explicitly set in the
-- dashboard. Same shape as beautician (mig 0079).
alter table public.massage_providers
  add column if not exists has_physical_location boolean default false;

alter table public.massage_providers
  add column if not exists latitude  double precision;
alter table public.massage_providers
  add column if not exists longitude double precision;

alter table public.massage_providers
  drop constraint if exists massage_lat_range;
alter table public.massage_providers
  add constraint massage_lat_range
  check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.massage_providers
  drop constraint if exists massage_lng_range;
alter table public.massage_providers
  add constraint massage_lng_range
  check (longitude is null or (longitude >= -180 and longitude <= 180));

comment on column public.massage_providers.has_physical_location is
  'Therapist opts in to a public physical studio address. When true, latitude + longitude render the Visit Us panel.';
