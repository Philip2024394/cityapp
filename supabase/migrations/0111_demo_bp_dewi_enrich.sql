-- ============================================================================
-- 0111 — Enrich demo-bp-dewi to template-quality beautician profile
-- ----------------------------------------------------------------------------
-- Founder direction (2026-05-29): the / cards now serve as the marketplace
-- TEMPLATE preview. One mock per vertical must showcase a fully populated
-- profile (hero text, gallery, service photos, social URLs, pricing, promo).
-- Dewi is the canonical beautician demo. Other mocks stay sparse on purpose.
-- All photo URLs are Unsplash CDN (sourced 2026-05-29 from the public
-- search pages: makeup-artist, manicure, hair-salon).
-- ============================================================================

update public.beautician_providers set
  business_name      = 'Dewi Beauty Studio',
  bio                = 'Beautician profesional 10+ tahun di Yogyakarta, spesialis bridal makeup, soft glam & nail art.
Mobile service ke hotel/villa di Jogja, Bantul & Sleman.
Peralatan profesional, sterilisasi lengkap, hasil tahan seharian.
Booking via WhatsApp — respons cepat & jadwal fleksibel weekend.',
  price_makeup_idr   = 450000,
  price_nail_idr     = 200000,
  -- price_hair_idr already 350000

  instagram_url      = 'https://www.instagram.com/dewi.beautystudio',
  tiktok_url         = 'https://www.tiktok.com/@dewi.beautystudio',
  facebook_url       = 'https://www.facebook.com/dewi.beautystudio',

  promo_text         = 'This week only — book Makeup + Nails together and save 15%. Free travel within Jogja city.',

  hero_text          = jsonb_build_object(
    'line1',         'Professional',
    'line2',         'Beautician',
    'tagline',       'Bridal · Soft Glam · Nail Art',
    'color',         '#EC4899',
    'line1_color',   '#0A0A0A',
    'tagline_color', '#0A0A0A',
    'effect',        'shimmer'
  ),

  gallery_image_urls = ARRAY[
    'https://images.unsplash.com/photo-1709477542149-f4e0e21d590b',
    'https://images.unsplash.com/photo-1636023730877-233b9237d4ec',
    'https://images.unsplash.com/photo-1604654894610-df63bc536371',
    'https://images.unsplash.com/photo-1610992015762-45dca7fa3a85',
    'https://images.unsplash.com/photo-1560869713-7d0a29430803',
    'https://images.unsplash.com/photo-1580618672591-eb180b1a973f'
  ],

  service_photos     = jsonb_build_object(
    'makeup', jsonb_build_array(
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1709477542149-f4e0e21d590b',
        'name',        'Soft Glam',
        'description', 'Natural-radiance look — flawless base, soft contour, long-wear lip. 2-hour session, lasts all day.',
        'price_idr',   450000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1709477542170-f11ee7d471a0',
        'name',        'Bridal Makeup',
        'description', 'Full bridal package with airbrush base, lash extensions, and HD finish. Travel to venue included.',
        'price_idr',   1500000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1636023730877-233b9237d4ec',
        'name',        'Party Look',
        'description', 'Bold smokey eye, glitter accents — engagement parties, photoshoots, prom.',
        'price_idr',   650000
      )
    ),
    'nails', jsonb_build_array(
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1604654894610-df63bc536371',
        'name',        'Gel Manicure',
        'description', 'Premium gel polish, cuticle care, hand massage. Lasts 3-4 weeks.',
        'price_idr',   200000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1610992015762-45dca7fa3a85',
        'name',        'Nail Art',
        'description', 'Custom designs — minimal line work, florals, French tips, chrome finishes.',
        'price_idr',   350000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1630843599725-32ead7671867',
        'name',        'Extensions',
        'description', 'Gel-X or acrylic extensions in your chosen shape and length. 90-minute session.',
        'price_idr',   500000
      )
    ),
    'hair', jsonb_build_array(
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1560869713-7d0a29430803',
        'name',        'Blow-Dry & Style',
        'description', 'Wash, blow-dry, soft waves or sleek finish. Great for events or photoshoots.',
        'price_idr',   350000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1580618672591-eb180b1a973f',
        'name',        'Updo & Bridal Hair',
        'description', 'Wedding updos, braided crowns, romantic loose waves. Hair-piece consultation included.',
        'price_idr',   600000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0',
        'name',        'Hair Treatment',
        'description', 'Keratin or protein deep-condition — repairs colour-treated hair, adds shine.',
        'price_idr',   450000
      )
    )
  ),

  languages          = ARRAY['id','en'],
  service_locations  = ARRAY['home','hotel','villa']::text[],

  updated_at         = now()
where slug = 'demo-bp-dewi' and is_mock = true;
