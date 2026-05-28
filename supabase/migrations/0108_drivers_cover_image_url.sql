-- 0108 — Drivers: cover_image_url for per-driver banner picker
--
-- Adds a nullable cover_image_url column to public.drivers and
-- public.mock_drivers so each driver can pick a hero backdrop on their
-- profile page (rendered by DriverProfileShell). When NULL, the shell
-- falls back to the vehicle-type default (DEFAULT_BIKE_HERO /
-- DEFAULT_CAR_HERO).
--
-- IDEMPOTENT: uses `add column if not exists` on both tables so the
-- migration can be re-run safely. No RLS change — the column lives on
-- tables that already have RLS configured upstream.

alter table public.drivers
  add column if not exists cover_image_url text;

alter table public.mock_drivers
  add column if not exists cover_image_url text;

comment on column public.drivers.cover_image_url is
  'Optional per-driver hero backdrop URL for the public profile page. '
  'NULL falls back to vehicle-type default in DriverProfileShell.';
comment on column public.mock_drivers.cover_image_url is
  'Optional per-driver hero backdrop URL for the public profile page. '
  'NULL falls back to vehicle-type default in DriverProfileShell.';

-- Expose cover_image_url on drivers_public so the public /car/[slug] +
-- /r/[slug] SELECTs (and the alternatives list inside DriverProfileShell)
-- can read it. Appended at the end of the column list to satisfy
-- Postgres's "can't reorder columns in replaced view" rule.
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
    -- NEW (migration 0108): optional per-driver hero backdrop URL.
    cover_image_url
  from public.drivers;

grant select on public.drivers_public to anon, authenticated;
