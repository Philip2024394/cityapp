-- Bring Mira / Ayu / Rina to full parity with Dewi BUT differentiated:
--   • Each gets a DIFFERENT theme color (yellow / orange / dark red)
--   • Each gets a DIFFERENT banner pulled from the Dewi pink library
--     (set as cover_image_url so the marketplace cards don't look identical)
--   • Each gets a DIFFERENT services_offered profile + marketplace_categories
--     so they show up under separate filter groups in the marketplace
--   • Same service_photos pack across all (founder will swap per-vendor
--     photos later — visual variety comes from the unique cover banner)
--   • Full bios (240-280 chars, Indonesian, beautician-flavored)
--   • Operating hours
--
-- Banner pool (from BANNER_LIBRARY['#EC4899']):
--   • Mira  (yellow, bridal/makeup) → makeup banner #5920 (ChatGPT May 25 03:13:30)
--   • Ayu   (orange, nails/lashes)  → nails banner  #2761 (ChatGPT May 25 03:48:55)
--   • Rina  (dark red, skin)        → whitening banner #7494 (Untitleddasda…dasd)
-- These are the same URLs the library shows so any image-host caching
-- still works.

with photo_pack as (
  -- Same JSONB shape Dewi has, just parameterised by reviewer-tone bio.
  select jsonb_build_object(
    'makeup', jsonb_build_array(
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png','name','Bridal Makeup','description','Full bridal look — airbrush base, soft glam eyes, lashes, lip color. Tahan seharian dan photo-ready.','price_idr',1100000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png','name','Party Makeup','description','Glam look untuk event malam — bold smokey eye, contour, lashes, finishing spray tahan 8 jam.','price_idr',420000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssss-removebg-preview.png','name','Natural Look','description','Daily soft makeup — base ringan, blush natural, lip tint. Fresh & no-makeup vibe.','price_idr',280000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssssasdasd-removebg-preview.png','name','Graduation Makeup','description','Tahan dari pagi sampai sore — perfect untuk foto wisuda + acara keluarga setelahnya.','price_idr',320000)
    ),
    'nails', jsonb_build_array(
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssss-removebg-preview.png','name','Nail Art','description','Custom design — abstract, floral, atau French twist. Gel polish 3 minggu durability.','price_idr',230000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png','name','Pedicure','description','Foot soak, exfoliation, cuticle care, base + color. Termasuk pijat kaki 10 menit.','price_idr',170000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssssasdasd-removebg-preview.png','name','Gel Manicure','description','Long-lasting gel finish — pilih dari 80+ shade. Tahan 2-3 minggu tanpa chipping.','price_idr',210000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png','name','Acrylic Extension','description','Length + shape sesuai request. Sculpting, filing, finishing dengan top coat.','price_idr',360000)
    ),
    'hair', jsonb_build_array(
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssssasdasd-removebg-preview.png','name','Hair Color','description','Full color, balayage, atau highlights. Konsultasi shade dulu via WhatsApp. Brand: Wella, L''Oreal.','price_idr',620000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png','name','Hair Styling','description','Blow-dry, curls, bun, atau braided up-do untuk acara formal. Tahan seharian.','price_idr',240000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png','name','Hair Treatment','description','Deep conditioning + steam — atasi rambut rusak akibat coloring atau heat tools.','price_idr',330000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssss-removebg-preview.png','name','Bridal Hair','description','Up-do atau half-up untuk akad/resepsi. Pre-trial available sebelum hari H.','price_idr',520000)
    ),
    'skin', jsonb_build_array(
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png','name','Facial Glow','description','Deep cleansing, exfoliation, brightening mask. Cocok before event biar makeup ngangkat.','price_idr',290000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssss-removebg-preview.png','name','Skin Consultation','description','30 menit assessment — review rutin skincare, rekomendasi produk sesuai skin type.','price_idr',140000)
    ),
    'lashes', jsonb_build_array(
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssssasdasd-removebg-preview.png','name','Classic Lash Extension','description','1:1 application — natural look, ideal untuk daily wear. Refill setelah 3 minggu.','price_idr',340000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png','name','Volume Lash','description','Fluffy volume fans, dramatic look. Untuk acara atau yang suka mata pop.','price_idr',490000),
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png','name','Lash Lift','description','Natural curl untuk bulu mata asli — no extensions. Tahan 6-8 minggu.','price_idr',270000)
    ),
    'brows', jsonb_build_array(
      jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssss-removebg-preview.png','name','Brow Shaping','description','Threading + shaping sesuai face shape. Termasuk tinting untuk fuller look.','price_idr',170000)
    )
  ) as photos
)

