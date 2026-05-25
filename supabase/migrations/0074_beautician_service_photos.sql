-- ============================================================================
-- 0074 — Beautician: per-service photo gallery
-- ----------------------------------------------------------------------------
-- Adds a JSONB column storing up to 4 photo URLs per service the
-- beautician offers. Shape:
--   {
--     "makeup": ["url1","url2","url3","url4"],
--     "nails":  ["url1", ...],
--     ...
--   }
-- Keys MUST be from the same 12-item allowlist as services_offered
-- (mig 0073). Each array capped at 4 entries.
--
-- The /beautician/[slug] page combines all entries into the portfolio
-- carousel. Selecting a service from the burger menu filters the
-- carousel to that service's photos only.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists service_photos jsonb default '{}'::jsonb;

-- Per-service caps + key allowlist. The function returns true when the
-- whole map is valid; false aborts the row write.
create or replace function public._beautician_service_photos_ok(p jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  k text;
  v jsonb;
  allowed text[] := array[
    'makeup','nails','hair','skin','lashes','brows',
    'waxing','facial','massage','henna','bridal','spa'
  ];
begin
  if p is null or p = '{}'::jsonb then return true; end if;
  if jsonb_typeof(p) <> 'object' then return false; end if;
  for k, v in select * from jsonb_each(p) loop
    if not (k = any(allowed)) then return false; end if;
    if jsonb_typeof(v) <> 'array' then return false; end if;
    if jsonb_array_length(v) > 4 then return false; end if;
  end loop;
  return true;
end;
$$;

alter table public.beautician_providers
  drop constraint if exists beautician_providers_service_photos_check,
  add  constraint beautician_providers_service_photos_check
    check (public._beautician_service_photos_ok(service_photos));
