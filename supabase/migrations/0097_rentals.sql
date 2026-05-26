-- ============================================================================
-- 0097 — Vehicle rentals (lepas kunci / with-driver-by-day)
-- ----------------------------------------------------------------------------
-- IndoCity adds a "Rentals" product line — drivers can list their
-- vehicle for daily/weekly hire alongside (or instead of) the live
-- ride-hailing flow. This is a different mental model from /cari
-- (compare, plan, commit for a day) so it gets its own discovery
-- hub at /rentals.
--
-- Schema decisions:
--   • rental_type discriminator: self_drive (lepas kunci) | with_driver
--     (by-day with chauffeur) | both. NULL = driver does not offer
--     rental — only live booking.
--   • rental_daily_rate_idr: the published daily rate. NULL when
--     rental_type is NULL.
--   • A driver can offer BOTH live booking (price_per_km + min_fee)
--     AND rental (rental_daily_rate_idr) — listings are unified.
--     The rental marketplaces filter `rental_daily_rate_idr is not null`
--     to show only drivers offering rental.
--
-- Bike-rental note: bike rental is always lepas kunci in Indonesia
-- (there's no "ojek-by-day" product — that's just an ojek booking).
-- The existing /rent page already covers bike rental; the new
-- /rentals hub links to it as-is. This migration applies to ALL
-- vehicle types so a future shift can be made without re-migrating.
--
-- COMPLIANCE: still a software directory. Drivers self-publish their
-- daily rate. IndoCity surfaces it as-is — no fare computation, no
-- order matching. Customer contacts the driver via WhatsApp to agree
-- the rental terms directly.
-- ============================================================================

-- 1. Drivers table
-- ----------------------------------------------------------------------------
alter table public.drivers
  add column if not exists rental_type text
    check (rental_type is null or rental_type in ('self_drive','with_driver','both')),
  add column if not exists rental_daily_rate_idr int
    check (rental_daily_rate_idr is null or rental_daily_rate_idr > 0),
  -- Optional: weekly + monthly rates for longer stays (common in Bali
  -- tourist rentals). Drivers can leave NULL to mean "ask via WhatsApp".
  add column if not exists rental_weekly_rate_idr int
    check (rental_weekly_rate_idr is null or rental_weekly_rate_idr > 0),
  add column if not exists rental_monthly_rate_idr int
    check (rental_monthly_rate_idr is null or rental_monthly_rate_idr > 0),
  -- Minimum rental window in days. Default 1 (rent for at least a day).
  add column if not exists rental_min_days int not null default 1
    check (rental_min_days >= 1);

-- 2. Mock drivers table — mirror the same columns so seeds work
-- ----------------------------------------------------------------------------
alter table public.mock_drivers
  add column if not exists rental_type text
    check (rental_type is null or rental_type in ('self_drive','with_driver','both')),
  add column if not exists rental_daily_rate_idr int
    check (rental_daily_rate_idr is null or rental_daily_rate_idr > 0),
  add column if not exists rental_weekly_rate_idr int
    check (rental_weekly_rate_idr is null or rental_weekly_rate_idr > 0),
  add column if not exists rental_monthly_rate_idr int
    check (rental_monthly_rate_idr is null or rental_monthly_rate_idr > 0),
  add column if not exists rental_min_days int not null default 1
    check (rental_min_days >= 1);

-- 3. Discovery index for the rental marketplace queries
-- ----------------------------------------------------------------------------
create index if not exists idx_drivers_rental
  on public.drivers (vehicle_type, rental_type)
  where rental_daily_rate_idr is not null;

create index if not exists idx_mock_drivers_rental
  on public.mock_drivers (vehicle_type, rental_type)
  where rental_daily_rate_idr is not null and mock_hidden_at is null;

-- 4. Expose new rental columns on the public view (mig 0067 / 0096)
-- ----------------------------------------------------------------------------
-- Postgres can't reorder existing view columns inside CREATE OR REPLACE,
-- so the rental_* columns are APPENDED at the end of the column list
-- — same approach as migration 0096.
create or replace view public.drivers_public
  with (security_invoker = true)
as
  select
    user_id, slug, business_name, bio, whatsapp_e164,
    brand_logo_url, city, area,
    service_zone_center_lat, service_zone_center_lng, service_zone_radius_km,
    status, availability,
    current_lat, current_lng, current_location_updated_at,
    last_active_at,
    bike_make, bike_model, bike_year, bike_color, bike_plate,
    bike_type, bike_cc, has_box,
    services, price_per_km, min_fee, pitstop_fee,
    accepts_cash, accepts_qr, accepts_transfer,
    -- OMITTED: qr_payment_url, transfer_details (payment instruments)
    rating, trips_count,
    created_at, updated_at,
    online_until, session_started_at,
    referral_code, referrer_driver_id,
    business_contract_enabled, business_max_parcels_per_day,
    business_services, business_notes, business_enabled_at,
    b2b_score, b2b_tier, b2b_score_updated_at,
    tour_guide_enabled, tour_guide_day_rate_idr, tour_guide_languages,
    tour_guide_notes, tour_guide_enabled_at,
    partner_program_status, partner_suspended_at, partner_suspended_reason,
    booking_alerts_enabled, booking_alerts_consented_at,
    vehicle_type,
    vehicle_make, vehicle_model, vehicle_year,
    vehicle_color, vehicle_plate, vehicle_seats,
    vehicle_photos,
    paid_until,
    -- NEW (mig 0097): rental product columns
    rental_type,
    rental_daily_rate_idr,
    rental_weekly_rate_idr,
    rental_monthly_rate_idr,
    rental_min_days
  from public.drivers;

grant select on public.drivers_public to anon, authenticated;

-- 5. Helpful comments
-- ----------------------------------------------------------------------------
comment on column public.drivers.rental_type is
  'Discriminator for the rental marketplaces: NULL = no rental offered, '
  '"self_drive" = lepas kunci (customer drives), "with_driver" = by-day '
  'hire with chauffeur, "both" = driver offers either model. Surfaced '
  'as a filter chip on /rentals/* marketplaces.';

comment on column public.drivers.rental_daily_rate_idr is
  'Self-published daily rental rate in IDR. NULL = driver does not offer '
  'rental. Used by /rentals/* marketplaces to filter listings + display '
  'the "From Rp X/day" pricing. IndoCity never sets or modifies this.';
