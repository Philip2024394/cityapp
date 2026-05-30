-- ============================================================================
-- 0156 — Hourly hire packages + driver availability slots
-- ----------------------------------------------------------------------------
-- Adds a third service mode (after Passenger and Parcel B2B): "Hourly
-- Booking" — the driver hires out themselves + their vehicle by the
-- 3 / 6 / 8 hour block, petrol billed separately to the customer.
--
-- Plus rich availability declaration so customers can match drivers to
-- their actual use case (airport sunrise pickup ≠ nightclub return).
--
-- Compliance: petrol cost is NOT recorded as a platform transaction —
-- driver and customer settle BBM directly. The WhatsApp deep-link
-- includes a templated petrol-tracking instruction (tank photo at
-- pickup + dropoff) but the platform never stores those trip records.
-- IndoCity stays on the directory side of Permenhub 118/2018.
--
-- Defaults (Yogyakarta market research, May 2026):
--   Avanza / 7-seat MPV — car + driver only, petrol separate:
--     3h Rp 175,000  ·  6h Rp 300,000  ·  8h Rp 400,000
--   Innova / premium MPV — car + driver only, petrol separate:
--     3h Rp 250,000  ·  6h Rp 450,000  ·  8h Rp 600,000
-- ============================================================================

-- ── Hourly hire ───────────────────────────────────────────────────────────
alter table public.drivers
  add column if not exists hourly_enabled        boolean not null default false,
  add column if not exists hourly_3h_rate_idr    integer
    check (hourly_3h_rate_idr is null or hourly_3h_rate_idr between 0 and 5000000),
  add column if not exists hourly_6h_rate_idr    integer
    check (hourly_6h_rate_idr is null or hourly_6h_rate_idr between 0 and 5000000),
  add column if not exists hourly_8h_rate_idr    integer
    check (hourly_8h_rate_idr is null or hourly_8h_rate_idr between 0 and 5000000);

comment on column public.drivers.hourly_enabled is
  'Driver offers hourly hire (3h / 6h / 8h car + driver, petrol separate).';
comment on column public.drivers.hourly_3h_rate_idr is
  'Customer-paid 3-hour hire rate, IDR. Petrol billed separately by customer.';

-- ── Working hours + availability slots ─────────────────────────────────────
-- Stored as text "HH:MM" 24h format for simplicity (no timezone math —
-- drivers self-report in their local Jakarta time).
alter table public.drivers
  add column if not exists working_hours_start text
    check (working_hours_start is null or working_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  add column if not exists working_hours_end   text
    check (working_hours_end is null or working_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- Multi-select availability flags — customer matches their use case.
alter table public.drivers
  add column if not exists available_sunrise   boolean not null default false,
  add column if not exists available_daytime   boolean not null default false,
  add column if not exists available_evening   boolean not null default false,
  add column if not exists available_nightlife boolean not null default false;

comment on column public.drivers.available_sunrise   is 'Driver works pre-dawn / sunrise hours (00:00–07:00) — airport early pickups, sunrise tours.';
comment on column public.drivers.available_daytime   is 'Driver works daytime (07:00–17:00) — daily activity, office, school.';
comment on column public.drivers.available_evening   is 'Driver works evening (17:00–22:00) — dinner, events, family rides.';
comment on column public.drivers.available_nightlife is 'Driver works late hours (22:00–04:00) — club return, late airport.';

-- ── Mock seed — the 3 visible car demos get hourly packages enabled ────────
-- Bike + truck mocks left alone for now (bike isn't typically hired hourly;
-- truck uses the existing daily_rate model). Customers tap the Hourly tab
-- on a car profile to see these rates.

update public.mock_drivers
   set
     -- Avanza / MPV defaults
     -- (mock_drivers table doesn't have hourly_* columns yet — they live on the
     --  drivers table. Mocks render their hourly card via the constants in
     --  src/lib/pricing/hourlyHire.ts based on vehicle_make + vehicle_model.
     --  No-op update kept to keep this migration's intent visible.)
     mock_hidden_at = mock_hidden_at
 where slug in (
   'dwi-toyota-innova-jogja',
   'budi-toyota-avanza-yogya',
   'siti-honda-mobilio-sleman'
 );

-- ============================================================================
-- POST-CONDITIONS
--   • drivers.hourly_enabled defaults false — existing drivers unaffected
--   • drivers.hourly_3h/6h/8h_rate_idr nullable — fill via dashboard or
--     "Reset to defaults" button (looks up by vehicle_make+model)
--   • drivers.working_hours_start/end text "HH:MM"
--   • drivers.available_sunrise/daytime/evening/nightlife booleans
-- ============================================================================
