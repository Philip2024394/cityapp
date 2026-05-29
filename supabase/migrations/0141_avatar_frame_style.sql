-- ============================================================================
-- 0141 — Animated avatar frame style on beautician_providers
-- ----------------------------------------------------------------------------
-- Adds a single text column controlling the animated ring rendered around
-- the beautician's profile avatar on the prominent public-profile hero
-- card. Default 'none' keeps existing rows visually unchanged. A CHECK
-- constraint pins the value to one of four well-known styles so the
-- client renderer (src/components/profile/AvatarFrame.tsx) never has to
-- defend against unknown strings.
--
-- Styles:
--   none     → plain 2px solid ring in the profile's theme color
--   gradient → Instagram-story-style conic gradient (pink → orange →
--              yellow → orange → pink), static
--   pulse    → solid theme-color ring with a 2s pulsing box-shadow
--   rainbow  → spinning conic-gradient ring (red → orange → yellow →
--              green → blue → purple → red), 8s rotation
--
-- The dashboard "Avatar frame" picker (src/app/dashboard/beautician/edit
-- /page.tsx) writes through /api/beautician/me/profile, which delegates
-- shared field validation to src/lib/validation/universalProfile.ts.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists avatar_frame_style text not null default 'none';

alter table public.beautician_providers
  drop constraint if exists beautician_providers_avatar_frame_style_check;

alter table public.beautician_providers
  add constraint beautician_providers_avatar_frame_style_check
  check (avatar_frame_style in ('none','gradient','pulse','rainbow'));

comment on column public.beautician_providers.avatar_frame_style is
  'Drives the animated ring around the profile avatar on the public '
  'profile hero card. One of: none, gradient, pulse, rainbow. Default '
  '''none'' keeps the avatar visually unchanged. Renderer lives in '
  'src/components/profile/AvatarFrame.tsx.';

-- ============================================================================
-- POST-CONDITIONS
--   • All existing beautician rows have avatar_frame_style = 'none' and
--     render identically to before this migration.
--   • Dashboard editor exposes a 4-tile picker; public profile uses the
--     AvatarFrame client component which respects prefers-reduced-motion
--     for the pulse + rainbow animations.
-- ============================================================================
