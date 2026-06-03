-- ============================================================================
-- 0190_beautician_visit_us_enabled.sql
-- ----------------------------------------------------------------------------
-- Adds a per-provider toggle that, when enabled, surfaces a "Visit us /
-- Get a ride" card on the public /beautician/[slug] page. Customer picks
-- Bike or Car, deep-links to /cari with the SALON address pre-filled as
-- dropoff (inverse of the places.delivery_enabled flow which pre-fills
-- pickup at the venue).
--
-- Founder direction 2026-06-03: same Path A safe pattern used for
-- restaurants — Bike + Car CTAs that hand off to /cari, customer picks
-- a specific driver from the list, agrees fare on WhatsApp.
--
-- PM 12/2019 directory posture (see memory
-- project_kita2u_to_citydrivers_handoff.md):
--   - Customer picks the driver explicitly (no platform appointment).
--   - Each driver's estimate is THEIR published rate × distance.
--   - "Get a ride" is a WhatsApp handoff (no DB booking record).
--   - Customer pays driver direct on arrival (no fund custody).
--
-- Toggle is gated in the dashboard UI to providers that have already
-- pinned a salon location (has_physical_location AND latitude AND
-- longitude). A provider without a pinned address can't enable it
-- because the deep link would have nothing to fill in.
--
-- Default false on existing rows.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists visit_us_enabled boolean not null default false;

comment on column public.beautician_providers.visit_us_enabled is
  'When true, /beautician/[slug] renders a "Visit us / Get a ride" card with Bike + Car CTAs deep-linking to /cari with the salon address pre-filled as dropoff. Owner-controlled. Dashboard UI gates the toggle on (has_physical_location AND latitude IS NOT NULL AND longitude IS NOT NULL).';
