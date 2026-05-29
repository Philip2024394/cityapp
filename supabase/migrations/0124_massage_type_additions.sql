-- ============================================================================
-- 0124 — Massage type allowlist additions
-- ----------------------------------------------------------------------------
-- Adds cupping (bekam), couples, and gua_sha to the massage_type CHECK
-- constraint surfaced by the catalogue brainstorm pass (2026-05-29).
-- The TS-side enum in src/lib/massage/types.ts needs the same entries
-- added — that's a separate code change, not a migration.
-- ============================================================================

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
    'other'
  ]::text[]));
