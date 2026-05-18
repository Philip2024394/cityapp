-- ============================================================================
-- 0012_driver_places.sql
-- ----------------------------------------------------------------------------
-- The content graph that bridges Layer 1 (driver storefront) ↔ Layer 2
-- (community discovery).
--
-- Each driver curates up to 10 places they recommend to customers. On
-- their public page these render as a "My favourite places" grid; on the
-- place page they render as "Tour this place with one of these drivers."
--
-- App-level cap of 10 places per driver is enforced in the
-- /api/driver-places PATCH handler. The schema itself only enforces the
-- shape (display_order 0–9, primary key dedup, FKs).
-- ============================================================================

create table if not exists public.driver_places (
  driver_user_id  uuid not null
                  references public.drivers(user_id) on delete cascade,
  place_id        uuid not null
                  references public.places(id)      on delete cascade,
  note            text,                                 -- "Best at sunset, go before 5pm"
  display_order   smallint not null default 0
                  check (display_order between 0 and 9),
  created_at      timestamptz not null default now(),
  primary key (driver_user_id, place_id)
);

-- Hot query: rendering a place page's "drivers who tour here" list
create index if not exists driver_places_place_order_idx
  on public.driver_places (place_id, display_order);

-- Hot query: rendering a driver page's favourite places, in order
create index if not exists driver_places_driver_order_idx
  on public.driver_places (driver_user_id, display_order);

alter table public.driver_places enable row level security;

-- ──────────────────────────────────────────────────────────────────────
-- Public read — everyone can see which places a driver recommends.
-- This is essential for both Layer 1 (driver page rendering) and
-- Layer 2 (place page driver list).
-- ──────────────────────────────────────────────────────────────────────
drop policy if exists "driver_places_public_read" on public.driver_places;
create policy "driver_places_public_read"
  on public.driver_places for select
  using (true);

-- ──────────────────────────────────────────────────────────────────────
-- Authed write — drivers manage their own list. Insert, update, delete
-- all gated on auth.uid() = driver_user_id.
-- ──────────────────────────────────────────────────────────────────────
drop policy if exists "driver_places_owner_insert" on public.driver_places;
create policy "driver_places_owner_insert"
  on public.driver_places for insert
  to authenticated
  with check (driver_user_id = auth.uid());

drop policy if exists "driver_places_owner_update" on public.driver_places;
create policy "driver_places_owner_update"
  on public.driver_places for update
  to authenticated
  using       (driver_user_id = auth.uid())
  with check  (driver_user_id = auth.uid());

drop policy if exists "driver_places_owner_delete" on public.driver_places;
create policy "driver_places_owner_delete"
  on public.driver_places for delete
  to authenticated
  using (driver_user_id = auth.uid());
