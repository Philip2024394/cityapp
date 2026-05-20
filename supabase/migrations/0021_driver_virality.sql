-- ============================================================================
-- 0021_driver_virality.sql
-- ----------------------------------------------------------------------------
-- Driver-to-driver referrals + buddy pairing — the viral acquisition layer.
--
-- Existing affiliate system (migrations 0016/0018) tracks EXTERNAL AGENTS
-- referring drivers (sales-rep program with KYC + bank payout). This is
-- different: drivers refer other drivers and earn free subscription months
-- — no KYC, no bank, just a code on their profile.
--
-- Three pieces:
--   1. drivers.referrer_driver_id + drivers.referral_code
--      Each driver gets a shareable code (derived from slug). When a new
--      driver onboards with ?ref=<code>, attribution lands here.
--
--   2. driver_referral_rewards
--      One row per (referrer, referred) pair when the referred driver
--      converts to active subscription. Tracks months_granted so the
--      referrer's billing extends. Idempotent via unique constraint.
--
--   3. driver_buddies
--      First-week mentor pairing. On insert, a trigger picks an
--      eligible top-rated driver in the same city as the new driver's
--      buddy. Both sides see the pairing on their dashboard.
--
-- DIRECTORY-POSTURE (PM 12/2019): all rows here are driver-self events
-- (signup, profile attribution). No customer trip data is recorded.
-- ============================================================================

-- ─── drivers: referral_code + referrer_driver_id ──────────────────────
alter table public.drivers
  add column if not exists referral_code text,
  add column if not exists referrer_driver_id uuid references public.profiles(id);

-- Unique referral code per driver. Backfilled from slug; new drivers get
-- one set in a trigger below.
create unique index if not exists drivers_referral_code_uniq
  on public.drivers(referral_code)
  where referral_code is not null;

create index if not exists drivers_referrer_driver_idx
  on public.drivers(referrer_driver_id)
  where referrer_driver_id is not null;

-- Backfill referral_code for existing drivers — use the slug since it's
-- already unique + URL-safe + memorable in WhatsApp groups.
update public.drivers
   set referral_code = slug
 where referral_code is null;

-- ─── trigger: auto-set referral_code on insert ────────────────────────
create or replace function public.set_driver_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null then
    new.referral_code := new.slug;
  end if;
  return new;
end;
$$;

drop trigger if exists drivers_set_referral_code on public.drivers;
create trigger drivers_set_referral_code
  before insert on public.drivers
  for each row execute function public.set_driver_referral_code();

-- ─── driver_referral_rewards ──────────────────────────────────────────
-- One row per converted referral. `referred_driver_id` is the newly
-- onboarded driver. `referrer_driver_id` is the driver who shared the
-- link. months_granted=1 by default; can be tuned per campaign.
create table if not exists public.driver_referral_rewards (
  id                    uuid primary key default gen_random_uuid(),
  referrer_driver_id    uuid not null references public.profiles(id) on delete cascade,
  referred_driver_id    uuid not null references public.profiles(id) on delete cascade,
  months_granted        int  not null default 1,
  status                text not null default 'pending'
                        check (status in ('pending','granted','cancelled')),
  granted_at            timestamptz,
  created_at            timestamptz not null default now(),
  unique(referrer_driver_id, referred_driver_id)
);

create index if not exists driver_referral_rewards_referrer_idx
  on public.driver_referral_rewards(referrer_driver_id);

alter table public.driver_referral_rewards enable row level security;

-- Driver can SELECT their own rewards (as either side of the pair).
create policy "Driver read own rewards"
  on public.driver_referral_rewards for select
  using (
    auth.uid() = referrer_driver_id or
    auth.uid() = referred_driver_id or
    public.is_admin()
  );

-- Only admin / service-role inserts/updates (gated via API route).
create policy "Admin write rewards"
  on public.driver_referral_rewards for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─── trigger: create pending reward when new driver has a referrer ───
create or replace function public.create_driver_referral_reward()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.referrer_driver_id is not null and new.referrer_driver_id <> new.user_id then
    insert into public.driver_referral_rewards (
      referrer_driver_id, referred_driver_id, months_granted, status
    ) values (
      new.referrer_driver_id, new.user_id, 1, 'pending'
    )
    on conflict (referrer_driver_id, referred_driver_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists drivers_create_referral_reward on public.drivers;
create trigger drivers_create_referral_reward
  after insert on public.drivers
  for each row execute function public.create_driver_referral_reward();

-- ─── driver_buddies ───────────────────────────────────────────────────
-- First-week mentor pairing. Each new driver gets matched with a
-- top-rated existing driver in the same city. Unique on mentee so a
-- given driver only has one buddy. Mentor can have many mentees.
create table if not exists public.driver_buddies (
  id                  uuid primary key default gen_random_uuid(),
  mentor_user_id      uuid not null references public.profiles(id) on delete cascade,
  mentee_user_id      uuid not null references public.profiles(id) on delete cascade,
  paired_at           timestamptz not null default now(),
  graduated_at        timestamptz,
  reward_claimed      boolean not null default false,
  unique(mentee_user_id)
);

create index if not exists driver_buddies_mentor_idx on public.driver_buddies(mentor_user_id);
create index if not exists driver_buddies_mentee_idx on public.driver_buddies(mentee_user_id);

alter table public.driver_buddies enable row level security;

-- Both mentor and mentee can read their pairing.
create policy "Driver read own buddy pairing"
  on public.driver_buddies for select
  using (
    auth.uid() = mentor_user_id or
    auth.uid() = mentee_user_id or
    public.is_admin()
  );

create policy "Admin write buddies"
  on public.driver_buddies for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─── trigger: auto-pair new driver with a buddy ───────────────────────
-- Picks an eligible mentor when a new driver row is inserted:
--   • same city
--   • status = 'active'
--   • has a rating (i.e. at least one review)
--   • NOT the new driver themselves
--   • currently mentoring < 3 mentees (avoid burnout)
-- Falls back to: top-rated driver in the same city.
-- If no eligible mentor exists (early-days / fresh city), inserts nothing.
create or replace function public.auto_pair_driver_buddy()
returns trigger
language plpgsql
security definer
as $$
declare
  v_mentor_id uuid;
begin
  select d.user_id into v_mentor_id
  from public.drivers d
  where d.city = new.city
    and d.status = 'active'
    and d.user_id <> new.user_id
    and d.rating is not null
    and (
      select count(*) from public.driver_buddies b
      where b.mentor_user_id = d.user_id and b.graduated_at is null
    ) < 3
  order by d.rating desc nulls last, d.trips_count desc nulls last, d.created_at asc
  limit 1;

  if v_mentor_id is not null then
    insert into public.driver_buddies (mentor_user_id, mentee_user_id)
    values (v_mentor_id, new.user_id)
    on conflict (mentee_user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists drivers_auto_pair_buddy on public.drivers;
create trigger drivers_auto_pair_buddy
  after insert on public.drivers
  for each row execute function public.auto_pair_driver_buddy();
