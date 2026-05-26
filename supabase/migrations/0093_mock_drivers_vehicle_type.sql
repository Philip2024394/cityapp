-- ============================================================================
-- 0093 — Multi-vehicle support for mock_drivers (Car seeds)
-- ----------------------------------------------------------------------------
-- Mirrors migration 0092's drivers-table changes onto the parallel
-- mock_drivers table. Same rationale: lets the /car marketplace ship
-- pre-populated with demo entries before real car drivers sign up.
--
-- Bike mocks (the existing 4 Yogya drivers seeded back in 0050) keep
-- vehicle_type='bike' via the default and continue rendering on the
-- bike marketplace. Car mocks land in a separate insert below.
-- ============================================================================

alter table public.mock_drivers
  add column if not exists vehicle_type text not null default 'bike'
    check (vehicle_type in ('bike','car','truck','premium_car','minibus')),
  add column if not exists vehicle_make   text,
  add column if not exists vehicle_model  text,
  add column if not exists vehicle_year   int,
  add column if not exists vehicle_color  text,
  add column if not exists vehicle_plate  text,
  add column if not exists vehicle_seats  int,
  add column if not exists vehicle_photos jsonb not null default '[]'::jsonb;

create index if not exists idx_mock_drivers_vehicle_type
  on public.mock_drivers (vehicle_type, availability)
  where mock_hidden_at is null;

comment on column public.mock_drivers.vehicle_type is
  'Mirrors drivers.vehicle_type so the /car, /truck, etc. marketplace surfaces can pre-populate from the same mock pool used by /handyman + /bike.';

-- ---------------------------------------------------------------------------
-- Seed 4 demo car drivers in Yogyakarta
-- ---------------------------------------------------------------------------
-- All numbers + names are fictional. Stays inside compliance: each row
-- represents a driver who self-publishes their own price_per_km +
-- min_fee. IndoCity surfaces them as a directory — never sets fares.
--
-- Pricing reflects Yogya market norms for app-based car (taxi online):
--   • Base around Rp 5,000/km
--   • Min fee Rp 25,000–35,000
-- Drivers can tune these on their own dashboards once they sign up.
-- ---------------------------------------------------------------------------

insert into public.mock_drivers (
  slug, business_name, bio, whatsapp_e164, profile_image_url,
  city, area, services, price_per_km, min_fee, rating, availability,
  vehicle_type, vehicle_make, vehicle_model, vehicle_year,
  vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos
) values
(
  'budi-toyota-avanza-yogya',
  'Budi Toyota Avanza',
  'Pengalaman 8 tahun. AC dingin, audio bagus, AC kabin selalu dingin. Bisa antar ke airport YIA / Solo / Magelang.',
  '6281234567001',
  'https://ik.imagekit.io/nepgaxllc/avanza-budi.png',
  'Yogyakarta', 'Yogyakarta Kota',
  array['person']::text[],
  4500, 30000, 4.8, 'online',
  'car', 'Toyota', 'Avanza', 2021,
  'Silver', 'AB 1234 BD', 7,
  '["https://images.unsplash.com/photo-1583121274602-3e2820c69888"]'::jsonb
),
(
  'siti-honda-mobilio-sleman',
  'Siti Honda Mobilio',
  'Pengemudi wanita, ramah anak-anak. AC dingin, mobil bersih, car seat tersedia jika diminta. Khusus pelanggan keluarga.',
  '6281234567002',
  'https://ik.imagekit.io/nepgaxllc/mobilio-siti.png',
  'Yogyakarta', 'Sleman',
  array['person']::text[],
  4000, 28000, 4.9, 'online',
  'car', 'Honda', 'Mobilio', 2020,
  'Putih', 'AB 5678 SK', 7,
  '["https://images.unsplash.com/photo-1494976388531-d1058494cdd8"]'::jsonb
),
(
  'agus-suzuki-ertiga-bantul',
  'Agus Suzuki Ertiga',
  'Driver berpengalaman wisata Yogya — Borobudur, Prambanan, Kaliurang, Pantai Parangtritis. Bisa booking harian (8 jam Rp 350K) atau per trip.',
  '6281234567003',
  'https://ik.imagekit.io/nepgaxllc/ertiga-agus.png',
  'Yogyakarta', 'Bantul',
  array['person']::text[],
  5000, 35000, 4.7, 'online',
  'car', 'Suzuki', 'Ertiga', 2022,
  'Hitam', 'AB 9012 BT', 7,
  '["https://images.unsplash.com/photo-1502877338535-766e1452684a"]'::jsonb
),
(
  'dwi-toyota-innova-jogja',
  'Dwi Toyota Innova',
  'Innova Reborn, kapasitas 7 penumpang + bagasi besar. Cocok rombongan keluarga, group tour, antar-jemput airport.',
  '6281234567004',
  'https://ik.imagekit.io/nepgaxllc/innova-dwi.png',
  'Yogyakarta', 'Yogyakarta Kota',
  array['person']::text[],
  6000, 40000, 4.6, 'online',
  'car', 'Toyota', 'Innova Reborn', 2023,
  'Abu-abu', 'AB 3456 BG', 7,
  '["https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2"]'::jsonb
)
on conflict (slug) do nothing;
