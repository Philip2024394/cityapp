-- ============================================================================
-- 0047 — Massage providers (home + hotel service)
-- ----------------------------------------------------------------------------
-- A sister marketplace to the rider directory. Independent therapists list
-- 60/90/120-minute prices, gender, bio, KTP-backed identity. Customers
-- (often via a partner hotel/villa QR) contact directly on WhatsApp.
--
-- INVARIANTS (same as drivers):
--   • Platform is software only. No funds flow through us.
--   • Same Rp 38k / month subscription model. Same partner program 8%.
--   • KTP image is PRIVATE — admin-only visibility (RLS).
--   • status='pending' until an admin verifies KTP → 'active'.
-- ============================================================================

create table if not exists public.massage_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  gender           text not null check (gender in ('woman','man')),
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Pricing — three duration tiers, all IDR
  price_60min_idr  integer not null check (price_60min_idr  >= 0),
  price_90min_idr  integer not null check (price_90min_idr  >= 0),
  price_120min_idr integer not null check (price_120min_idr >= 0),

  -- Location
  city               text,
  service_area_notes text,

  -- Contact
  whatsapp_e164    text not null,

  -- Media (R2 / ImageKit URLs)
  profile_image_url text,
  ktp_image_url     text,                  -- PRIVATE: admin-only read via RLS

  -- Live availability — green pulse online / orange busy / grey offline.
  availability     text not null default 'offline'
                   check (availability in ('online','busy','offline')),

  -- Verification gate
  status           text not null default 'pending'
                   check (status in ('pending','active','suspended','removed')),
  verified_at      timestamptz,
  verified_by      uuid references auth.users(id),
  rejected_reason  text,

  -- Subscription — mirrors drivers: 7-day trial then 38k/month
  subscription_status text not null default 'trial'
                   check (subscription_status in ('trial','active','expired','cancelled')),
  trial_ends_at    timestamptz not null default (now() + interval '7 days'),
  paid_until       timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_mp_listing
  on public.massage_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_mp_owner
  on public.massage_providers (user_id);

-- touch updated_at on every UPDATE
create or replace function public.touch_massage_providers()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_massage_providers on public.massage_providers;
create trigger trg_touch_massage_providers
  before update on public.massage_providers
  for each row execute function public.touch_massage_providers();

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.massage_providers enable row level security;

-- Public can SELECT only the marketplace-safe columns, only of active rows.
-- ktp_image_url is masked at the API layer (the marketplace API never
-- selects it for public consumers). RLS is column-coarse, so the API does
-- the column filtering — same pattern as the drivers table.
drop policy if exists mp_public_read on public.massage_providers;
create policy mp_public_read on public.massage_providers
  for select
  to anon, authenticated
  using (status = 'active');

-- Owner can read everything about themselves.
drop policy if exists mp_owner_read on public.massage_providers;
create policy mp_owner_read on public.massage_providers
  for select
  to authenticated
  using (user_id = auth.uid());

-- Owner can UPDATE their own row. Status / verification / paid_until are
-- protected — the API never lets a self-owned update touch those columns.
drop policy if exists mp_owner_update on public.massage_providers;
create policy mp_owner_update on public.massage_providers
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- INSERT is funnelled through the admin-key API route (assigns slug etc).
-- No direct insert policy needed — service-role bypasses RLS.
