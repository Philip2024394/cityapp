-- ============================================================================
-- 0182_drivers_public_snoozed_until.sql — expose snoozed_until on the view
-- ----------------------------------------------------------------------------
-- Migration 0181 added drivers.snoozed_until. The drivers_public view (mig
-- 0067) doesn't auto-pick-up new columns — it's an explicit SELECT list.
-- This migration recreates the view with snoozed_until included so the
-- marketplace browser query can read it and the listing sort can put
-- snoozed drivers at the bottom of the randomised cards.
--
-- snoozed_until is a timestamp signal only — no PII risk in exposing it to
-- anon (it is functionally equivalent to "availability=offline" for the
-- public view layer; it just carries an expiry).
--
-- 2026-06-02 redo: the original 0182 SELECT list was copied from 0067 and
-- missed the multi-vehicle + paid_until + bike_photo_url columns added by
-- later out-of-band migrations (0092 / 0162 / 0174). CREATE OR REPLACE VIEW
-- refuses to drop existing columns, so the migration failed. This version
-- enumerates EVERY column that currently exists on the cloud view PLUS
-- snoozed_until at the end. Future column additions to drivers should
-- update this view too, otherwise marketplace reads won't see them.
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
    -- Multi-vehicle columns (mig 0092, 0162) — preserved from cloud state
    vehicle_type, vehicle_make, vehicle_model, vehicle_year, vehicle_color,
    vehicle_plate, vehicle_seats, vehicle_photos,
    -- Trial / pricing (mig 0174) — preserved from cloud state
    paid_until,
    -- Legacy bike photo (mig pre-0067 add) — preserved from cloud state
    bike_photo_url,
    -- NEW (this migration) — the driver-initiated self-snooze flag
    snoozed_until
  from public.drivers;

grant select on public.drivers_public to anon, authenticated;
