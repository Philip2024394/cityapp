-- ============================================================================
-- 0159 — Schema reconciliation pass 1 (typed-client migration support)
-- ----------------------------------------------------------------------------
-- The typed Supabase client surfaced columns that application code reads/
-- writes but the live schema no longer exposes. See
-- docs/SUPABASE_TYPES_MIGRATION.md "Drift the typed client revealed". This
-- migration restores the columns flagged as confirmed-missing by the
-- compiler probe on 2026-05-30:
--
--   • drivers.bike_photo_url            — read in /r/[slug] real-driver branch
--   • tour_guide_listings.paid_until    — read in /admin/providers list
--
-- Plus the corresponding `drivers_public` view recreate to expose
-- bike_photo_url on the marketplace projection (consumed by the
-- alternative-bike-drivers loader in /r/[slug]).
--
-- All ADD COLUMN statements are idempotent (`if not exists`). NULL defaults
-- — existing rows are unaffected; downstream code already treats these as
-- nullable (`r.bike_photo_url ?? null` pattern throughout).
--
-- NO TABLE RENAMES, NO COLUMN DROPS. Strictly additive.
-- ============================================================================

-- ── 1. drivers.bike_photo_url ───────────────────────────────────────────────
-- Single hero photo of the bike (separate from cover_image_url which is the
-- driver's profile cover). Used by the bike-vertical card on /r/[slug] —
-- when set, it becomes the first photo in the rider's photo carousel.
alter table public.drivers
  add column if not exists bike_photo_url text;

comment on column public.drivers.bike_photo_url is
  'Optional hero photo of the bike, distinct from the driver''s profile cover. '
  'Used by /r/[slug] bike-vertical render. NULL = use cover_image_url fallback.';

-- ── 2. tour_guide_listings.paid_until ───────────────────────────────────────
-- Mirrors the same subscription gate other provider tables already have
-- (beautician_providers.paid_until, handyman_providers.paid_until, etc.).
-- NULL = legacy / grace; future date = active subscription; past date =
-- expired (will be hidden from /tour marketplace by the existing pricing/
-- grace logic once that path lands for tour guides).
alter table public.tour_guide_listings
  add column if not exists paid_until date;

comment on column public.tour_guide_listings.paid_until is
  'Tour-guide subscription expiry (date). Mirrors paid_until on other '
  '*_providers tables — NULL during the current free-listing phase. '
  'Surfaced on /admin/providers for the same workload view as other verticals.';

-- ── 3. Recreate drivers_public view to expose bike_photo_url ───────────────
-- Postgres can't ADD columns to an existing view via `create or replace` —
-- it requires same-shape replacement. Mirroring the pattern from 0096:
-- drop cascade + recreate. Payment instruments (qr_payment_url,
-- transfer_details) remain OMITTED for the same security reasons as 0067.
-- bike_photo_url is appended at the END to satisfy column-order rules.
drop view if exists public.drivers_public cascade;

create view public.drivers_public
  with (security_invoker = true) as
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
    -- NEW (0159): bike hero photo (read by /r/[slug] alt-driver loader)
    bike_photo_url
  from public.drivers;

grant select on public.drivers_public to anon, authenticated;

comment on view public.drivers_public is
  'Marketplace-safe projection of public.drivers. Excludes payment '
  'instruments (qr_payment_url, transfer_details). bike_photo_url added '
  'in mig 0159 so /r/[slug] can render the bike hero shot from anon reads.';

-- ============================================================================
-- POST-CONDITIONS
--   • drivers.bike_photo_url            — exists, nullable, no default
--   • tour_guide_listings.paid_until    — exists, nullable, no default
--   • drivers_public view               — recreated with bike_photo_url at end
--   • All prior columns + grants preserved
-- ============================================================================
