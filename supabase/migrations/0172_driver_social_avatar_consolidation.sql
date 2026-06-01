-- ============================================================================
-- 0172_driver_social_avatar_consolidation.sql
-- ----------------------------------------------------------------------------
-- Adds the three social-URL columns that BusContactUsPanel +
-- UniversalProfileExtrasEditor already read defensively. Mirrors the
-- column set added on the service-provider verticals (mig 0072 / 0130)
-- so every dashboard reads the same social-link contract.
--
-- No backfill — defaults to NULL. Idempotent via IF NOT EXISTS so reruns
-- against an already-applied environment are no-ops.
-- ============================================================================

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url    text,
  ADD COLUMN IF NOT EXISTS facebook_url  text;

ALTER TABLE public.mock_drivers
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url    text,
  ADD COLUMN IF NOT EXISTS facebook_url  text;
