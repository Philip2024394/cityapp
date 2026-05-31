-- =============================================================================
-- 0163 — mock_drivers: add 'jeep' + seed 3 Yogya jeep demo drivers
-- =============================================================================
-- Mirrors 0162 (which widened drivers.vehicle_type) for the parallel
-- mock_drivers table. Then seeds 3 demo jeep drivers in Yogyakarta to carry
-- the /jeep marketplace until real jeep signups land. Profile images use
-- founder-supplied jeep banner URLs uploaded 2026-05-31.
--
-- Compliance: each row is a self-publishing driver. CityDrivers is a software
-- directory under PM 12/2019. Mocks are visually labelled as demo entries via
-- their slug prefix ('demo-jeep-*') so the admin tools and surfacing logic
-- can distinguish them from real signups.
-- =============================================================================

-- 1. Widen the check constraint to include 'jeep'.
alter table public.mock_drivers
  drop constraint if exists mock_drivers_vehicle_type_check;

alter table public.mock_drivers
  add constraint mock_drivers_vehicle_type_check
  check (vehicle_type in ('bike','car','truck','premium_car','minibus','jeep'));

-- 2. Seed 3 demo jeep drivers in Yogyakarta — Bromo / Merapi / Ijen sunrise
-- charter operators. Prices reflect Yogya market norms for jeep charter:
--   • Base ~ Rp 12,000/km (premium vs car at Rp 5,000/km)
--   • Min fee Rp 150,000 (charter floor)
-- Drivers tune these on their own dashboards once they sign up.

insert into public.mock_drivers (
  slug, business_name, bio, whatsapp_e164, profile_image_url,
  city, area, services, price_per_km, min_fee, rating, availability,
  vehicle_type, vehicle_make, vehicle_model, vehicle_year,
  vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos
) values
(
  'demo-jeep-yusuf-bromo-yogya',
  'Pak Yusuf Bromo Sunrise Jeep',
  'Charter jeep untuk Bromo, Tumpak Sewu, Ijen. Antar-jemput dari Yogya. Sopir lokal, fasih English + Bahasa Indonesia. Punya kopi pagi gratis untuk tamu.',
  '6281234567801',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_44_53%20AM.png',
  'Yogyakarta',
  'Sleman',
  ARRAY['jeep_tour','airport','charter']::text[],
  12000, 150000, 4.9, 'online',
  'jeep', 'Suzuki', 'Jimny', 2019, 'Kuning', 'AB 1234 JEEP', 4,
  '["https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_44_53%20AM.png"]'::jsonb
),
(
  'demo-jeep-wahyu-merapi-yogya',
  'Pak Wahyu Merapi Lava Jeep',
  'Tour Merapi Lava — Kaliadem, Bunker, Museum Sisa Hartaku, Stonehenge. Jeep 4x4 modifikasi off-road. Paket sunrise / sunset / volcano photography.',
  '6281234567802',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_50_01%20AM.png',
  'Yogyakarta',
  'Cangkringan',
  ARRAY['jeep_tour','off_road','photography']::text[],
  10000, 175000, 4.8, 'online',
  'jeep', 'Toyota', 'Land Cruiser', 1995, 'Hitam', 'AB 5678 JEEP', 4,
  '["https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_50_01%20AM.png"]'::jsonb
),
(
  'demo-jeep-bambang-adventure-yogya',
  'Pak Bambang Adventure Jeep Yogya',
  'Jeep adventure ke pantai selatan, Goa Pindul, Hutan Pinus. Bisa charter harian / mingguan. Termasuk driver + bensin (sesuai paket). Bayar langsung ke saya.',
  '6281234567803',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_05_47%20PM.png',
  'Yogyakarta',
  'Bantul',
  ARRAY['jeep_tour','beach','day_charter']::text[],
  11000, 160000, 4.7, 'online',
  'jeep', 'Daihatsu', 'Rocky', 2001, 'Hijau Army', 'AB 9012 JEEP', 5,
  '["https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_05_47%20PM.png"]'::jsonb
)
on conflict (slug) do nothing;
