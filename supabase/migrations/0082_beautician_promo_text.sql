-- ============================================================================
-- 0082 — Beautician: running promo text (marquee under portfolio carousel)
-- ----------------------------------------------------------------------------
-- Editable text for the scrolling marquee strip that sits between the
-- portfolio carousel and the Start From / Contact CTA row on the
-- public profile. Was hardcoded as a generic promo line; now the
-- beautician writes their own (up to 500 chars).
-- ============================================================================

alter table public.beautician_providers
  add column if not exists promo_text text;

alter table public.beautician_providers
  drop constraint if exists beautician_providers_promo_text_check,
  add  constraint beautician_providers_promo_text_check check (
    promo_text is null or length(promo_text) <= 500
  );
