-- ============================================================================
-- 0155 — Add lat / lng / trips_count to mock_drivers + populate the 6 demos
-- ----------------------------------------------------------------------------
-- /cari now displays a "Fastest" badge on the nearest driver card. The
-- distance maths needs real coordinates per driver — but mock_drivers
-- never had lat/lng columns (the previous `mockDriverRowToRider` always
-- returned lat=0,lng=0, which made every mock equally far from any
-- customer GPS).
--
-- This migration adds the columns + seeds the 6 currently-visible demos
-- with real Yogyakarta neighbourhood coordinates spread across the city,
-- plus richer profile text + plausible trips_count for badge logic.
--
-- Coordinates chosen so the 6 mocks cluster around Yogyakarta within
-- ~6 km of the city centre (-7.7956, 110.3695). Customer browsing from
-- the city will see realistic distance variation.
-- ============================================================================

-- 1. Schema additions (idempotent)
alter table public.mock_drivers
  add column if not exists lat numeric(10, 7),
  add column if not exists lng numeric(10, 7),
  add column if not exists trips_count integer not null default 0;

-- 2. Seed coordinates + richer profile copy for the 6 visible demos.
--    Each gets bio focused on their vehicle's strengths.

-- ── Bike #1 — Andi · Honda CB150R · Tegalrejo
update public.mock_drivers
   set lat          = -7.7841,
       lng          = 110.3539,
       trips_count  = 312,
       bio          = 'Honda CB150R sport, helmet 2 unit, hujan-proof. Antar penumpang, paket UMKM, food run. 7 tahun riding di Jogja — Tegalrejo, Malioboro, UGM, Yogyakarta International Airport. WhatsApp aktif 6 pagi sampai 11 malam.',
       services     = array['person', 'parcel']::text[],
       city         = coalesce(nullif(city, ''), 'Yogyakarta'),
       area         = coalesce(nullif(area, ''), 'Tegalrejo')
 where slug = 'demo-andi-cb';

-- ── Bike #2 — Budi · Honda BeAT · Umbulharjo
update public.mock_drivers
   set lat          = -7.8189,
       lng          = 110.3811,
       trips_count  = 256,
       bio          = 'Honda BeAT matic 110cc, irit BBM, jago jalan-jalan kecil. Cocok untuk antar paket Shopee/Tokopedia harian, ojek pelajar UNY/UGM, dan jemput food order. Area Umbulharjo, Kotagede, Banguntapan, Sleman. Box belakang siap pakai.',
       services     = array['parcel', 'food', 'person']::text[],
       city         = coalesce(nullif(city, ''), 'Yogyakarta'),
       area         = coalesce(nullif(area, ''), 'Umbulharjo')
 where slug = 'demo-budi-beat';

-- ── Bike #3 — Citra · Honda Scoopy · Mantrijeron
update public.mock_drivers
   set lat          = -7.8244,
       lng          = 110.3551,
       trips_count  = 198,
       bio          = 'Honda Scoopy retro, stylish & nyaman buat tamu wisatawan. Driver perempuan — aman & ramah untuk customer wanita & turis. Bahasa Inggris & Bahasa Jawa. Antar wisata Malioboro, Tamansari, Kraton, Prawirotaman.',
       services     = array['person', 'parcel']::text[],
       city         = coalesce(nullif(city, ''), 'Yogyakarta'),
       area         = coalesce(nullif(area, ''), 'Mantrijeron')
 where slug = 'demo-citra-scoopy';

-- ── Car #1 — Dwi Toyota Innova · Caturtunggal (Sleman)
update public.mock_drivers
   set lat          = -7.7711,
       lng          = 110.3855,
       trips_count  = 142,
       bio          = 'Toyota Innova Reborn 2.0V 2023, AC dingin, 7 seats, bagasi luas. Cocok keluarga, rombongan kerja, jemput bandara. Driver berpengalaman 12 tahun, paham rute wisata Jogja, Magelang, Borobudur, Dieng. Bahasa Inggris & Indonesia.',
       services     = array['person']::text[],
       city         = coalesce(nullif(city, ''), 'Yogyakarta'),
       area         = coalesce(nullif(area, ''), 'Caturtunggal')
 where slug = 'dwi-toyota-innova-jogja';

-- ── Car #2 — Budi Toyota Avanza · Gondokusuman
update public.mock_drivers
   set lat          = -7.7752,
       lng          = 110.3737,
       trips_count  = 178,
       bio          = 'Toyota Avanza 2022, 7 seats, mesin matic, irit BBM. Daily ride Jogja kota, jemput sekolah, antar pasar, airport transfer ke YIA. Tarif transparan, no surge. Available 24/7, response cepat di WhatsApp.',
       services     = array['person']::text[],
       city         = coalesce(nullif(city, ''), 'Yogyakarta'),
       area         = coalesce(nullif(area, ''), 'Gondokusuman')
 where slug = 'budi-toyota-avanza-yogya';

-- ── Car #3 — Siti Honda Mobilio · Depok (Sleman)
update public.mock_drivers
   set lat          = -7.7625,
       lng          = 110.4031,
       trips_count  = 124,
       bio          = 'Honda Mobilio 2021, 7 seats, AC dingin, sound system. Driver perempuan — pilihan aman untuk customer wanita, anak sekolah, lansia. Rute Depok, UGM, UPN, Maguwoharjo, Bandara YIA. Slow & safe driving.',
       services     = array['person']::text[],
       city         = coalesce(nullif(city, ''), 'Yogyakarta'),
       area         = coalesce(nullif(area, ''), 'Depok')
 where slug = 'siti-honda-mobilio-sleman';

-- ============================================================================
-- POST-CONDITIONS
--   • mock_drivers.lat + mock_drivers.lng populated for the 6 visible demos
--   • trips_count seeded with plausible 120-320 range
--   • Each mock has a thick, vehicle-specific Indonesian bio
--   • All 6 stay availability='online' (set in 0152)
-- ============================================================================
