-- ============================================================================
-- 0037_tour_guide_listings.sql
-- ----------------------------------------------------------------------------
-- New richer Tour Guide listing model (one /tour profile per user) plus
-- a paid subscription path for standalone tour guides who aren't City
-- Rider drivers. Mirrors the rental_company architecture from 0034.
--
-- Entitlement rule for "can I create a tour guide listing?":
--   1. The user has an active driver subscription (subscriptions.status
--      = 'active' AND current_period_end > now()) — drivers already pay
--      Rp 38K/mo and tour guide listing is included as a bonus, OR
--   2. The user has an active standalone tour_guide subscription
--      (user_accounts.tour_guide_status = 'active' AND
--       tour_guide_expires_at > now()) — pays Rp 38K/mo or Rp 350K/yr.
--
-- Quota: 1 active tour_guide_listing per owner (DB-enforced via unique
-- index on owner_user_id). Upgrades to multi-listing can come later.
--
-- LEGACY POSTURE: the existing drivers.tour_guide_enabled + tour_guide_*
-- columns (migration 0029) and the /places "Tour Guide" tab keep working
-- exactly as they do today. This migration adds a parallel richer path
-- (services multi-pick, hero overlay) under /tour without disturbing it.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────
-- tour_guide_listings — one per user
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.tour_guide_listings (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  owner_user_id   uuid not null references auth.users(id) on delete cascade,

  -- Identity
  name            text not null,
  whatsapp_e164   text not null,
  email           text,

  -- Location
  city            text not null,
  address         text,
  lat             numeric,
  lng             numeric,
  location        geography(POINT, 4326),

  -- Services — max 3, app-enforced. Allowed values are open by design so
  -- we can add new categories without a migration; the form constraints
  -- it to the canonical list at write time.
  services        text[] not null default '{}',
  languages       text[] not null default '{}',
  day_rate_idr    int,
  notes           text,
  image_urls      text[] not null default '{}',

  -- Trust + status (same enum as bike_rentals.status incl. 'paused')
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','suspended','paused')),
  verified        boolean not null default false,
  available_now   boolean not null default true,

  -- Reviews aggregate (denormalised — same posture as rentals/places)
  rating          numeric(2,1),
  review_count    int not null default 0,

  rejection_note  text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One listing per owner. Drop + create makes it idempotent if the
-- migration is re-applied during dev.
drop index if exists tour_guide_one_per_owner;
create unique index tour_guide_one_per_owner
  on public.tour_guide_listings (owner_user_id);

create index if not exists tour_guide_city_status_idx
  on public.tour_guide_listings (city, status);

create index if not exists tour_guide_location_gix
  on public.tour_guide_listings using gist (location);

-- updated_at trigger (reuses the shared set_updated_at fn)
drop trigger if exists tgl_set_updated_at on public.tour_guide_listings;
create trigger tgl_set_updated_at
  before update on public.tour_guide_listings
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────
alter table public.tour_guide_listings enable row level security;

-- Anyone can read approved listings (public /tour feed + /tour/[slug]).
drop policy if exists "tgl_public_read_approved" on public.tour_guide_listings;
create policy "tgl_public_read_approved"
  on public.tour_guide_listings for select
  using (status = 'approved');

-- Owner reads their own listing (any status) so the dashboard can
-- show pending/paused rows.
drop policy if exists "tgl_owner_read_own" on public.tour_guide_listings;
create policy "tgl_owner_read_own"
  on public.tour_guide_listings for select
  to authenticated
  using (owner_user_id = auth.uid());

-- Authenticated owners can submit (status='pending'). Quota is enforced
-- by the unique index above + an app-layer entitlement check.
drop policy if exists "tgl_authed_submit" on public.tour_guide_listings;
create policy "tgl_authed_submit"
  on public.tour_guide_listings for insert
  to authenticated
  with check (
    owner_user_id = auth.uid()
    and status = 'pending'
  );

-- Owner can update their own listing (limited mutable surface — admin
-- moderation still owns status / verified / rating writes via service role).
drop policy if exists "tgl_owner_update_own" on public.tour_guide_listings;
create policy "tgl_owner_update_own"
  on public.tour_guide_listings for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- user_accounts — tour_guide subscription columns
-- ─────────────────────────────────────────────────────────────────────
alter table public.user_accounts
  add column if not exists tour_guide_status      text not null default 'inactive'
    check (tour_guide_status in ('inactive','active','expired')),
  add column if not exists tour_guide_plan        text
    check (tour_guide_plan in ('monthly','yearly')),
  add column if not exists tour_guide_started_at  timestamptz,
  add column if not exists tour_guide_expires_at  timestamptz;

create index if not exists ua_tour_guide_idx
  on public.user_accounts (tour_guide_status);

-- ─────────────────────────────────────────────────────────────────────
-- payment_intents — open up to tour_guide products
-- ─────────────────────────────────────────────────────────────────────
alter table public.payment_intents
  drop constraint if exists payment_intents_product_check;

alter table public.payment_intents
  add constraint payment_intents_product_check
  check (product in (
    'subscription',
    'subscription_yearly',
    'verified',
    'rental_company_monthly',
    'rental_company_yearly',
    'tour_guide_monthly',
    'tour_guide_yearly'
  ));

-- ─────────────────────────────────────────────────────────────────────
-- Driver-subscription trigger must keep ignoring tour_guide products.
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

  -- Skip non-driver products — each has its own trigger downstream.
  if new.product in (
    'rental_company_monthly','rental_company_yearly',
    'tour_guide_monthly','tour_guide_yearly'
  ) then
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
-- NEW: tour_guide subscription extension on payment
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.extend_tour_guide_on_payment()
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

  if new.product not in ('tour_guide_monthly','tour_guide_yearly') then
    return new;
  end if;

  v_plan := case
    when new.product = 'tour_guide_yearly' then 'yearly'
    else 'monthly'
  end;

  -- Ensure the user_accounts row exists.
  insert into public.user_accounts (user_id)
  values (new.driver_user_id)
  on conflict (user_id) do nothing;

  -- Basis: later of current expiry or now()
  select coalesce(tour_guide_expires_at, now())
    into v_basis
  from public.user_accounts
  where user_id = new.driver_user_id
  for update;

  if v_basis < now() then v_basis := now(); end if;

  update public.user_accounts
  set tour_guide_status     = 'active',
      tour_guide_plan       = v_plan,
      tour_guide_started_at = coalesce(tour_guide_started_at, now()),
      tour_guide_expires_at = v_basis + (new.extends_days || ' days')::interval,
      updated_at            = now()
  where user_id = new.driver_user_id;

  -- Un-pause any of their paused tour guide listings.
  update public.tour_guide_listings
  set status     = 'approved',
      updated_at = now()
  where owner_user_id = new.driver_user_id
    and status        = 'paused';

  return new;
end;
$$;

drop trigger if exists pi_extend_tour_guide on public.payment_intents;
create trigger pi_extend_tour_guide
  after update of status on public.payment_intents
  for each row
  when (new.status = 'paid')
  execute function public.extend_tour_guide_on_payment();
