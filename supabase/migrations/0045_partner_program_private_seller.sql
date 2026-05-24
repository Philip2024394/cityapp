-- ============================================================================
-- 0045 — Partner Program: add `private_seller` partner_type
-- ----------------------------------------------------------------------------
-- The original 0044 partner_type CHECK was venue-only (hotel/villa/restaurant
-- /cafe/spa/tour_operator/other). Independent individuals — drivers, agents,
-- private merchants — also want to sign up. Adding `private_seller` so the
-- dropdown can offer "Individual / Private seller" without forcing them
-- into the 'other' bucket.
-- ============================================================================

alter table public.partners
  drop constraint if exists partners_partner_type_check;

alter table public.partners
  add constraint partners_partner_type_check
  check (partner_type in (
    'hotel','villa','restaurant','cafe','spa','tour_operator','private_seller','other'
  ));
