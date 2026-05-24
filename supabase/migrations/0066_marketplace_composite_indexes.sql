-- ============================================================================
-- 0066 — Composite indexes for marketplace queries (drivers / rentals / tour)
-- ----------------------------------------------------------------------------
-- Schema audit flagged that drivers, bike_rentals, and tour_guide_listings
-- were missing the canonical `(status, availability, city) where status='active'`
-- composite index used by the 5 newer provider tables. Marketplace queries
-- always filter status='active' + availability + optional city; without
-- the composite Postgres has to do bitmap-merge of separate per-column
-- indexes, which is fine at low scale but bloats with traffic.
--
-- Existing indexes (kept for backwards compat with non-city queries):
--   drivers_active_idx              (status, availability) where status='active'
--   drivers_city_idx                (city)
--   bike_rentals … (city, status)
--   tour_guide_listings … (city, status)
-- ============================================================================

-- ── 1. DRIVERS ─────────────────────────────────────────────────────────────
create index if not exists idx_drivers_listing
  on public.drivers (status, availability, city)
  where status = 'active';

-- ── 2. BIKE_RENTALS ────────────────────────────────────────────────────────
-- bike_rentals.status uses 'approved' lifecycle (mig 0008:76-77), not 'active'.
create index if not exists idx_rentals_listing
  on public.bike_rentals (status, available_now, city)
  where status = 'approved';

-- ── 3. TOUR_GUIDE_LISTINGS ─────────────────────────────────────────────────
-- availability was added in 0054 but no composite landed with it.
create index if not exists idx_tour_guide_listing
  on public.tour_guide_listings (status, availability, city)
  where status = 'approved';
-- tour_guide_listings uses status='approved' lifecycle, not 'active'.
-- The partial predicate must match to be useful; verified against
-- migration 0037 (`check (status in ('pending','approved','rejected', ...))`).

-- ============================================================================
-- POST-CONDITION
--   Marketplace city-scoped queries are now index-only scans:
--     SELECT … FROM drivers WHERE status='active' AND availability='online'
--              AND city='Yogyakarta'
--   Before: bitmap-merge of drivers_active_idx + drivers_city_idx.
--   After:  single index range scan on idx_drivers_listing.
-- ============================================================================
