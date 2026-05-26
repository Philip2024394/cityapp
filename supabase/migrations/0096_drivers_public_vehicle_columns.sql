-- ============================================================================
-- 0096 — drivers_public view: add vehicle_type + generic vehicle columns
-- ----------------------------------------------------------------------------
-- Migration 0092 added vehicle_type + vehicle_make/model/year/color/plate/
-- seats/photos + paid_until to public.drivers. The drivers_public view
-- (created in 0067, used by /cari/rider + every marketplace read) was
-- defined BEFORE those columns existed, so it currently doesn't expose
-- them — making it impossible to filter Bike vs Car drivers on the
-- public surface.
--
-- Postgres `create or replace view` cannot reorder columns, so the new
-- columns are APPENDED at the end of the existing column list. Payment
-- instruments (qr_payment_url, transfer_details) remain OMITTED for
-- the same security-protective reasons as 0067.
-- ============================================================================

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
    -- NEW (migration 0092): vehicle category discriminator + generic
    -- spec columns. Appended at the END to satisfy Postgres's
    -- can't-reorder-columns-in-replaced-view rule.
    vehicle_type,
    vehicle_make, vehicle_model, vehicle_year,
    vehicle_color, vehicle_plate, vehicle_seats,
    vehicle_photos,
    -- NEW (migration 0092): subscription gate (NULL or future date = active)
    paid_until
  from public.drivers;

grant select on public.drivers_public to anon, authenticated;

comment on view public.drivers_public is
  'Marketplace-safe projection of public.drivers. Excludes payment '
  'instruments (qr_payment_url, transfer_details). Exposes vehicle_type + '
  'generic vehicle spec from migration 0092 so /cari/rider can filter '
  'Bike vs Car vs Minibus on the public surface. paid_until is exposed so '
  'the marketplace can hide drivers whose subscription has lapsed.';
