-- ============================================================================
-- 0098 — Demo rental mocks (4 car rentals + 3 truck rentals)
-- ----------------------------------------------------------------------------
-- Pre-populates /rentals/car + /rentals/truck so the marketplaces ship
-- with realistic-looking inventory before real drivers sign up.
--
-- Mix of self_drive (lepas kunci) and with_driver options across both
-- vehicle types, with Yogya + Bali market-norm pricing:
--
--   Car:
--     • Honda Brio 2022 — lepas kunci Yogya, Rp 250K/day, Rp 1.5M/week
--     • Suzuki Ertiga 2021 — lepas kunci Bali, Rp 350K/day, Rp 2M/week
--     • Toyota Avanza 2022 — with driver Yogya, Rp 500K/day (8h)
--     • Toyota Innova 2023 — both, Rp 400K self-drive / Rp 650K w/ driver
--
--   Truck:
--     • Mitsubishi L300 pickup — with driver Yogya, Rp 600K/day (moving)
--     • Suzuki Carry pickup — with driver Bali, Rp 500K/day (load+driver)
--     • Hino Dutro Engkel Box — with driver Sleman, Rp 900K/day
--
-- All drivers self-publish their rates. IndoCity is a directory only.
-- ============================================================================

insert into public.mock_drivers (
  slug, business_name, bio, whatsapp_e164, profile_image_url,
  city, area, services, price_per_km, min_fee, rating, availability,
  vehicle_type, vehicle_make, vehicle_model, vehicle_year,
  vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos,
  rental_type, rental_daily_rate_idr, rental_weekly_rate_idr, rental_monthly_rate_idr, rental_min_days
) values

-- ── Car rentals ────────────────────────────────────────────────────────────
(
  'honda-brio-lepas-kunci-yogya',
  'Brio Lepas Kunci Yogya',
  'Honda Brio matic, AC dingin, audio bagus. Lepas kunci, free helm + jas hujan. Cocok untuk wisata Yogya, antar-jemput keluarga, kerja harian. Sewa minimum 1 hari.',
  '6281234567010',
  'https://ik.imagekit.io/nepgaxllc/brio-rental.png',
  'Yogyakarta', 'Yogyakarta Kota',
  array['person']::text[],
  4000, 25000, 4.8, 'online',
  'car', 'Honda', 'Brio Satya', 2022,
  'Putih', 'AB 1122 BD', 5,
  '["https://images.unsplash.com/photo-1583121274602-3e2820c69888"]'::jsonb,
  'self_drive', 250000, 1500000, 5000000, 1
),
(
  'ertiga-rental-bali-self',
  'Ertiga Self-Drive Bali',
  'Suzuki Ertiga 2021, 7 penumpang. Lepas kunci di area Kuta / Seminyak / Ubud. Free pickup hotel area Kuta. Asuransi included. SIM A required.',
  '6281234567011',
  'https://ik.imagekit.io/nepgaxllc/ertiga-rental.png',
  'Bali', 'Kuta',
  array['person']::text[],
  4500, 30000, 4.9, 'online',
  'car', 'Suzuki', 'Ertiga GL', 2021,
  'Silver', 'DK 3344 KT', 7,
  '["https://images.unsplash.com/photo-1502877338535-766e1452684a"]'::jsonb,
  'self_drive', 350000, 2000000, 7000000, 1
),
(
  'avanza-sewa-sopir-yogya',
  'Sewa Avanza + Sopir Yogya',
  'Toyota Avanza 2022 dengan supir berpengalaman. Tarif harian (8 jam) Rp 500K. Cocok untuk wisata Borobudur, Prambanan, Malioboro, antar-jemput rombongan. Driver berbahasa Inggris (basic).',
  '6281234567012',
  'https://ik.imagekit.io/nepgaxllc/avanza-sewa.png',
  'Yogyakarta', 'Yogyakarta Kota',
  array['person']::text[],
  5500, 35000, 4.7, 'online',
  'car', 'Toyota', 'Avanza Veloz', 2022,
  'Hitam', 'AB 8899 BD', 7,
  '["https://images.unsplash.com/photo-1494976388531-d1058494cdd8"]'::jsonb,
  'with_driver', 500000, 3000000, null, 1
),
(
  'innova-bali-both-options',
  'Innova Bali — Lepas Kunci atau dengan Sopir',
  'Toyota Innova Reborn 2023. Pilihan: lepas kunci Rp 400K/hari (SIM A required) ATAU dengan supir Rp 650K/hari (8 jam, BBM included luar kota tambahan). Spesialis tour Bali — Uluwatu, Tanah Lot, Ubud, Lovina.',
  '6281234567013',
  'https://ik.imagekit.io/nepgaxllc/innova-bali.png',
  'Bali', 'Denpasar',
  array['person']::text[],
  6000, 50000, 4.9, 'online',
  'car', 'Toyota', 'Innova Reborn', 2023,
  'Abu-abu', 'DK 5566 DN', 7,
  '["https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2"]'::jsonb,
  'both', 400000, 2500000, 9000000, 1
),

