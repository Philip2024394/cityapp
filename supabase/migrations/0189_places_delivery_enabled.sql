-- ============================================================================
-- 0189_places_delivery_enabled.sql
-- ----------------------------------------------------------------------------
-- Adds a per-place toggle that, when enabled, surfaces a CityDrivers
-- delivery widget on the public /places/[slug] page. Owner opts in via
-- the dashboard.
--
-- DISTINCT from places.free_delivery (mig 0103):
--   free_delivery     — venue arranges + pays for its OWN delivery
--                       (their staff, their cost, their fleet). Just
--                       a label on the public cart.
--   delivery_enabled  — venue accepts CityDrivers customers picking up
--                       orders. Public page renders a "Need delivery?"
--                       CTA that deep-links to /cari with the venue
--                       address pre-filled as pickup.
--
-- Owner can have both ON, both OFF, or either independently.
--
-- Default false. Existing rows keep their current "no delivery widget"
-- behaviour until the owner toggles it on.
--
-- COMPLIANCE (PM 12/2019 directory):
--   The widget never appoints trips, never sets fares, never custodies
--   funds. Customer picks a specific driver from /cari → WhatsApp handoff
--   with the full order context pre-typed. The driver's per-km published
--   rate × distance is shown PER-DRIVER (not as a single platform
--   estimate). See memory file `project_kita2u_to_citydrivers_handoff.md`
--   for the 3-rule pattern this implements.
-- ============================================================================

alter table public.places
  add column if not exists delivery_enabled boolean not null default false;

comment on column public.places.delivery_enabled is
  'When true, /places/[slug] renders a "Need delivery?" CTA deep-linking to /cari with venue address as pickup. Owner-controlled; gated in the dashboard UI to product-seller categories (restaurant, cafe, bar, club) so service categories (hospital, attraction, etc.) cannot accidentally enable it.';
