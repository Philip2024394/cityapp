-- ============================================================================
-- 0017_billing_and_payouts.sql
-- ----------------------------------------------------------------------------
-- Two scale-readiness layers:
--   1. payment_intents — every Midtrans Snap transaction (subscription
--      renewal, verified-tier upgrade). Webhook flips the row's status,
--      a trigger then bumps subscriptions.paid_until.
--   2. affiliate_payouts + commission_rules — turn approved
--      affiliate_referrals into batched payouts the admin can pay
--      through any bank/provider.
--
-- Both designed so the *codebase* doesn't have to know which provider
-- (Midtrans Snap vs Iris vs Xendit vs manual transfer) is doing the
-- actual money movement — only the state machine.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────
-- payment_intents — every paid transaction
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.payment_intents (
  id               uuid primary key default gen_random_uuid(),
  driver_user_id   uuid not null references public.drivers(user_id) on delete cascade,

  -- 'subscription' = base Rp 30K/month, 'verified' = Tour Verified Rp 100K/month
  product          text not null check (product in ('subscription','verified')),
  amount_idr       int  not null check (amount_idr > 0),

  -- Provider details
  provider         text not null default 'midtrans' check (provider in ('midtrans','manual','xendit')),
  provider_order_id text not null unique,  -- order_id we send to Midtrans
  provider_txn_id  text,                   -- Midtrans transaction_id (returned on settlement)
  snap_token       text,                   -- Snap token for the client redirect
  snap_redirect_url text,

  status           text not null default 'pending'
                   check (status in ('pending','paid','failed','expired','cancelled','refunded')),
  paid_at          timestamptz,

  -- How many days this purchase extends paid_until by — set at create time.
  -- 30 for monthly subscription renewal.
  extends_days     int not null default 30 check (extends_days > 0),

  -- Raw provider notification kept for audit + dispute resolution
  raw_notification jsonb,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists pi_driver_idx       on public.payment_intents(driver_user_id, created_at desc);
create index if not exists pi_status_idx       on public.payment_intents(status, created_at desc);
create index if not exists pi_provider_txn_idx on public.payment_intents(provider_txn_id) where provider_txn_id is not null;

alter table public.payment_intents enable row level security;

-- Driver reads own intents — for the dashboard's billing history view.
drop policy if exists "pi_owner_select" on public.payment_intents;
create policy "pi_owner_select"
  on public.payment_intents for select
  to authenticated
  using (driver_user_id = auth.uid());

-- All writes via service-role (admin, webhook handler). No client-side
-- writes — clients only kick off via /api/payments/snap/create which
-- runs server-side with the service role key.

-- updated_at trigger
drop trigger if exists pi_set_updated_at on public.payment_intents;
create trigger pi_set_updated_at
  before update on public.payment_intents
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- Subscription auto-extension trigger
-- When a payment_intent flips to status='paid', bump the driver's
-- subscription paid_until by extends_days from whichever is later:
--   (existing paid_until, or now())
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

  -- Pick the latest of current paid_until or now() as the basis
  select coalesce(current_period_end, now())
    into v_basis
  from public.subscriptions
  where driver_id = new.driver_user_id
  for update;

  if v_basis < now() then v_basis := now(); end if;

  -- Extend by the purchase's extends_days
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

drop trigger if exists pi_extend_subscription on public.payment_intents;
create trigger pi_extend_subscription
  after update of status on public.payment_intents
  for each row
  when (new.status = 'paid')
  execute function public.extend_subscription_on_payment();

-- ─────────────────────────────────────────────────────────────────────
-- Tier upgrade trigger — for 'verified' product, also flip drivers.listing_tier
-- (already used elsewhere via places.listing_tier — same column shape).
-- ─────────────────────────────────────────────────────────────────────
-- (Future: when we add Tour Verified flag to drivers table, hook it here)

-- ─────────────────────────────────────────────────────────────────────
-- commission_rules — what we owe affiliates per conversion
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.commission_rules (
  id            uuid primary key default gen_random_uuid(),
  app_type      text not null,                -- 'cityrider', 'food-basic', etc.
  app_tier      text not null,                -- 'driver', 'verified', 'merchant', etc.
  amount_idr    int  not null check (amount_idr >= 0),
  active_from   date not null default current_date,
  active_until  date,
  created_at    timestamptz not null default now()
);

-- Default rule for cityrider driver conversion. Adjust manually as you wish.
insert into public.commission_rules (app_type, app_tier, amount_idr, active_from)
values ('cityrider', 'driver', 15_000, current_date)
on conflict do nothing;

alter table public.commission_rules enable row level security;
drop policy if exists "commission_rules_public_read" on public.commission_rules;
create policy "commission_rules_public_read"
  on public.commission_rules for select using (true);

-- ─────────────────────────────────────────────────────────────────────
-- affiliate_payouts — batched payouts per agent
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.affiliate_payouts (
  id                 uuid primary key default gen_random_uuid(),
  agent_id           uuid not null references public.affiliate_agents(id) on delete cascade,

  -- Sum of commission_amount across all included affiliate_referrals
  amount_idr         int not null check (amount_idr >= 0),
  referral_count     int not null default 0,

  status             text not null default 'pending'
                     check (status in ('pending','processing','paid','cancelled','failed')),

  -- Disbursement provider (chosen at run time)
  provider           text default 'manual' check (provider in ('manual','xendit','iris')),
  provider_txn_id    text,         -- bank ref number or provider transaction id
  bank_name          text,         -- snapshot of agent's bank at payout time
  bank_account       text,
  bank_holder        text,

  paid_at            timestamptz,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists ap_agent_idx  on public.affiliate_payouts(agent_id, created_at desc);
create index if not exists ap_status_idx on public.affiliate_payouts(status, created_at desc);

alter table public.affiliate_payouts enable row level security;

-- Agents read own payouts (for the existing Affiliate.jsx dashboard)
drop policy if exists "ap_public_read" on public.affiliate_payouts;
create policy "ap_public_read"
  on public.affiliate_payouts for select using (true);

-- All writes via service-role only (admin endpoints).

drop trigger if exists ap_set_updated_at on public.affiliate_payouts;
create trigger ap_set_updated_at
  before update on public.affiliate_payouts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- Link affiliate_referrals → affiliate_payouts (one referral per payout)
-- ─────────────────────────────────────────────────────────────────────
alter table public.affiliate_referrals
  add column if not exists payout_id uuid references public.affiliate_payouts(id) on delete set null;

create index if not exists ar_payout_idx on public.affiliate_referrals(payout_id) where payout_id is not null;

-- ─────────────────────────────────────────────────────────────────────
-- When a paid payment_intent lands, set commission_amount on the
-- driver's pending affiliate_referrals row (if any) using the active
-- commission_rule for this app_type/app_tier. Marks the referral
-- 'approved' so the next aggregation run picks it up.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.approve_affiliate_referral_on_payment()
returns trigger
language plpgsql
security definer
as $$
declare
  v_commission int;
begin
  if new.status <> 'paid' or old.status = 'paid' then
    return new;
  end if;

  -- Pull commission for cityrider drivers
  select amount_idr into v_commission
  from public.commission_rules
  where app_type = 'cityrider'
    and app_tier = 'driver'
    and active_from <= current_date
    and (active_until is null or active_until >= current_date)
  order by active_from desc
  limit 1;

  if v_commission is null then v_commission := 0; end if;

  update public.affiliate_referrals
  set commission_amount = v_commission,
      status            = 'approved'
  where registration_id = new.driver_user_id
    and app_type        = 'cityrider'
    and status          = 'pending'
    and payout_id is null;

  return new;
end;
$$;

drop trigger if exists pi_approve_referral on public.payment_intents;
create trigger pi_approve_referral
  after update of status on public.payment_intents
  for each row
  when (new.status = 'paid')
  execute function public.approve_affiliate_referral_on_payment();

-- ─────────────────────────────────────────────────────────────────────
-- Performance indexes for scale to 5,000+ drivers
-- ─────────────────────────────────────────────────────────────────────
create index if not exists drivers_city_status_active_idx
  on public.drivers(city, status, availability)
  where status = 'active';

create index if not exists subscriptions_active_idx
  on public.subscriptions(status, current_period_end)
  where status = 'active';

create index if not exists reviews_rating_idx
  on public.reviews(driver_user_id, rating)
  where status = 'visible';
