-- ============================================================================
-- 0135 — Property-only backfill: socials (mig 0130) + chat handles (mig 0132)
-- ----------------------------------------------------------------------------
-- The property vertical (table public.property_listings, added in mig 0126)
-- was created AFTER the propagation pass that added x_url / snapchat_url /
-- website_url (mig 0130) and telegram_handle / wechat_id / line_id /
-- kakaotalk_id (mig 0132) to the other 7 provider tables. It missed both
-- of those passes by being too new.
--
-- This migration is a property-only catch-up so the shared VisitUsPanel
-- and the public profile page can render all 11 contact / social buttons
-- for property listings the same way they do for beautician / handyman /
-- massage / etc. All columns are nullable text — null = "not set" = the
-- corresponding icon button is hidden on the public profile.
--
-- No RLS changes (new columns inherit existing row policies).
-- No DML — backfill is schema-only.
-- ============================================================================

alter table public.property_listings
  add column if not exists x_url        text,
  add column if not exists snapchat_url text,
  add column if not exists website_url  text,
  add column if not exists telegram_handle text,
  add column if not exists wechat_id       text,
  add column if not exists line_id         text,
  add column if not exists kakaotalk_id    text;

-- ============================================================================
-- POST-CONDITIONS
--   • property_listings now matches the universal-profile column set across
--     all 8 provider tables: instagram_url, tiktok_url, facebook_url, x_url,
--     snapchat_url, website_url, telegram_handle, wechat_id, line_id,
--     kakaotalk_id (whatsapp_e164 already existed since mig 0126).
--   • /api/property/[slug]/public must add the 7 new columns to its
--     PUBLIC_COLS projection so the public page receives them.
--   • The shared validator (src/lib/validation/universalProfile.ts) already
--     covers these columns from migs 0130 + 0132 — no validator change.
-- ============================================================================
