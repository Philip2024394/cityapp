-- 0005_places.sql
-- Places directory — discovery surface that hands off into the existing
-- /cari booking flow. Phase 1: schema + seed only.
--
-- Scalability note: columns for owner_user_id, listing_tier, paid_until,
-- featured_until, status, verified, rating, review_count are reserved
-- for later phases (submissions, payments, reviews, moderation). Phase
-- 1 seeds rows with status='approved' so they appear immediately under
-- the existing read policy.
--
-- Geography note: every spatial entity carries BOTH a PostGIS
-- geography column (for future spatial queries — nearest-neighbour,
-- polygon containment, distance order) AND plain lat/lng columns (for
-- trivial REST reads, no GeoJSON view required). The duplication is
-- intentional. A future migration will install a trigger to keep
-- them in sync once writes come from outside the seed.

create extension if not exists postgis;

-- ─────────────────────────────────────────────────────────────────────
-- city_zones: one polygon per service city. The polygon defines
-- "inside city limits" for rider fairness — any place whose location
-- falls outside the polygon triggers the return-fare rule. centroid
-- is the fare-return anchor (the empty-leg distance riders are
-- reimbursed for). The bounding-box columns (min_lng..max_lat) are
-- the fast Phase-1 in/out check; PostGIS ST_Contains is reserved for
-- Phase 2 when real city polygons replace this rectangle.
-- ─────────────────────────────────────────────────────────────────────
create table city_zones (
  id            uuid primary key default gen_random_uuid(),
  city          text not null unique,

  geometry      geography(Polygon, 4326) not null,
  centroid      geography(Point,   4326) not null,

  centroid_lat  double precision not null,
  centroid_lng  double precision not null,

  min_lng       double precision not null,
  max_lng       double precision not null,
  min_lat       double precision not null,
  max_lat       double precision not null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index city_zones_geometry_gix on city_zones using gist (geometry);

-- ─────────────────────────────────────────────────────────────────────
-- places: discoverable destinations. status defaults to 'pending' so
-- future user submissions land in a moderation queue; seed rows below
-- explicitly set 'approved'. The public read policy filters by status.
-- ─────────────────────────────────────────────────────────────────────
create table places (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  category        text not null,
  subcategory     text,
  description     text,
  image_urls      text[] not null default '{}',

  location        geography(Point, 4326) not null,
  lat             double precision not null,
  lng             double precision not null,

  city            text not null references city_zones(city),
  address         text,
  phone           text,
  whatsapp_e164   text,
  website         text,
  hours_json      jsonb,
  tags            text[] not null default '{}',
  rating          numeric(2,1),
  review_count    int not null default 0,

  owner_user_id   uuid references auth.users(id) on delete set null,
  listing_tier    text not null default 'free'
                  check (listing_tier in ('free','paid','featured')),
  paid_until      date,
  featured_until  date,

  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','suspended')),
  verified        boolean not null default false,
  rejection_note  text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index places_location_gix on places using gist (location);
create index places_city_status  on places (city, status);
create index places_category     on places (category);

-- ─────────────────────────────────────────────────────────────────────
-- RLS — Phase 1 allows PUBLIC READ of city_zones and approved places.
-- Inserts/updates/deletes locked to service-role until later phases
-- ship the submission + moderation surfaces.
-- ─────────────────────────────────────────────────────────────────────
alter table city_zones enable row level security;
alter table places     enable row level security;

create policy "city_zones_public_read"
  on city_zones for select
  using (true);

create policy "places_public_read_approved"
  on places for select
  using (status = 'approved');

-- ─────────────────────────────────────────────────────────────────────
-- Seed: Yogyakarta city zone. Rough rectangle covering greater Yogya
-- (Sleman/Kota/Bantul core). Deliberately excludes Adisutjipto airport
-- (east), Borobudur (NW), Prambanan (NE), Parangtritis + Gunungkidul
-- beaches (SE/S) — all correctly out-of-zone so return-fare kicks in.
-- Replace with a real boundary polygon (QGIS) later — schema unchanged.
-- ─────────────────────────────────────────────────────────────────────
insert into city_zones (
  city, geometry, centroid,
  centroid_lat, centroid_lng,
  min_lng, max_lng, min_lat, max_lat
) values (
  'yogyakarta',
  ST_GeogFromText('SRID=4326;POLYGON((110.30 -7.73, 110.42 -7.73, 110.42 -7.85, 110.30 -7.85, 110.30 -7.73))'),
  ST_GeogFromText('SRID=4326;POINT(110.3657 -7.7928)'),
  -7.7928, 110.3657,
  110.30, 110.42, -7.85, -7.73
);

-- ─────────────────────────────────────────────────────────────────────
-- Seed: ~70 places spanning every Phase-1 category across Yogyakarta
-- and the surrounding region. status='approved' so they list at once.
-- image_urls intentionally left empty — UI renders a category-gradient
-- placeholder. Real photos arrive with the Phase 3 owner-claim flow.
-- ─────────────────────────────────────────────────────────────────────
insert into places (slug, name, category, description, location, lat, lng, city, address, tags, status) values
-- Temples
('borobudur-temple','Candi Borobudur','temple','9th-century Mahayana Buddhist temple, UNESCO World Heritage site.',ST_GeogFromText('SRID=4326;POINT(110.2038 -7.6079)'),-7.6079,110.2038,'yogyakarta','Borobudur, Magelang Regency',ARRAY['tourist','outside_city'],'approved'),
('prambanan-temple','Candi Prambanan','temple','9th-century Hindu temple compound, the largest in Indonesia.',ST_GeogFromText('SRID=4326;POINT(110.4915 -7.7520)'),-7.7520,110.4915,'yogyakarta','Jl. Raya Solo–Yogyakarta, Sleman',ARRAY['tourist','outside_city'],'approved'),
('kraton-yogyakarta','Kraton Yogyakarta','temple','Royal palace of the Sultanate of Yogyakarta, still actively used.',ST_GeogFromText('SRID=4326;POINT(110.3641 -7.8053)'),-7.8053,110.3641,'yogyakarta','Jl. Rotowijayan Blok No.1, Yogyakarta',ARRAY['tourist'],'approved'),
('plaosan-temple','Candi Plaosan','temple','Twin Buddhist temple complex paired with Prambanan nearby.',ST_GeogFromText('SRID=4326;POINT(110.5048 -7.7401)'),-7.7401,110.5048,'yogyakarta','Bugisan, Prambanan, Klaten',ARRAY['tourist','outside_city'],'approved'),
('ratu-boko-temple','Candi Ratu Boko','temple','Hilltop archaeological complex overlooking the Prambanan plain.',ST_GeogFromText('SRID=4326;POINT(110.4892 -7.7707)'),-7.7707,110.4892,'yogyakarta','Bokoharjo, Prambanan, Sleman',ARRAY['tourist','outside_city'],'approved'),

-- Beaches
('parangtritis-beach','Pantai Parangtritis','beach','Iconic black-sand beach south of Yogyakarta with cultural ties to the Sultanate.',ST_GeogFromText('SRID=4326;POINT(110.3306 -8.0253)'),-8.0253,110.3306,'yogyakarta','Kretek, Bantul',ARRAY['tourist','outside_city'],'approved'),
('indrayanti-beach','Pantai Indrayanti','beach','White-sand beach in Gunungkidul with cafés and beach huts.',ST_GeogFromText('SRID=4326;POINT(110.6231 -8.1545)'),-8.1545,110.6231,'yogyakarta','Tepus, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('krakal-beach','Pantai Krakal','beach','Long stretch of calm white-sand beach popular for swimming.',ST_GeogFromText('SRID=4326;POINT(110.6133 -8.1502)'),-8.1502,110.6133,'yogyakarta','Tanjungsari, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('drini-beach','Pantai Drini','beach','Sheltered cove with a small island and traditional fishing boats.',ST_GeogFromText('SRID=4326;POINT(110.5736 -8.1454)'),-8.1454,110.5736,'yogyakarta','Tanjungsari, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('timang-beach','Pantai Timang','beach','Famous for the wooden gondola crossing to a rocky islet.',ST_GeogFromText('SRID=4326;POINT(110.6470 -8.1640)'),-8.1640,110.6470,'yogyakarta','Purwodadi, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('baron-beach','Pantai Baron','beach','Fishing village beach at the mouth of an underground river.',ST_GeogFromText('SRID=4326;POINT(110.5527 -8.1377)'),-8.1377,110.5527,'yogyakarta','Kemadang, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),

-- Tourist attractions
('malioboro-street','Jalan Malioboro','attraction','Yogyakarta''s main shopping and cultural street.',ST_GeogFromText('SRID=4326;POINT(110.3654 -7.7926)'),-7.7926,110.3654,'yogyakarta','Jl. Malioboro, Yogyakarta',ARRAY['tourist','open_late'],'approved'),
('tugu-yogyakarta','Tugu Yogyakarta','attraction','19th-century landmark monument at the city''s symbolic centre.',ST_GeogFromText('SRID=4326;POINT(110.3673 -7.7828)'),-7.7828,110.3673,'yogyakarta','Jl. Margo Utomo, Yogyakarta',ARRAY['tourist'],'approved'),
('tamansari-water-castle','Tamansari Water Castle','attraction','Royal garden complex with bathing pools and tunnels.',ST_GeogFromText('SRID=4326;POINT(110.3596 -7.8108)'),-7.8108,110.3596,'yogyakarta','Patehan, Kraton, Yogyakarta',ARRAY['tourist'],'approved'),
('pasar-beringharjo','Pasar Beringharjo','attraction','Historic central market for batik, snacks and souvenirs.',ST_GeogFromText('SRID=4326;POINT(110.3656 -7.7990)'),-7.7990,110.3656,'yogyakarta','Jl. Margo Mulyo No.16, Yogyakarta',ARRAY['tourist'],'approved'),
('hutan-pinus-mangunan','Hutan Pinus Mangunan','attraction','Pine forest viewpoint popular at sunrise.',ST_GeogFromText('SRID=4326;POINT(110.4348 -7.9362)'),-7.9362,110.4348,'yogyakarta','Mangunan, Dlingo, Bantul',ARRAY['tourist','outside_city'],'approved'),
('heha-sky-view','Heha Sky View','attraction','Hilltop café and viewpoint over Yogyakarta.',ST_GeogFromText('SRID=4326;POINT(110.4733 -7.9090)'),-7.9090,110.4733,'yogyakarta','Patuk, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),

-- Restaurants
('gudeg-yu-djum','Gudeg Yu Djum','restaurant','Long-running gudeg specialist, a Yogya classic.',ST_GeogFromText('SRID=4326;POINT(110.3819 -7.7790)'),-7.7790,110.3819,'yogyakarta','Jl. Wijilan No.167, Yogyakarta',ARRAY['halal'],'approved'),
('sate-klathak-pak-pong','Sate Klathak Pak Pong','restaurant','Famed klathak skewers grilled on bicycle spokes.',ST_GeogFromText('SRID=4326;POINT(110.3850 -7.8503)'),-7.8503,110.3850,'yogyakarta','Jl. Stadion Sultan Agung, Bantul',ARRAY['halal'],'approved'),
('house-of-raminten','House of Raminten','restaurant','24-hour Javanese restaurant with theatrical staff and gamelan.',ST_GeogFromText('SRID=4326;POINT(110.3815 -7.7740)'),-7.7740,110.3815,'yogyakarta','Jl. FM Noto No.7, Yogyakarta',ARRAY['halal','open_24h','tourist'],'approved'),
('sagan-resto','Sagan Resto','restaurant','Garden-set restaurant serving Indonesian and Western fare.',ST_GeogFromText('SRID=4326;POINT(110.3791 -7.7773)'),-7.7773,110.3791,'yogyakarta','Jl. Colombo No.31, Yogyakarta',ARRAY['halal'],'approved'),
('bale-raos','Bale Raos','restaurant','Royal Javanese cuisine in a heritage Kraton-area pavilion.',ST_GeogFromText('SRID=4326;POINT(110.3624 -7.8025)'),-7.8025,110.3624,'yogyakarta','Jl. Magangan Kulon No.1, Kraton',ARRAY['halal','tourist'],'approved'),
('mie-ayam-tumini','Mie Ayam Tumini','restaurant','Cult-favourite noodle warung with a permanent queue.',ST_GeogFromText('SRID=4326;POINT(110.3717 -7.8061)'),-7.8061,110.3717,'yogyakarta','Jl. Imogiri Timur, Yogyakarta',ARRAY['halal'],'approved'),
('warung-ss-jogja','Warung SS Yogyakarta','restaurant','Family-style Indonesian comfort food chain.',ST_GeogFromText('SRID=4326;POINT(110.3741 -7.7841)'),-7.7841,110.3741,'yogyakarta','Jl. Cendrawasih No.3, Yogyakarta',ARRAY['halal','family'],'approved'),
('mediterranea-restaurant','Mediterranea Restaurant','restaurant','Italian and Mediterranean dishes in a heritage building.',ST_GeogFromText('SRID=4326;POINT(110.3793 -7.7748)'),-7.7748,110.3793,'yogyakarta','Jl. Tirtodipuran No.24A, Yogyakarta',ARRAY['english_spoken'],'approved'),

-- Cafes
('filosofi-kopi-yogya','Filosofi Kopi Yogyakarta','cafe','Speciality coffee shop made famous by the film of the same name.',ST_GeogFromText('SRID=4326;POINT(110.3679 -7.7791)'),-7.7791,110.3679,'yogyakarta','Jl. Pajeksan No.GT I/719, Yogyakarta',ARRAY['english_spoken'],'approved'),
('klinik-kopi','Klinik Kopi','cafe','Single-origin micro-roastery with a daily-rotating menu.',ST_GeogFromText('SRID=4326;POINT(110.3737 -7.7635)'),-7.7635,110.3737,'yogyakarta','Jl. Kabupaten Lor No.546, Sleman',ARRAY['english_spoken'],'approved'),
('silol-coffee','Silol Coffee','cafe','Quiet corner café favoured by students and writers.',ST_GeogFromText('SRID=4326;POINT(110.3702 -7.7959)'),-7.7959,110.3702,'yogyakarta','Jl. Suryotomo No.20, Yogyakarta',ARRAY[]::text[],'approved'),
('epic-coffee','Epic Coffee','cafe','Spacious roastery and brunch café in Gejayan.',ST_GeogFromText('SRID=4326;POINT(110.3776 -7.7745)'),-7.7745,110.3776,'yogyakarta','Jl. Selokan Mataram, Yogyakarta',ARRAY['english_spoken'],'approved'),
('awor-coffee','Awor Coffee','cafe','Hidden alley café near Tugu station.',ST_GeogFromText('SRID=4326;POINT(110.3661 -7.7805)'),-7.7805,110.3661,'yogyakarta','Jl. Pajeksan, Yogyakarta',ARRAY[]::text[],'approved'),
('kopi-klotok','Kopi Klotok','cafe','Pakem-area open-air warung famous for traditional kopi tubruk.',ST_GeogFromText('SRID=4326;POINT(110.4030 -7.6960)'),-7.6960,110.4030,'yogyakarta','Jl. Kaliurang Km.16, Pakem, Sleman',ARRAY['tourist','outside_city'],'approved'),

-- Bars & clubs
('liquid-cafe','Liquid Cafe','bar','Lounge bar with regular DJs in north Yogya.',ST_GeogFromText('SRID=4326;POINT(110.3873 -7.7702)'),-7.7702,110.3873,'yogyakarta','Jl. Magelang Km.6, Yogyakarta',ARRAY['nightlife'],'approved'),
('boshe-vvip-club','Boshe VVIP Club','club','Large nightclub hosting EDM acts.',ST_GeogFromText('SRID=4326;POINT(110.3823 -7.7842)'),-7.7842,110.3823,'yogyakarta','Jl. Magelang Km.6.5, Yogyakarta',ARRAY['nightlife'],'approved'),
('lucifer-yogya','Lucifer Yogyakarta','club','Late-night dance club on Mataram Street.',ST_GeogFromText('SRID=4326;POINT(110.3656 -7.8082)'),-7.8082,110.3656,'yogyakarta','Jl. Mataram No.5, Yogyakarta',ARRAY['nightlife'],'approved'),
('hugos-cafe','Hugo''s Cafe','bar','Long-standing lounge inside the Sheraton Mustika.',ST_GeogFromText('SRID=4326;POINT(110.3711 -7.7896)'),-7.7896,110.3711,'yogyakarta','Jl. Laksda Adisucipto Km.8.7, Yogyakarta',ARRAY['nightlife','english_spoken'],'approved'),

-- Hospitals
('rs-sardjito','RSUP Dr. Sardjito','hospital','Major teaching hospital, 24-hour emergency.',ST_GeogFromText('SRID=4326;POINT(110.3737 -7.7710)'),-7.7710,110.3737,'yogyakarta','Jl. Kesehatan No.1, Sleman',ARRAY['open_24h','emergency'],'approved'),
('rs-bethesda','RS Bethesda','hospital','Long-established private hospital with full specialties.',ST_GeogFromText('SRID=4326;POINT(110.3814 -7.7841)'),-7.7841,110.3814,'yogyakarta','Jl. Jenderal Sudirman No.70, Yogyakarta',ARRAY['open_24h','emergency'],'approved'),
('rs-panti-rapih','RS Panti Rapih','hospital','Catholic-run hospital with 24-hour services.',ST_GeogFromText('SRID=4326;POINT(110.3793 -7.7793)'),-7.7793,110.3793,'yogyakarta','Jl. Cik Di Tiro No.30, Yogyakarta',ARRAY['open_24h','emergency'],'approved'),
('rs-pku-muhammadiyah','RS PKU Muhammadiyah','hospital','Central public-private hospital with emergency care.',ST_GeogFromText('SRID=4326;POINT(110.3618 -7.7888)'),-7.7888,110.3618,'yogyakarta','Jl. KH Ahmad Dahlan No.20, Yogyakarta',ARRAY['open_24h','emergency'],'approved'),
('rs-hidayatullah','RS Hidayatullah','hospital','Mid-size general hospital in southern Yogya.',ST_GeogFromText('SRID=4326;POINT(110.3789 -7.7949)'),-7.7949,110.3789,'yogyakarta','Jl. Veteran No.184, Yogyakarta',ARRAY['emergency'],'approved'),

-- Doctors & clinics
('klinik-pratama-permata','Klinik Pratama Permata','doctor','Family GP clinic, BPJS accepted.',ST_GeogFromText('SRID=4326;POINT(110.3645 -7.7895)'),-7.7895,110.3645,'yogyakarta','Jl. Mangkubumi, Yogyakarta',ARRAY[]::text[],'approved'),
('klinik-estetika-affandi','Klinik Estetika dr Affandi','doctor','Dermatology and aesthetic clinic.',ST_GeogFromText('SRID=4326;POINT(110.3744 -7.7806)'),-7.7806,110.3744,'yogyakarta','Jl. C. Simanjuntak, Yogyakarta',ARRAY[]::text[],'approved'),

-- Dentists
('bamed-dental-yogya','Bamed Dental Care','dentist','Modern dental clinic with implant and orthodontic services.',ST_GeogFromText('SRID=4326;POINT(110.3892 -7.7821)'),-7.7821,110.3892,'yogyakarta','Jl. Affandi (Gejayan), Yogyakarta',ARRAY['english_spoken'],'approved'),
('audy-dental-yogya','Audy Dental Yogya','dentist','Cosmetic and general dentistry chain branch.',ST_GeogFromText('SRID=4326;POINT(110.3760 -7.7733)'),-7.7733,110.3760,'yogyakarta','Jl. Gejayan, Yogyakarta',ARRAY[]::text[],'approved'),
('klinik-gigi-famili-dental','Klinik Gigi Famili Dental','dentist','Family dental practice including paediatric care.',ST_GeogFromText('SRID=4326;POINT(110.3789 -7.7843)'),-7.7843,110.3789,'yogyakarta','Jl. Laksda Adisucipto, Yogyakarta',ARRAY['family'],'approved'),

-- Pharmacies
('apotek-kimia-farma-malioboro','Apotek Kimia Farma Malioboro','pharmacy','State pharmacy chain branch on Malioboro.',ST_GeogFromText('SRID=4326;POINT(110.3654 -7.7929)'),-7.7929,110.3654,'yogyakarta','Jl. Malioboro, Yogyakarta',ARRAY[]::text[],'approved'),
('apotek-k24-sudirman','Apotek K-24 Sudirman','pharmacy','24-hour pharmacy with prescription delivery.',ST_GeogFromText('SRID=4326;POINT(110.3729 -7.7836)'),-7.7836,110.3729,'yogyakarta','Jl. Jenderal Sudirman, Yogyakarta',ARRAY['open_24h'],'approved'),
('apotek-guardian-hartono-mall','Apotek Guardian Hartono Mall','pharmacy','Mall pharmacy with personal-care selection.',ST_GeogFromText('SRID=4326;POINT(110.3829 -7.7553)'),-7.7553,110.3829,'yogyakarta','Hartono Mall, Sleman',ARRAY[]::text[],'approved'),
('apotek-roxy','Apotek Roxy','pharmacy','Independent neighbourhood pharmacy.',ST_GeogFromText('SRID=4326;POINT(110.3771 -7.7838)'),-7.7838,110.3771,'yogyakarta','Jl. Cendrawasih, Yogyakarta',ARRAY[]::text[],'approved'),

-- Shopping malls
('malioboro-mall','Malioboro Mall','mall','Central mall connected to Malioboro Street.',ST_GeogFromText('SRID=4326;POINT(110.3658 -7.7906)'),-7.7906,110.3658,'yogyakarta','Jl. Malioboro No.52-58, Yogyakarta',ARRAY['family'],'approved'),
('hartono-mall','Hartono Mall','mall','Large mall in Sleman with cinema and food court.',ST_GeogFromText('SRID=4326;POINT(110.3829 -7.7553)'),-7.7553,110.3829,'yogyakarta','Jl. Ring Road Utara, Sleman',ARRAY['family'],'approved'),
('jogja-city-mall','Jogja City Mall','mall','North Ringroad mall popular with families.',ST_GeogFromText('SRID=4326;POINT(110.3552 -7.7438)'),-7.7438,110.3552,'yogyakarta','Jl. Magelang Km.6, Sleman',ARRAY['family'],'approved'),
('galeria-mall','Galeria Mall','mall','Long-running mid-size mall east of the city centre.',ST_GeogFromText('SRID=4326;POINT(110.3791 -7.7853)'),-7.7853,110.3791,'yogyakarta','Jl. Jenderal Sudirman No.99-101, Yogyakarta',ARRAY['family'],'approved'),
('plaza-ambarrukmo','Plaza Ambarrukmo','mall','Major eastern Yogyakarta mall and entertainment hub.',ST_GeogFromText('SRID=4326;POINT(110.4014 -7.7818)'),-7.7818,110.4014,'yogyakarta','Jl. Laksda Adisucipto Km.6, Yogyakarta',ARRAY['family'],'approved'),

-- Hotels
('hyatt-regency-yogyakarta','Hyatt Regency Yogyakarta','hotel','Resort-style hotel with golf course in north Yogya.',ST_GeogFromText('SRID=4326;POINT(110.3590 -7.7647)'),-7.7647,110.3590,'yogyakarta','Jl. Palagan Tentara Pelajar, Sleman',ARRAY['english_spoken','tourist'],'approved'),
('the-phoenix-hotel','The Phoenix Hotel Yogyakarta','hotel','Heritage colonial-era hotel near Tugu.',ST_GeogFromText('SRID=4326;POINT(110.3622 -7.7826)'),-7.7826,110.3622,'yogyakarta','Jl. Jenderal Sudirman No.9, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('greenhost-boutique-hotel','Greenhost Boutique Hotel','hotel','Eco-conscious boutique hotel in the Prawirotaman district.',ST_GeogFromText('SRID=4326;POINT(110.3631 -7.7958)'),-7.7958,110.3631,'yogyakarta','Jl. Prawirotaman II No.629, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('royal-ambarrukmo','Royal Ambarrukmo Yogyakarta','hotel','Five-star hotel built around a royal Pendopo.',ST_GeogFromText('SRID=4326;POINT(110.4011 -7.7819)'),-7.7819,110.4011,'yogyakarta','Jl. Laksda Adisucipto No.81, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('tentrem-hotel','Tentrem Hotel Yogyakarta','hotel','Modern luxury hotel near Jogja City Mall.',ST_GeogFromText('SRID=4326;POINT(110.3829 -7.7670)'),-7.7670,110.3829,'yogyakarta','Jl. AM Sangaji No.72A, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),

-- Transit — bus stations
('terminal-giwangan','Terminal Giwangan','bus_station','Main inter-city bus terminal south of Yogyakarta.',ST_GeogFromText('SRID=4326;POINT(110.3815 -7.8261)'),-7.8261,110.3815,'yogyakarta','Jl. Imogiri Timur, Yogyakarta',ARRAY['open_24h','transit'],'approved'),
('terminal-jombor','Terminal Jombor','bus_station','Inter-city terminal in north Yogyakarta.',ST_GeogFromText('SRID=4326;POINT(110.3593 -7.7415)'),-7.7415,110.3593,'yogyakarta','Jl. Magelang Km.7, Sleman',ARRAY['transit'],'approved'),

-- Transit — train stations
('yogyakarta-tugu-station','Stasiun Yogyakarta (Tugu)','train_station','Main central railway station.',ST_GeogFromText('SRID=4326;POINT(110.3637 -7.7889)'),-7.7889,110.3637,'yogyakarta','Jl. Margo Utomo No.1, Yogyakarta',ARRAY['transit','open_24h'],'approved'),
('lempuyangan-station','Stasiun Lempuyangan','train_station','Eastern Yogyakarta railway station for economy services.',ST_GeogFromText('SRID=4326;POINT(110.3786 -7.7860)'),-7.7860,110.3786,'yogyakarta','Jl. Lempuyangan, Yogyakarta',ARRAY['transit','open_24h'],'approved'),

-- Transit — airports
('adisutjipto-airport','Bandara Adisutjipto (JOG)','airport','Domestic airport on the eastern edge of Yogyakarta.',ST_GeogFromText('SRID=4326;POINT(110.4319 -7.7884)'),-7.7884,110.4319,'yogyakarta','Jl. Solo Km.9, Sleman',ARRAY['transit','outside_city'],'approved'),
('yia-airport','Bandara Yogyakarta International (YIA)','airport','International airport in Kulon Progo, ~45 km west.',ST_GeogFromText('SRID=4326;POINT(110.0573 -7.9046)'),-7.9046,110.0573,'yogyakarta','Temon, Kulon Progo',ARRAY['transit','outside_city','english_spoken'],'approved'),

-- Government / public services
('kantor-walikota-yogya','Kantor Walikota Yogyakarta','government','Mayor''s office and city civil services.',ST_GeogFromText('SRID=4326;POINT(110.3737 -7.8033)'),-7.8033,110.3737,'yogyakarta','Jl. Kenari No.56, Yogyakarta',ARRAY[]::text[],'approved'),
('kantor-gubernur-diy','Kantor Gubernur DIY','government','Provincial government office.',ST_GeogFromText('SRID=4326;POINT(110.3651 -7.7806)'),-7.7806,110.3651,'yogyakarta','Kepatihan, Yogyakarta',ARRAY[]::text[],'approved'),
('polresta-yogya','Polresta Yogyakarta','government','City-level police headquarters.',ST_GeogFromText('SRID=4326;POINT(110.3736 -7.7891)'),-7.7891,110.3736,'yogyakarta','Jl. Reksobayan No.1, Yogyakarta',ARRAY['open_24h','emergency'],'approved'),

-- Bike repair
('ahass-yogya-sudirman','Honda AHASS Sudirman','bike_repair','Authorised Honda service centre.',ST_GeogFromText('SRID=4326;POINT(110.3658 -7.7858)'),-7.7858,110.3658,'yogyakarta','Jl. Jenderal Sudirman, Yogyakarta',ARRAY[]::text[],'approved'),
('yamaha-service-sudirman','Yamaha Service Center Sudirman','bike_repair','Authorised Yamaha service centre.',ST_GeogFromText('SRID=4326;POINT(110.3769 -7.7841)'),-7.7841,110.3769,'yogyakarta','Jl. Jenderal Sudirman, Yogyakarta',ARRAY[]::text[],'approved'),
('bengkel-motor-mas-aji','Bengkel Motor Mas Aji','bike_repair','Independent local bike workshop, all brands.',ST_GeogFromText('SRID=4326;POINT(110.3782 -7.7896)'),-7.7896,110.3782,'yogyakarta','Jl. Laksda Adisucipto, Yogyakarta',ARRAY[]::text[],'approved');
