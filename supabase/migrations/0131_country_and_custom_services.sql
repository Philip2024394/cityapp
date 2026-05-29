-- ============================================================================
-- 0131 — Country code (drives WA prefix + currency) + custom service names
-- ----------------------------------------------------------------------------
-- Two additive columns on all 7 provider tables:
--
--   country_code             — ISO 3166-1 alpha-2 (e.g. 'ID', 'US', 'GB').
--                              Drives the WA-prefix chip in the dashboard,
--                              the currency symbol on price tiles, and the
--                              flag on public profiles. Default 'ID' so
--                              every existing row reads as Indonesian.
--
--   custom_services_offered  — text[] of free-form service names the
--                              provider added themselves. Rendered on the
--                              public profile alongside the enum-based
--                              services_offered chips, identical visual
--                              treatment. Default '{}'.
--
-- Mirrors migrations 0072 / 0130 — same 7 tables, additive only, no RLS
-- changes, no CHECK constraints on the country_code beyond 2-letter format.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- country_code on every provider table
-- ─────────────────────────────────────────────────────────────────────────

alter table public.bike_rentals
  add column if not exists country_code text default 'ID' not null,
  add column if not exists custom_services_offered text[] default '{}';

alter table public.tour_guide_listings
  add column if not exists country_code text default 'ID' not null,
  add column if not exists custom_services_offered text[] default '{}';

alter table public.massage_providers
  add column if not exists country_code text default 'ID' not null,
  add column if not exists custom_services_offered text[] default '{}';

alter table public.beautician_providers
  add column if not exists country_code text default 'ID' not null,
  add column if not exists custom_services_offered text[] default '{}';

alter table public.laundry_providers
  add column if not exists country_code text default 'ID' not null,
  add column if not exists custom_services_offered text[] default '{}';

alter table public.handyman_providers
  add column if not exists country_code text default 'ID' not null,
  add column if not exists custom_services_offered text[] default '{}';

alter table public.home_clean_providers
  add column if not exists country_code text default 'ID' not null,
  add column if not exists custom_services_offered text[] default '{}';

-- ─────────────────────────────────────────────────────────────────────────
-- Format check — 2 uppercase letters. Stored uppercase to match ISO 3166-1
-- conventions and keep the lookup map keys consistent.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'bike_rentals', 'tour_guide_listings', 'massage_providers',
    'beautician_providers', 'laundry_providers',
    'handyman_providers', 'home_clean_providers'
  ] loop
    execute format($f$
      alter table public.%I
        drop constraint if exists %I,
        add  constraint %I check (country_code ~ '^[A-Z]{2}$');
    $f$,
      v_table,
      v_table || '_country_code_iso',
      v_table || '_country_code_iso'
    );
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Optional limit: keep custom_services_offered scannable — 20 max.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'bike_rentals', 'tour_guide_listings', 'massage_providers',
    'beautician_providers', 'laundry_providers',
    'handyman_providers', 'home_clean_providers'
  ] loop
    execute format($f$
      alter table public.%I
        drop constraint if exists %I,
        add  constraint %I check (
          custom_services_offered is null
          or array_length(custom_services_offered, 1) is null
          or array_length(custom_services_offered, 1) <= 20
        );
    $f$,
      v_table,
      v_table || '_custom_services_max',
      v_table || '_custom_services_max'
    );
  end loop;
end;
$$;

-- ============================================================================
-- POST-CONDITIONS
--   • Every provider row now carries an ISO country_code (defaults 'ID') and
--     a custom_services_offered text[] (default empty).
--   • Validator (src/lib/validation/universalProfile.ts) needs:
--       - country_code: 2 letters, uppercase, must exist in the lookup map.
--       - custom_services_offered: each entry trim()ed, max 60 chars,
--         deduped against the enum-based services_offered list.
--   • Service-photo badge metadata lives inside the existing service_photos
--     jsonb column — no schema change needed for that part of the feature.
-- ============================================================================
