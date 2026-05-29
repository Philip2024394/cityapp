-- ============================================================================
-- 0117 — Enrich demo-yusuf-jogja-history tour guide
-- ----------------------------------------------------------------------------
-- mock_tour_guide_listings is a flat mock table — no hero_text, promo_text,
-- service_photos, or social URLs. Enrichment = polished notes, 6 image_urls,
-- expanded services & languages, sensible bike_brand / fuel_included /
-- availability / address.
-- All photo URLs are Unsplash CDN (sourced 2026-05-29: borobudur,
-- yogyakarta).
-- ============================================================================

update public.mock_tour_guide_listings set
  notes              = 'Yogyakarta history & culture guide — 8+ years showing visitors Borobudur sunrise, Prambanan, Kraton walking tour, Malioboro food crawl, and traditional batik workshops.
Fluent English & Bahasa. Itinerary built around your interests (history, photography, family-friendly).
Day rate covers fuel, bottled water, and entry tickets for the guide. Pickup from hotel.
WhatsApp to lock dates 1-2 days ahead — fills fast on weekends.',

  services           = ARRAY['cultural','history','temples','food','batik','photography','shopping'],
  languages          = ARRAY['id','en'],
  day_rate_idr       = 600000,
  fuel_included      = true,
  bike_brand         = 'Honda PCX 160',
  availability       = 'online',
  address            = 'Prawirotaman, Yogyakarta',
  available_now      = true,

  image_urls         = ARRAY[
    'https://images.unsplash.com/photo-1705905343745-6d901a93e946',
    'https://images.unsplash.com/photo-1620549146396-9024d914cd99',
    'https://images.unsplash.com/photo-1735315853160-c167783cd957',
    'https://images.unsplash.com/photo-1588312578101-cacee14bb0ab',
    'https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d',
    'https://images.unsplash.com/photo-1602057512587-76d5cc4b34e2'
  ]
where slug = 'demo-yusuf-jogja-history';
