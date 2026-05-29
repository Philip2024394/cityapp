-- ============================================================================
-- 0119 — Insert demo-cb150r-2024 into bike_rentals (the real listings table)
-- ----------------------------------------------------------------------------
-- The /rent/[slug] detail page queries `bike_rentals` (status='approved'),
-- not `mock_bike_rentals`. To give rent its template-quality detail page,
-- insert a real row with status='approved' so the page resolves. The list
-- page (`/rent`) reads both tables; same slug across both is fine
-- (per-table uniqueness only).
-- All photo URLs are Unsplash CDN (same set as mig 0118).
-- ============================================================================

insert into public.bike_rentals (
  slug, brand, model, year, cc, transmission, color, description,
  image_urls, daily_price_idr, weekly_price_idr, monthly_price_idr,
  security_deposit_idr, helmet_count, raincoat_count,
  has_phone_holder, has_phone_charger, has_delivery_box,
  delivers_to_hotel, delivers_to_villa, pickup_dropoff,
  rental_mode, city, address, location, lat, lng,
  owner_name, owner_company, owner_whatsapp_e164,
  instagram_url, tiktok_url, facebook_url, operating_hours,
  status, verified, available_now, listing_tier, fuel_included,
  rating, review_count, cover_image_url, languages
)
values (
  'demo-cb150r-2024',
  'Honda', 'CB150R', 2024, 150, 'manual', 'red',
  'Honda CB150R Streetfire 2024 — performa sport, posisi riding nyaman untuk dalam kota dan luar kota. Cocok untuk weekend ride ke Kaliurang, Parangtritis, atau touring ke Magelang. Helmet & jas hujan disediakan. Pickup/dropoff hotel di area Jogja city tersedia tanpa biaya tambahan.',
  ARRAY[
    'https://images.unsplash.com/photo-1609630875171-b1321377ee65',
    'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87',
    'https://images.unsplash.com/photo-1606907568152-58fcb0a0a4e5',
    'https://images.unsplash.com/photo-1588627541420-fce3f661b779',
    'https://images.unsplash.com/photo-1502744688674-c619d1586c9e',
    'https://images.unsplash.com/photo-1611182150972-4094e06cba79'
  ],
  140000, 800000, 2800000,
  1500000, 2, 2,
  true, true, false,
  true, true, true,
  'self_ride',
  'yogyakarta', 'Sosrowijayan, Yogyakarta',
  st_setsrid(st_makepoint(110.3625, -7.7956), 4326)::geography,
  -7.7956, 110.3625,
  'Adi', 'Adi · Yogya Rentals', '+62000000201',
  'https://www.instagram.com/adi.yogyarentals',
  'https://www.tiktok.com/@adi.yogyarentals',
  'https://www.facebook.com/adi.yogyarentals',
  jsonb_build_object(
    'mon','08:00-20:00','tue','08:00-20:00','wed','08:00-20:00',
    'thu','08:00-20:00','fri','08:00-21:00','sat','08:00-21:00',
    'sun','09:00-19:00'
  ),
  'approved', true, true, 'paid', false,
  4.8, 24,
  'https://images.unsplash.com/photo-1609630875171-b1321377ee65',
  ARRAY['id','en']
)
on conflict (slug) do nothing;
