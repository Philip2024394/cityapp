-- ============================================================================
-- 0149 — Parcel B2B opt-in + tiered rate card on drivers
-- ----------------------------------------------------------------------------
-- New product surface: dedicated parcel-delivery hub at /cityriders/parcel.
-- Customers (UMKM, Shopee sellers) browse bike / car / truck drivers who
-- have opted into B2B parcel contracts. Drivers self-publish a 5-tier
-- volume rate card (per-parcel for bike/car; truck uses its existing
-- daily/weekly/monthly rental rates and doesn't need this column set).
--
-- IndoCity is a SOFTWARE DIRECTORY (PM 12/2019, Permenhub 118/2018) —
-- drivers self-publish all rates. We surface suggested defaults from
-- src/lib/parcel/defaults.ts; the column stores whatever the driver
-- chose. Customer + driver agree the contract on WhatsApp; the platform
-- takes 0% commission.
--
-- Rate-tier JSON shape (per driver):
--   {
--     "tier_1_5":       9000,
--     "tier_6_20":      7000,
--     "tier_21_50":     5500,
--     "tier_51_100":    4500,
--     "tier_100_plus_negotiate": true
--   }
-- ============================================================================

alter table public.drivers
  add column if not exists parcel_b2b_enabled boolean not null default false;

alter table public.drivers
  add column if not exists parcel_rate_tiers jsonb;

alter table public.drivers
  add column if not exists parcel_daily_capacity int
    check (parcel_daily_capacity is null or parcel_daily_capacity between 1 and 500);

alter table public.drivers
  add column if not exists parcel_service_zone text;

alter table public.drivers
  add column if not exists parcel_outer_zone_surcharge int
    check (parcel_outer_zone_surcharge is null or parcel_outer_zone_surcharge between 0 and 50000);

create index if not exists drivers_parcel_b2b_idx
  on public.drivers (parcel_b2b_enabled)
  where parcel_b2b_enabled = true;

comment on column public.drivers.parcel_b2b_enabled is
  'Driver has opted into parcel B2B contracts (UMKM / Shopee seller bulk delivery).';
comment on column public.drivers.parcel_rate_tiers is
  'Per-driver self-published 5-tier volume rate card (per-parcel IDR). Bike + car only; truck uses rental_*_rate_idr.';
comment on column public.drivers.parcel_daily_capacity is
  'Max parcels per day driver commits to (1-500).';
comment on column public.drivers.parcel_service_zone is
  'Free-text service zone description (e.g., "All Sleman + Bantul").';
comment on column public.drivers.parcel_outer_zone_surcharge is
  'IDR surcharge for parcels outside the stated service zone.';

-- ============================================================================
-- POST-CONDITIONS
--   • parcel_b2b_enabled defaults false — existing rows unaffected
--   • parcel_rate_tiers nullable — drivers fill via dashboard
--   • Partial index on parcel_b2b_enabled=true keeps the parcel hub query fast
-- ============================================================================
