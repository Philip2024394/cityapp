-- ============================================================================
-- 0076 — rating + rating_count on the 5 service-provider tables
-- ----------------------------------------------------------------------------
-- mig 0075 added a trigger that maintains rating + rating_count on the
-- source provider row whenever a review lands, but the 5 service-provider
-- tables didn't have those columns yet. Drivers / tour_guide_listings /
-- bike_rentals already had them from earlier migrations.
-- ============================================================================

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'massage_providers', 'beautician_providers', 'laundry_providers',
    'handyman_providers', 'home_clean_providers'
  ] loop
    execute format($f$
      alter table public.%I
        add column if not exists rating       numeric(3,2),
        add column if not exists rating_count int not null default 0;
    $f$, v_table);
  end loop;
end $$;
