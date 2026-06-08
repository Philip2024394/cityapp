-- ============================================================================
-- 0197 — Demo beautician Dewi: swap card + hero/banner images.
-- ----------------------------------------------------------------------------
-- Card image (profile_image_url) is what shows on /beautician marketplace
-- listings. cover_image_url is the hero banner on the per-profile page.
-- Mirrors mig 0196 for Ayu — same target row pattern (slug = 'demo-bp-…')
-- so the seed/demo state stays consistent across the two visible cards.
-- ============================================================================

update public.beautician_providers
   set profile_image_url = 'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_06_35%20PM.png',
       cover_image_url   = 'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_05_01%20PM.png'
 where slug = 'demo-bp-dewi';
