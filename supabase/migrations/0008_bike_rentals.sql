-- 0008_bike_rentals.sql
-- Motorcycle rental marketplace — Slice 1.
-- Integrated into IndoCity (not standalone): listings live at /rent,
-- owners reuse the platform's existing auth/KYC where available, and
-- rentals share city zones + supabase storage with the places directory.
--
-- This migration ships:
--   - bike_rentals table
--   - public-read RLS for approved rows (mirrors places policy)
--   - seed: ~12 listings across Yogyakarta + Denpasar so the card UI has
--     real data to render from day one.
--
-- Booking, calendar, payment, and photo handoff are NOT in this slice.

create table bike_rentals (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,

  -- ─── Owner ────────────────────────────────────────────────────────
  owner_user_id   uuid references auth.users(id) on delete set null,
  owner_name      text not null,
  owner_company   text,
  owner_whatsapp_e164 text not null,
  owner_languages text[] not null default '{}',
  owner_response_time_min int,

  -- ─── Bike ─────────────────────────────────────────────────────────
  brand           text not null,
  model           text not null,
  year            int  not null,
  cc              int  not null,
  transmission    text not null
                  check (transmission in ('automatic','manual','semi_auto')),
  bike_type       text,
  color           text,

  -- ─── Pricing ──────────────────────────────────────────────────────
  daily_price_idr        int not null,
  weekly_price_idr       int,
  monthly_price_idr      int,
  security_deposit_idr   int,
  driver_rate_per_day_idr int,   -- only set when rental_mode includes 'with_driver'

  -- ─── Inclusions ───────────────────────────────────────────────────
  helmet_count           int not null default 0,
  raincoat_count         int not null default 0,
  has_phone_holder       boolean not null default false,
  has_phone_charger      boolean not null default false,
  has_delivery_box       boolean not null default false,
  ready_to_work          boolean not null default false,

  -- ─── Service / delivery ───────────────────────────────────────────
  delivers_to_hotel      boolean not null default false,
  delivers_to_villa      boolean not null default false,
  pickup_dropoff         boolean not null default false,

  -- ─── Rental mode ──────────────────────────────────────────────────
  rental_mode            text not null
                         check (rental_mode in ('self_ride','with_driver','both')),

  -- ─── Location ─────────────────────────────────────────────────────
  city                   text not null references city_zones(city),
  address                text,
  location               geography(Point, 4326) not null,
  lat                    double precision not null,
  lng                    double precision not null,

  -- ─── Media + meta ─────────────────────────────────────────────────
  image_urls             text[] not null default '{}',
  description            text,
  tags                   text[] not null default '{}',
  rating                 numeric(2,1),
  review_count           int not null default 0,

  -- ─── Trust + status ───────────────────────────────────────────────
  status                 text not null default 'pending'
                         check (status in ('pending','approved','rejected','suspended')),
  verified               boolean not null default false,
  available_now          boolean not null default true,
  listing_tier           text not null default 'free'
                         check (listing_tier in ('free','paid','featured')),
  paid_until             date,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index bike_rentals_location_gix on bike_rentals using gist (location);
create index bike_rentals_city_status  on bike_rentals (city, status);
create index bike_rentals_mode         on bike_rentals (rental_mode);
create index bike_rentals_available    on bike_rentals (available_now);

-- ─── RLS — mirrors places policy ────────────────────────────────────
alter table bike_rentals enable row level security;

drop policy if exists "bike_rentals_public_read_approved" on bike_rentals;
create policy "bike_rentals_public_read_approved"
  on bike_rentals for select
  using (status = 'approved');

-- ─── Seed: ~12 listings across Yogya + Denpasar ─────────────────────
-- Mix of brands, modes, ready-to-work flags, languages spoken, and
-- price tiers so the card UI exercises all visual states immediately.

-- First, ensure city_zones has a row for Denpasar so the bike_rentals
-- FK doesn't choke. Rough Bali-south rectangle covering Kuta, Seminyak,
-- Canggu, Denpasar, Sanur, Nusa Dua. Refine with a real polygon later.
insert into city_zones (
  city, geometry, centroid,
  centroid_lat, centroid_lng,
  min_lng, max_lng, min_lat, max_lat
) values (
  'denpasar',
  ST_GeogFromText('SRID=4326;POLYGON((115.10 -8.55, 115.30 -8.55, 115.30 -8.85, 115.10 -8.85, 115.10 -8.55))'),
  ST_GeogFromText('SRID=4326;POINT(115.2167 -8.6500)'),
  -8.6500, 115.2167,
  115.10, 115.30, -8.85, -8.55
) on conflict (city) do nothing;

insert into bike_rentals (
  slug, owner_name, owner_company, owner_whatsapp_e164, owner_languages, owner_response_time_min,
  brand, model, year, cc, transmission, bike_type, color,
  daily_price_idr, weekly_price_idr, monthly_price_idr, security_deposit_idr, driver_rate_per_day_idr,
  helmet_count, raincoat_count, has_phone_holder, has_phone_charger, has_delivery_box, ready_to_work,
  delivers_to_hotel, delivers_to_villa, pickup_dropoff,
  rental_mode, city, address, location, lat, lng,
  image_urls, description, tags,
  rating, review_count, status, verified, available_now, listing_tier
) values

-- Yogyakarta — individual rider listings (idle bike utilisation)
('honda-pcx-150-jogja-1','Pak Budi',null,'+6281234567001',ARRAY['id','en'],8,
 'Honda','PCX 150',2023,150,'automatic','matic','Hitam',
 95000,600000,2100000,500000,null,
 2,2,true,true,false,false,
 true,false,true,
 'self_ride','yogyakarta','Jl. Prawirotaman, Yogyakarta',
 ST_GeogFromText('SRID=4326;POINT(110.3651 -7.8141)'),-7.8141,110.3651,
 ARRAY[]::text[],'Honda PCX 150 mulus, baru servis, helmet & raincoat untuk berdua.',
 ARRAY['tourist','english_spoken'],
 4.9,32,'approved',true,true,'free'),

('yamaha-nmax-155-jogja-1','Mbak Sari',null,'+6281234567002',ARRAY['id','en'],12,
 'Yamaha','NMAX 155',2022,155,'automatic','matic','Putih',
 90000,580000,2000000,500000,null,
 2,1,true,true,false,false,
 true,true,true,
 'self_ride','yogyakarta','Jl. Tirtodipuran, Yogyakarta',
 ST_GeogFromText('SRID=4326;POINT(110.3656 -7.8089)'),-7.8089,110.3656,
 ARRAY[]::text[],'NMAX matic dengan box di belakang, cocok turis jalan-jalan keliling Jogja.',
 ARRAY['tourist','english_spoken'],
 4.8,28,'approved',true,true,'free'),

('honda-beat-jogja-1','Andri R.',null,'+6281234567003',ARRAY['id'],20,
 'Honda','BeAT',2024,110,'automatic','matic','Merah',
 60000,380000,1200000,300000,null,
 2,1,false,false,false,false,
 false,false,false,
 'self_ride','yogyakarta','Jl. Kaliurang Km.5, Sleman',
 ST_GeogFromText('SRID=4326;POINT(110.3893 -7.7843)'),-7.7843,110.3893,
 ARRAY[]::text[],'BeAT irit, cocok mahasiswa atau yang butuh harian.',
 ARRAY[]::text[],
 4.6,15,'approved',true,true,'free'),

-- Yogyakarta — ready-to-work delivery bike
('honda-vario-125-jogja-rtw','Reza Adi',null,'+6281234567004',ARRAY['id','en'],5,
 'Honda','Vario 125',2023,125,'automatic','matic','Biru',
 75000,470000,1700000,400000,null,
 1,1,true,true,true,true,
 false,false,true,
 'self_ride','yogyakarta','Jl. Affandi (Gejayan), Sleman',
 ST_GeogFromText('SRID=4326;POINT(110.3863 -7.7790)'),-7.7790,110.3863,
 ARRAY[]::text[],'Ready-to-work — box, phone holder, charger sudah lengkap. Cocok kurir GoFood / ShopeeFood mulai hari ini.',
 ARRAY['ready_to_work'],
 4.9,47,'approved',true,true,'featured'),

-- Yogyakarta — with-driver
('yamaha-aerox-driver-jogja','CV Jogja Tour',NULL,'+6281234567005',ARRAY['id','en','zh'],3,
 'Yamaha','Aerox 155',2023,155,'automatic','matic','Hitam',
 150000,950000,3500000,500000,200000,
 2,2,true,true,false,false,
 true,true,true,
 'with_driver','yogyakarta','Jl. Malioboro, Yogyakarta',
 ST_GeogFromText('SRID=4326;POINT(110.3654 -7.7926)'),-7.7926,110.3654,
 ARRAY[]::text[],'Sewa motor + driver lokal yang tahu jalan-jalan rahasia Jogja. Bahasa Inggris OK.',
 ARRAY['tourist','english_spoken'],
 5.0,12,'approved',true,true,'featured'),

-- Yogyakarta — company fleet (Scoopy)
('honda-scoopy-jogja-fleet','Jogja Rental Shop','PT Jogja Wisata Motor','+6281234567006',ARRAY['id','en'],10,
 'Honda','Scoopy',2024,110,'automatic','matic','Krem',
 65000,400000,1300000,300000,null,
 2,1,true,false,false,false,
 true,false,true,
 'self_ride','yogyakarta','Jl. Sosrowijayan, Yogyakarta',
 ST_GeogFromText('SRID=4326;POINT(110.3658 -7.7935)'),-7.7935,110.3658,
 ARRAY[]::text[],'Armada baru, all-new Scoopy 2024. Dokumen lengkap, pickup hotel area Malioboro.',
 ARRAY['tourist'],
 4.7,89,'approved',true,true,'paid'),

-- Denpasar / Bali — tourist focus
('yamaha-nmax-bali-1','Wayan Putra',NULL,'+6281234567010',ARRAY['id','en'],6,
 'Yamaha','NMAX 155',2023,155,'automatic','matic','Abu-abu',
 100000,650000,2300000,500000,null,
 2,2,true,true,false,false,
 true,true,true,
 'self_ride','denpasar','Jl. Sunset Road, Kuta',
 ST_GeogFromText('SRID=4326;POINT(115.1690 -8.7150)'),-8.7150,115.1690,
 ARRAY[]::text[],'NMAX siap untuk Bali road trip — Canggu, Uluwatu, Ubud. Diantar ke hotel.',
 ARRAY['tourist','english_spoken'],
 4.8,156,'approved',true,true,'featured'),

('honda-vario-150-bali-1','Made Astawa',NULL,'+6281234567011',ARRAY['id','en'],15,
 'Honda','Vario 150',2022,150,'automatic','matic','Hitam',
 85000,540000,1900000,400000,null,
 2,1,true,true,false,false,
 true,false,true,
 'self_ride','denpasar','Jl. Raya Seminyak',
 ST_GeogFromText('SRID=4326;POINT(115.1670 -8.6900)'),-8.6900,115.1670,
 ARRAY[]::text[],'Vario 150 untuk explore Bali selatan. Driver bisa drop ke airport.',
 ARRAY['tourist','english_spoken'],
 4.7,73,'approved',true,true,'free'),

-- Denpasar — adventure
('honda-crf-150l-bali','Kadek Surya',NULL,'+6281234567012',ARRAY['id','en'],4,
 'Honda','CRF 150L',2023,150,'manual','adventure','Merah',
 180000,1100000,4000000,1000000,null,
 1,1,false,false,false,false,
 true,true,true,
 'self_ride','denpasar','Jl. Raya Ubud',
 ST_GeogFromText('SRID=4326;POINT(115.2630 -8.5070)'),-8.5070,115.2630,
 ARRAY[]::text[],'Dual-sport for off-road trails — Mount Batur sunrise, Sidemen rice fields, Munduk waterfalls.',
 ARRAY['tourist','english_spoken','adventure'],
 4.9,22,'approved',true,true,'free'),

-- Denpasar — fleet company
('yamaha-mio-bali-fleet','Bali Bike Co','PT Bali Motor Sewa','+6281234567013',ARRAY['id','en'],8,
 'Yamaha','Mio M3',2022,115,'automatic','matic','Biru',
 70000,420000,1500000,300000,null,
 2,1,false,true,false,false,
 true,true,true,
 'self_ride','denpasar','Jl. Bypass Ngurah Rai, Kuta',
 ST_GeogFromText('SRID=4326;POINT(115.1750 -8.7220)'),-8.7220,115.1750,
 ARRAY[]::text[],'Fleet rental dengan armada 40+ motor. Pengantaran ke seluruh Bali Selatan.',
 ARRAY['tourist','english_spoken'],
 4.6,312,'approved',true,true,'paid'),

-- Denpasar — with driver (tourist concierge)
('honda-pcx-driver-bali','Ngurah Adi',NULL,'+6281234567014',ARRAY['id','en'],3,
 'Honda','PCX 160',2024,160,'automatic','matic','Putih',
 180000,1150000,4200000,500000,250000,
 2,2,true,true,false,false,
 true,true,true,
 'with_driver','denpasar','Jl. Raya Canggu',
 ST_GeogFromText('SRID=4326;POINT(115.1380 -8.6500)'),-8.6500,115.1380,
 ARRAY[]::text[],'PCX premium + local guide. Custom itinerary, English fluent, photo spots included.',
 ARRAY['tourist','english_spoken'],
 5.0,9,'approved',true,true,'featured'),

-- Yogyakarta — currently unavailable (status visible but available_now = false)
('honda-cb150r-jogja-1','Dimas P.',NULL,'+6281234567020',ARRAY['id'],30,
 'Honda','CB150R',2022,150,'manual','sport','Hitam',
 110000,700000,2500000,500000,null,
 1,1,false,false,false,false,
 false,false,false,
 'self_ride','yogyakarta','Jl. Solo, Yogyakarta',
 ST_GeogFromText('SRID=4326;POINT(110.3974 -7.7901)'),-7.7901,110.3974,
 ARRAY[]::text[],'Sport naked, manual transmission. Cocok pengendara berpengalaman.',
 ARRAY[]::text[],
 4.5,8,'approved',true,false,'free');
