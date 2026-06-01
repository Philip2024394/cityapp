-- ============================================================================
-- 0168_places_tour_image_backfill.sql
-- ----------------------------------------------------------------------------
-- Backfill `public.places` so every place_slug referenced by a row in
-- src/lib/tours/templates.ts has a row in the table WITH an `image_url`.
-- The customer-facing tour card cascade in
-- src/components/profile/shell/ToursTabContent.tsx is:
--   1. driver_tour_packages.photo_url (driver upload)
--   2. places[place_slugs[0]].image_url (curated platform image)
--   3. template fallback (defined in templates.ts)
-- Step 2 was silently breaking for ~38 tour destinations because either the
-- place row didn't exist (Craft Village Loop slugs etc.) or the row existed
-- but `image_url` was NULL. This migration fixes both.
--
-- Image strategy: every backfilled row points to the founder's existing
-- ImageKit CDN asset (the CityDrivers landing hero) as a guaranteed-loading
-- safe default. Per-place curated photography can be swapped in incrementally
-- via the existing places admin without another migration. The point of
-- THIS migration is to stop the cascade from falling through to a missing /
-- broken URL.
--
-- Coords are approximate (Yogya-area landmarks) — populated only to satisfy
-- the NOT NULL `location` PostGIS column. Map distance code does NOT use
-- these points for tour cards; refine with proper geocoding later.
-- ============================================================================

DO $$
DECLARE
  default_img CONSTANT text := 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2030,%202026,%2001_51_17%20AM.png';
