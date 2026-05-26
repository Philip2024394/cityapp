-- ============================================================================
-- Beautician service locations — which of Home / Hotel / Villa the
-- beautician is willing to travel to. Powers:
--   • Hero-area icon row on the public profile (Home / Hotel / Villa)
--   • Bottom-left icons on the marketplace card
-- A blank array means "no location set" — the UI then renders no
-- location icons rather than defaulting to all three. Existing rows
-- get the full set on migration so cards/profiles don't suddenly empty.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists service_locations text[] default '{home,hotel,villa}'::text[];

comment on column public.beautician_providers.service_locations is
  'Subset of {home, hotel, villa} — locations the beautician travels to. Empty array = none, controls the icons on both the public profile hero and the marketplace card.';

-- Backfill any existing rows that ended up with NULL (older schema may
-- predate the default).
update public.beautician_providers
   set service_locations = '{home,hotel,villa}'::text[]
 where service_locations is null;

-- Constrain values to the allowlist (defence in depth — the API
-- already validates, but DB-level keeps direct admin updates safe).
alter table public.beautician_providers
  drop constraint if exists beautician_service_locations_allowlist;

alter table public.beautician_providers
  add constraint beautician_service_locations_allowlist
  check (
    service_locations is null
    or service_locations <@ array['home','hotel','villa']::text[]
  );
