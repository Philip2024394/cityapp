-- ============================================================================
-- 0095 — Minibus (Bus) demo seeds
-- ----------------------------------------------------------------------------
-- Three Yogyakarta-area minibus mocks so the /bus marketplace renders
-- pre-populated. Same pattern as the Car seeds in migration 0093:
-- self-published rates, directory model, no fare computation by IndoCity.
--
-- Indonesian minibus market norms (Yogya/Bali tourism + airport charters):
--   • Toyota Hiace      — 14–16 seats, ~Rp 7,000/km, charter Rp 800–1,000K/day
--   • Toyota Avanza     — 7 seats, ~Rp 5,000/km, charter Rp 450–550K/day
--   • Toyota Innova     — 7 seats, AC dingin, ~Rp 6,500/km, charter Rp 600–750K/day
--   • Suzuki APV / Ertiga — alternate 7-seater options
-- ----------------------------------------------------------------------------

insert into public.mock_drivers (
  slug, business_name, bio, whatsapp_e164, profile_image_url,
  city, area, services, price_per_km, min_fee, rating, availability,
  vehicle_type, vehicle_make, vehicle_model, vehicle_year,
  vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos
) values
(
  'rahmat-hiace-jogja-charter',
  'Rahmat Toyota Hiace Charter',
  'Hiace Commuter 16 seats, AC dingin, sound system, leg room luas. Cocok untuk rombongan keluarga / kantor / wisata Jogja-Solo-Magelang-Bromo. Bisa harian (8 jam Rp 950K) atau per trip.',
  '6281234567005',
  'https://ik.imagekit.io/nepgaxllc/hiace-rahmat.png',
  'Yogyakarta', 'Yogyakarta Kota',
  array['person']::text[],
  7000, 80000, 4.9, 'online',
  'minibus', 'Toyota', 'Hiace Commuter', 2022,
  'Putih', 'AB 7788 BG', 16,
  '["https://images.unsplash.com/photo-1570125909232-eb263c188f7e","https://images.unsplash.com/photo-1561463655-baf3a5f80f74"]'::jsonb
),
(
  'sutarto-innova-tour-yogya',
  'Sutarto Innova Reborn Tour',
  'Innova Reborn 7 penumpang + bagasi. Spesialis tour Yogyakarta: Borobudur, Prambanan, Kraton, Malioboro, Pantai Parangtritis, Kaliurang. Driver berbahasa Inggris (basic) dan Bahasa Jawa.',
  '6281234567006',
  'https://ik.imagekit.io/nepgaxllc/innova-sutarto.png',
  'Yogyakarta', 'Sleman',
  array['person']::text[],
  6500, 60000, 4.8, 'online',
  'minibus', 'Toyota', 'Innova Reborn', 2023,
  'Hitam', 'AB 4455 SK', 7,
  '["https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2","https://images.unsplash.com/photo-1494976388531-d1058494cdd8"]'::jsonb
),
(
  'wahyu-avanza-rombongan-bantul',
  'Wahyu Toyota Avanza Rombongan',
  'Avanza 2021, 7 penumpang + bagasi. Tarif ekonomis untuk pernikahan, antar-jemput bandara YIA, dan rombongan kecil. Free air mineral.',
  '6281234567007',
  'https://ik.imagekit.io/nepgaxllc/avanza-wahyu.png',
  'Yogyakarta', 'Bantul',
  array['person']::text[],
  5000, 50000, 4.7, 'online',
  'minibus', 'Toyota', 'Avanza Veloz', 2021,
  'Silver', 'AB 9988 BT', 7,
  '["https://images.unsplash.com/photo-1583121274602-3e2820c69888"]'::jsonb
)
on conflict (slug) do nothing;
