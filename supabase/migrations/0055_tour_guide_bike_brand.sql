-- ============================================================================
-- 0055 — Tour guide bike brand
-- ----------------------------------------------------------------------------
-- Shows above the daily price on the marketplace card. Most Indonesian
-- tour guides use Honda — that's the default — but they can change it
-- on the dashboard. Mocks get a mix so the UI shows both.
-- ============================================================================

alter table public.tour_guide_listings
  add column if not exists bike_brand text not null default 'Honda';

alter table public.mock_tour_guide_listings
  add column if not exists bike_brand text not null default 'Honda';

update public.mock_tour_guide_listings set bike_brand = 'Yamaha'
  where slug in ('demo-ketut-volcano', 'demo-pak-eko-batik');
