-- ============================================================================
-- 0184_mock_hide_vehicle_type_match.sql — match vehicle_type when hiding mocks
-- ----------------------------------------------------------------------------
-- LAUNCH AUDIT M3: when a new real driver signs up, the
-- hide_one_mock_driver() trigger (mig 0050) picks the oldest mock_drivers
-- row regardless of vehicle type. A new bike driver could therefore
-- hide a jeep mock instead of a bike mock, slowly draining the wrong
-- pool while leaving bike density unchanged.
--
-- This migration replaces the trigger function so it filters mocks by
-- vehicle_type to match the newly-inserted real driver. Bike signups
-- hide a bike mock; car signups hide a car mock; etc.
--
-- Falls back to the original "any mock" behaviour if no matching-type
-- mock is available — better to hide something than nothing.
-- ============================================================================

create or replace function public.hide_one_mock_driver()
returns trigger language plpgsql security definer as $$
declare
  victim_id uuid;
begin
  -- Prefer hiding a mock of the SAME vehicle_type as the new real driver.
  -- new.vehicle_type comes from the just-inserted drivers row.
  select id into victim_id
    from public.mock_drivers
   where mock_hidden_at is null
     and vehicle_type = new.vehicle_type
   order by created_at asc
   limit 1;

  -- Fallback — no matching mock available, hide the oldest of any type.
  -- This preserves the original 0050 behaviour as a degraded path.
  if victim_id is null then
    select id into victim_id
      from public.mock_drivers
     where mock_hidden_at is null
     order by created_at asc
     limit 1;
  end if;

  if victim_id is not null then
    update public.mock_drivers
       set mock_hidden_at = now()
     where id = victim_id;
  end if;
  return new;
end $$;
