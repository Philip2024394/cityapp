-- ============================================================================
-- 0054 — Tour guide three-state availability
-- ----------------------------------------------------------------------------
-- Replaces the binary `available_now` with a three-state `availability`
-- column matching the massage_providers + drivers convention:
--   online   → green pulsing dot on the marketplace card
--   busy     → orange dot
--   offline  → orange dot (hidden? still listed but capped)
-- ============================================================================

alter table public.tour_guide_listings
  add column if not exists availability text not null default 'online'
    check (availability in ('online','busy','offline'));

alter table public.mock_tour_guide_listings
  add column if not exists availability text not null default 'online'
    check (availability in ('online','busy','offline'));

-- Seed variety into the mocks so the UI shows all three states.
update public.mock_tour_guide_listings set availability = 'online'  where slug = 'demo-made-bali-temples';
update public.mock_tour_guide_listings set availability = 'busy'    where slug = 'demo-ketut-volcano';
update public.mock_tour_guide_listings set availability = 'online'  where slug = 'demo-yusuf-jogja-history';
update public.mock_tour_guide_listings set availability = 'offline' where slug = 'demo-pak-eko-batik';
