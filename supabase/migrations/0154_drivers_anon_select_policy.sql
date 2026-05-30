-- ============================================================================
-- 0154 — Add SELECT RLS policy on drivers for anon (marketplace read)
-- ----------------------------------------------------------------------------
-- 0153 added GRANT SELECT but the drivers table has RLS enabled with NO
-- SELECT policy that includes anon — so reads silently filter to zero
-- rows. The /cari booking page is a public marketplace; unauthenticated
-- visitors must be able to read the active driver list (through the
-- drivers_public view, which omits payment columns).
--
-- Policy scope: only `status='active'` rows. Inactive / removed / pending
-- drivers stay hidden from the public marketplace. Authenticated drivers
-- can still see their own row via the (existing) drivers_update policy
-- which has its own USING clause for self.
-- ============================================================================

drop policy if exists drivers_marketplace_read on public.drivers;

create policy drivers_marketplace_read on public.drivers
  for select
  to anon, authenticated
  using (status = 'active');

-- ============================================================================
-- POST-CONDITIONS
--   • anon + authenticated can SELECT active drivers (drivers_public view
--     now resolves properly since the underlying table allows the read).
--   • Inactive / pending / removed rows remain hidden from anon.
-- ============================================================================
