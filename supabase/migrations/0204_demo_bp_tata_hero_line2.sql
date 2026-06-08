-- ============================================================================
-- 0204 — Tata's hero line 2: "Beautician" → "Eye Lashes".
-- ----------------------------------------------------------------------------
-- Mirrors mig 0203 (Sari → "Hair Treatment"). Tata's vertical is eye-lash
-- extension + lift + repair, so the hero animated word reads "Eye Lashes"
-- instead of the generic 'Beautician' fallback. jsonb_set + coalesce
-- keeps any future hero_text fields intact.
-- ============================================================================

update public.beautician_providers
   set hero_text = jsonb_set(coalesce(hero_text, '{}'::jsonb), '{line2}', '"Eye Lashes"'::jsonb)
 where slug = 'demo-bp-tata';
