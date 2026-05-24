-- ============================================================================
-- 0053 — Tour guide fuel_included flag
-- ----------------------------------------------------------------------------
-- Drives the "Fuel Included" / "Fuel Excluded" pill on the tour-guide
-- card. Defaults to false because most independent guides charge fuel
-- separately (typically Rp 30–50k for a day tour).
-- ============================================================================

alter table public.tour_guide_listings
  add column if not exists fuel_included boolean not null default false;

alter table public.mock_tour_guide_listings
  add column if not exists fuel_included boolean not null default false;

-- Seed some variety into the existing mocks so the UI shows both states.
update public.mock_tour_guide_listings set fuel_included = true
  where slug in ('demo-made-bali-temples', 'demo-yusuf-jogja-history');
