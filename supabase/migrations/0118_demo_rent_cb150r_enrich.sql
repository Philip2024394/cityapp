-- ============================================================================
-- 0118 — Enrich demo-cb150r-2024 bike rental listing
-- ----------------------------------------------------------------------------
-- mock_bike_rentals is a flat mock table — no hero_text, promo_text,
-- service_photos, or social URLs. Enrichment = 6 image_urls + completed
-- bike specs + full pricing tiers + security deposit.
-- All photo URLs are Unsplash CDN (sourced 2026-05-29: sport-motorcycle,
-- honda-motorcycle).
-- ============================================================================

update public.mock_bike_rentals set
  year                   = 2024,
  cc                     = 150,
  transmission           = 'manual',
  bike_type              = 'sport',
  color                  = coalesce(color, 'red'),

  daily_price_idr        = 140000,
  weekly_price_idr       = coalesce(weekly_price_idr,   800000),
  monthly_price_idr      = coalesce(monthly_price_idr, 2800000),
  security_deposit_idr   = coalesce(security_deposit_idr, 1500000),

  available_now          = true,

  image_urls             = ARRAY[
    'https://images.unsplash.com/photo-1609630875171-b1321377ee65',
    'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87',
    'https://images.unsplash.com/photo-1606907568152-58fcb0a0a4e5',
    'https://images.unsplash.com/photo-1588627541420-fce3f661b779',
    'https://images.unsplash.com/photo-1502744688674-c619d1586c9e',
    'https://images.unsplash.com/photo-1611182150972-4094e06cba79'
  ]
where slug = 'demo-cb150r-2024';
