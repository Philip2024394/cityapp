-- ============================================================================
-- 0144 — Drivers FAQ + Terms + Privacy columns
-- ----------------------------------------------------------------------------
-- Adds the same legal + FAQ surface to `public.drivers` that mig 0142
-- added to `beautician_providers` (and 0143 mirrored to facial/skincare
-- providers). Powers the new /dashboard/car/{faq,terms,privacy} editors
-- and the matching public-profile rendering on /car/[slug] (+ bus, +
-- truck, + bike rider equivalents).
--
-- Schema mirrors mig 0142 exactly so any future "vendor with FAQ" code
-- can polymorphically union across the four tables without column drift:
--   legal_terms              text       — long-form ToS, vendor-authored
--   legal_privacy            text       — privacy policy, vendor-authored
--   faq_items                jsonb      — array of {q, a} objects
--   faq_enabled              boolean    — show FAQ accordion on public page
--
-- Zero behaviour change for existing rows: defaults make every driver
-- look exactly like they did before, until they opt in via the editor.
-- ============================================================================

alter table public.drivers
  add column if not exists legal_terms   text,
  add column if not exists legal_privacy text,
  add column if not exists faq_items     jsonb not null default '[]'::jsonb,
  add column if not exists faq_enabled   boolean not null default false;

comment on column public.drivers.faq_items is
  'Array of {q, a} pairs. Rendered as an accordion above the contact '
  'form on the public driver profile when faq_enabled = true and the '
  'array is non-empty. Editor: /dashboard/car/faq.';

comment on column public.drivers.legal_terms is
  'Long-form terms and conditions the driver authored. Linked from the '
  'footer of their public profile. Editor: /dashboard/car/terms.';

comment on column public.drivers.legal_privacy is
  'Long-form privacy policy the driver authored. Linked from the footer '
  'of their public profile. Editor: /dashboard/car/privacy.';

-- ============================================================================
-- POST-CONDITIONS
--   • drivers.legal_terms / legal_privacy = NULL on every existing row
--     (footer links hide when empty — zero visual change until vendor opts in)
--   • drivers.faq_items = '[]'::jsonb, faq_enabled = false on every existing
--     row (accordion stays hidden until vendor opts in)
--   • /dashboard/car/{faq,terms,privacy} editors now save successfully
-- ============================================================================
