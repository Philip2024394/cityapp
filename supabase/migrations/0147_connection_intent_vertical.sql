-- ============================================================================
-- 0147 — Extend connection_intent with vertical + provider-side response
-- ----------------------------------------------------------------------------
-- The WhatsApp intent-intercept alert (originally CityRiders-only — see
-- 0146) now covers every Indocity vertical: beautician, handyman,
-- laundry, massage, home-clean, tour-guide, facial, skincare, rentals,
-- property, plus the original 'car' (driver) and 'rider' (bike).
--
-- We rename `driver_id` to `provider_id` semantically (column stays
-- named `driver_id` to avoid breaking RLS + existing inserts — service
-- providers across all verticals share the same auth.users id space).
--
-- New column: `vertical` text — required, validated client-side AND by
-- this CHECK constraint. We backfill existing 0146 rows by source.
-- ============================================================================

alter table public.connection_intent
  add column if not exists vertical text;

-- Backfill 0146 rows: 'cari' + 'rider_profile' came from bike-rider flows,
-- 'car_profile' from car-driver. The few 'other' rows we tag generic.
update public.connection_intent
   set vertical = case
     when source in ('cari', 'rider_profile') then 'rider'
     when source = 'car_profile'              then 'car'
     else 'rider'  -- safest default; pre-0147 traffic was rider/car only
   end
 where vertical is null;

alter table public.connection_intent
  alter column vertical set not null;

alter table public.connection_intent
  drop constraint if exists connection_intent_vertical_check;
alter table public.connection_intent
  add constraint connection_intent_vertical_check check (vertical in (
    'rider', 'car',
    'beautician', 'handyman', 'laundry', 'massage', 'home-clean',
    'tour-guide', 'facial', 'skincare', 'rentals', 'property',
    'places'
  ));

create index if not exists connection_intent_vertical_idx
  on public.connection_intent (vertical, occurred_at desc);

comment on column public.connection_intent.vertical is
  'Vertical that owns this intent. Drives the dashboard tab routing and '
  'per-vertical analytics in /dashboard/<vertical>/stats.';

-- ----------------------------------------------------------------------------
-- Expand source enum to cover service-vertical profile pages. The check
-- constraint on `source` from 0146 only allowed cari/rider_profile/
-- car_profile/other — we add the per-vertical profile sources so the
-- 'source' column reads cleanly without hammering 'other'.
-- ----------------------------------------------------------------------------
alter table public.connection_intent
  drop constraint if exists connection_intent_source_check;
alter table public.connection_intent
  add constraint connection_intent_source_check check (source in (
    'cari',
    'rider_profile', 'car_profile',
    'beautician_profile', 'handyman_profile', 'laundry_profile',
    'massage_profile', 'home_clean_profile', 'tour_profile',
    'facial_profile', 'skincare_profile', 'rentals_profile',
    'property_profile', 'places_profile', 'bus_profile',
    'other'
  ));

-- ============================================================================
-- POST-CONDITIONS
--   • connection_intent.vertical is NOT NULL, constrained
--   • Existing rows backfilled
--   • source CHECK expanded to include each vertical's profile page
-- ============================================================================
