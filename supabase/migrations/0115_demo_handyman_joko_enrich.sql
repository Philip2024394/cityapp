-- ============================================================================
-- 0115 — Enrich demo-hp-pak-joko to template-quality handyman profile
-- ----------------------------------------------------------------------------
-- Mirrors mig 0111 (Dewi) standard checklist, adapted for handyman shape:
--   • bio cap 300 chars (mig 0061)
--   • promo_text cap 280 chars (mig 0089)
--   • specialties capped at 3 (mig 0061) — kept as-is
--   • service_photos is a FLAT jsonb ARRAY (mig 0089 CHECK constraint),
--     with each item's `name` containing the specialty label so the
--     profile-page chip filter can partial-match.
-- All photo URLs are Unsplash CDN (sourced 2026-05-29: handyman-tools,
-- electrician, plumbing-repair).
-- ============================================================================

update public.handyman_providers set
  bio                = 'Tukang berpengalaman 12+ tahun di Yogyakarta — listrik, AC service, perbaikan alat rumah tangga. Free quote dalam 24 jam, no callout fee di area Jogja.',

  instagram_url      = 'https://www.instagram.com/pakjoko.tukang',
  tiktok_url         = 'https://www.tiktok.com/@pakjoko.tukang',
  facebook_url       = 'https://www.facebook.com/pakjoko.tukang',

  promo_text         = 'Free quote dalam 24 jam — no callout fee untuk area Jogja city minggu ini.',

  hero_text          = jsonb_build_object(
    'line1',         'Professional',
    'line2',         'Tukang',
    'tagline',       'Listrik · AC Service · Service Alat',
    'color',         '#F59E0B',
    'line1_color',   '#0A0A0A',
    'tagline_color', '#0A0A0A',
    'effect',        'shimmer'
  ),

  theme_color        = '#F59E0B',

  gallery_image_urls = ARRAY[
    'https://images.unsplash.com/photo-1581783898377-1c85bf937427',
    'https://images.unsplash.com/photo-1682345262055-8f95f3c513ea',
    'https://images.unsplash.com/photo-1426927308491-6380b6a9936f',
    'https://images.unsplash.com/photo-1581166397057-235af2b3c6dd',
    'https://images.unsplash.com/photo-1586864387789-628af9feed72',
    'https://images.unsplash.com/photo-1676210134188-4c05dd172f89'
  ],

  -- Flat-array service_photos (mig 0089 CHECK constraint).
  -- `name` carries the specialty label so the profile chip filter
  -- (buildPortfolioPhotos) can partial-match against SPECIALTY_LABELS.
  service_photos     = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1682345262055-8f95f3c513ea',
      'name',        'Tukang Listrik — Panel Upgrade',
      'description', 'Pemasangan MCB dan pengecekan instalasi listrik rumah, jaminan aman SNI.',
      'price_idr',   250000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1621905251189-08b45d6a269e',
      'name',        'Tukang Listrik — Stop Kontak & Saklar',
      'description', 'Penggantian stop kontak, saklar, lampu LED. Same-day di area Jogja.',
      'price_idr',   150000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1635335874521-7987db781153',
      'name',        'AC Service — Cuci AC',
      'description', 'Pembersihan AC split & evaporator, freon top-up, garansi 30 hari.',
      'price_idr',   180000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1555963966-b7ae5404b6ed',
      'name',        'AC Service — Bongkar Pasang',
      'description', 'Pindah unit AC antar-ruang atau antar-rumah, lengkap dengan pipa & bracket.',
      'price_idr',   450000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1426927308491-6380b6a9936f',
      'name',        'Service Alat (Kulkas, Mesin Cuci) — Diagnosa',
      'description', 'Diagnosa kerusakan, ganti spare-part original/OEM. Free quote sebelum kerjakan.',
      'price_idr',   200000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1586864387789-628af9feed72',
      'name',        'Service Alat (Kulkas, Mesin Cuci) — Mesin Cuci',
      'description', 'Service mesin cuci front-load & top-load: pompa, belting, dinamo.',
      'price_idr',   300000
    )
  ),

  hourly_rate_idr    = coalesce(hourly_rate_idr, 100000),
  day_rate_idr       = coalesce(day_rate_idr,    600000),
  has_own_tools      = true,

  languages          = ARRAY['id','en'],

  updated_at         = now()
where slug = 'demo-hp-pak-joko' and is_mock = true;
