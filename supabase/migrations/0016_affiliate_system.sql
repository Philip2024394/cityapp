-- ============================================================================
-- 0016_affiliate_system.sql
-- ----------------------------------------------------------------------------
-- Affiliate programme — applies the schema previously kept at
-- `supabase_affiliate_tables.sql` in the streetlocal monorepo root,
-- plus the City Rider attribution layer (drivers.referrer_agent_code +
-- a trigger that auto-creates an affiliate_referrals row when a
-- referred driver signs up).
--
-- Three tables from the existing streetlocal Affiliate.jsx UI:
--   affiliate_agents      — one row per agent (signup form posts here)
--   affiliate_referrals   — one row per converted customer/driver
--   affiliate_seat_limits — country-level enrolment cap (ID=1000)
--
-- Cityrider integration:
--   drivers.referrer_agent_code (TEXT, nullable) — captured from a
--     ?ref=AGENTCODE URL param at signup, persisted via cookie until
--     /onboarding completes
--   Trigger on INSERT into drivers: if referrer_agent_code matches an
--     ACTIVE affiliate_agents row, insert a pending affiliate_referrals
--     row pointed at that agent.
--
-- RLS: matches the permissive policies in the original .sql file so the
-- existing landing/src/Affiliate.jsx keeps working without changes.
-- Tighten later when production users replace public access.
-- ============================================================================

-- ─── affiliate_agents ─────────────────────────────────────────────────
create table if not exists public.affiliate_agents (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  country         text not null,
  whatsapp        text not null unique,
  agent_code      text not null unique,
  status          text not null default 'pending_payment'
                  check (status in ('pending_payment','pending_verification','active','suspended','cancelled')),
  total_clicks    integer not null default 0,
  payment_proof   text,
  paid_at         timestamptz,
  bank_name       text,
  bank_account    text,
  bank_holder     text,
  ktp_url         text,
  verification_status text default 'none'
                  check (verification_status in ('none','submitted','verified','rejected')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_affiliate_agents_country     on public.affiliate_agents(country);
create index if not exists idx_affiliate_agents_status      on public.affiliate_agents(status);
create index if not exists idx_affiliate_agents_agent_code  on public.affiliate_agents(agent_code);

alter table public.affiliate_agents enable row level security;

drop policy if exists "Public insert agents" on public.affiliate_agents;
create policy "Public insert agents"
  on public.affiliate_agents for insert
  with check (true);

drop policy if exists "Public read agents" on public.affiliate_agents;
create policy "Public read agents"
  on public.affiliate_agents for select
  using (true);

drop policy if exists "Public update agents" on public.affiliate_agents;
create policy "Public update agents"
  on public.affiliate_agents for update
  using (true);

-- ─── affiliate_referrals ──────────────────────────────────────────────
create table if not exists public.affiliate_referrals (
  id                uuid primary key default gen_random_uuid(),
  agent_id          uuid not null references public.affiliate_agents(id) on delete cascade,
  customer_name     text,
  customer_phone    text,
  app_type          text,
  app_tier          text,
  registration_id   uuid,
  commission_amount integer not null default 0,
  status            text not null default 'pending'
                    check (status in ('pending','approved','paid','cancelled')),
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_affiliate_referrals_agent_id on public.affiliate_referrals(agent_id);
-- Dedup — one referral row per (agent, driver) pair
create unique index if not exists uniq_affiliate_referral_agent_registration
  on public.affiliate_referrals(agent_id, registration_id)
  where registration_id is not null;

alter table public.affiliate_referrals enable row level security;

drop policy if exists "Public read referrals" on public.affiliate_referrals;
create policy "Public read referrals"
  on public.affiliate_referrals for select
  using (true);

drop policy if exists "Public insert referrals" on public.affiliate_referrals;
create policy "Public insert referrals"
  on public.affiliate_referrals for insert
  with check (true);

drop policy if exists "Public update referrals" on public.affiliate_referrals;
create policy "Public update referrals"
  on public.affiliate_referrals for update
  using (true);

-- ─── affiliate_seat_limits ────────────────────────────────────────────
create table if not exists public.affiliate_seat_limits (
  id            text primary key,           -- country code e.g. 'ID'
  country_name  text not null,
  max_seats     integer not null default 1000,
  created_at    timestamptz not null default now()
);

insert into public.affiliate_seat_limits (id, country_name, max_seats)
values ('ID', 'Indonesia', 1000)
on conflict (id) do nothing;

alter table public.affiliate_seat_limits enable row level security;

drop policy if exists "Public read seat limits" on public.affiliate_seat_limits;
create policy "Public read seat limits"
  on public.affiliate_seat_limits for select
  using (true);

-- ─── updated_at trigger for affiliate_agents ──────────────────────────
-- Reuse set_updated_at from migration 0011 — already exists.
drop trigger if exists affiliate_agents_set_updated_at on public.affiliate_agents;
create trigger affiliate_agents_set_updated_at
  before update on public.affiliate_agents
  for each row execute function public.set_updated_at();

-- ============================================================================
-- CITY RIDER ATTRIBUTION LAYER
-- ============================================================================

-- Soft FK: drivers.referrer_agent_code points at affiliate_agents.agent_code.
-- TEXT not UUID because the URL ?ref= param carries the human-readable
-- agent code; we do the lookup at attribution time.
alter table public.drivers
  add column if not exists referrer_agent_code text;

create index if not exists drivers_referrer_agent_idx
  on public.drivers(referrer_agent_code)
  where referrer_agent_code is not null;

-- Auto-create an affiliate_referrals row when a referred driver signs
-- up. Only fires when the agent_code matches an ACTIVE affiliate_agents
-- row — invalid codes are ignored silently (no error, no record).
create or replace function public.create_affiliate_referral_for_driver()
returns trigger
language plpgsql
security definer
as $$
declare
  v_agent_id uuid;
begin
  if new.referrer_agent_code is null or new.referrer_agent_code = '' then
    return new;
  end if;

  select id into v_agent_id
  from public.affiliate_agents
  where agent_code = new.referrer_agent_code
    and status = 'active'
  limit 1;

  if v_agent_id is not null then
    insert into public.affiliate_referrals (
      agent_id, customer_name, customer_phone, app_type, app_tier,
      registration_id, commission_amount, status
    ) values (
      v_agent_id,
      new.business_name,
      new.whatsapp_e164,
      'cityrider',
      'driver',
      new.user_id,
      0,            -- commission set later when subscription becomes paid
      'pending'
    )
    on conflict (agent_id, registration_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists drivers_create_affiliate_referral on public.drivers;
create trigger drivers_create_affiliate_referral
  after insert on public.drivers
  for each row execute function public.create_affiliate_referral_for_driver();
