-- ============================================================================
-- 0140 — Animated CTA button effect on beautician public profile
-- ----------------------------------------------------------------------------
-- Adds `cta_button_effect` to beautician_providers so the public profile's
-- primary WhatsApp/Book CTA can opt into a subtle animation. Drives:
--
--   none    — static, no animation (default; current behaviour)
--   pulse   — gentle scale 1 → 1.05 → 1, 2s loop
--   glow    — pulsing box-shadow in the provider's theme color, 2s loop
--   shake   — ±2px translate-x micro-nudge, 4s loop
--
-- Applies ONLY to the most prominent CTA (the Contact button under the
-- portfolio carousel). All animations honour prefers-reduced-motion in
-- the rendering layer.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists cta_button_effect text not null default 'none';

alter table public.beautician_providers
  drop constraint if exists beautician_providers_cta_button_effect_chk;

alter table public.beautician_providers
  add constraint beautician_providers_cta_button_effect_chk
  check (cta_button_effect in ('none','pulse','glow','shake'));

comment on column public.beautician_providers.cta_button_effect is
  'Drives the public profile primary WhatsApp/Book CTA animation. One of '
  'none|pulse|glow|shake. Set from the dashboard edit page; respects the '
  'viewer''s prefers-reduced-motion at render time.';

-- ============================================================================
-- POST-CONDITIONS
--   • New column defaults to 'none' for existing rows — no visual change
--     until a beautician opts in from the dashboard editor.
--   • CHECK constraint guards against bad writes from any callsite.
-- ============================================================================
