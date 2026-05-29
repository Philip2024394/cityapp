-- ============================================================================
-- 0113 — Enrich demo-sari to template-quality massage profile
-- ----------------------------------------------------------------------------
-- Mirrors the standard-profile checklist established by mig 0111 (Dewi).
-- Sari is the canonical massage demo: Balinese therapist, Kuta, 8 years.
-- All photo URLs are Unsplash CDN (sourced 2026-05-29: spa-massage,
-- balinese-massage, wellness-spa). The massage_providers table has no
-- business_name column — display_name stays as "Sari".
-- ============================================================================

update public.massage_providers set
  bio                = 'Therapist Balinese profesional 8+ tahun, spesialis Balinese, aromatherapy & deep tissue.
Mobile service ke hotel/villa Kuta, Seminyak & Canggu.
Minyak therapeutic-grade, handuk steril, suasana tenang dengan musik & wewangian pilihan.
Booking via WhatsApp — respons cepat, jadwal pagi sampai malam.',

  marketplace_categories = ARRAY['balinese','aromatherapy','deep_tissue']::text[],

  instagram_url      = 'https://www.instagram.com/sari.balinesemassage',
  tiktok_url         = 'https://www.tiktok.com/@sari.balinesemassage',
  facebook_url       = 'https://www.facebook.com/sari.balinesemassage',

  promo_text         = 'This week — book a 120-min Balinese + Aromatherapy combo and save Rp 80,000.',

  hero_text          = jsonb_build_object(
    'line1',         'Professional',
    'line2',         'Therapist',
    'tagline',       'Balinese · Aromatherapy · Deep Tissue',
    'color',         '#0EA5E9',
    'line1_color',   '#0A0A0A',
    'tagline_color', '#0A0A0A',
    'effect',        'shimmer'
  ),

  theme_color        = '#0EA5E9',

  gallery_image_urls = ARRAY[
    'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2',
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15',
    'https://images.unsplash.com/photo-1519823551278-64ac92734fb1',
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
    'https://images.unsplash.com/photo-1591343395082-e120087004b4',
    'https://images.unsplash.com/photo-1544843776-7c98a52e08a4'
  ],

  service_photos     = jsonb_build_object(
    'balinese', jsonb_build_array(
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
        'name',        'Traditional Balinese',
        'description', 'Long-stroke, palm-press technique with coconut oil. Releases tension across back, shoulders, legs. Best for first-time visitors.',
        'price_idr',   180000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1591343395082-e120087004b4',
        'name',        'Balinese Boreh Body Scrub',
        'description', 'Traditional spice scrub paired with the full Balinese routine. Improves circulation and skin glow.',
        'price_idr',   260000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1701917094553-aa3c13f6d16c',
        'name',        'Balinese 120-min Ritual',
        'description', 'Extended Balinese session with extra time on shoulders, neck, and feet. Hot towel finish.',
        'price_idr',   340000
      )
    ),
    'aromatherapy', jsonb_build_array(
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2',
        'name',        'Aromatherapy Relax',
        'description', 'Choice of lavender, jasmine, or sandalwood essential oils. Gentle pressure for full nervous-system reset.',
        'price_idr',   200000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1515377905703-c4788e51af15',
        'name',        'Hot Stone & Aromatherapy',
        'description', 'Warmed volcanic stones + essential oils — deep relaxation for stressed muscles. Includes head and face.',
        'price_idr',   290000
      )
    ),
    'deep_tissue', jsonb_build_array(
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1544843776-7c98a52e08a4',
        'name',        'Sports Deep Tissue',
        'description', 'Firm pressure targeting runner/surfer/cyclist tightness — IT band, calves, shoulders.',
        'price_idr',   240000
      ),
      jsonb_build_object(
        'url',         'https://images.unsplash.com/photo-1728497872660-cc6b16238c3a',
        'name',        'Neck, Back & Shoulders',
        'description', 'Focused 60-min deep work for desk/laptop tension — ideal for digital nomads.',
        'price_idr',   220000
      )
    )
  ),

  languages          = ARRAY['id','en'],
  service_locations  = ARRAY['home','hotel','villa']::text[],

  updated_at         = now()
where slug = 'demo-sari' and is_mock = true;
