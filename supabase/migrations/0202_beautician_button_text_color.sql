-- 0202 — User-controlled button text color on beautician_providers.
--
-- Replaces the auto-luminance heuristic (inkForTheme()) that returned the
-- theme color itself for medium-luminance themes — producing illegible
-- yellow-on-yellow buttons on Sari's profile (theme #FACC15).
--
-- Default white (#FFFFFF) renders legibly on every saturated theme color
-- in the picker (pink/yellow/orange/red/purple/teal). Beauticians can
-- later override from the dashboard. The same value also drives the
-- hero-button icon stroke color on the public profile.

alter table public.beautician_providers
  add column if not exists button_text_color text not null default '#FFFFFF'
    check (button_text_color ~* '^#[A-Fa-f0-9]{6}$');

-- Tata's chocolate-brown theme reads better with a chocolate button text
-- than pure white — preserve the existing visual by overriding the
-- default just for her seeded row.
update public.beautician_providers
   set button_text_color = '#5C3317'
 where slug = 'demo-bp-tata';
