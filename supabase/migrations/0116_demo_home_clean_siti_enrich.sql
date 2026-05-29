-- ============================================================================
-- 0116 — Enrich demo-hc-bu-siti to template-quality home-clean profile
-- ----------------------------------------------------------------------------
-- Mirrors mig 0111 (Dewi) standard checklist. home_clean_providers has
-- the same keyed-object service_photos shape as beautician (per mig 0105
-- comment "mirrors mig 0074"). No business_name column on this table.
-- All photo URLs are Unsplash CDN (sourced 2026-05-29: cleaning-supplies,
-- clean-kitchen).
-- ============================================================================

update public.home_clean_providers set
  bio                = 'Layanan home-clean profesional di Yogyakarta — deep clean, regular, move-in/out & sofa shampoo. Tim 2-3 orang, peralatan & deterjen sendiri, ramah lingkungan. Booking via WhatsApp.',

  instagram_url      = 'https://www.instagram.com/busiti.cleaning',
  tiktok_url         = 'https://www.tiktok.com/@busiti.cleaning',
  facebook_url       = 'https://www.facebook.com/busiti.cleaning',

  promo_text         = 'Free sofa shampoo dengan setiap deep-clean 4 jam minggu ini.',

  hero_text          = jsonb_build_object(
    'line1',         'Professional',
    'line2',         'Home Clean',
    'tagline',       'Deep Clean · Sofa · Move-in / Move-out',
    'color',         '#10B981',
    'line1_color',   '#0A0A0A',
    'tagline_color', '#0A0A0A',
    'effect',        'shimmer'
  ),

  theme_color        = '#10B981',

  gallery_image_urls = ARRAY[
    'https://images.unsplash.com/photo-1563453392212-326f5e854473',
    'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba',
    'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50',
    'https://images.unsplash.com/photo-1556911220-bff31c812dba',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858',
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a'
  ],

  service_photos     = jsonb_build_object(
    'deep_clean', jsonb_build_array(
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1563453392212-326f5e854473',
        'name',        'Deep Clean Studio / 1BR',
        'description', '4 jam — lantai, kamar mandi, dapur, perabot, kaca dalam. Tim 2 orang.',
        'price_idr',   300000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1484154218962-a197022b5858',
        'name',        'Deep Clean 2-3BR',
        'description', '6 jam — semua kamar, area umum, kamar mandi, dapur termasuk kompor & oven.',
        'price_idr',   500000
      )
    ),
    'regular_clean', jsonb_build_array(
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50',
        'name',        'Regular Weekly Clean',
        'description', '2-3 jam mingguan — sapu, pel, lap permukaan, dapur, kamar mandi. Tim 1-2 orang.',
        'price_idr',   180000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1556037843-347ddff9f4b0',
        'name',        'Bi-weekly Clean',
        'description', '3-4 jam dua-mingguan — sama dengan regular plus area hidden seperti rak buku & lemari.',
        'price_idr',   250000
      )
    ),
    'move_in_out', jsonb_build_array(
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba',
        'name',        'Move-in / Move-out Deep',
        'description', '6-8 jam — kabinet dalam, lemari, kulkas dalam, oven, kamar mandi total. Hand-over ready.',
        'price_idr',   700000
      )
    ),
    'sofa_carpet', jsonb_build_array(
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1556911220-bff31c812dba',
        'name',        'Sofa Shampoo',
        'description', 'Cuci sofa 3-seater dengan shampoo fabric, mesin vakum hot-water extractor.',
        'price_idr',   200000
      )
    )
  ),

  hourly_rate_idr    = coalesce(hourly_rate_idr, 55000),
  day_rate_idr       = coalesce(day_rate_idr,    350000),

  languages          = ARRAY['id','en'],

  updated_at         = now()
where slug = 'demo-hc-bu-siti' and is_mock = true;
