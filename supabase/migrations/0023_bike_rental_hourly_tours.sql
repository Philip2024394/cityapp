-- ============================================================================
-- 0023_bike_rental_hourly_tours.sql
-- ----------------------------------------------------------------------------
-- Adds hourly bike+driver tour rates to bike_rentals — the 3hr / 6hr / 8hr
-- blocks that customers book when they want a local driver to take them on
-- a city or attraction tour (motor-driver-as-guide service).
--
-- Defaults match the lowest-rate baseline the user provided as the
-- Indonesian market floor:
--   3 hours → Rp 150,000
--   6 hours → Rp 280,000
--   8 hours → Rp 350,000
-- Petrol is excluded by default — customer pays it separately. The
-- fuel_included flag lets a driver bundle petrol into the quote if they
-- prefer (e.g. for short urban tours where fuel is trivial).
--
-- Both columns are nullable so rentals that ONLY offer self-ride don't
-- carry empty placeholder values. The /dashboard editor sets them only
-- when the rental_mode includes 'with_driver'.
-- ============================================================================

alter table public.bike_rentals
  add column if not exists tour_3h_idr int,
  add column if not exists tour_6h_idr int,
  add column if not exists tour_8h_idr int,
  add column if not exists fuel_included boolean not null default false;

-- Backfill existing 'with_driver' rentals with the lowest-rate defaults
-- so the editor doesn't show empty fields when an existing driver opens
-- it. Only touches rows whose rental_mode includes with_driver AND have
-- no value set yet — never overwrites custom rates.
update public.bike_rentals
set tour_3h_idr = coalesce(tour_3h_idr, 150000),
    tour_6h_idr = coalesce(tour_6h_idr, 280000),
    tour_8h_idr = coalesce(tour_8h_idr, 350000)
where rental_mode in ('with_driver','both');

-- Index supports "show me tour rentals near pickup point sorted by rate"
-- on the marketplace.
create index if not exists bike_rentals_tour_3h_idx
  on public.bike_rentals (tour_3h_idr)
  where rental_mode in ('with_driver','both') and status = 'approved';
