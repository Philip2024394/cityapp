-- ============================================================================
-- 0080 — Beautician: business_name column
-- ----------------------------------------------------------------------------
-- Separate from `display_name` (the beautician's personal name as it
-- appears on the floating profile card) — business_name is the studio
-- / salon brand that appears as the banner title and on receipts.
-- Nullable so existing rows aren't broken; required at signup going
-- forward via app-level validation.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists business_name text;
