-- ============================================================================
-- 0122 — Bring `places` up to beautician column parity for the shared dashboard
-- ----------------------------------------------------------------------------
-- The template pivot (2026-05-29) introduces a SHARED ProviderDashboard
-- component driven by a per-category config. To mount it on /places, the
-- table needs the same field set every provider table already has.
--
-- We keep `places`-specific column names (image_urls, hours_json, lat/lng,
-- name) intact — the dashboard config maps logical-field-name → column-name
-- per category, so no breaking renames. Only ADD what's missing.
--
-- Skipped (already present under different names):
--   hours_json           ← acts as operating_hours
--   image_urls           ← acts as gallery_image_urls
--   lat / lng            ← act as latitude / longitude
--   name                 ← acts as display_name
-- ============================================================================

alter table public.places
  add column if not exists hero_text         jsonb,
  add column if not exists promo_text        text,
  add column if not exists theme_color       text,
  add column if not exists business_name     text,
  add column if not exists service_photos    jsonb        default '{}'::jsonb,
  add column if not exists instagram_url     text,
  add column if not exists tiktok_url        text,
  add column if not exists facebook_url      text,
  add column if not exists languages         text[]       default '{}'::text[],
  add column if not exists certifications    text[]       default '{}'::text[],
  add column if not exists profile_image_url text,
  add column if not exists cover_image_url   text,
  add column if not exists bio               text,
  add column if not exists dietary_tags      text[]       default '{}'::text[],
  add column if not exists price_tier        text;

-- price_tier — $/$$/$$$ marketing badge for food venues.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'places_price_tier_check'
  ) then
    alter table public.places
      add constraint places_price_tier_check
      check (price_tier is null or price_tier in ('budget','mid','upscale'));
  end if;
end$$;

-- promo_text length cap — keep marquee snappy (mirror mig 0089 handyman cap).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'places_promo_text_len'
  ) then
    alter table public.places
      add constraint places_promo_text_len
      check (promo_text is null or char_length(promo_text) <= 280);
  end if;
end$$;

-- service_photos sanity — must be a JSON object (keyed by sub-type label),
-- mirroring beautician/home_clean shape, NOT a flat array.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'places_service_photos_object'
  ) then
    alter table public.places
      add constraint places_service_photos_object
      check (jsonb_typeof(service_photos) = 'object');
  end if;
end$$;
