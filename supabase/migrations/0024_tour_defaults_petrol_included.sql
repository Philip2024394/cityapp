-- ============================================================================
-- 0024_tour_defaults_petrol_included.sql
-- ----------------------------------------------------------------------------
-- Updates bike+driver tour defaults to be COMPETITIVE WITH MARKET (after
-- May 2026 research against Klook, Viator, GetYourGuide, Canggu Rent
-- Scooter, Pamitran, Bahasa-IG ojek wisata operators):
--
--   3hr: 150,000 → 175,000 all-in (petrol bundled within ~30km radius)
--   6hr: 280,000 → 325,000 all-in
--   8hr: 350,000 → 425,000 all-in
--
-- Reasoning: previous defaults sat at the absolute Bahasa-IG informal
-- floor — below every OTA listing and below Bali market by 50%+. New
-- defaults still undercut Klook/Viator/GYG by 30-50% but let drivers
-- in Bali/Jakarta cover petrol + earn fairly.
--
-- "+ petrol" framing is unusual in the tourist market — Klook/Viator
-- bundle. We default fuel_included = true now and surface "+ petrol
-- over 30km" as an optional toggle on the editor instead.
--
-- Backfill rule: ONLY rows that still match the OLD defaults get bumped.
-- Custom rates set by drivers (anything other than exact 150k/280k/350k)
-- are left untouched.
-- ============================================================================

-- Bump rows that still match the old defaults
update public.bike_rentals
set tour_3h_idr = 175000
where rental_mode in ('with_driver','both') and tour_3h_idr = 150000;

update public.bike_rentals
set tour_6h_idr = 325000
where rental_mode in ('with_driver','both') and tour_6h_idr = 280000;

update public.bike_rentals
set tour_8h_idr = 425000
where rental_mode in ('with_driver','both') and tour_8h_idr = 350000;

-- Flip fuel_included to TRUE for any with_driver rentals where it's
-- still the migration-0023 default of false AND tour rates are at the
-- new bundled defaults (proxy for "this driver hasn't customised
-- anything"). Custom-rate drivers are left alone.
update public.bike_rentals
set fuel_included = true
where rental_mode in ('with_driver','both')
  and fuel_included = false
  and tour_3h_idr in (150000, 175000)
  and tour_6h_idr in (280000, 325000)
  and tour_8h_idr in (350000, 425000);
