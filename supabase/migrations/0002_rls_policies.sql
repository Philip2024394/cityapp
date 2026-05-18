-- ============================================================================
-- City Rider — Row Level Security policies
-- ============================================================================
-- Identity model:
--   * auth.uid() is the authenticated user's profile id
--   * profiles.role determines what they can see/write
--   * Anonymous bookings: customer is NOT authenticated; trips inserted by
--     server-side route using the service-role key (bypasses RLS)
-- ============================================================================

-- Helper — is the caller an admin?
create or replace function public.is_admin() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$ language sql security definer stable;

-- Helper — is the caller a driver?
create or replace function public.is_driver() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'driver'
  )
$$ language sql security definer stable;

-- ============================================================================
-- PROFILES
-- ============================================================================
-- Authenticated user reads own profile; admin reads all
create policy profiles_select on public.profiles
  for select using (
    auth.uid() = id or public.is_admin()
  );

-- User updates own row (cannot change role to admin); admin updates anyone
create policy profiles_update on public.profiles
  for update using (
    auth.uid() = id or public.is_admin()
  )
  with check (
    auth.uid() = id or public.is_admin()
  );

-- Inserts happen via the on_auth_user_created trigger (security definer)
-- so no insert policy needed for end users.

-- ============================================================================
-- DRIVERS
-- ============================================================================
-- Public discovery: anyone (even anonymous) can read active rider profiles
create policy drivers_select_public on public.drivers
  for select using (
    status = 'active' or auth.uid() = user_id or public.is_admin()
  );

-- A driver creates their own row (during onboarding)
create policy drivers_insert_own on public.drivers
  for insert with check (
    auth.uid() = user_id and public.is_driver()
  );

-- A driver updates their own row; admin can update any (e.g. suspend)
create policy drivers_update on public.drivers
  for update using (
    auth.uid() = user_id or public.is_admin()
  )
  with check (
    auth.uid() = user_id or public.is_admin()
  );

-- Admin can delete (rare); driver soft-deletes by setting status='suspended'
create policy drivers_delete_admin on public.drivers
  for delete using (public.is_admin());

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
-- Driver reads own subscription; admin reads all
create policy subscriptions_select on public.subscriptions
  for select using (
    auth.uid() = driver_id or public.is_admin()
  );

-- Only admin writes subscriptions (MVP: manual billing flag)
-- The server-role key bypasses RLS for the on_driver_created trigger to seed trial.
create policy subscriptions_admin_write on public.subscriptions
  for all using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- TRIPS
-- ============================================================================
-- Reads:
--   * Authenticated customer reads own trips (by user_id link)
--   * Driver reads trips assigned to them
--   * Admin reads all
--   * Anonymous customers retrieve their own trip via a signed token (server-only)
create policy trips_select on public.trips
  for select using (
    auth.uid() = customer_user_id
    or auth.uid() = driver_id
    or public.is_admin()
  );

-- Inserts:
--   * Authenticated customer creates a trip for themselves (must set customer_user_id)
--   * Anonymous bookings happen via server-side route using service_role (bypasses RLS)
--   * Admin can create on behalf of anyone
create policy trips_insert_own on public.trips
  for insert with check (
    auth.uid() = customer_user_id
    or public.is_admin()
  );

-- Updates:
--   * Driver updates own trip (accept/decline/status transitions)
--   * Customer updates own trip (cancel before acceptance, mark paid, rate)
--   * Admin updates anything
create policy trips_update on public.trips
  for update using (
    auth.uid() = driver_id
    or auth.uid() = customer_user_id
    or public.is_admin()
  )
  with check (
    auth.uid() = driver_id
    or auth.uid() = customer_user_id
    or public.is_admin()
  );

-- ============================================================================
-- TRIP EVENTS — read mirrors the parent trip; writes via service-role only
-- ============================================================================
create policy trip_events_select on public.trip_events
  for select using (
    exists (
      select 1 from public.trips t
      where t.id = trip_events.trip_id
      and (
        auth.uid() = t.customer_user_id
        or auth.uid() = t.driver_id
      )
    )
    or public.is_admin()
  );

-- All trip_events inserts are made by server-side routes using the
-- service_role key (so they bypass RLS). Admin can also write directly.
create policy trip_events_insert_admin on public.trip_events
  for insert with check (public.is_admin());

-- ============================================================================
-- AUDIT LOG — admin only
-- ============================================================================
create policy audit_log_admin_only on public.audit_log
  for all using (public.is_admin())
  with check (public.is_admin());
