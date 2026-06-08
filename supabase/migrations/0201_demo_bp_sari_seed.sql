-- ============================================================================
-- 0201 — Seed demo beautician Sari (hair-treatment specialist).
-- ----------------------------------------------------------------------------
-- Adds a sixth demo card to the beautician marketplace beside Ayu, Dewi,
-- Rina, Mira, Salon Melati, and Tata. Sari's specialty is hair treatment
-- (keratin, color, deep conditioning, styling) — fills the dedicated hair
-- vertical alongside Dewi's broader makeup/nails/hair package.
--
-- Pattern mirrors mig 0198 (Tata seed): demo-bp-… slug, is_mock=true,
-- status='active' so the card surfaces in the marketplace, availability=
-- 'online' so it isn't filtered by the "live drivers only" toggle, and a
-- Kita2u yellow theme_color (#FACC15) per founder direction 2026-06-08.
--
-- price_hair_idr is set because the schema check constraint requires at
-- least one of (makeup, nail, hair) to be priced, and Sari's specialty is
-- hair — the hair slot is the right home for a hair-treatment provider.
--
-- service_photos.hair carousel uses four real, HEAD-verified Unsplash CDN
-- images (Unsplash License — free for commercial use, no attribution
-- required). All four returned 200 OK + image/jpeg on 2026-06-08:
--   • Keratin Treatment     — dnpa8k6TGRE (close-up glossy black/brown hair)
--   • Hair Color            — CIrRI0ujiRo (blonde-colored woman portrait)
--   • Deep Conditioning     — omY18KP7_Cw (hair mask jar on table flatlay)
--   • Hair Styling          — MmDO1-ezCE4 (woman blow-drying styled hair)
-- ============================================================================

insert into public.beautician_providers (
  slug,
  display_name,
  gender,
  years_experience,
  bio,
  price_hair_idr,
  city,
  service_area_notes,
  whatsapp_e164,
  profile_image_url,
  cover_image_url,
  availability,
  status,
  is_mock,
  theme_color,
  services_offered,
  marketplace_categories,
  languages,
  certifications,
  instagram_url
)
values (
  'demo-bp-sari',
  'Sari',
  'woman',
  6,
  'Spesialis hair treatment, 6 tahun pengalaman di Yogyakarta. Keratin smoothing, hair color, scalp care & repair untuk rambut rusak. Produk profesional, hasil tahan & halus. Mobile service ke rumah/hotel atau datang ke studio. Booking via WhatsApp — konsultasi gratis.',
  400000,
  'Yogyakarta',
  'Mobile service Yogyakarta, Bantul, Sleman',
  '+62000000403',
  'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_51_41%20PM.png',
  'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_37_59%20PM.png',
  'online',
  'active',
  true,
  '#FACC15',
  ARRAY['hair']::text[],
  ARRAY['hair']::text[],
  ARRAY['id']::text[],
  ARRAY[]::text[],
  'https://instagram.com/sari_hairtreatment'
)
on conflict (slug) do update set
  display_name           = excluded.display_name,
  gender                 = excluded.gender,
  years_experience       = excluded.years_experience,
  bio                    = excluded.bio,
  price_hair_idr         = excluded.price_hair_idr,
  city                   = excluded.city,
  service_area_notes     = excluded.service_area_notes,
  whatsapp_e164          = excluded.whatsapp_e164,
  profile_image_url      = excluded.profile_image_url,
  cover_image_url        = excluded.cover_image_url,
  availability           = excluded.availability,
  status                 = excluded.status,
  is_mock                = excluded.is_mock,
  theme_color            = excluded.theme_color,
  services_offered       = excluded.services_offered,
  marketplace_categories = excluded.marketplace_categories,
  languages              = excluded.languages,
  certifications         = excluded.certifications,
  instagram_url          = excluded.instagram_url;

update public.beautician_providers
   set service_photos = jsonb_build_object(
         'hair', jsonb_build_array(
           jsonb_build_object(
             'name',        'Keratin Treatment',
             'description', 'Keratin smoothing untuk rambut frizzy/rusak. Hasil halus, lurus alami, dan berkilau — tahan 3–4 bulan dengan perawatan rumah yang tepat.',
             'price_idr',   600000,
             'url',         'https://images.unsplash.com/photo-1560264641-1b5191cc63e2?fm=jpg&q=80&w=1600&auto=format&fit=crop'
           ),
           jsonb_build_object(
             'name',        'Hair Color',
             'description', 'Pewarnaan profesional — balayage, highlight, atau single tone. Konsultasi warna gratis, produk low-ammonia agar rambut tetap sehat.',
             'price_idr',   550000,
             'url',         'https://images.unsplash.com/photo-1605980766335-d3a41c7332a1?fm=jpg&q=80&w=1600&auto=format&fit=crop'
           ),
           jsonb_build_object(
             'name',        'Deep Conditioning / Hair Mask',
             'description', 'Masker rambut intensif dengan protein + argan oil. Memperbaiki rambut kering, mengembalikan kelembaban & kilau alami dalam satu sesi.',
             'price_idr',   280000,
             'url',         'https://images.unsplash.com/photo-1732861612244-5704d12e9397?fm=jpg&q=80&w=1600&auto=format&fit=crop'
           ),
           jsonb_build_object(
             'name',        'Hair Styling',
             'description', 'Blow-out & styling untuk acara, photoshoot, atau daily glam. Soft waves, sleek straight, atau volume bouncy — hasil rapi tahan seharian.',
             'price_idr',   220000,
             'url',         'https://images.unsplash.com/photo-1734111719430-fe4a3973f8af?fm=jpg&q=80&w=1600&auto=format&fit=crop'
           )
         )
       )
 where slug = 'demo-bp-sari';
