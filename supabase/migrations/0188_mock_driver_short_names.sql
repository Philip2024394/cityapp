-- ============================================================================
-- 0188_mock_driver_short_names.sql
-- ----------------------------------------------------------------------------
-- Shorten the mock driver display names that were keyword-stuffed with
-- vehicle type / city / marketing words. Founder feedback Jun 2026: long
-- names like "Pak Bambang Adventure Jeep Yogya" overflow the floating
-- info card on mobile and render as "Pak Bambang Adv…", which looks bad.
-- The hero overlay already calls out "Adventure" / vehicle type / city,
-- so the name field should carry only the operator's actual name.
--
-- Dashboard /info pages now cap business_name at 32 chars on input (with
-- a hint about not stuffing keywords). This migration trims existing
-- mock seed rows so the demo profiles read tidy without waiting for an
-- owner to edit them.
--
-- Only mock_drivers rows are touched. Real `drivers` rows are left alone
-- — the input cap nudges new sign-ups, existing real drivers can
-- self-edit from /dashboard/<vehicle>/info.
-- ============================================================================

update public.mock_drivers
   set business_name = 'Pak Yusuf'
 where slug = 'demo-jeep-yusuf-bromo-yogya';

update public.mock_drivers
   set business_name = 'Pak Wahyu'
 where slug = 'demo-jeep-wahyu-merapi-yogya';

update public.mock_drivers
   set business_name = 'Pak Bambang'
 where slug = 'demo-jeep-bambang-adventure-yogya';

-- Minibus mock — 0095_minibus_mock_drivers.sql seeded
-- "Wahyu Toyota Avanza Rombongan" (29 chars). Strip the trailing two
-- words; vehicle make / model already shows in the profile header.
update public.mock_drivers
   set business_name = 'Pak Wahyu Avanza'
 where business_name = 'Wahyu Toyota Avanza Rombongan';
