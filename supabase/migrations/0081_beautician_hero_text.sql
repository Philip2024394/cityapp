-- ============================================================================
-- 0081 — Beautician: customisable hero text
-- ----------------------------------------------------------------------------
-- Lets the beautician edit the 3-line hero overlay (Professional /
-- Beautician / tagline) instead of every profile showing the same
-- hardcoded copy. Stored as JSONB so we can extend without migrations:
--   {
--     "line1":   "Professional",         // small text top line
--     "line2":   "Beautician",           // bold middle line (themed color)
--     "tagline": "Enhancing your natural beauty",
--     "color":   "#EC4899",              // line2 color (defaults to theme)
--     "effect":  "none" | "glow" | "dance" | "flyin"
--   }
-- NULL = render the global defaults (Professional / Beautician /
-- "Enhancing your natural beauty effortless", themed color, no effect).
-- ============================================================================

alter table public.beautician_providers
  add column if not exists hero_text jsonb;
