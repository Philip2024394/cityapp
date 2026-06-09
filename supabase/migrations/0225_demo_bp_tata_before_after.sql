-- ============================================================================
-- 0225 — Demo before/after pair on Tata's "Lash Design" portfolio entry.
-- ----------------------------------------------------------------------------
-- Task 9 of 12 in the Linktree-beat rollout: a first-class before/after
-- portfolio block. This migration converts Tata's first lash entry
-- (service_photos.lashes[0], "Lash Design") into a before/after demo so
-- the public profile shows the interactive BeforeAfterSlider on the
-- portfolio carousel card AND inside the View Details popup.
--
-- Image picks (HEAD-verified image/jpeg 200 OK, Unsplash License,
-- no plus.unsplash.com):
--   • BEFORE — Egor Vikhrev, close-up of natural blue eyes with sparse
--              lifted lashes (photo-1587910234573-d6fc84743bc8). Same
--              image proven by migration 0200 for the "Lash Curling"
--              service URL — natural eye lashes, no extensions.
--   • AFTER  — Milky Way Lashes, close-up of full extension lashes on
--              an eye (photo-1639629509821-c54cdd984227). Same image
--              already in use as the `url` field for this entry, so the
--              fallback static render stays consistent if a client
--              can't parse before/after for any reason.
--
-- The existing `url` field is preserved as the fallback / cover image.
-- Only the lashes[0] entry is touched — entries 1 (Lash Curling) and 2
-- (Lash Repair / Refill) remain as in 0200.
-- ============================================================================

update public.beautician_providers
   set service_photos = jsonb_set(
         jsonb_set(
           service_photos,
           '{lashes,0,before_image_url}',
           to_jsonb('https://images.unsplash.com/photo-1587910234573-d6fc84743bc8?fm=jpg&q=80&w=1600&auto=format&fit=crop'::text)
         ),
         '{lashes,0,after_image_url}',
         to_jsonb('https://images.unsplash.com/photo-1639629509821-c54cdd984227?fm=jpg&q=80&w=1600&auto=format&fit=crop'::text)
       )
 where slug = 'demo-bp-tata';
