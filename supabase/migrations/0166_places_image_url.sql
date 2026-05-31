-- =============================================================================
-- 0166 — places.image_url for tour-card thumbnails
-- =============================================================================
-- Founder spec 2026-05-31: driver tour packages auto-pick a thumbnail
-- from the first place_slug → places.image_url. Driver can still upload
-- their own photo via driver_tour_packages.photo_url which overrides.
--
-- Image source priority (rendered by ToursTabContent):
--   1. driver_tour_packages.photo_url (driver upload — wins if set)
--   2. places[place_slugs[0]].image_url (curated platform thumbnail)
--   3. null → card shows no image
-- =============================================================================

alter table public.places
  add column if not exists image_url text;

comment on column public.places.image_url is
  'Curated thumbnail URL shown on driver tour cards when the driver does not upload their own photo. Hosted on ImageKit; set via /admin/places editor or seeded SQL.';
