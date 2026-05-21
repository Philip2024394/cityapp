-- ============================================================================
-- 0034_account_type_and_rental_company.sql
-- ----------------------------------------------------------------------------
-- Two account types live on the City Rider auth users:
--
--   * 'personal'        (default) — can use bike booking, food, parcel AND
--                                    list 1 bike rental for free.
--   * 'rental_company'  (paid)    — unlimited bike-rental listings, but
--                                    LOCKED OUT of cari/food/parcel. Paid
--                                    via Midtrans Snap (Rp 38K/mo or
--                                    Rp 350K/yr — same flat StreetLocal
--                                    pricing as the driver subscription).
--
-- This migration:
--   1. Creates `user_accounts` (1:1 with auth.users)
--   2. Adds the rental_company product values to payment_intents
--   3. Wires a NEW trigger that extends user_accounts on rental_company
--      settlement (separate from the driver-subscription trigger so the
--      two flows stay decoupled)
--   4. Drops the strict FK payment_intents.driver_user_id → drivers so
--      a rental-company owner (NOT a driver) can also pay through the
--      same payments pipeline. FK is replaced with FK to auth.users.
--   5. Adds owner_user_id index on bike_rentals for the quota lookup
--   6. Adds 'paused' to the bike_rentals.status enum so we can pause
--      a company's listings when their subscription lapses
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────
-- user_accounts — 1:1 with auth.users
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.user_accounts (
  user_id                  uuid primary key references auth.users(id) on delete cascade,

  account_type             text not null default 'personal'
                           check (account_type in ('personal','rental_company')),

  subscription_status      text not null default 'inactive'
                           check (subscription_status in ('inactive','active','expired')),
  subscription_plan        text check (subscription_plan in ('monthly','yearly')),
  subscription_started_at  timestamptz,
  subscription_expires_at  timestamptz,

  -- After admin approves the company's first listing we flip this to true
  -- and subsequent submits auto-approve. Defaults to false on signup.
  trusted                  boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists ua_subscription_idx
  on public.user_accounts (account_type, subscription_status);

alter table public.user_accounts enable row level security;

-- Owner reads its own row only.
drop policy if exists "ua_owner_select" on public.user_accounts;
create policy "ua_owner_select"
  on public.user_accounts for select
  to authenticated
  using (user_id = auth.uid());

-- All writes via service role (signup trigger, payment webhook, admin).

drop trigger if exists ua_set_updated_at on public.user_accounts;
create trigger ua_set_updated_at
  before update on public.user_accounts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- Auto-create user_accounts row on new auth.users signup
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.create_user_account_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists users_create_account on auth.users;
create trigger users_create_account
  after insert on auth.users
  for each row execute function public.create_user_account_on_signup();

-- Backfill any existing users so the dashboard + RLS keys work today.
insert into public.user_accounts (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────
-- payment_intents — open up to rental_company products + drop driver FK
-- ─────────────────────────────────────────────────────────────────────
-- Allow rental_company owners (who don't have a drivers row) to settle
-- payments through the same pipeline. We keep the column name
-- `driver_user_id` for back-compat with existing code; semantically it
-- is now `auth.users.id`.
alter table public.payment_intents
  drop constraint if exists payment_intents_driver_user_id_fkey;

alter table public.payment_intents
  add constraint payment_intents_driver_user_id_fkey
  foreign key (driver_user_id) references auth.users(id) on delete cascade;

-- Add the two rental_company products to the check constraint.
alter table public.payment_intents
  drop constraint if exists payment_intents_product_check;

alter table public.payment_intents
  add constraint payment_intents_product_check
  check (product in (
    'subscription',
    'subscription_yearly',
    'verified',
    'rental_company_monthly',
    'rental_company_yearly'
  ));

-- ─────────────────────────────────────────────────────────────────────
-- Existing driver-subscription trigger must IGNORE rental_company
-- products (those drivers don't have a public.subscriptions row).
-- We rewrite the function with an early-return guard.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.extend_subscription_on_payment()
returns trigger
language plpgsql
security definer
as $$
declare
  v_basis timestamptz;
begin
  if new.status <> 'paid' or old.status = 'paid' then
    return new;
  end if;

  -- Skip rental_company products — handled by its own trigger below.
  if new.product in ('rental_company_monthly','rental_company_yearly') then
    return new;
  end if;

  select coalesce(current_period_end, now())
    into v_basis
  from public.subscriptions
  where driver_id = new.driver_user_id
  for update;

  if v_basis < now() then v_basis := now(); end if;

  update public.subscriptions
  set status            = 'active',
      current_period_end = v_basis + (new.extends_days || ' days')::interval,
      amount_idr         = greatest(amount_idr, new.amount_idr),
      payment_reference  = new.provider_txn_id,
      updated_at         = now()
  where driver_id = new.driver_user_id;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- NEW: rental_company subscription extension on payment
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.extend_rental_company_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_basis timestamptz;
  v_plan  text;
begin
  if new.status <> 'paid' or old.status = 'paid' then
    return new;
  end if;

  if new.product not in ('rental_company_monthly','rental_company_yearly') then
    return new;
  end if;

  v_plan := case
    when new.product = 'rental_company_yearly' then 'yearly'
    else 'monthly'
  end;

  -- Ensure the user_accounts row exists (signup trigger should have done it
  -- but be defensive — service role can be used pre-signup in tests).
  insert into public.user_accounts (user_id)
  values (new.driver_user_id)
  on conflict (user_id) do nothing;

  -- Basis: later of current expiry or now()
  select coalesce(subscription_expires_at, now())
    into v_basis
  from public.user_accounts
  where user_id = new.driver_user_id
  for update;

  if v_basis < now() then v_basis := now(); end if;

  update public.user_accounts
  set account_type            = 'rental_company',
      subscription_status     = 'active',
      subscription_plan       = v_plan,
      subscription_started_at = coalesce(subscription_started_at, now()),
      subscription_expires_at = v_basis + (new.extends_days || ' days')::interval,
      updated_at              = now()
  where user_id = new.driver_user_id;

  -- When a company comes back from a lapse, un-pause any of their listings
  -- that were paused due to the lapse so they go live again immediately.
  update public.bike_rentals
  set status     = 'approved',
      updated_at = now()
  where owner_user_id = new.driver_user_id
    and status        = 'paused';

  return new;
end;
$$;

drop trigger if exists pi_extend_rental_company on public.payment_intents;
create trigger pi_extend_rental_company
  after update of status on public.payment_intents
  for each row
  when (new.status = 'paid')
  execute function public.extend_rental_company_on_payment();

-- ─────────────────────────────────────────────────────────────────────
-- bike_rentals — add 'paused' status, owner index for quota lookup
-- ─────────────────────────────────────────────────────────────────────
alter table public.bike_rentals
  drop constraint if exists bike_rentals_status_check;

alter table public.bike_rentals
  add constraint bike_rentals_status_check
  check (status in ('pending','approved','rejected','suspended','paused'));

create index if not exists bike_rentals_owner_status_idx
  on public.bike_rentals (owner_user_id, status);
