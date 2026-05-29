-- ============================================================================
-- 0128 — Seed 3 demo property templates (sale / rent / builder)
-- ----------------------------------------------------------------------------
-- One mock per listing_type so /property browse + filter chips render
-- content immediately. Per-table mock pattern (mig 0126): is_mock=true,
-- user_id=null. Real signup hides the oldest visible mock of matching
-- listing_type via the existing trigger.
-- Cities restricted to city_zones FK (currently yogyakarta + denpasar).
-- Photo URLs are Unsplash CDN sourced 2026-05-29.
-- ============================================================================

insert into public.property_listings (
  is_mock, user_id, slug, display_name, business_name, bio,
  listing_type, property_type,
  city, address, kelurahan, kecamatan,
  location, latitude, longitude,
  whatsapp_e164,
  price_idr, price_negotiable,
  bedrooms, bathrooms, floors,
  land_size_sqm, building_size_sqm,
  certificate_type, facing_direction, year_built, furnished,
  parking_cars, parking_bikes, has_pool, has_garden,
  electricity_va, water_source,
  kpr_eligible, accepted_banks, flood_zone, expat_friendly,
  cover_image_url, profile_image_url, gallery_image_urls,
  hero_text, promo_text, theme_color,
  instagram_url, tiktok_url, facebook_url,
  status, verified,
  rating, rating_count
)
values
-- ─── 1. DEMO SALE ─── villa in Denpasar
(
  true, null, 'demo-prop-villa-sanur-sale', 'Putri Villa Group', 'Putri Villa Sanur',
  '4-bedroom villa, walking distance to Sanur beach. Mature tropical garden, 12 m saltwater pool, fully furnished with teak interior. KPR-ready, SHM certificate. Suited for buy-to-let or expat residence (HGB conversion available).',
  'for_sale', 'villa',
  'denpasar', 'Jalan Danau Tamblingan, Sanur', 'Sanur Kaja', 'Denpasar Selatan',
  st_setsrid(st_makepoint(115.2599, -8.6920), 4326)::geography,
  -8.6920, 115.2599,
  '+62000001001',
  9500000000, true,
  4, 4, 2,
  450, 320,
  'SHM', 'Northeast', 2019, 'fully',
  2, 4, true, true,
  3500, 'PDAM',
  true, ARRAY['BTN','BCA','Mandiri']::text[], 'none', true,
  'https://images.unsplash.com/photo-1711609110590-5ad5c4599e56',
  'https://images.unsplash.com/photo-1688653802629-5360086bf632',
  ARRAY[
    'https://images.unsplash.com/photo-1711609110590-5ad5c4599e56',
    'https://images.unsplash.com/photo-1688653802629-5360086bf632',
    'https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4',
    'https://images.unsplash.com/photo-1675657144285-7daf131132de'
  ],
  jsonb_build_object(
    'line1','Tropical living',
    'line2','Sanur Villa',
    'tagline','4 BR · 320 m² · Walking distance to the beach',
    'color','#0EA5E9','line1_color','#FFFFFF','tagline_color','#FFFFFF',
    'effect','shimmer'
  ),
  'Open viewing weekends — schedule via WhatsApp. KPR pre-approval support included.',
  '#0EA5E9',
  'https://www.instagram.com/putri.villa.sanur',
  'https://www.tiktok.com/@putri.villa.sanur',
  'https://www.facebook.com/putri.villa.sanur',
  'active', true,
  4.8, 12
)
on conflict (slug) do nothing;

