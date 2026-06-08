-- ============================================================================
-- 0198 — Seed demo beautician Tata (eye-lash specialist).
-- ----------------------------------------------------------------------------
-- Adds a fifth demo card to the beautician marketplace beside Ayu, Dewi,
-- Rina, Mira, and Salon Melati. Tata's specialty is eye lashes (extension
-- + lash lift) — fills a vertical gap none of the existing demos cover.
--
-- Pattern mirrors mig 0196/0197 (Ayu/Dewi image swaps): demo-bp-… slug,
-- is_mock=true, status='active' so the card surfaces in the marketplace,
-- availability='online' so it isn't filtered by the "live drivers only"
-- toggle, and a cream theme_color (#FFFDD0) for the per-profile page tint
-- per founder direction 2026-06-08.
--
-- price_nail_idr is set because the schema check constraint requires at
-- least one of (makeup, nail, hair) to be priced. Lashes share a vertical
-- with nails in marketplace_categories so reusing the nail slot keeps the
-- listing filterable without a schema change.
-- ============================================================================

insert into public.beautician_providers (
  slug,
  display_name,
  gender,
  years_experience,
  bio,
  price_nail_idr,
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
  'demo-bp-tata',
  'Tata',
  'woman',
  5,
  'Spesialis eye lash extension & lash lift, 5 tahun pengalaman di Yogyakarta. Mobile service ke rumah, hotel, dan villa — atau datang ke studio. Produk hypoallergenic, hasil natural & tahan 3-4 minggu. Booking via WhatsApp — konsultasi style gratis.',
  350000,
  'Yogyakarta',
  'Mobile service Yogyakarta, Bantul, Sleman',
  '+62000000402',
  'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_14_33%20PM.png',
  'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_12_38%20PM.png',
  'online',
  'active',
  true,
  '#FFFDD0',
  ARRAY['lashes', 'brows']::text[],
  ARRAY['lashes']::text[],
  ARRAY['id']::text[],
  ARRAY[]::text[],
  'https://instagram.com/tata_lashes'
)
on conflict (slug) do update set
  display_name           = excluded.display_name,
  gender                 = excluded.gender,
  years_experience       = excluded.years_experience,
  bio                    = excluded.bio,
  price_nail_idr         = excluded.price_nail_idr,
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
