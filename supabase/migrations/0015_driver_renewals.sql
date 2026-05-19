-- ============================================================================
-- 0015_driver_renewals.sql
-- ----------------------------------------------------------------------------
-- Per-driver renewal calendar — SIM C, STNK, PKB (vehicle tax), BPJS
-- Kesehatan, BPJS Ketenagakerjaan, Pramuwisata (Bali tour-driver).
-- Single row per driver; driver fills in whichever dates they have.
--
-- Strictly the driver's own bookkeeping — platform never checks
-- whether the dates are real, never auto-suspends a driver whose
-- date has lapsed. Same legal model as the rides log: we provide
-- the form, the driver is the record-of-authority.
-- ============================================================================

create table if not exists public.driver_renewals (
  driver_user_id          uuid primary key
                          references public.drivers(user_id) on delete cascade,
  sim_c_expires_on        date,
  stnk_expires_on         date,
  pkb_due_on              date,  -- annual vehicle tax due date
  bpjs_kes_paid_until     date,
  bpjs_tk_paid_until      date,
  pramuwisata_expires_on  date,
  updated_at              timestamptz not null default now()
);

-- Auto-bump updated_at (reuses set_updated_at trigger from 0011)
drop trigger if exists driver_renewals_set_updated_at on public.driver_renewals;
create trigger driver_renewals_set_updated_at
  before update on public.driver_renewals
  for each row execute function public.set_updated_at();

alter table public.driver_renewals enable row level security;

-- ──────────────────────────────────────────────────────────────────────
-- Owner-only access — driver reads, inserts, updates ONLY their own
-- row. No public read. UU PDP — these dates are personal data.
-- ──────────────────────────────────────────────────────────────────────
drop policy if exists "renewals_owner_select" on public.driver_renewals;
create policy "renewals_owner_select"
  on public.driver_renewals for select
  to authenticated
  using (driver_user_id = auth.uid());

drop policy if exists "renewals_owner_insert" on public.driver_renewals;
create policy "renewals_owner_insert"
  on public.driver_renewals for insert
  to authenticated
  with check (driver_user_id = auth.uid());

drop policy if exists "renewals_owner_update" on public.driver_renewals;
create policy "renewals_owner_update"
  on public.driver_renewals for update
  to authenticated
  using       (driver_user_id = auth.uid())
  with check  (driver_user_id = auth.uid());
