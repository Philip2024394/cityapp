-- =============================================================================
-- 0165 — Places: Yogya gap fill #2 (viewpoints / rafting / geopark)
-- =============================================================================
-- Founder audit 2026-05-31 (round 2): 7 additional Yogya / Magelang places.
-- Coordinates approximate from public mapping data.
-- =============================================================================

insert into public.places (slug, name, category, description, location, lat, lng, city, address, tags, status) values

-- ── Mangunan / Bantul viewpoints + forest spots ─────────────────────
('puncak-becici','Puncak Becici','attraction','Pine-forest hilltop deck with treetop viewing platforms over the Mangunan valley.',
  ST_GeogFromText('SRID=4326;POINT(110.4220 -7.9437)'),-7.9437,110.4220,'yogyakarta','Muntuk, Dlingo, Bantul',ARRAY['tourist','outside_city']::text[],'approved'),

('seribu-batu-songgo-langit','Seribu Batu Songgo Langit','attraction','Mossy-rock forest park near Mangunan — themed huts and photo stages.',
  ST_GeogFromText('SRID=4326;POINT(110.4350 -7.9437)'),-7.9437,110.4350,'yogyakarta','Muntuk, Dlingo, Bantul',ARRAY['tourist','outside_city','family']::text[],'approved'),

('bukit-bego','Bukit Bego','attraction','Cliff-cut roadside viewpoint above the Imogiri valley, popular for sunrise photos.',
  ST_GeogFromText('SRID=4326;POINT(110.4145 -7.8910)'),-7.8910,110.4145,'yogyakarta','Wukirsari, Imogiri, Bantul',ARRAY['tourist','outside_city']::text[],'approved'),

-- ── Rivers (rafting operator launch points) ─────────────────────────
('elo-river-rafting','Elo River Rafting','attraction','Class II-III rafting put-in on the Elo River near Borobudur.',
  ST_GeogFromText('SRID=4326;POINT(110.2310 -7.6079)'),-7.6079,110.2310,'yogyakarta','Mendut, Mungkid, Magelang',ARRAY['tourist','outside_city']::text[],'approved'),

('progo-river-rafting','Progo River Rafting','attraction','Class III-IV rafting on the Upper Progo, Kulon Progo / Magelang border.',
  ST_GeogFromText('SRID=4326;POINT(110.1934 -7.6588)'),-7.6588,110.1934,'yogyakarta','Magelang / Kulon Progo border',ARRAY['tourist','outside_city']::text[],'approved'),

-- ── Tourism village ─────────────────────────────────────────────────
('tinalah-tourism-village','Tinalah Tourism Village','attraction','Desa Wisata in Samigaluh — river camping, cave, plantation tours.',
  ST_GeogFromText('SRID=4326;POINT(110.1610 -7.8237)'),-7.8237,110.1610,'yogyakarta','Purwoharjo, Samigaluh, Kulon Progo',ARRAY['tourist','outside_city','family']::text[],'approved'),

-- ── UNESCO geopark covering Gunungkidul ─────────────────────────────
('gunung-sewu-geopark','Gunung Sewu UNESCO Geopark','attraction','Karst landscape spanning Gunungkidul / Wonogiri / Pacitan — UNESCO Global Geopark.',
  ST_GeogFromText('SRID=4326;POINT(110.5500 -8.0500)'),-8.0500,110.5500,'yogyakarta','Gunungkidul Regency',ARRAY['tourist','outside_city']::text[],'approved')

on conflict (slug) do nothing;
