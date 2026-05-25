-- ============================================================================
-- 0077 — Beautician: extended services catalog + marketplace categories
-- ----------------------------------------------------------------------------
-- Extends the services_offered allowlist with 4 widely-requested Indonesian
-- beauty services (whitening, microblading, smoothing, permanent makeup)
-- and adds a NEW marketplace_categories column — beautician picks up to 3
-- PRIMARY categories that determine which filter group they appear under in
-- the /beautician marketplace page. Subset of services_offered (you can't
-- be displayed under a category you don't offer).
-- ============================================================================

-- Refresh services_offered CHECK with the extended allowlist.
alter table public.beautician_providers
  drop constraint if exists beautician_providers_services_offered_check,
  add  constraint beautician_providers_services_offered_check check (
    services_offered is null
    or array_length(services_offered, 1) is null
    or (
      array_length(services_offered, 1) <= 16
      and services_offered <@ array[
        'makeup','nails','hair','skin','lashes','brows',
        'waxing','facial','massage','henna','bridal','spa',
        'whitening','microblading','smoothing','permanent_makeup'
      ]::text[]
    )
  );

-- Refresh service_photos key allowlist function (mig 0074) so the 4 new
-- keys are accepted in the per-service photo gallery too.
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
    'waxing','facial','massage','henna','bridal','spa',
    'whitening','microblading','smoothing','permanent_makeup'
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

-- Primary marketplace categories — max 3, subset of services_offered
-- allowlist. Filters under which the beautician appears.
alter table public.beautician_providers
  add column if not exists marketplace_categories text[] default '{}';

alter table public.beautician_providers
  drop constraint if exists beautician_providers_marketplace_categories_check,
  add  constraint beautician_providers_marketplace_categories_check check (
    marketplace_categories is null
    or array_length(marketplace_categories, 1) is null
    or (
      array_length(marketplace_categories, 1) <= 3
      and marketplace_categories <@ array[
        'makeup','nails','hair','skin','lashes','brows',
        'waxing','facial','massage','henna','bridal','spa',
        'whitening','microblading','smoothing','permanent_makeup'
      ]::text[]
    )
  );

-- Backfill — any beautician with services_offered set picks the first 3
-- as their starting marketplace_categories so existing rows aren't blank
-- after the column lands.
update public.beautician_providers
   set marketplace_categories = services_offered[1:3]
 where coalesce(array_length(marketplace_categories, 1), 0) = 0
   and coalesce(array_length(services_offered, 1), 0) > 0;
