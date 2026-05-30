-- ============================================================================
-- 0151 — Curate demo mocks to 1 polished driver per vehicle type
-- ----------------------------------------------------------------------------
-- The customer-facing booking page (/cari) and parcel hub (/cityriders/
-- parcel) merge the real `drivers` table with `mock_drivers` so the
-- marketplace looks populated at launch. Founder direction: surface
-- ONE polished demo per vehicle type instead of the seeded pool of
-- 16+ mocks (5 bike + 8 car + 3 truck + 3 minibus). When a real
-- driver signs up, the `trg_hide_mock_on_real_driver_signup` trigger
-- auto-hides one mock per matching vehicle_type, so the 3 demos
-- naturally fade out as real supply grows.
--
-- Kept (mock_hidden_at = NULL):
--   • Bike  → demo-andi-cb          (Honda CB150R · 'person' + 'parcel')
--   • Car   → dwi-toyota-innova-jogja (Toyota Innova Reborn)
--   • Truck → l300-pickup-pindahan-yogya (Mitsubishi L300 Pickup)
--
-- All other mock_drivers rows: mock_hidden_at = NOW().
-- ============================================================================

-- 1. Hide everyone first
update public.mock_drivers
   set mock_hidden_at = now()
 where mock_hidden_at is null;

-- 2. Un-hide the three chosen demos
update public.mock_drivers
   set mock_hidden_at = null
 where slug in (
   'demo-andi-cb',
   'dwi-toyota-innova-jogja',
   'l300-pickup-pindahan-yogya'
 );

-- 3. Make sure the 3 demos have rich-enough data for a polished render.
--    Each gets a rating + ensures availability is 'online' so they
--    sort first in /cari and /cityriders/parcel.

update public.mock_drivers
   set availability = 'online',
       rating       = 4.9,
       bio          = 'Demo driver — CityRiders directory showcase. Will hide automatically once real drivers join for this vehicle type.'
 where slug = 'demo-andi-cb'
   and (rating is null or rating < 4.7);

update public.mock_drivers
   set availability = 'online',
       rating       = 4.8,
       bio          = 'Demo driver — CityRiders directory showcase. Will hide automatically once real drivers join for this vehicle type.'
 where slug = 'dwi-toyota-innova-jogja'
   and (rating is null or rating < 4.7);

update public.mock_drivers
   set availability = 'online',
       rating       = 4.8,
       bio          = 'Demo driver — CityRiders directory showcase. Will hide automatically once real drivers join for this vehicle type.'
 where slug = 'l300-pickup-pindahan-yogya'
   and (rating is null or rating < 4.7);

-- ============================================================================
-- POST-CONDITIONS
--   • mock_drivers visible count = 3 (one per vehicle_type)
--   • All 3 have availability='online', rating ≥ 4.8
--   • trg_hide_mock_on_real_driver_signup will auto-hide on next real
--     driver insert for the matching vehicle_type
-- ============================================================================
