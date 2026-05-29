-- ============================================================================
-- 0125 — Handyman specialty allowlist additions
-- ----------------------------------------------------------------------------
-- Adds 5 specialties surfaced by the catalogue brainstorm pass (2026-05-29):
--   waterproofing, septic_tank, solar_panel, smart_home, mosquito_net
-- The TS-side enum in src/lib/handyman/types.ts (HandymanSpecialty +
-- SPECIALTY_LABELS + SPECIALTY_SHORT) needs the same entries added —
-- separate code change, not a migration.
-- The 3-specialty cap (handyman_providers_specialties_max3) is unchanged.
-- ============================================================================

alter table public.handyman_providers
  drop constraint if exists handyman_providers_specialties_check;

alter table public.handyman_providers
  add  constraint handyman_providers_specialties_check
  check (specialties <@ ARRAY[
    'electrical','plumbing','ac_service','ac_install',
    'carpentry','painting','general_repair','furniture_assembly',
    'appliance_repair','roof_repair','tiling','welding','locksmith',
    'gardening','ceiling_gypsum','water_pump','water_heater',
    'cctv_antenna','aluminum','well_drilling','pest_control',
    'canopy','glass_window','wallpaper',
    'waterproofing','septic_tank','solar_panel','smart_home','mosquito_net',
    'other'
  ]::text[]);
