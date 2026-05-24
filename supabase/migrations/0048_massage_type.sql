-- ============================================================================
-- 0048 — Massage provider: single massage_type field
-- ----------------------------------------------------------------------------
-- Each therapist picks ONE specialty. Drives the under-name label on the
-- marketplace card and the dashboard read-only display. Indonesian +
-- Western options curated to cover the common Bali/Yogya market.
-- ============================================================================

alter table public.massage_providers
  add column if not exists massage_type text
    check (massage_type in (
      -- Indonesian / Asian
      'balinese','javanese','lulur','pijat_tradisional','refleksi',
      'thai','shiatsu','tui_na',
      -- Western
      'swedish','deep_tissue','sports','aromatherapy','hot_stone',
      'trigger_point','lymphatic','prenatal','myofascial',
      -- Catch-all
      'other'
    ));

-- Default existing rows to 'balinese' so the NOT NULL guarantee below
-- holds; the dashboard will prompt them to refine on first login.
update public.massage_providers set massage_type = 'balinese' where massage_type is null;

alter table public.massage_providers
  alter column massage_type set not null,
  alter column massage_type set default 'balinese';
