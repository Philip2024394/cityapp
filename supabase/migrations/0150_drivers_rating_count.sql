-- ============================================================================
-- 0150 — Add rating_count to drivers
-- ----------------------------------------------------------------------------
-- The car + rider dashboards (and their /stats subpages) display "N reviews"
-- alongside the average rating. Other vertical tables (beautician_providers,
-- massage_providers, handyman_providers, etc.) already have rating_count;
-- drivers never got the column. Without it, .select(...) calls fail with:
--   "column drivers.rating_count does not exist"
--
-- Default 0 — counts increment as customer reviews land via /api/reviews.
-- ============================================================================

alter table public.drivers
  add column if not exists rating_count integer not null default 0
    check (rating_count >= 0);

comment on column public.drivers.rating_count is
  'Total number of customer reviews for this driver. Increments via /api/reviews.';