-- ── Truck rentals ──────────────────────────────────────────────────────────
(
  'l300-pickup-pindahan-yogya',
  'L300 Pickup + Sopir untuk Pindahan',
  'Mitsubishi L300 pickup bak terbuka. Tarif Rp 600K/hari (8 jam) include sopir + 1 helper. Bisa angkut isi rumah/kantor 1 ruangan. Coverage Yogya-Solo-Magelang.',
  '6281234567014',
  'https://ik.imagekit.io/nepgaxllc/l300-pickup.png',
  'Yogyakarta', 'Yogyakarta Kota',
  array['parcel']::text[],
  6000, 60000, 4.6, 'online',
  'truck', 'Mitsubishi', 'L300 Pickup', 2019,
  'Putih', 'AB 7711 BD', 3,
  '["https://images.unsplash.com/photo-1601584115197-04ecc0da31d7"]'::jsonb,
  'with_driver', 600000, 3500000, 12000000, 1
),
(
  'carry-pickup-bali-helper',
  'Carry Pickup + Tukang Angkat Bali',
  'Suzuki Carry 1.5L pickup, kapasitas 700kg. Tarif Rp 500K/hari include sopir + 1 helper untuk muat-bongkar. Pindahan kos / kontrakan / barang dagangan.',
  '6281234567015',
  'https://ik.imagekit.io/nepgaxllc/carry-pickup.png',
  'Bali', 'Denpasar',
  array['parcel']::text[],
  5500, 50000, 4.7, 'online',
  'truck', 'Suzuki', 'Carry Futura', 2020,
  'Merah', 'DK 2233 DN', 3,
  '["https://images.unsplash.com/photo-1601584115197-04ecc0da31d7"]'::jsonb,
  'with_driver', 500000, 3000000, 10000000, 1
),
(
  'hino-engkel-box-sleman',
  'Hino Engkel Box untuk Pindahan Besar',
  'Hino Dutro 130HD engkel box, kapasitas 4 ton. Cocok untuk pindahan rumah besar, distribusi ritel, atau angkutan barang dagangan. Tarif Rp 900K/hari + BBM separate. Sopir berpengalaman 10 tahun.',
  '6281234567016',
  'https://ik.imagekit.io/nepgaxllc/hino-engkel.png',
  'Yogyakarta', 'Sleman',
  array['parcel']::text[],
  8000, 100000, 4.8, 'online',
  'truck', 'Hino', 'Dutro 130HD', 2021,
  'Putih', 'AB 4477 SK', 2,
  '["https://images.unsplash.com/photo-1565008576549-57569a49371d"]'::jsonb,
  'with_driver', 900000, 5500000, 20000000, 1
)
on conflict (slug) do nothing;
