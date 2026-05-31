-- =============================================================================
-- 0164 — Places: Yogya gap fill (Merapi / caves / beaches / waterfalls)
-- =============================================================================
-- Founder audit 2026-05-31: 16 named Yogya tourist places + 1 duplicate
-- cleanup. Coordinates are approximate (sourced from public mapping data);
-- can be refined later if drivers / partners flag a misplaced pin.
--
-- Categories used:
--   • attraction  — non-temple landmark (bunkers, castles, volcanoes)
--   • beach       — south-coast Gunungkidul + Bantul beaches
--   • attraction  — caves (no dedicated 'cave' category in 0005 schema)
--   • attraction  — waterfalls (no dedicated 'waterfall' category)
-- =============================================================================

-- 1. Drop the duplicate Pawon temple mock — keeps the canonical
--    pawon-temple row from migration 0006.
delete from public.places where slug = 'candi-pawon-magelang-mock';

-- 2. Add the missing places.
insert into public.places (slug, name, category, description, location, lat, lng, city, address, tags, status) values

-- ── Merapi area landmarks ─────────────────────────────────────────────
('gunung-merapi','Gunung Merapi','attraction','Active stratovolcano on the Yogya / Central Java border, 2,930 m peak.',
  ST_GeogFromText('SRID=4326;POINT(110.4457 -7.5407)'),-7.5407,110.4457,'yogyakarta','Sleman / Magelang border, Yogyakarta',ARRAY['tourist','outside_city']::text[],'approved'),

('bunker-kaliadem','Bunker Kaliadem','attraction','Concrete bunker on the southern Merapi slope famous from the 2006 eruption.',
  ST_GeogFromText('SRID=4326;POINT(110.4451 -7.5870)'),-7.5870,110.4451,'yogyakarta','Kaliadem, Cangkringan, Sleman',ARRAY['tourist','outside_city']::text[],'approved'),

('batu-alien','Batu Alien','attraction','House-sized volcanic boulder ejected during the 2010 Merapi eruption.',
  ST_GeogFromText('SRID=4326;POINT(110.4503 -7.5859)'),-7.5859,110.4503,'yogyakarta','Kepuharjo, Cangkringan, Sleman',ARRAY['tourist','outside_city']::text[],'approved'),

('the-lost-world-castle','The Lost World Castle','attraction','Mock-castle photo park on the southern Merapi slope.',
  ST_GeogFromText('SRID=4326;POINT(110.4543 -7.5985)'),-7.5985,110.4543,'yogyakarta','Petung, Kepuharjo, Cangkringan, Sleman',ARRAY['tourist','outside_city','family']::text[],'approved'),

-- ── Caves ─────────────────────────────────────────────────────────────
('kalisuci-cave-tubing','Kalisuci Cave Tubing','attraction','Cave tubing run through Kalisuci river karst system.',
  ST_GeogFromText('SRID=4326;POINT(110.6492 -8.0408)'),-8.0408,110.6492,'yogyakarta','Pacarejo, Semanu, Gunungkidul',ARRAY['tourist','outside_city']::text[],'approved'),

('goa-cerme','Goa Cerme','attraction','Underground river cave traversed end-to-end with a local guide.',
  ST_GeogFromText('SRID=4326;POINT(110.3654 -7.9389)'),-7.9389,110.3654,'yogyakarta','Srunggo, Selopamioro, Imogiri, Bantul',ARRAY['tourist','outside_city']::text[],'approved'),

('goa-kiskendo','Goa Kiskendo','attraction','Limestone cave system with Ramayana mythology connections.',
  ST_GeogFromText('SRID=4326;POINT(110.1346 -7.7531)'),-7.7531,110.1346,'yogyakarta','Jatimulyo, Girimulyo, Kulon Progo',ARRAY['tourist','outside_city']::text[],'approved'),

-- ── Beaches (Gunungkidul + Bantul / Kulon Progo south coast) ─────────
('slili-beach','Pantai Slili','beach','Small cove beach tucked between Krakal and Sundak in Gunungkidul.',
  ST_GeogFromText('SRID=4326;POINT(110.6219 -8.1551)'),-8.1551,110.6219,'yogyakarta','Sidoharjo, Tepus, Gunungkidul',ARRAY['tourist','outside_city']::text[],'approved'),

('ngandong-beach','Pantai Ngandong','beach','Quiet white-sand beach next to Sundak with surf-rentable shacks.',
  ST_GeogFromText('SRID=4326;POINT(110.6296 -8.1518)'),-8.1518,110.6296,'yogyakarta','Sidoharjo, Tepus, Gunungkidul',ARRAY['tourist','outside_city']::text[],'approved'),

('kesirat-beach','Pantai Kesirat','beach','Cliff-edge campsite beach in western Gunungkidul, popular for sunset.',
  ST_GeogFromText('SRID=4326;POINT(110.1934 -8.0024)'),-8.0024,110.1934,'yogyakarta','Girikarto, Panggang, Gunungkidul',ARRAY['tourist','outside_city']::text[],'approved'),

('goa-cemara-beach','Pantai Goa Cemara','beach','Cemara-pine-fringed beach with photogenic dune avenues.',
  ST_GeogFromText('SRID=4326;POINT(110.2614 -7.9911)'),-7.9911,110.2614,'yogyakarta','Patihan, Gadingsari, Sanden, Bantul',ARRAY['tourist','outside_city']::text[],'approved'),

-- ── Waterfalls ────────────────────────────────────────────────────────
('air-terjun-kedung-pedut','Air Terjun Kedung Pedut','attraction','Multi-tiered turquoise-pool waterfall in Kulon Progo.',
  ST_GeogFromText('SRID=4326;POINT(110.1289 -7.7475)'),-7.7475,110.1289,'yogyakarta','Jatimulyo, Girimulyo, Kulon Progo',ARRAY['tourist','outside_city']::text[],'approved'),

('grojogan-watu-purbo','Grojogan Watu Purbo','attraction','Six-tier rock-step waterfall on the Krasak river in Sleman.',
  ST_GeogFromText('SRID=4326;POINT(110.3823 -7.6488)'),-7.6488,110.3823,'yogyakarta','Bangunkerto, Turi, Sleman',ARRAY['tourist','outside_city']::text[],'approved'),

('grojogan-sewu-waterfall','Grojogan Sewu','attraction','Iconic 81m waterfall in Karanganyar — outside DIY but a popular Yogya day trip.',
  ST_GeogFromText('SRID=4326;POINT(111.1331 -7.6645)'),-7.6645,111.1331,'yogyakarta','Tawangmangu, Karanganyar, Central Java',ARRAY['tourist','outside_city']::text[],'approved'),

('air-terjun-kedung-kandang','Air Terjun Kedung Kandang','attraction','Seasonal staircase waterfall over rice-terrace bedrock in Gunungkidul.',
  ST_GeogFromText('SRID=4326;POINT(110.5512 -7.9831)'),-7.9831,110.5512,'yogyakarta','Nglanggeran, Patuk, Gunungkidul',ARRAY['tourist','outside_city']::text[],'approved'),

('air-terjun-jogan','Air Terjun Jogan','attraction','Coastal waterfall that drops directly into the Indian Ocean near Pantai Siung.',
  ST_GeogFromText('SRID=4326;POINT(110.6649 -8.1810)'),-8.1810,110.6649,'yogyakarta','Purwodadi, Tepus, Gunungkidul',ARRAY['tourist','outside_city']::text[],'approved')

on conflict (slug) do nothing;
