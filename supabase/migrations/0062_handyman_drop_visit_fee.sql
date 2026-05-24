-- ============================================================================
-- 0062 — Handyman: drop visit_fee, hour/day pricing only
-- ----------------------------------------------------------------------------
-- Visit fee removed per UX rule — Indonesian tukang on this platform now
-- price exclusively by hour and/or day (day = 8 hours).
-- ============================================================================

-- Drop the prior at-least-one-of-three constraint before dropping the
-- column it referenced.
alter table public.handyman_providers
  drop constraint if exists handyman_providers_at_least_one_price;

alter table public.handyman_providers
  drop column if exists visit_fee_idr;

-- New rule: at least one of hour / day must be set.
alter table public.handyman_providers
  add constraint handyman_providers_at_least_one_price
  check (
    hourly_rate_idr is not null
    or day_rate_idr is not null
  );

-- Backfill: any seeded mock without an hourly_rate gets one derived
-- from day_rate / 8, so the CHECK passes cleanly when the constraint
-- locks in (and the marketplace shows pricing on every row).
update public.handyman_providers
   set hourly_rate_idr = greatest(round(day_rate_idr / 8), 1)
 where hourly_rate_idr is null and day_rate_idr is not null;

-- Mirror: backfill day_rate from hourly_rate * 8 where missing.
update public.handyman_providers
   set day_rate_idr = hourly_rate_idr * 8
 where day_rate_idr is null and hourly_rate_idr is not null;
