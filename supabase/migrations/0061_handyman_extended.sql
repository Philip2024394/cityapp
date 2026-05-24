-- ============================================================================
-- 0061 — Handyman: extended Indonesian specialty list, max-3 limit,
--                  visit-fee nullable, day-rate = 8 hours convention
-- ----------------------------------------------------------------------------
-- Indonesian tukang reality: many specialties beyond the original 14.
-- Added: AC install, plafon, pompa air, water heater, cctv/antena,
-- aluminium, sumur bor, pest control, kanopi, kaca, wallpaper.
--
-- Provider may pick up to 3 specialties (per UX request).
-- Visit fee is now optional — at least ONE of visit/hour/day must be set.
-- ============================================================================

-- 1. Drop the old CHECK on specialties + re-create with the extended set.
alter table public.handyman_providers
  drop constraint if exists handyman_providers_specialties_check;

alter table public.handyman_providers
  add constraint handyman_providers_specialties_check
  check (specialties <@ array[
    'electrical','plumbing','ac_service','ac_install',
    'carpentry','painting','general_repair',
    'furniture_assembly','appliance_repair',
    'roof_repair','tiling','welding','locksmith','gardening',
    'ceiling_gypsum','water_pump','water_heater',
    'cctv_antenna','aluminum','well_drilling',
    'pest_control','canopy','glass_window','wallpaper',
    'other'
  ]::text[]);

-- 2. Cap specialties at 3 (UX rule — keeps cards scannable).
alter table public.handyman_providers
  drop constraint if exists handyman_providers_specialties_max3;
alter table public.handyman_providers
  add constraint handyman_providers_specialties_max3
  check (coalesce(array_length(specialties, 1), 0) between 1 and 3);

-- 3. Visit fee was NOT NULL — relax to nullable; require at least one
--    of visit / hour / day to be set so the listing has SOME pricing.
alter table public.handyman_providers
  alter column visit_fee_idr drop not null;

alter table public.handyman_providers
  drop constraint if exists handyman_providers_at_least_one_price;
alter table public.handyman_providers
  add constraint handyman_providers_at_least_one_price
  check (
    visit_fee_idr   is not null
    or hourly_rate_idr is not null
    or day_rate_idr    is not null
  );

-- 4. Trim existing mock seeds that have >3 specialties (defensive — none
--    of the 4 seeded mocks currently exceeds 3, but in case admin added
--    extra rows manually we don't want them blocked by the new CHECK).
update public.handyman_providers
   set specialties = specialties[1:3]
 where coalesce(array_length(specialties, 1), 0) > 3;
