-- ============================================================================
-- 0136 — "Mixed services" escape-valve on handyman + massage
-- ----------------------------------------------------------------------------
-- Mig 0133 added the 'mixed' catch-all service ID to beautician
-- (services_offered + marketplace_categories). This migration propagates
-- the same escape valve to:
--   • handyman_providers   — column 'specialties'  (text[], multi-select)
--   • massage_providers    — column 'massage_type' (text,   single-select)
--
-- Skipped on purpose:
--   • tour_guide_listings  — its services column ('services' text[]) has
--                            NO CHECK constraint by design (mig 0037
--                            comment: "Allowed values are open by design
--                            so we can add new categories without a
--                            migration"). 'mixed' can already be saved
--                            without a schema change; the catalog file
--                            (src/data/tourServices.ts) just needs the
--                            'mixed' entry, handled in a sibling code
--                            edit.
--
-- BannerLibraryPicker treats 'mixed' as "ignore the per-user filter" —
-- when set, every banner category appears regardless of which specific
-- services the provider also picked. Without 'mixed', the picker stays
-- SCOPED to the provider's selected services.
-- ============================================================================

-- ── Handyman ─────────────────────────────────────────────────────────────
-- Most recent allowlist comes from mig 0125; we rewrite the CHECK to
-- include 'mixed' as the final escape-valve entry.
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
    -- mig 0136 escape-valve
    'mixed',
    'other'
  ]::text[]);

-- ── Massage ──────────────────────────────────────────────────────────────
-- Single-value column (mig 0048 / mig 0124). 'mixed' lets a therapist
-- advertise that they do multiple modalities without forcing them to
-- pick a single dominant one.
alter table public.massage_providers
  drop constraint if exists massage_providers_massage_type_check;

alter table public.massage_providers
  add  constraint massage_providers_massage_type_check
  check (massage_type = ANY (ARRAY[
    'balinese','javanese','lulur','pijat_tradisional','refleksi',
    'thai','shiatsu','tui_na',
    'swedish','deep_tissue','sports','aromatherapy','hot_stone',
    'trigger_point','lymphatic','prenatal','myofascial',
    'cupping','couples','gua_sha',
    -- mig 0136 escape-valve
    'mixed',
    'other'
  ]::text[]));

-- ============================================================================
-- POST-CONDITIONS
--   • Handyman tukang can save 'mixed' inside specialties[].
--   • Massage therapist can save 'mixed' as massage_type.
--   • Tour-guide vertical already accepts 'mixed' (no CHECK to relax) —
--     handled in src/data/tourServices.ts only.
--   • BannerLibraryPicker, when wired with userCategoryIds containing
--     'mixed', shows every banner category for the vertical.
-- ============================================================================
