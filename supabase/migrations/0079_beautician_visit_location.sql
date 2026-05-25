-- ============================================================================
-- 0079 — Beautician: physical visit location (Visit Us feature)
-- ----------------------------------------------------------------------------
-- Opt-in flag for beauticians with a physical salon/studio. When enabled,
-- the public profile shows a "Visit Us" panel with address, hours, and a
-- MapLibre map with a glowing marker. Defaults OFF — home-based
-- beauticians shouldn't publish a home address by accident.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists has_physical_location boolean not null default false,
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;

-- Lat/lng must be a valid pair when set. We don't require them strictly
-- because a beautician can flag has_physical_location and not pin a map.
alter table public.beautician_providers
  drop constraint if exists beautician_providers_latlng_check,
  add  constraint beautician_providers_latlng_check check (
    (latitude is null and longitude is null)
    or
    (latitude  between -90 and 90 and longitude between -180 and 180)
  );