BEGIN
  -- ── Phase 1: rows exist, image_url is NULL → fill it. ──
  UPDATE public.places
     SET image_url  = default_img,
         updated_at = now()
   WHERE slug IN (
           'krakal-beach', 'pasar-beringharjo', 'yia-airport',
           'sambisari-temple', 'mendut-temple', 'sojiwan-temple',
           'kalibiru', 'ijo-temple', 'kraton-yogyakarta',
           'pawon-temple', 'banyunibo-temple', 'adisutjipto-airport',
           'plaosan-temple', 'siung-beach', 'sundak-beach',
           'tugu-yogyakarta'
         )
     AND image_url IS NULL;

  -- ── Phase 2: rows missing entirely → insert with image_url + location set. ──
  INSERT INTO public.places (slug, name, category, description, image_url, city, status, lat, lng, location)
  VALUES
    ('alun-alun-selatan',    'Alun-Alun Selatan',     'attraction', 'South Square of the Yogyakarta Kraton — masangin (blindfold walk between two banyan trees) tradition.', default_img, 'yogyakarta', 'approved', -7.811, 110.362, ST_GeographyFromText('SRID=4326;POINT(110.362 -7.811)')),
    ('bantul',               'Bantul',                'attraction', 'Bantul regency south of Yogyakarta — batik villages, pottery, and the south coast beaches.',            default_img, 'yogyakarta', 'approved', -7.888, 110.327, ST_GeographyFromText('SRID=4326;POINT(110.327 -7.888)')),
    ('borobudur',            'Borobudur',             'attraction', '9th-century Mahayana Buddhist temple, the world''s largest. UNESCO World Heritage.',                    default_img, 'yogyakarta', 'approved', -7.608, 110.204, ST_GeographyFromText('SRID=4326;POINT(110.204 -7.608)')),
    ('bukit-panguk',         'Bukit Panguk Kediwung', 'attraction', 'Sea-of-clouds sunrise viewpoint on the Mangunan plateau.',                                              default_img, 'yogyakarta', 'approved', -7.940, 110.434, ST_GeographyFromText('SRID=4326;POINT(110.434 -7.940)')),
    ('dieng-plateau',        'Dieng Plateau',         'attraction', 'Highland volcanic plateau (~2000m) with ancient Hindu temples, colour lakes and sulphur craters.',       default_img, 'yogyakarta', 'approved', -7.207, 109.918, ST_GeographyFromText('SRID=4326;POINT(109.918 -7.207)')),
    ('goa-selarong',         'Goa Selarong',          'attraction', 'Cave complex used by Prince Diponegoro as base during the Java War (1825–1830).',                        default_img, 'yogyakarta', 'approved', -7.879, 110.297, ST_GeographyFromText('SRID=4326;POINT(110.297 -7.879)')),
    ('imogiri',              'Imogiri Royal Cemetery','attraction', 'Hilltop royal cemetery of the Sultans of Yogyakarta and Surakarta. 17th-century complex.',               default_img, 'yogyakarta', 'approved', -7.929, 110.408, ST_GeographyFromText('SRID=4326;POINT(110.408 -7.929)')),
    ('jomblang-cave',        'Jomblang Cave',         'attraction', 'Collapsed sinkhole cave famous for the "heaven''s light" beam — vertical descent required.',             default_img, 'yogyakarta', 'approved', -8.034, 110.638, ST_GeographyFromText('SRID=4326;POINT(110.638 -8.034)')),
    ('kasongan',             'Kasongan',              'attraction', 'Pottery village south-west of Yogya — earthenware studios sell direct from the wheel.',                  default_img, 'yogyakarta', 'approved', -7.840, 110.331, ST_GeographyFromText('SRID=4326;POINT(110.331 -7.840)')),
    ('kotagede',             'Kotagede',              'attraction', 'Historic silversmithing district and former Mataram royal capital. Workshops + old-town lanes.',          default_img, 'yogyakarta', 'approved', -7.829, 110.397, ST_GeographyFromText('SRID=4326;POINT(110.397 -7.829)')),
    ('magelang',             'Magelang',              'attraction', 'Central Java town near Borobudur — gateway for the Borobudur–Mendut–Pawon temple loop.',                  default_img, 'yogyakarta', 'approved', -7.473, 110.218, ST_GeographyFromText('SRID=4326;POINT(110.218 -7.473)')),
    ('malioboro',            'Jalan Malioboro',       'attraction', 'Yogyakarta''s main shopping street — andong horse carts, batik vendors, street food.',                    default_img, 'yogyakarta', 'approved', -7.793, 110.366, ST_GeographyFromText('SRID=4326;POINT(110.366 -7.793)')),
    ('manding',              'Manding',               'attraction', 'Leather-craft village south of Yogya — bags, jackets and sandals straight from the workshops.',           default_img, 'yogyakarta', 'approved', -7.892, 110.348, ST_GeographyFromText('SRID=4326;POINT(110.348 -7.892)')),
    ('mangunan-pine-forest', 'Hutan Pinus Mangunan',  'attraction', 'Planted pine forest on the Mangunan ridge with treetop viewpoints and Insta-photo platforms.',            default_img, 'yogyakarta', 'approved', -7.937, 110.444, ST_GeographyFromText('SRID=4326;POINT(110.444 -7.937)')),
    ('mount-merapi',         'Mount Merapi',          'attraction', 'Active stratovolcano (~2930m) at the north edge of Yogyakarta — jeep lava tours from Kaliurang.',          default_img, 'yogyakarta', 'approved', -7.541, 110.446, ST_GeographyFromText('SRID=4326;POINT(110.446 -7.541)')),
    ('nglambor-beach',       'Nglambor Beach',        'attraction', 'Snorkelling-friendly south coast cove protected by twin offshore rocks.',                                default_img, 'yogyakarta', 'approved', -8.180, 110.628, ST_GeographyFromText('SRID=4326;POINT(110.628 -8.180)')),
    ('pasar-klewer',         'Pasar Klewer',          'attraction', 'Solo''s legendary textile market — Java''s biggest batik trading floor.',                                default_img, 'yogyakarta', 'approved', -7.575, 110.827, ST_GeographyFromText('SRID=4326;POINT(110.827 -7.575)')),
    ('pindul-cave',          'Goa Pindul (tubing)',   'attraction', 'River-cave tubing route in Gunungkidul — gentle 45-minute float through limestone formations.',            default_img, 'yogyakarta', 'approved', -7.943, 110.659, ST_GeographyFromText('SRID=4326;POINT(110.659 -7.943)')),
    ('prambanan',            'Prambanan',             'attraction', '9th-century Hindu temple complex dedicated to the Trimurti. UNESCO World Heritage.',                       default_img, 'yogyakarta', 'approved', -7.752, 110.491, ST_GeographyFromText('SRID=4326;POINT(110.491 -7.752)')),
    ('ratu-boko',            'Ratu Boko',             'attraction', 'Palace-ruin plateau south of Prambanan — sunset viewpoint over the Prambanan plain.',                      default_img, 'yogyakarta', 'approved', -7.770, 110.489, ST_GeographyFromText('SRID=4326;POINT(110.489 -7.770)')),
    ('solo-kraton',          'Kraton Surakarta',      'attraction', 'Royal palace of the Sunan of Surakarta (Solo) — Javanese court culture and museum.',                      default_img, 'yogyakarta', 'approved', -7.578, 110.829, ST_GeographyFromText('SRID=4326;POINT(110.829 -7.578)')),
    ('sri-gethuk-waterfall', 'Sri Gethuk Waterfall',  'attraction', 'Three-tier waterfall on the Oya river in Gunungkidul — bamboo-raft access.',                              default_img, 'yogyakarta', 'approved', -7.954, 110.471, ST_GeographyFromText('SRID=4326;POINT(110.471 -7.954)')),
    ('taman-sari',           'Taman Sari Water Castle','attraction','18th-century royal bathing complex behind the Kraton — pools, tunnels and the underground mosque.',       default_img, 'yogyakarta', 'approved', -7.810, 110.359, ST_GeographyFromText('SRID=4326;POINT(110.359 -7.810)'))
  ON CONFLICT (slug) DO NOTHING;
END $$;
