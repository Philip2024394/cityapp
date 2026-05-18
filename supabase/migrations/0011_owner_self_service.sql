-- ============================================================================
-- 0011_owner_self_service.sql
-- ----------------------------------------------------------------------------
-- Phase 5 — owner self-service for places + bike_rentals.
--
-- Before this migration:
--   * Submissions were ANONYMOUS — owner_user_id stayed NULL forever.
--   * Owners could not edit their own listing after submission.
--   * Only admin moderation could touch a row post-submission.
--
-- After this migration:
--   * Authed submissions populate owner_user_id = auth.uid().
--   * Owners with auth.uid() = owner_user_id can SELECT + UPDATE their own
--     rows (subject to the safe-fields restriction below).
--   * Owners CANNOT change status / paid_until / listing_tier / verified —
--     moderation stays admin-only via service-role.
--   * Anonymous (legacy) submissions are still allowed for backwards
--     compatibility; they remain owner-less and only admin can edit them.
--
-- Idempotent: every CREATE has a matching DROP IF EXISTS first.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. AUTHED INSERT POLICIES — populate owner_user_id from session
-- ──────────────────────────────────────────────────────────────────────────

drop policy if exists "places_authed_submit" on places;
create policy "places_authed_submit"
  on places for insert
  to authenticated
  with check (
    status = 'pending'
    and owner_user_id = auth.uid()
    and city in (select city from city_zones)
  );

drop policy if exists "bike_rentals_authed_submit" on bike_rentals;
create policy "bike_rentals_authed_submit"
  on bike_rentals for insert
  to authenticated
  with check (
    status = 'pending'
    and owner_user_id = auth.uid()
    and city in (select city from city_zones)
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 2. OWNER SELECT POLICIES — read own rows regardless of status
--    (public read of status='approved' rows is already granted in 0005/0008)
-- ──────────────────────────────────────────────────────────────────────────

drop policy if exists "places_owner_read_own" on places;
create policy "places_owner_read_own"
  on places for select
  to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists "bike_rentals_owner_read_own" on bike_rentals;
create policy "bike_rentals_owner_read_own"
  on bike_rentals for select
  to authenticated
  using (owner_user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- 3. OWNER UPDATE POLICIES — edit own rows, BUT moderation columns are
--    frozen. The WITH CHECK clause enforces that the *new* row preserves
--    the existing status/paid_until/listing_tier/verified values, so even
--    if a malicious client patches them client-side, the row is rejected.
--    Only the service-role can mutate those fields (via /api/admin/*).
-- ──────────────────────────────────────────────────────────────────────────

drop policy if exists "places_owner_update_own" on places;
create policy "places_owner_update_own"
  on places for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (
    owner_user_id = auth.uid()
    and status        = (select p.status        from places p where p.id = places.id)
    and listing_tier  = (select p.listing_tier  from places p where p.id = places.id)
    and paid_until    is not distinct from (select p.paid_until from places p where p.id = places.id)
    and verified      = (select p.verified      from places p where p.id = places.id)
  );

drop policy if exists "bike_rentals_owner_update_own" on bike_rentals;
create policy "bike_rentals_owner_update_own"
  on bike_rentals for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (
    owner_user_id = auth.uid()
    and status        = (select r.status        from bike_rentals r where r.id = bike_rentals.id)
    and listing_tier  = (select r.listing_tier  from bike_rentals r where r.id = bike_rentals.id)
    and paid_until    is not distinct from (select r.paid_until from bike_rentals r where r.id = bike_rentals.id)
    and verified      = (select r.verified      from bike_rentals r where r.id = bike_rentals.id)
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 4. DEDUP — block obvious spam: one PENDING listing per (owner, city)
--    Approved/rejected/suspended rows are unrestricted (an owner may
--    legitimately operate multiple shops in the same city). This only
--    catches "submit, wait, submit again" flooding of the moderation queue.
-- ──────────────────────────────────────────────────────────────────────────

create unique index if not exists places_one_pending_per_owner_city_idx
  on places (owner_user_id, city)
  where status = 'pending' and owner_user_id is not null;

create unique index if not exists bike_rentals_one_pending_per_owner_city_idx
  on bike_rentals (owner_user_id, city)
  where status = 'pending' and owner_user_id is not null;

-- ──────────────────────────────────────────────────────────────────────────
-- 5. updated_at TRIGGERS — keep updated_at fresh on owner edits so
--    /dashboard/places + /dashboard/rentals can show "Last edited".
-- ──────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists places_set_updated_at on places;
create trigger places_set_updated_at
  before update on places
  for each row execute function public.set_updated_at();

drop trigger if exists bike_rentals_set_updated_at on bike_rentals;
create trigger bike_rentals_set_updated_at
  before update on bike_rentals
  for each row execute function public.set_updated_at();
