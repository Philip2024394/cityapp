-- ============================================================================
-- 0133 — "Mixed services" catch-all service ID on beautician
-- ----------------------------------------------------------------------------
-- Adds the 'mixed' value to the beautician services_offered CHECK
-- constraint so beauticians who do many things can pick a single
-- escape-valve service. The dashboard banner picker treats 'mixed' as
-- "show every banner regardless of category" — users who only offer
-- one specific service stay scoped to their service's banners, but
-- 'mixed' opens the floodgates without forcing them to tick 8 boxes.
--
-- Per the founder's directive (2026-05-29): "we always have Mixed
-- service as selection option so the user not get confused that they
-- also can have profile page with mixed services".
--
-- Same logic could be added to handyman/massage/tour-guide later if
-- those verticals want the same escape valve. Skipped today since
-- their service catalogues are smaller and 'general' already works.
-- ============================================================================

-- Find the existing CHECK constraint covering services_offered values
-- and rewrite it to include 'mixed'. The constraint name pattern
-- matches what mig 0073 + 0077 used.
alter table public.beautician_providers
  drop constraint if exists beautician_providers_services_offered_check;

alter table public.beautician_providers
  add constraint beautician_providers_services_offered_check
  check (
    services_offered is null
    or services_offered <@ array[
      'makeup','nails','hair','skin','lashes','brows','waxing','facial',
      'massage','henna','bridal','spa',
      'whitening','microblading','smoothing','permanent_makeup',
      -- mig 0133 escape-valve
      'mixed'
    ]::text[]
  );

-- marketplace_categories uses the same allowlist — keep them in sync.
alter table public.beautician_providers
  drop constraint if exists beautician_providers_marketplace_categories_check;

alter table public.beautician_providers
  add constraint beautician_providers_marketplace_categories_check
  check (
    marketplace_categories is null
    or marketplace_categories <@ array[
      'makeup','nails','hair','skin','lashes','brows','waxing','facial',
      'massage','henna','bridal','spa',
      'whitening','microblading','smoothing','permanent_makeup',
      'mixed'
    ]::text[]
  );

-- ============================================================================
-- POST-CONDITIONS
--   • Beauticians can now save 'mixed' in services_offered /
--     marketplace_categories. The dashboard chip picker shows
--     "Mixed services" as one of the catalog entries; the public profile
--     renders it as a chip just like any other service.
--   • BannerLibraryPicker (src/components/dashboard/BannerLibraryPicker
--     .tsx) treats 'mixed' as "ignore the per-user filter" — when the
--     beautician has picked 'mixed', every category with banners
--     appears in the picker regardless of which specific services they
--     also picked. Without 'mixed', the picker is now SCOPED to the
--     user's selected services.
-- ============================================================================
