-- ============================================================================
-- 0044 — Partner Program
-- ----------------------------------------------------------------------------
-- Hotels / villas / restaurants etc. join the program (free), get a unique
-- QR code, and earn an 8% commission when their guests scan and book a
-- City Rider. Driver pays the partner DIRECTLY (cash / GoPay / transfer);
-- the platform never touches the money (per 0001 invariant).
--
-- LEGAL POSTURE (Perpres 27/2026, signed 1 May 2026):
--   The 8% cap applies to the *aplikator's* deduction from fares. Here
--   the platform takes 0%. The 8% is a B2B referral commission between
--   driver and partner, recorded by our ledger but transferred outside
--   our system. We are a PSE (electronic system operator), not a
--   Penyelenggara Angkutan (transport operator). See claude.md history.
--
-- ENFORCEMENT MODEL:
--   Driver settles each booking with the partner within 7 days. Unpaid
--   bookings past due → suspend_delinquent_partner_drivers() flips the
--   driver's partner_program_status to 'suspended' → no more partner-QR
--   guests will be matched until balance cleared by the partner.
-- ============================================================================

-- =============================================================================
-- 1. PARTNERS — hotels / villas / etc.
-- =============================================================================
create table if not exists public.partners (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  partner_type      text not null default 'hotel'
                    check (partner_type in ('hotel','villa','restaurant','cafe','spa','tour_operator','other')),

  -- contact + location
  contact_email     text not null,
  contact_phone     text,
  contact_whatsapp  text,
  address           text,
  city              text,
  lat               double precision,
  lng               double precision,

  -- ownership — one user per partner (v1)
  owner_user_id     uuid references auth.users(id) on delete set null,

  -- commission policy (capped at 15% just in case a partner tries to abuse)
  commission_rate   numeric(5,4) not null default 0.08
                    check (commission_rate >= 0 and commission_rate <= 0.15),

  status            text not null default 'pending'
                    check (status in ('pending','active','suspended','removed')),
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_partners_owner
  on public.partners (owner_user_id)
  where owner_user_id is not null;

create index if not exists idx_partners_active_slug
  on public.partners (slug)
  where status = 'active';

-- =============================================================================
-- 2. PARTNER_BOOKINGS — one row per attributed booking
-- =============================================================================
create table if not exists public.partner_bookings (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid not null references public.partners(id) on delete cascade,
  driver_user_id  uuid not null references public.drivers(user_id) on delete cascade,

  -- ride snapshot (rides aren't always persisted; we keep our own copy)
  pickup_name     text,
  dropoff_name    text,
  service_type    text,
  fare_idr        integer not null check (fare_idr >= 0),
  commission_idr  integer not null check (commission_idr >= 0),

  -- rider attribution (anonymous — we only have the localStorage session id)
  rider_anon_id   text,

  -- settlement state — driver pays partner OUTSIDE our system, partner
  -- marks "settled" in their dashboard. We are the ledger only.
  status          text not null default 'pending'
                  check (status in ('pending','settled','disputed','waived')),
  settled_at      timestamptz,
  settled_by      uuid references auth.users(id),
  dispute_reason  text,

  created_at      timestamptz not null default now(),
  due_at          timestamptz not null default (now() + interval '7 days')
);

create index if not exists idx_pb_partner_status
  on public.partner_bookings (partner_id, status, created_at desc);
create index if not exists idx_pb_driver_status
  on public.partner_bookings (driver_user_id, status, due_at);
create index if not exists idx_pb_overdue
  on public.partner_bookings (driver_user_id, due_at)
  where status = 'pending';

-- =============================================================================
-- 3. DRIVERS — partner program eligibility columns
-- =============================================================================
alter table public.drivers
  add column if not exists partner_program_status text not null default 'eligible'
    check (partner_program_status in ('eligible','suspended','opted_out'));
alter table public.drivers
  add column if not exists partner_suspended_at      timestamptz;
alter table public.drivers
  add column if not exists partner_suspended_reason  text;

-- =============================================================================
-- 4. UPDATED_AT TRIGGER
-- =============================================================================
create or replace function public.touch_partners_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_partners on public.partners;
create trigger trg_touch_partners
before update on public.partners
for each row execute function public.touch_partners_updated_at();

-- =============================================================================
-- 5. RLS POLICIES
-- =============================================================================
alter table public.partners         enable row level security;
alter table public.partner_bookings enable row level security;

-- Public read of active partners (for the /p/[slug] landing page lookup).
drop policy if exists partners_public_read on public.partners;
create policy partners_public_read on public.partners
  for select using (status = 'active');

-- Owner full control over their own partner row.
drop policy if exists partners_owner_full on public.partners;
create policy partners_owner_full on public.partners
  for all using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- Partner owner OR driver can see bookings they're a party to.
drop policy if exists pb_partner_read on public.partner_bookings;
create policy pb_partner_read on public.partner_bookings
  for select using (
    exists (
      select 1 from public.partners p
      where p.id = partner_bookings.partner_id
        and p.owner_user_id = auth.uid()
    )
    or driver_user_id = auth.uid()
  );

-- Partner owner can update (mark settled / disputed). Inserts go through
-- the service role from /api/contact/ping (we never let drivers or
-- guests write partner_bookings directly).
drop policy if exists pb_partner_settle on public.partner_bookings;
create policy pb_partner_settle on public.partner_bookings
  for update using (
    exists (
      select 1 from public.partners p
      where p.id = partner_bookings.partner_id
        and p.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.partners p
      where p.id = partner_bookings.partner_id
        and p.owner_user_id = auth.uid()
    )
  );

-- =============================================================================
-- 6. SUSPEND DELINQUENT DRIVERS — call from weekly cron
-- =============================================================================
create or replace function public.suspend_delinquent_partner_drivers()
returns integer language plpgsql security definer as $$
declare
  affected integer := 0;
begin
  update public.drivers d
  set partner_program_status   = 'suspended',
      partner_suspended_at     = now(),
      partner_suspended_reason = 'Outstanding partner commissions overdue (>7 days)'
  where d.partner_program_status = 'eligible'
    and exists (
      select 1 from public.partner_bookings b
      where b.driver_user_id = d.user_id
        and b.status = 'pending'
        and b.due_at < now()
    );
  get diagnostics affected = row_count;
  return affected;
end;
$$;

comment on function public.suspend_delinquent_partner_drivers is
  'Weekly cron: POST /api/cron/partner-suspend with header x-cron-secret. Suspends drivers with overdue partner bookings.';
