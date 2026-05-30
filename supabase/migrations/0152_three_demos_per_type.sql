-- ============================================================================
-- 0152 — Bump demo mocks from 1 to 3 per vehicle type
-- ----------------------------------------------------------------------------
-- Migration 0151 hid the mock pool down to 1 visible demo per vehicle
-- type, which made the booking page (/cari) look empty when no real
-- drivers were active for a vehicle. Founder wants 3 demos per type so
-- the marketplace reads as populated.
--
-- Auto-hide behaviour: the `trg_hide_mock_on_real_driver_signup`
-- trigger un-hides one mock per real driver insert of the matching
-- vehicle_type, so the 3 demos still fade out as real supply grows.
-- ============================================================================

-- Hide all mocks first
update public.mock_drivers
   set mock_hidden_at = now()
 where mock_hidden_at is null;

-- Un-hide 3 polished demos per vehicle type
update public.mock_drivers
   set mock_hidden_at = null
 where slug in (
   -- Bike (3)
   'demo-andi-cb',
   'demo-budi-beat',
   'demo-citra-scoopy',
   -- Car (3)
   'dwi-toyota-innova-jogja',
   'budi-toyota-avanza-yogya',
   'siti-honda-mobilio-sleman',
   -- Truck (3)
   'l300-pickup-pindahan-yogya',
   'carry-pickup-bali-helper',
   'hino-engkel-box-sleman'
 );

-- Ensure all 9 demos are 'online' + rated highly so they sort first
update public.mock_drivers
   set availability = 'online',
       rating       = coalesce(nullif(rating, 0), 4.8)
 where mock_hidden_at is null;

-- ============================================================================
-- POST-CONDITIONS
--   • mock_drivers visible count = 9 (3 per vehicle_type)
--   • All 9 have availability='online'
--   • trg_hide_mock_on_real_driver_signup will fade them out one-by-one
--     as real drivers join for each vehicle type
-- ============================================================================
