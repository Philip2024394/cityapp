-- ============================================================================
-- 0043_affiliate_banner_shares_brin.sql
-- ----------------------------------------------------------------------------
-- BRIN index on affiliate_banner_shares.created_at — speeds up:
--   1. unfiltered `group by date_trunc('day', created_at)` time-series queries
--   2. `where created_at >= sinceIso order by created_at desc limit ...`
--      the admin gateway already runs
--   3. `group by banner_id` global aggregations (the planner can use the
--      BRIN-ordered scan for the sort phase)
--
-- BRIN was chosen over BTREE because:
--   - rows are inserted in monotonically-increasing created_at order
--     (every insert is from a real-time event), so block-range summaries
--     give near-BTREE performance at a tiny fraction of the index size
--   - the table will grow to millions of rows; BRIN stays small
--
-- Idempotent.
-- ============================================================================

create index if not exists affiliate_banner_shares_created_brin
  on public.affiliate_banner_shares
  using brin (created_at);
