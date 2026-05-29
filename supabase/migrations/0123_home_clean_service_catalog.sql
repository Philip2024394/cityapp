-- ============================================================================
-- 0123 — Home-clean service allowlist + supply / eco / team fields
-- ----------------------------------------------------------------------------
-- home_clean_providers has service_photos jsonb but no constrained service
-- catalogue, unlike beautician (mig 0073). The shared ProviderDashboard
-- needs a per-row `services_offered` allowlist so the dropdown can render.
-- Catalogue is the 5 essentials surfaced by the brainstorm pass:
--   regular_clean / deep_clean / move_in_out / post_construction / sofa_carpet
-- Also adds has_own_supplies, eco_friendly, team_size — all nullable.
-- ============================================================================

alter table public.home_clean_providers
  add column if not exists services_offered text[] not null default '{}'::text[],
  add column if not exists has_own_supplies boolean,
  add column if not exists eco_friendly     boolean,
  add column if not exists team_size        smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'home_clean_services_offered_check'
  ) then
    alter table public.home_clean_providers
      add constraint home_clean_services_offered_check
      check (
        services_offered <@ ARRAY[
          'regular_clean','deep_clean','move_in_out',
          'post_construction','sofa_carpet'
        ]::text[]
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'home_clean_services_offered_max5'
  ) then
    alter table public.home_clean_providers
      add constraint home_clean_services_offered_max5
      check (coalesce(array_length(services_offered, 1), 0) between 0 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'home_clean_team_size_range'
  ) then
    alter table public.home_clean_providers
      add constraint home_clean_team_size_range
      check (team_size is null or team_size between 1 and 20);
  end if;
end$$;
