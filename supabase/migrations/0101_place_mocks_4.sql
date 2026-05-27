-- ============================================================================
-- 0101 — Demo place mocks (4 fully-populated profiles)
-- ----------------------------------------------------------------------------
-- Seeds 4 places + their place_offers so the new beautician-mirror profile
-- layout demos at full data density. Status = approved, paid_until = today
-- + 60 days, so they surface on /places immediately.
--
-- Footprint:
--   1. Warung Sederhana Bu Tini       — restaurant, Yogyakarta (with menu)
--   2. Lava Lounge Bar Bali           — bar, Seminyak (drinks + live music)
--   3. Candi Pawon                    — temple, near Borobudur (no prices,
--                                       image-only offers; contact disabled)
--   4. Damai Boutique Yogya           — mall (closest cat. to a clothes shop)
--
-- All images use stable Unsplash IDs so the mocks survive without uploads.
-- ============================================================================

-- 1. WARUNG SEDERHANA BU TINI ────────────────────────────────────────────────
insert into public.places (
  slug, name, category, description, image_urls, location, lat, lng,
  city, address, tags, hours_json, whatsapp_e164, rating, review_count,
  listing_tier, status, verified, contact_enabled, paid_until
) values (
  'warung-bu-tini-yogya-mock',
  'Warung Sederhana Bu Tini',
  'restaurant',
  'Warung legendaris Yogyakarta sejak 1985. Gudeg manis khas Jogja, ayam goreng kampung, tahu-tempe bacem. Tempat duduk lesehan, harga mahasiswa, ramah keluarga. Buka sampai larut malam.',
  array[
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200',
    'https://images.unsplash.com/photo-1576402187878-974f70c890a5?w=1200',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=1200'
  ]::text[],
  'SRID=4326;POINT(110.3657 -7.7928)',
  -7.7928, 110.3657,
  'yogyakarta', 'Jl. Wijilan No. 167, Yogyakarta Kota',
  array['gudeg','jogja-asli','lesehan','halal','ramah-keluarga']::text[],
  jsonb_build_object(
    'mon','08:00-23:00',
    'tue','08:00-23:00',
    'wed','08:00-23:00',
    'thu','08:00-23:00',
    'fri','08:00-00:00',
    'sat','08:00-00:00',
    'sun','08:00-23:00'
  ),
  '6281234567100',
  4.7, 124,
  'paid', 'approved', false, true,
  (current_date + interval '60 days')::date
) on conflict (slug) do nothing;

-- 2. LAVA LOUNGE BAR BALI ────────────────────────────────────────────────────
insert into public.places (
  slug, name, category, description, image_urls, location, lat, lng,
  city, address, tags, hours_json, whatsapp_e164, rating, review_count,
  listing_tier, status, verified, contact_enabled, paid_until
) values (
  'lava-lounge-bar-seminyak-mock',
  'Lava Lounge Bar Bali',
  'bar',
  'Premium beach-style cocktail bar in Seminyak. Signature tropical cocktails, craft beer, late-night kitchen until 2am. Live acoustic music every Friday + Saturday from 8pm. Happy hour 5–7pm daily.',
  array[
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200',
    'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=1200',
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1200'
  ]::text[],
  'SRID=4326;POINT(115.1736 -8.6905)',
  -8.6905, 115.1736,
  'denpasar', 'Jl. Kayu Aya No. 88, Seminyak, Bali',
  array['cocktails','live-music','happy-hour','rooftop','expat']::text[],
  jsonb_build_object(
    'mon','17:00-01:00',
    'tue','17:00-01:00',
    'wed','17:00-01:00',
    'thu','17:00-01:00',
    'fri','17:00-02:00',
    'sat','17:00-02:00',
    'sun','17:00-01:00'
  ),
  '6281234567101',
  4.8, 286,
  'paid', 'approved', true, true,
  (current_date + interval '60 days')::date
) on conflict (slug) do nothing;

