-- ============================================================================
-- theme_color across the remaining 5 service verticals
-- ----------------------------------------------------------------------------
-- Beautician got per-provider theme_color in migration 0078. Bringing the
-- same column to handyman, laundry, massage, home-clean, and tour-guide so
-- the unified <UniversalProviderCard> can apply per-provider accents on
-- their profile pages. (The marketplace cards themselves stay City Riders
-- brand-yellow for grid coherence — same policy as the beautician
-- marketplace.)
--
-- Each column is text + nullable + checked against the standard hex
-- pattern. Defaults to the City Riders brand yellow so existing rows have
-- a sensible non-null fallback.
-- ============================================================================

-- handyman -----------------------------------------------------------------
alter table public.handyman_providers
  add column if not exists theme_color text default '#FACC15';

alter table public.handyman_providers
  drop constraint if exists handyman_theme_color_hex;
alter table public.handyman_providers
  add constraint handyman_theme_color_hex
  check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$');

comment on column public.handyman_providers.theme_color is
  'Hex #RRGGBB. Per-handyman accent — left border, avatar ring, profile CTA on their /handyman/[slug] page. Marketplace card stays brand-yellow.';

-- laundry ------------------------------------------------------------------
alter table public.laundry_providers
  add column if not exists theme_color text default '#FACC15';

alter table public.laundry_providers
  drop constraint if exists laundry_theme_color_hex;
alter table public.laundry_providers
  add constraint laundry_theme_color_hex
  check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$');

comment on column public.laundry_providers.theme_color is
  'Hex #RRGGBB. Per-laundry accent for the /laundry/[slug] profile.';

-- massage ------------------------------------------------------------------
alter table public.massage_providers
  add column if not exists theme_color text default '#FACC15';

alter table public.massage_providers
  drop constraint if exists massage_theme_color_hex;
alter table public.massage_providers
  add constraint massage_theme_color_hex
  check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$');

comment on column public.massage_providers.theme_color is
  'Hex #RRGGBB. Per-therapist accent for the /massage/[slug] profile.';

-- home-clean ---------------------------------------------------------------
alter table public.home_clean_providers
  add column if not exists theme_color text default '#FACC15';

alter table public.home_clean_providers
  drop constraint if exists home_clean_theme_color_hex;
alter table public.home_clean_providers
  add constraint home_clean_theme_color_hex
  check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$');

comment on column public.home_clean_providers.theme_color is
  'Hex #RRGGBB. Per-cleaner accent for the /home-clean/[slug] profile.';

-- tour-guide ---------------------------------------------------------------
alter table public.tour_guide_listings
  add column if not exists theme_color text default '#FACC15';

alter table public.tour_guide_listings
  drop constraint if exists tour_guide_theme_color_hex;
alter table public.tour_guide_listings
  add constraint tour_guide_theme_color_hex
  check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$');

comment on column public.tour_guide_listings.theme_color is
  'Hex #RRGGBB. Per-tour-guide accent for the /tour/[slug] profile.';