-- ─── 2. DEMO RENT ─── house in Yogyakarta
insert into public.property_listings (
  is_mock, user_id, slug, display_name, business_name, bio,
  listing_type, property_type,
  city, address, kelurahan, kecamatan,
  location, latitude, longitude,
  whatsapp_e164,
  monthly_rent_idr, weekly_rent_idr, daily_rent_idr, deposit_idr, min_lease_months,
  bedrooms, bathrooms, floors,
  land_size_sqm, building_size_sqm,
  certificate_type, year_built, furnished,
  parking_cars, parking_bikes, has_garden,
  electricity_va, water_source,
  expat_friendly, flood_zone,
  cover_image_url, profile_image_url, gallery_image_urls,
  hero_text, promo_text, theme_color,
  instagram_url, tiktok_url, facebook_url,
  status, verified,
  rating, rating_count
)
values (
  true, null, 'demo-prop-house-prawirotaman-rent', 'Rumah Jogja Living', 'Rumah Sewa Prawirotaman',
  '3-bedroom traditional Joglo-style house in Prawirotaman, the artist quarter. Fully furnished, fast Wi-Fi included. Walking distance to Malioboro shuttle, batik galleries, and warung gudeg. Long-stay friendly — discounts for 6+ months.',
  'for_rent', 'house',
  'yogyakarta', 'Jalan Prawirotaman II', 'Brontokusuman', 'Mergangsan',
  st_setsrid(st_makepoint(110.3654, -7.8231), 4326)::geography,
  -7.8231, 110.3654,
  '+62000001002',
  9500000, 2400000, 380000, 18000000, 1,
  3, 2, 1,
  220, 180,
  'HGB', 2012, 'fully',
  1, 2, true,
  2200, 'PDAM',
  true, 'occasional',
  'https://images.unsplash.com/photo-1627096618883-c964adf3ec8a',
  'https://images.unsplash.com/photo-1719887805632-de5be825f72b',
  ARRAY[
    'https://images.unsplash.com/photo-1627096618883-c964adf3ec8a',
    'https://images.unsplash.com/photo-1719887805632-de5be825f72b',
    'https://images.unsplash.com/photo-1643216365771-e4af0eb705d8',
    'https://images.unsplash.com/photo-1643216120728-fa08e985b178'
  ],
  jsonb_build_object(
    'line1','Live like a local',
    'line2','Prawirotaman House',
    'tagline','3 BR · Joglo-style · Artist quarter Jogja',
    'color','#10B981','line1_color','#FFFFFF','tagline_color','#FFFFFF',
    'effect','shimmer'
  ),
  'Free airport transfer for 3+ month stays — book direct via WhatsApp.',
  '#10B981',
  'https://www.instagram.com/rumah.prawirotaman',
  'https://www.tiktok.com/@rumah.prawirotaman',
  'https://www.facebook.com/rumah.prawirotaman',
  'active', true,
  4.7, 8
)
on conflict (slug) do nothing;

-- ─── 3. DEMO BUILDER ─── apartment new construction in Denpasar
insert into public.property_listings (
  is_mock, user_id, slug, display_name, business_name, bio,
  listing_type, property_type,
  city, address, kelurahan, kecamatan,
  location, latitude, longitude,
  whatsapp_e164,
  starting_price_idr, nup_idr, units_total, units_available,
  developer_name, completion_date,
  bedrooms, bathrooms, floors,
  building_size_sqm, certificate_type, furnished,
  parking_cars, parking_bikes, has_pool, has_garden,
  electricity_va, water_source,
  kpr_eligible, accepted_banks, flood_zone, expat_friendly,
  cover_image_url, profile_image_url, gallery_image_urls,
  hero_text, promo_text, theme_color,
  instagram_url, tiktok_url, facebook_url,
  drone_url, virtual_tour_url,
  status, verified,
  rating, rating_count
)
values (
  true, null, 'demo-prop-renon-residences-builder', 'Renon Residences Developer', 'Renon Residences Tower 1',
  'Pre-launch tower in central Renon — 18 storeys, 240 units. Mixed studio / 1BR / 2BR layouts. Rooftop infinity pool, co-working floor, 24-hour security. NUP open for the first 60 units with priority unit selection. Estimated handover Q3 2027.',
  'new_construction', 'apartment',
  'denpasar', 'Jalan Tukad Pakerisan, Renon', 'Panjer', 'Denpasar Selatan',
  st_setsrid(st_makepoint(115.2335, -8.6802), 4326)::geography,
  -8.6802, 115.2335,
  '+62000001003',
  1850000000, 25000000, 240, 60,
  'Renon Land Group', '2027-09-30',
  2, 2, 18,
  72, 'Strata', 'semi',
  1, 1, true, true,
  3500, 'PDAM',
  true, ARRAY['BTN','Mandiri','BNI']::text[], 'none', true,
  'https://images.unsplash.com/photo-1564078516393-cf04bd966897',
  'https://images.unsplash.com/photo-1686056040370-b5e5c06c4273',
  ARRAY[
    'https://images.unsplash.com/photo-1564078516393-cf04bd966897',
    'https://images.unsplash.com/photo-1686056040370-b5e5c06c4273',
    'https://images.unsplash.com/photo-1518733057094-95b53143d2a7',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'
  ],
  jsonb_build_object(
    'line1','Pre-launch Q1 2026',
    'line2','Renon Residences',
    'tagline','From Rp 1.85B · NUP open · 60 units priority',
    'color','#7C3AED','line1_color','#FFFFFF','tagline_color','#FFFFFF',
    'effect','shimmer'
  ),
  'Limited NUP slots — secure your unit before pre-launch ends. Book via WhatsApp.',
  '#7C3AED',
  'https://www.instagram.com/renon.residences',
  'https://www.tiktok.com/@renon.residences',
  'https://www.facebook.com/renon.residences',
  'https://www.youtube.com/watch?v=demo-drone',
  'https://my.matterport.com/show/?m=demo-virtual-tour',
  'active', true,
  4.9, 4
)
on conflict (slug) do nothing;
