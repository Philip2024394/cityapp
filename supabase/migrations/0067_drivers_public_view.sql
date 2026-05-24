-- ============================================================================
-- 0067 — `drivers_public` view (lock down qr_payment_url + transfer_details)
-- ----------------------------------------------------------------------------
-- Security audit flagged that drivers_select_public RLS policy allowed anon
-- to SELECT every column of every active driver — including the two payment
-- instruments (qr_payment_url + transfer_details). Bulk-scrapeable payment
-- QRs are a phishing-injection target (clone the driver's listing on a
-- third-party site, redirect payments).
--
-- Fix mirrors the partners + 5-provider lockdown (mig 0064) using a view
-- to filter columns rather than RLS (which is row-coarse). drivers needs
-- the view route because lib/drivers/queries.ts has 5 .from('drivers')
-- calls — 3 for marketplace browsing (switched to `drivers_public`) and
-- 2 for owner self-read (kept on `drivers`, gated by drivers_owner_read).
--
-- View columns: every public marketplace column EXCEPT:
--   • qr_payment_url     — payment instrument
--   • transfer_details   — payment instrument
-- All other intentionally-public fields stay (GPS, WhatsApp, last_active_at
-- — these are by-design for marketplace function, covered by the
-- prominent-disclosure modal when drivers tap "Go Online").
-- ============================================================================

-- ── 1. Create the view (security_invoker so underlying RLS still applies) ──
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
    booking_alerts_enabled, booking_alerts_consented_at
  from public.drivers;

comment on view public.drivers_public is
  'Marketplace-safe projection of public.drivers. Excludes payment instruments '
  '(qr_payment_url, transfer_details). Use this view for all anon + authenticated '
  'browser-side marketplace reads. The underlying table is restricted to owner '
  'access only via the drivers_owner_read RLS policy plus the SELECT revoke below.';

-- ── 2. Grant SELECT on the view to public roles ────────────────────────────
grant select on public.drivers_public to anon, authenticated;

-- ── 3. Drop the broad RLS that exposed all columns of active drivers ──────
drop policy if exists drivers_select_public on public.drivers;

-- ── 4. Revoke table SELECT from anon entirely ─────────────────────────────
-- Anon now has zero direct access to the drivers table — only the view.
revoke select on public.drivers from anon;

-- Authenticated KEEPS table SELECT so drivers_owner_read RLS can grant
-- the owner access to their full row (qr_payment_url, transfer_details
-- included — they need to edit those on the dashboard). RLS limits row
-- visibility to user_id = auth.uid(), so other authenticated users still
-- cannot see anyone else's payment methods.

-- ============================================================================
-- POST-CONDITIONS
--   • Anon browser: cannot directly query drivers; must use drivers_public
--     view (no qr_payment_url, no transfer_details).
--   • Authenticated browser: same view for browsing; direct .from('drivers')
--     returns only their own row (drivers_owner_read).
--   • Service role: unchanged — bypasses RLS + grants.
--   • Code change in lib/drivers/queries.ts: marketplace + slug + tour-guide
--     reads switched to .from('drivers_public') in the same commit.
-- ============================================================================
