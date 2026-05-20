-- ============================================================================
-- 0026_b2b_score.sql
-- ----------------------------------------------------------------------------
-- B2B reliability score + tier columns on drivers.
--
-- The /business directory ranks drivers by a 0-100 score computed nightly
-- by /api/admin/b2b/recompute-scores. Top 10 per city are promoted to
-- 'top' tier (gold ribbon), 11-30 are 'standard', the rest are 'hidden'
-- (only visible when buyer taps "Show all"), low-quality drivers are
-- 'removed' (excluded from the page entirely).
--
-- business_enabled_at tracks when the driver FIRST enabled the B2B
-- toggle — used for the 30-day grace period (new drivers can't be
-- demoted while building reviews + tenure).
--
-- Honest design notes (PM 12/2019 directory posture):
--   - We rank voluntary listings on transparent metrics
--   - We do NOT assign work
--   - We do NOT penalise for missed platform-assigned jobs (no such jobs exist)
--   - Drivers see their own score + breakdown — no silent demotion
-- ============================================================================

alter table public.drivers
  add column if not exists b2b_score smallint
    check (b2b_score is null or (b2b_score >= 0 and b2b_score <= 100)),
  add column if not exists b2b_tier text
    check (b2b_tier is null or b2b_tier in ('top','standard','hidden','removed')),
  add column if not exists b2b_score_updated_at timestamptz,
  add column if not exists business_enabled_at timestamptz;

-- Backfill: any existing driver who already has business_contract_enabled=true
-- gets business_enabled_at = now() so they begin their 30-day grace clock.
update public.drivers
  set business_enabled_at = now()
  where business_contract_enabled = true and business_enabled_at is null;

-- Index: /business ordering query — tier asc (we want top first, but
-- we'll order by score desc within the tier filter so a btree on
-- (city, b2b_tier, b2b_score desc) is the ideal shape).
create index if not exists drivers_b2b_rank_idx
  on public.drivers (city, b2b_score desc nulls last)
  where business_contract_enabled = true and status = 'active';
