-- ============================================================================
-- 0129 — Bike rentals: WYSIWYG profile-editor parity columns
-- ----------------------------------------------------------------------------
-- Brings bike_rentals up to the same profile-editor parity as beautician
-- (mig 0078 + 0081 + 0082) and handyman (mig 0087 + 0091). Drives the new
-- WYSIWYG live-editor at /dashboard/rentals/edit (clone of
-- /dashboard/beautician/edit) so the owner can pick a theme, customise the
-- hero overlay, write a marquee promo, and tag a single bike_type as their
-- services_offered discriminator.
--
-- All columns are nullable so existing rows keep working and the public
-- profile falls back to the global rent defaults at render time.
-- ============================================================================

alter table public.bike_rentals
  add column if not exists theme_color      text,
  add column if not exists hero_text        jsonb,
  add column if not exists promo_text       text,
  add column if not exists services_offered text[] default '{}';

alter table public.bike_rentals
  drop constraint if exists bike_rentals_theme_color_check,
  add  constraint bike_rentals_theme_color_check check (
    theme_color is null
    or theme_color ~ '^#[0-9A-Fa-f]{6}$'
  );

comment on column public.bike_rentals.theme_color is
  'Hex #RRGGBB. Per-rental accent — drives the /rent/[slug] hero overlay, contact button, and badge ring. NULL = global rent yellow default.';
comment on column public.bike_rentals.hero_text is
  'Customisable hero overlay (line1, line2, tagline, color, line1_color, tagline_color, effect). NULL = global rent defaults.';
comment on column public.bike_rentals.promo_text is
  'Running marquee text under the photo carousel. ≤500 chars. NULL = hidden.';
comment on column public.bike_rentals.services_offered is
  'Single-element discriminator array carrying bike_type (matic, sport, ...). Kept as text[] for parity with beautician + handyman.';
