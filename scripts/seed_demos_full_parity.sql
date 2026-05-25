-- Bring Mira / Ayu / Rina to full parity with Dewi:
--   • Same services_offered (6 services)
--   • Same marketplace_categories (3 primary_cats)
--   • Same service_photos shape (4 photos per service, rich object form)
--   • Full bios (240-280 chars, Indonesian, beautician-flavored)
--   • Operating hours
--   • Distinct theme colors per founder spec (yellow / orange / dark red)
--
-- Reuses the same 4 ImageKit URLs across all beauticians (we don't have
-- per-beautician photos yet — visual parity is the goal).

with shared_services as (
  select array['makeup','nails','hair','skin','lashes','brows']::text[] as svcs,
         array['makeup','nails','hair']::text[] as primary_cats
),
photo_pack as (
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
   set services_offered       = (select svcs from shared_services),
       marketplace_categories = (select primary_cats from shared_services),
       service_photos         = (select photos from photo_pack),
       operating_hours        = '{"mon":"10:00-19:00","tue":"10:00-19:00","wed":"10:00-19:00","thu":"10:00-19:00","fri":"10:00-19:00","sat":"10:00-17:00"}'::jsonb,
       bio = case slug
         when 'demo-bp-mira' then E'Beautician profesional 7+ tahun di Yogyakarta, spesialis bridal & soft glam makeup.\nMobile service ke hotel/villa area Yogya, Bantul, Sleman.\nPeralatan profesional, sterilisasi lengkap, hasil tahan seharian.\nBooking via WhatsApp — respons cepat & jadwal fleksibel weekend.'
         when 'demo-bp-ayu'  then E'Beautician dengan pengalaman 9 tahun, spesialis nail art & lash extension.\nMobile service ke seluruh area Yogyakarta dan sekitarnya.\nPeralatan profesional, gel polish premium, hasil tahan minimal 3 minggu.\nBooking via WhatsApp — respons cepat & ramah konsultasi.'
         when 'demo-bp-rina' then E'Beautician dengan fokus skincare & natural look makeup, 6+ tahun pengalaman.\nMobile service area Yogyakarta — homecare, hotel, dan villa.\nProduk skincare medical-grade, hasil natural & glowing.\nBooking via WhatsApp — gratis konsultasi kulit pertama.'
         else bio
       end,
       theme_color = case slug
         when 'demo-bp-mira' then '#FACC15'  -- yellow
         when 'demo-bp-ayu'  then '#F97316'  -- orange (already orange)
         when 'demo-bp-rina' then '#B91C1C'  -- dark red
         else theme_color
       end
 where slug in ('demo-bp-mira','demo-bp-ayu','demo-bp-rina');
