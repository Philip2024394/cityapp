-- ============================================================================
-- 0148 — Loosen connection_intent + push_subscriptions FKs to auth.users
-- ----------------------------------------------------------------------------
-- 0146 created these tables with FKs against public.drivers because the
-- alert system was CityRiders-only. 0147 expanded the feature to every
-- vertical (beautician, handyman, laundry, …) where the provider rows
-- live in different tables. The unifying identity is auth.users.id — so
-- we retarget the FKs there.
--
-- The column NAME stays `driver_id` to avoid breaking the existing
-- inserts, RLS policies, and Realtime channel name `driver:<id>`. The
-- comment below reflects the semantic change.
-- ============================================================================

alter table public.connection_intent
  drop constraint if exists connection_intent_driver_id_fkey;
alter table public.connection_intent
  add constraint connection_intent_driver_id_fkey
  foreign key (driver_id) references auth.users(id) on delete cascade;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_driver_id_fkey;
alter table public.push_subscriptions
  add constraint push_subscriptions_driver_id_fkey
  foreign key (driver_id) references auth.users(id) on delete cascade;

comment on column public.connection_intent.driver_id is
  'Provider user_id (auth.users.id). Service provider across any '
  'vertical — beautician / handyman / laundry / massage / etc. — not '
  'specifically a ride driver. Column name kept for historical '
  'compatibility (Realtime channel name + existing inserts).';

comment on column public.push_subscriptions.driver_id is
  'Provider user_id (auth.users.id). Any vertical.';

-- ============================================================================
-- POST-CONDITIONS
--   • FKs now point to auth.users so non-driver verticals can insert
-- ============================================================================
