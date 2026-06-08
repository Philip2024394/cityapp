-- ============================================================================
-- 0196 — Replace demo-bp-ayu profile_image_url with new ImageKit asset
-- ----------------------------------------------------------------------------
-- Single-string swap on Ayu's profile image only. Other mocks (Dewi, Rina,
-- Mira) untouched. New asset is the ChatGPT-generated portrait at the pinky
-- ImageKit folder.
-- ============================================================================

update public.beautician_providers set
  profile_image_url = 'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_01_40%20PM.png',
  updated_at        = now()
where slug = 'demo-bp-ayu';
