-- ============================================================================
-- 0040_owner_delete_policies.sql
-- ----------------------------------------------------------------------------
-- Owners need a way to delete their own listings from their dashboard.
-- bike_rentals + tour_guide_listings were missing DELETE RLS policies,
-- so the existing PATCH (edit) flow was the only way to mutate a row
-- short of asking admin. This adds owner-scoped DELETE for both.
--
-- Admin can still delete anything via the service role.
-- ============================================================================

drop policy if exists "bike_rentals_owner_delete_own" on public.bike_rentals;
create policy "bike_rentals_owner_delete_own"
  on public.bike_rentals for delete
  to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists "tgl_owner_delete_own" on public.tour_guide_listings;
create policy "tgl_owner_delete_own"
  on public.tour_guide_listings for delete
  to authenticated
  using (owner_user_id = auth.uid());
