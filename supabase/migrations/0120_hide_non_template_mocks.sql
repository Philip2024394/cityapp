-- ============================================================================
-- 0120 — Hide every non-template mock so each category renders ONE card
-- ----------------------------------------------------------------------------
-- Founder direction (2026-05-29): the marketplace is now a template gallery,
-- not a directory of people. Each vertical should display exactly the
-- enriched template profile defined in mig 0111-0119. Sets mock_hidden_at
-- on every other visible mock; the existing hide-flag pattern (mig 0049)
-- already filters these out of marketplace queries. A real signup later
-- still triggers the per-table un-hide trigger as before.
-- Beautician keeps TWO templates visible — Dewi (makeup) and Ayu (nails).
-- ============================================================================

update public.beautician_providers
   set mock_hidden_at = now()
 where is_mock = true
   and mock_hidden_at is null
   and slug not in ('demo-bp-dewi','demo-bp-ayu');

update public.massage_providers
   set mock_hidden_at = now()
 where is_mock = true
   and mock_hidden_at is null
   and slug <> 'demo-sari';

update public.laundry_providers
   set mock_hidden_at = now()
 where is_mock = true
   and mock_hidden_at is null
   and slug <> 'demo-lp-cepat';

update public.handyman_providers
   set mock_hidden_at = now()
 where is_mock = true
   and mock_hidden_at is null
   and slug <> 'demo-hp-pak-joko';

update public.home_clean_providers
   set mock_hidden_at = now()
 where is_mock = true
   and mock_hidden_at is null
   and slug <> 'demo-hc-bu-siti';

update public.mock_tour_guide_listings
   set mock_hidden_at = now()
 where mock_hidden_at is null
   and slug <> 'demo-yusuf-jogja-history';

update public.mock_bike_rentals
   set mock_hidden_at = now()
 where mock_hidden_at is null
   and slug <> 'demo-cb150r-2024';