update public.beautician_providers
   set services_offered = case slug
         when 'demo-bp-mira' then array['makeup','hair','brows','bridal','lashes']::text[]
         when 'demo-bp-ayu'  then array['nails','lashes','brows','waxing','facial']::text[]
         when 'demo-bp-rina' then array['skin','facial','whitening','makeup','hair']::text[]
         else services_offered
       end,
       marketplace_categories = case slug
         when 'demo-bp-mira' then array['bridal','makeup','hair']::text[]
         when 'demo-bp-ayu'  then array['nails','lashes','brows']::text[]
         when 'demo-bp-rina' then array['skin','whitening','facial']::text[]
         else marketplace_categories
       end,
       service_photos = (select photos from photo_pack),
       operating_hours = '{"mon":"10:00-19:00","tue":"10:00-19:00","wed":"10:00-19:00","thu":"10:00-19:00","fri":"10:00-19:00","sat":"10:00-17:00"}'::jsonb,
       bio = case slug
         when 'demo-bp-mira' then E'Beautician profesional 7+ tahun di Yogyakarta, spesialis bridal & soft glam makeup.\nMobile service ke hotel/villa area Yogya, Bantul, Sleman.\nPeralatan profesional, sterilisasi lengkap, hasil tahan seharian.\nBooking via WhatsApp — respons cepat & jadwal fleksibel weekend.'
         when 'demo-bp-ayu'  then E'Beautician dengan pengalaman 9 tahun, spesialis nail art & lash extension.\nMobile service ke seluruh area Yogyakarta dan sekitarnya.\nPeralatan profesional, gel polish premium, hasil tahan minimal 3 minggu.\nBooking via WhatsApp — respons cepat & ramah konsultasi.'
         when 'demo-bp-rina' then E'Beautician dengan fokus skincare & natural look makeup, 6+ tahun pengalaman.\nMobile service area Yogyakarta — homecare, hotel, dan villa.\nProduk skincare medical-grade, hasil natural & glowing.\nBooking via WhatsApp — gratis konsultasi kulit pertama.'
         else bio
       end,
       theme_color = case slug
         when 'demo-bp-mira' then '#FACC15'  -- yellow
         when 'demo-bp-ayu'  then '#F97316'  -- orange
         when 'demo-bp-rina' then '#B91C1C'  -- dark red
         else theme_color
       end,
       -- Distinct cover banners pulled from the existing pink library.
       -- Each mock gets a banner that matches their category specialty,
       -- regardless of theme_color, so the marketplace cards visually
       -- differ at a glance.
       cover_image_url = case slug
         when 'demo-bp-mira' then 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2003_13_30%20PM.png?updatedAt=1779696825678'
         when 'demo-bp-ayu'  then 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2003_48_55%20PM.png?updatedAt=1779698955570'
         when 'demo-bp-rina' then 'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdadsdddsasddsdassddasdaddsdsdasd.png'
         else cover_image_url
       end,
       -- Hero text overlay on the banner — each mock pitches a
       -- different specialty so the public profile reads as a
       -- distinct positioning. line2 (the bold word) is tinted with
       -- the mock's theme_color; line1 + tagline stay neutral so they
       -- stay readable on any cover image.
       hero_text = case slug
         when 'demo-bp-mira' then jsonb_build_object(
           'line1',         'Bridal',
           'line2',         'Glow',
           'tagline',       'Soft glam makeup & hair for your big day',
           'color',         '#FACC15',
           'line1_color',   '#000000',
           'tagline_color', '#000000',
           'effect',        'shimmer'
         )
         when 'demo-bp-ayu' then jsonb_build_object(
           'line1',         'Nail Art',
           'line2',         'Studio',
           'tagline',       'Gel polish, lash extensions, brow shaping',
           'color',         '#F97316',
           'line1_color',   '#000000',
           'tagline_color', '#000000',
           'effect',        'underline'
         )
         when 'demo-bp-rina' then jsonb_build_object(
           'line1',         'Skin',
           'line2',         'Therapy',
           'tagline',       'Whitening, facial, glow — medical-grade products',
           'color',         '#B91C1C',
           'line1_color',   '#000000',
           'tagline_color', '#000000',
           'effect',        'none'
         )
         else hero_text
       end
 where slug in ('demo-bp-mira','demo-bp-ayu','demo-bp-rina');
