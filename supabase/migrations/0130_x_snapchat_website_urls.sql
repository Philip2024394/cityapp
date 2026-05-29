-- ============================================================================
-- 0130 — X (Twitter) + Snapchat + Website URLs on all provider tables
-- ----------------------------------------------------------------------------
-- Adds three more social/web URL columns to the Universal Business Profile.
-- Mirrors the migration-0072 trio (instagram_url / tiktok_url / facebook_url)
-- across the same 7 service-provider tables. The shared VisitUsPanel renders
-- a conditional icon button when any of these URLs is non-empty; the shared
-- validator (src/lib/validation/universalProfile.ts) host-checks them per
-- platform so providers can't paste random URLs that the public page would
-- mislabel.
--
-- Per-table additions (text, nullable):
--   x_url         — twitter.com / x.com profile URL
--   snapchat_url  — snapchat.com profile URL
--   website_url   — provider's own website / custom domain
--
-- No defaults — null = "not set" = button hidden on the public profile.
-- ============================================================================

alter table public.bike_rentals
  add column if not exists x_url        text,
  add column if not exists snapchat_url text,
  add column if not exists website_url  text;

alter table public.tour_guide_listings
  add column if not exists x_url        text,
  add column if not exists snapchat_url text,
  add column if not exists website_url  text;

alter table public.massage_providers
  add column if not exists x_url        text,
  add column if not exists snapchat_url text,
  add column if not exists website_url  text;

alter table public.beautician_providers
  add column if not exists x_url        text,
  add column if not exists snapchat_url text,
  add column if not exists website_url  text;

alter table public.laundry_providers
  add column if not exists x_url        text,
  add column if not exists snapchat_url text,
  add column if not exists website_url  text;

alter table public.handyman_providers
  add column if not exists x_url        text,
  add column if not exists snapchat_url text,
  add column if not exists website_url  text;

alter table public.home_clean_providers
  add column if not exists x_url        text,
  add column if not exists snapchat_url text,
  add column if not exists website_url  text;

-- ============================================================================
-- POST-CONDITIONS
--   • All 7 provider tables now carry the full Visit-Us social/web URL set:
--     instagram_url, tiktok_url, facebook_url, x_url, snapchat_url, website_url.
--   • No RLS changes — new columns inherit existing row policies.
--   • Validator (src/lib/validation/universalProfile.ts) needs the matching
--     SOCIAL_HOST_RE entries for x/snapchat; website_url accepts any https URL.
-- ============================================================================
