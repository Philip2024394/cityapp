-- ============================================================================
-- 0200 — Replace Tata's lash portfolio placeholder URLs with real stock images.
-- ----------------------------------------------------------------------------
-- Migration 0199 seeded the three lash services with placeholder URLs that
-- reused Tata's card/hero image (two of three entries shared the same URL).
-- This migration swaps the `url` field of each lashes[] entry for a distinct,
-- license-free Unsplash CDN image that visually represents the service.
--
-- Image picks (all Unsplash License — free for commercial use, no attribution
-- required):
--   • Lash Design          — Milky Way Lashes, close-up of long extension
--                            lashes on an eye (photo-1639629509821-...)
--   • Lash Curling (Lift)  — Egor Vikhrev, close-up of blue eyes showing
--                            lifted natural lashes (photo-1587910234573-...)
--   • Lash Repair / Refill — Bermix Studio, woman receiving lash treatment
--                            from artist (photo-1674049406467-...)
--
-- Only the `url` field changes; name, description, and price_idr are
-- preserved exactly as set in 0199.
-- ============================================================================

update public.beautician_providers
   set service_photos = jsonb_set(
         jsonb_set(
           jsonb_set(
             service_photos,
             '{lashes,0,url}',
             to_jsonb('https://images.unsplash.com/photo-1639629509821-c54cdd984227?fm=jpg&q=80&w=1600&auto=format&fit=crop'::text)
           ),
           '{lashes,1,url}',
           to_jsonb('https://images.unsplash.com/photo-1587910234573-d6fc84743bc8?fm=jpg&q=80&w=1600&auto=format&fit=crop'::text)
         ),
         '{lashes,2,url}',
         to_jsonb('https://images.unsplash.com/photo-1674049406467-824ea37c7184?fm=jpg&q=80&w=1600&auto=format&fit=crop'::text)
       )
 where slug = 'demo-bp-tata';