-- 3. CANDI PAWON (TEMPLE) ────────────────────────────────────────────────────
-- Contact disabled — temples don't have WhatsApp numbers. Offers have NO
-- prices (image-only gallery items) so the page demos the price-NULL path.
insert into public.places (
  slug, name, category, description, image_urls, location, lat, lng,
  city, address, tags, hours_json, whatsapp_e164, rating, review_count,
  listing_tier, status, verified, contact_enabled, paid_until
) values (
  'candi-pawon-magelang-mock',
  'Candi Pawon',
  'temple',
  'Small Buddhist temple from the 9th century, perfectly aligned between Borobudur and Candi Mendut. UNESCO-recognised stone reliefs depicting the Kalpataru (tree of life). Quiet contemplation spot — fewer tourists than its larger neighbour.',
  array[
    'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1200',
    'https://images.unsplash.com/photo-1583220570419-30cae4ddedea?w=1200',
    'https://images.unsplash.com/photo-1604966848793-eebda1ba6a64?w=1200',
    'https://images.unsplash.com/photo-1518509562904-e7ef99cddc85?w=1200'
  ]::text[],
  'SRID=4326;POINT(110.2204 -7.6065)',
  -7.6065, 110.2204,
  'yogyakarta', 'Dusun Brojonalan, Wanurejo, Borobudur (Magelang area)',
  array['buddhist','unesco','quiet','9th-century','reliefs']::text[],
  jsonb_build_object(
    'mon','06:00-17:00',
    'tue','06:00-17:00',
    'wed','06:00-17:00',
    'thu','06:00-17:00',
    'fri','06:00-17:00',
    'sat','06:00-17:00',
    'sun','06:00-17:00'
  ),
  null,                              -- temple has no WhatsApp
  4.6, 89,
  'paid', 'approved', false, false,
  (current_date + interval '60 days')::date
) on conflict (slug) do nothing;

-- 4. DAMAI BOUTIQUE (CLOTHES SHOP — closest category is `mall`) ──────────────
insert into public.places (
  slug, name, category, description, image_urls, location, lat, lng,
  city, address, tags, hours_json, whatsapp_e164, rating, review_count,
  listing_tier, status, verified, contact_enabled, paid_until
) values (
  'damai-boutique-yogya-mock',
  'Damai Boutique',
  'mall',
  'Independent boutique in the Prawirotaman backpacker district. Handwoven batik shirts, modern Indonesian wear, leather bags, and locally-made silver jewellery. Each piece tagged with its maker. Tax-free shipping abroad available.',
  array[
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200',
    'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=1200',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200',
    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200'
  ]::text[],
  'SRID=4326;POINT(110.3666 -7.8232)',
  -7.8232, 110.3666,
  'yogyakarta', 'Jl. Prawirotaman I No. 14, Yogyakarta',
  array['batik','handwoven','boutique','jewellery','tax-free']::text[],
  jsonb_build_object(
    'mon','10:00-21:00',
    'tue','10:00-21:00',
    'wed','10:00-21:00',
    'thu','10:00-21:00',
    'fri','10:00-22:00',
    'sat','10:00-22:00',
    'sun','11:00-20:00'
  ),
  '6281234567103',
  4.5, 47,
  'paid', 'approved', false, true,
  (current_date + interval '60 days')::date
) on conflict (slug) do nothing;

-- ============================================================================
-- place_offers — the carousel items each place surfaces
-- ============================================================================

