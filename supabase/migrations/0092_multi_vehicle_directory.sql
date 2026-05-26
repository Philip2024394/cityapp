-- ============================================================================
-- 0092 — Multi-vehicle directory support (Phase 1: Car)
-- ----------------------------------------------------------------------------
-- IndoCity is a SOFTWARE DIRECTORY operating under PM 12/2019. Drivers
-- self-publish their own minimum fare; IndoCity never sets, computes,
-- appoints, or matches fares. This migration extends the previously
-- bike-only `drivers` table to surface multiple vehicle categories
-- (bike → car → truck → premium_car → minibus) on dedicated
-- discovery + dashboard surfaces.
--
-- Phase 1 scope: schema-level only. Application code shipping now wires
-- /dashboard/car, /car marketplace, /car/[slug] profile + the /cari
-- Car selector tile. Truck / premium_car / minibus column wiring lands
-- in subsequent phases — the enum already includes them so no follow-up
-- enum migration is needed when we ship those.
--
-- Single-vehicle-per-driver-account in this phase (one drivers row per
-- user_id). Multi-vehicle support (one user listing bike + car
-- simultaneously) is deferred to a future `driver_vehicles` join table
-- once paying drivers ask for it. Founder direction.
-- ============================================================================

-- 1. Add vehicle_type discriminator
-- ----------------------------------------------------------------------------
-- Default 'bike' so every existing row reads as bike → no behavioural
-- change for legacy queries / dashboards. New signups for car/truck etc.
-- set this column explicitly via the onboarding form.
alter table public.drivers
  add column if not exists vehicle_type text not null default 'bike'
    check (vehicle_type in ('bike','car','truck','premium_car','minibus'));

-- 2. Generic vehicle spec columns
-- ----------------------------------------------------------------------------
-- Used by car/truck/premium_car/minibus dashboards. Legacy bike rows
-- continue to read from bike_make / bike_model / bike_year / bike_color /
-- bike_plate (existing columns). No data migration — bike code untouched.
alter table public.drivers
  add column if not exists vehicle_make   text,
  add column if not exists vehicle_model  text,
  add column if not exists vehicle_year   int,
  add column if not exists vehicle_color  text,
  add column if not exists vehicle_plate  text,
  add column if not exists vehicle_seats  int,
  add column if not exists vehicle_photos jsonb not null default '[]'::jsonb;

-- 3. Subscription gate
-- ----------------------------------------------------------------------------
-- Each non-bike vehicle dashboard costs 38,000 IDR/month per founder.
-- Phase 1 is admin-managed (manual WhatsApp invoicing → admin marks
-- the row paid_until = today + 30 days). When Midtrans / Xendit
-- recurring billing is wired in a later phase the webhook writes to
-- this same column — no UI or schema change.
--
-- Semantics:
--   NULL                  → never paid; dashboard shows subscription banner,
--                           profile is hidden from public marketplace
--   paid_until in future  → subscription active; full dashboard + listing
--   paid_until in past    → subscription lapsed; dashboard read-only,
--                           profile hidden from marketplace
--
-- Bike rows are exempt from the gate by default (paid_until stays NULL,
-- but the marketplace + dashboard treat vehicle_type='bike' as always
-- listable). Founder can revisit this if bike is later monetised too.
alter table public.drivers
  add column if not exists paid_until date;

-- 4. Discovery indexes
-- ----------------------------------------------------------------------------
-- The customer-facing /car marketplace + lowest-fare API both filter on
-- (vehicle_type, status, availability). A composite index lets those
-- queries hit the index even with a moderate row count.
create index if not exists idx_drivers_vehicle_type
  on public.drivers (vehicle_type, status, availability);

-- 5. Helpful comments for future maintainers
-- ----------------------------------------------------------------------------
comment on column public.drivers.vehicle_type is
  'Discriminator: bike|car|truck|premium_car|minibus. Drives which dashboard route the driver sees and which marketplace surface lists them.';

comment on column public.drivers.paid_until is
  'Subscription gate per vehicle dashboard. 38,000 IDR/month per founder. Phase 1 admin-managed; later phases populated by Midtrans/Xendit webhooks. NULL or past date = profile hidden from public marketplace (bike vehicle_type exempt — always listable).';

comment on column public.drivers.vehicle_photos is
  'JSON array of public image URLs. Customer profile pages render these in a carousel. Drivers upload via dashboard; storage is the existing /vehicle-photos bucket.';
