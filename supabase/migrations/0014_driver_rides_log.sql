-- ============================================================================
-- 0014_driver_rides_log.sql
-- ----------------------------------------------------------------------------
-- Driver-self-entered ride log. This is intentionally NOT a trip table —
-- the platform never auto-inserts rows. Only the driver writes to it,
-- after their ride happens, as bookkeeping for their own tax / police /
-- insurance records. Same legal model as a freelancer keeping their
-- own invoice log; the platform provides the form but is not the
-- record of authority.
--
-- Why we built this AFTER dropping trips/trip_events:
--   Driver still has independent legal duties:
--     * NPWP / Pajak Penghasilan — income records for DJP
--     * Police questioning about a specific date / customer
--     * Insurance claim paperwork
--     * If they're a registered ojol with Kemenhub, PM 12/2019 may
--       require them (not us) to maintain operational data
--
-- Privacy (UU PDP):
--   * customer_name and customer_phone are optional — driver enters
--     them only if THEY want them on record. We don't ask, don't
--     show on any public surface.
--   * Strict RLS — driver reads only their own rows, public reads
--     nothing. Admin reads all for support cases only.
-- ============================================================================

create table if not exists public.driver_rides_log (
  id              uuid primary key default gen_random_uuid(),
  driver_user_id  uuid not null references public.drivers(user_id) on delete cascade,

  -- When the ride happened (date only — driver's local date)
  ride_date       date not null default current_date,

  -- Endpoints (driver fills as much as they remember / care to record)
  pickup_label    text check (char_length(pickup_label) <= 200),
  dropoff_label   text check (char_length(dropoff_label) <= 200),
  pitstop_note    text check (char_length(pitstop_note) <= 200),

  -- Customer details — OPTIONAL. Driver enters only if they want them
  -- on record (e.g. for a repeat customer or dispute reference).
  customer_name   text check (char_length(customer_name) <= 80),
  customer_phone  text check (char_length(customer_phone) <= 30),

  -- Trip context
  service         text check (service in ('person','parcel','food','tour','other')),
  distance_km     numeric(6,2),
  amount_idr      int not null default 0 check (amount_idr >= 0),

  -- Free-text notes (anything else the driver wants to remember)
  notes           text check (char_length(notes) <= 600),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Hot query: "this month's rides" for the operations dashboard
create index if not exists rides_log_driver_date_idx
  on public.driver_rides_log (driver_user_id, ride_date desc);

-- Auto-bump updated_at on edit (re-uses the trigger function from 0011)
drop trigger if exists rides_log_set_updated_at on public.driver_rides_log;
create trigger rides_log_set_updated_at
  before update on public.driver_rides_log
  for each row execute function public.set_updated_at();

alter table public.driver_rides_log enable row level security;

-- ──────────────────────────────────────────────────────────────────────
-- Owner-only access — driver reads, inserts, updates, deletes ONLY
-- their own rows. No public read. No anonymous access. This is the
-- driver's private bookkeeping.
-- ──────────────────────────────────────────────────────────────────────
drop policy if exists "rides_log_owner_select" on public.driver_rides_log;
create policy "rides_log_owner_select"
  on public.driver_rides_log for select
  to authenticated
  using (driver_user_id = auth.uid());

drop policy if exists "rides_log_owner_insert" on public.driver_rides_log;
create policy "rides_log_owner_insert"
  on public.driver_rides_log for insert
  to authenticated
  with check (driver_user_id = auth.uid());

drop policy if exists "rides_log_owner_update" on public.driver_rides_log;
create policy "rides_log_owner_update"
  on public.driver_rides_log for update
  to authenticated
  using       (driver_user_id = auth.uid())
  with check  (driver_user_id = auth.uid());

drop policy if exists "rides_log_owner_delete" on public.driver_rides_log;
create policy "rides_log_owner_delete"
  on public.driver_rides_log for delete
  to authenticated
  using (driver_user_id = auth.uid());