-- 1. WARUNG BU TINI menu items (named with Rp prices)
insert into public.place_offers (place_id, name, description, price_idr, image_url, sort_order)
select p.id, v.name, v.description, v.price, v.image, v.sort_order
from (values
  ('Gudeg Komplit', 'Nasi gudeg manis khas Yogya — sayur nangka muda, ayam suwir, telur, tahu-tempe bacem, sambal goreng krecek. Porsi standar.', 35000, 'https://images.unsplash.com/photo-1606851094291-6efae152bb87?w=800', 1),
  ('Ayam Goreng Kampung', 'Ayam kampung pilihan, marinasi rempah tradisional, digoreng renyah. Disajikan dengan lalapan + sambal terasi.', 28000, 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800', 2),
  ('Sate Lilit Ayam', 'Sate lilit gaya Bali dengan kelapa parut + bumbu base genep. Porsi 5 tusuk + lontong + sambal matah.', 32000, 'https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=800', 3),
  ('Es Cendol Dawet', 'Cendol hijau dari beras + tepung beras, gula merah cair, santan kental + es serut. Pelengkap manis setelah makan.', 12000, 'https://images.unsplash.com/photo-1623164555086-78ace0a6c50e?w=800', 4)
) as v(name, description, price, image, sort_order)
cross join (select id from public.places where slug = 'warung-bu-tini-yogya-mock' limit 1) p
on conflict do nothing;

-- 2. LAVA LOUNGE BAR drinks + Friday-night live music feature
insert into public.place_offers (place_id, name, description, price_idr, image_url, sort_order)
select p.id, v.name, v.description, v.price, v.image, v.sort_order
from (values
  ('Lava Sunset Margarita', 'House signature: tequila, fresh-pressed lime, mango, smoked sea salt rim. Garnished with hibiscus. Voted #1 cocktail in Seminyak 2025.', 145000, 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800', 1),
  ('Local Craft IPA Flight', 'Four tasters from Bali microbreweries: Stark, Storm, Bali Hai, Sandika. Includes notes card + cheese board.', 165000, 'https://images.unsplash.com/photo-1505075106905-fb052892c116?w=800', 2),
  ('Friday Live Music — Free Entry', 'Acoustic guitarist + local vocalist every Friday from 8pm. No cover charge. Reserved seating for parties of 4+ — book on WhatsApp.', null, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', 3),
  ('Smoked Bali Tuna Tataki', 'Sashimi-grade tuna seared on charcoal, ponzu reduction, microherbs from our garden. Bar bites menu — until 12am.', 110000, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', 4)
) as v(name, description, price, image, sort_order)
cross join (select id from public.places where slug = 'lava-lounge-bar-seminyak-mock' limit 1) p
on conflict do nothing;

-- 3. CANDI PAWON — IMAGE-ONLY gallery items (price_idr = NULL throughout).
--    Demonstrates the no-price path the founder asked for.
insert into public.place_offers (place_id, name, description, price_idr, image_url, sort_order)
select p.id, v.name, v.description, null::int, v.image, v.sort_order
from (values
  ('Main shrine façade', 'Cubic stone shrine, 13.3m tall, facing east toward Borobudur. The pyramidal roof carries three terraced platforms decorated with stupas.', 'https://images.unsplash.com/photo-1583220570419-30cae4ddedea?w=800', 1),
  ('Kalpataru relief panel', 'East-wall reliefs of the divine tree of life, flanked by celestial beings showering wealth. Best photographed at 7am.', 'https://images.unsplash.com/photo-1604966848793-eebda1ba6a64?w=800', 2),
  ('Northern courtyard view', 'Quiet shaded courtyard with frangipani trees. Perfect for a contemplative pause between visiting the three Borobudur-axis temples.', 'https://images.unsplash.com/photo-1518509562904-e7ef99cddc85?w=800', 3),
  ('Sunrise alignment', 'During the equinox, the rising sun aligns through Pawon to Borobudur. Photographers gather at 5:30am — entry permitted from 6am.', 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800', 4)
) as v(name, description, image, sort_order)
cross join (select id from public.places where slug = 'candi-pawon-magelang-mock' limit 1) p
on conflict do nothing;

-- 4. DAMAI BOUTIQUE featured products
insert into public.place_offers (place_id, name, description, price_idr, image_url, sort_order)
select p.id, v.name, v.description, v.price, v.image, v.sort_order
from (values
  ('Hand-Batiked Linen Shirt', 'Long-sleeve, cap-style collar, sodium-fixed pewter print. Made in Sleman by mbak Tini''s workshop. Sizes S–XL. Cotton-linen blend (60/40).', 425000, 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800', 1),
  ('Tenun Ikat Tote', 'Handwoven Sumba ikat exterior + leather trim, single shoulder strap. 32×38cm. Each tote uses one square metre of vintage cloth — no two alike.', 580000, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800', 2),
  ('Silver Cuff — Modern Bali', 'Smith-finished silver 925, hammered, 12mm wide. Stamped with Damai maker mark. Adjustable 6.5–7.5". Lifetime polish service.', 1250000, 'https://images.unsplash.com/photo-1535632066274-7c6d0181f55a?w=800', 3),
  ('Sarong Kebaya Set', 'Two-piece traditional set for upacara — soft white cotton kebaya with hand-cutwork + brown batik sarong. Sizes XS–XL. Free hem alteration.', 850000, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800', 4)
) as v(name, description, price, image, sort_order)
cross join (select id from public.places where slug = 'damai-boutique-yogya-mock' limit 1) p
on conflict do nothing;
