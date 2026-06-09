-- mig 0229 — Free-tier visual ownership on the beautician profile.
-- Three new columns drive the public profile's layout decisions:
--
--   profile_placement         — avatar position on the hero
--                              ('center' | 'top-left' | 'bottom-left')
--                              Default 'center' preserves existing render
--                              for every existing row.
--
--   show_url_under_avatar     — when true, the public page renders a
--                              kita2u.com/<slug> chip below the display
--                              name. Default false (opt-in).
--
--   page_background_image_url — full-page background image behind every
--                              section. Public page renders it with an
--                              85% white overlay so foreground content
--                              stays readable. Nullable.
--
-- All three are FREE-tier — no plan gate. Pro upgrade pressure comes
-- from operational features (multi-page, custom domain, etc.), not from
-- gating visual polish (see founder direction 2026-06-09).
alter table public.beautician_providers
  add column if not exists profile_placement         text    not null default 'center',
  add column if not exists show_url_under_avatar     boolean not null default false,
  add column if not exists page_background_image_url text;

alter table public.beautician_providers
  drop constraint if exists beautician_profile_placement_chk;

alter table public.beautician_providers
  add constraint beautician_profile_placement_chk
  check (profile_placement in ('center', 'top-left', 'bottom-left'));
