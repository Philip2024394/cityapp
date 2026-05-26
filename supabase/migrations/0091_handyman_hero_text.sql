-- ============================================================================
-- 0091 — Handyman: customisable hero text (mirrors beautician mig 0081)
-- ----------------------------------------------------------------------------
-- Lets the tukang edit the 3-line hero overlay instead of every profile
-- showing the same hardcoded copy. Same JSONB shape as
-- beautician_providers.hero_text so the shared profile component reads it
-- without per-vertical branches.
--   {
--     "line1":         "Professional",
--     "line2":         "Tukang",
--     "tagline":       "Skilled tradesman at your service",
--     "color":         "#FACC15",     // line2 colour (defaults to theme)
--     "line1_color":   "#000000",
--     "tagline_color": "#000000",
--     "effect":        "none" | "shimmer" | "dance" | "underline"
--   }
-- NULL = render the global handyman defaults (see /handyman/[slug]/page.tsx).
-- ============================================================================

alter table public.handyman_providers
  add column if not exists hero_text jsonb;
