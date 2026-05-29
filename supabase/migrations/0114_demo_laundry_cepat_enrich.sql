-- ============================================================================
-- 0114 — Enrich demo-lp-cepat to template-quality laundry profile
-- ----------------------------------------------------------------------------
-- Mirrors mig 0111 (Dewi) standard checklist, minus service_photos and
-- business_name (laundry_providers has neither column). Cepat is the
-- canonical laundry demo: Yogyakarta wash-dry-iron with fast turnaround.
-- All photo URLs are Unsplash CDN (sourced 2026-05-29: laundry-service,
-- folded-clothes).
-- ============================================================================

update public.laundry_providers set
  bio                = 'Layanan laundry profesional di Yogyakarta — wash, dry & iron dengan turnaround 24 jam.
Free antar-jemput dalam radius 3 km, minimum 3 kg.
Deterjen hypoallergenic untuk kulit sensitif & wewangian pilihan.
Pesan via WhatsApp — pickup hari ini, kembali besok rapi & wangi.',

  instagram_url      = 'https://www.instagram.com/cepatlaundry.jogja',
  tiktok_url         = 'https://www.tiktok.com/@cepatlaundry.jogja',
  facebook_url       = 'https://www.facebook.com/cepatlaundry.jogja',

  promo_text         = 'Free pickup + delivery dalam 3 km radius minggu ini. Minimum 3 kg.',

  hero_text          = jsonb_build_object(
    'line1',         'Cepat & Bersih',
    'line2',         'Laundry',
    'tagline',       'Wash · Dry · Iron · 24h turnaround',
    'color',         '#2563EB',
    'line1_color',   '#0A0A0A',
    'tagline_color', '#0A0A0A',
    'effect',        'shimmer'
  ),

  theme_color        = '#2563EB',

  gallery_image_urls = ARRAY[
    'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60',
    'https://images.unsplash.com/photo-1582735689369-4fe89db7114c',
    'https://images.unsplash.com/photo-1635274605638-d44babc08a4f',
    'https://images.unsplash.com/photo-1604335398980-ededcadcc37d',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68',
    'https://images.unsplash.com/photo-1567113463300-102a7eb3cb26'
  ],

  price_wash_per_kg_idr      = coalesce(price_wash_per_kg_idr,      7000),
  price_wash_dry_per_kg_idr  = coalesce(price_wash_dry_per_kg_idr,  10000),
  price_wash_iron_per_kg_idr = coalesce(price_wash_iron_per_kg_idr, 13000),
  min_kg                     = coalesce(min_kg, 3),
  turnaround_hours           = coalesce(turnaround_hours, 24),

  languages          = ARRAY['id','en'],

  updated_at         = now()
where slug = 'demo-lp-cepat' and is_mock = true;
