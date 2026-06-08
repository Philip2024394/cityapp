-- ============================================================================
-- 0203 — Sari's hero line 2: "Beautician" → "Hair Treatment".
-- ----------------------------------------------------------------------------
-- The profile page's hero overlay reads p.hero_text.line2 (mig 0081); when
-- null, the fallback is the literal string 'Beautician'. Sari's vertical
-- is hair so the founder wants her hero animated word to read "Hair
-- Treatment" instead. jsonb_set + coalesce keeps any other hero_text
-- fields intact in case other line2 / tagline / colour overrides are
-- added later for her row.
-- ============================================================================

update public.beautician_providers
   set hero_text = jsonb_set(coalesce(hero_text, '{}'::jsonb), '{line2}', '"Hair Treatment"'::jsonb)
 where slug = 'demo-bp-sari';
