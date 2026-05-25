-- ============================================================================
-- 0078 — Beautician: per-profile theme color
-- ----------------------------------------------------------------------------
-- Lets every beautician brand their /beautician/[slug] profile page with
-- their own accent color. Drives the hero overlay "Beautician" word, the
-- floating share/reviews/contact buttons, the Top Rated Seller badge,
-- the service-filter chips, and the carousel View Details button.
--
-- Stored as a hex string (#RRGGBB). Validated with a regex CHECK so
-- only valid hex colors land. NULL = fall back to the global default
-- pink (#EC4899) at render time.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists theme_color text;

alter table public.beautician_providers
  drop constraint if exists beautician_providers_theme_color_check,
  add  constraint beautician_providers_theme_color_check check (
    theme_color is null
    or theme_color ~ '^#[0-9A-Fa-f]{6}$'
  );
