-- One-shot seed: populate demo-bp-dewi with rich per-service photo
-- metadata (name + description + start price) for the beautician
-- profile demo. Run via `npx supabase db query --linked --file ...`.

update public.beautician_providers
   set service_photos = jsonb_build_object(
  'makeup', jsonb_build_array(
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png','name','Bridal Makeup','description','Full bridal look — airbrush foundation, soft glam eyes, lashes, lip color. Tahan seharian, photo-ready.','price_idr',1200000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png','name','Party Makeup','description','Glam look untuk event malam — bold smokey eye, contour, lashes, finishing spray.','price_idr',450000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssss-removebg-preview.png','name','Natural Look','description','Daily soft makeup — base ringan, blush natural, lip tint. Fresh & no-makeup vibe.','price_idr',300000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssssasdasd-removebg-preview.png','name','Graduation Makeup','description','Tahan dari pagi sampai sore — perfect untuk foto wisuda + acara keluarga setelahnya.','price_idr',350000)
  ),
  'nails', jsonb_build_array(
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssss-removebg-preview.png','name','Nail Art','description','Custom design — abstract, floral, atau French twist. Gel polish 3 minggu durability.','price_idr',250000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png','name','Pedicure','description','Foot soak, exfoliation, cuticle care, base + color. Termasuk pijat kaki 10 menit.','price_idr',180000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssssasdasd-removebg-preview.png','name','Gel Manicure','description','Long-lasting gel finish — pilih dari 80+ shade. Tahan 2-3 minggu tanpa chipping.','price_idr',220000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png','name','Acrylic Extension','description','Length + shape sesuai request. Sculpting, filing, finishing dengan top coat.','price_idr',380000)
  ),
  'hair', jsonb_build_array(
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssssasdasd-removebg-preview.png','name','Hair Color','description','Full color, balayage, atau highlights. Konsultasi shade dulu via WhatsApp. Brand: Wella, L''Oreal.','price_idr',650000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png','name','Hair Styling','description','Blow-dry, curls, bun, atau braided up-do untuk acara formal. Tahan seharian.','price_idr',250000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png','name','Hair Treatment','description','Deep conditioning + steam — atasi rambut rusak akibat coloring atau heat tools.','price_idr',350000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssss-removebg-preview.png','name','Bridal Hair','description','Up-do atau half-up untuk akad/resepsi. Pre-trial available sebelum hari H.','price_idr',550000)
  ),
  'skin', jsonb_build_array(
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png','name','Facial Glow','description','Deep cleansing, exfoliation, brightening mask. Cocok before event biar makeup ngangkat.','price_idr',300000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssss-removebg-preview.png','name','Skin Consultation','description','30 menit assessment — review rutin skincare, rekomendasi produk sesuai skin type.','price_idr',150000)
  ),
  'lashes', jsonb_build_array(
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssssasdasd-removebg-preview.png','name','Classic Lash Extension','description','1:1 application — natural look, ideal untuk daily wear. Refill setelah 3 minggu.','price_idr',350000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2006_53_11%20AM.png','name','Volume Lash','description','Fluffy volume fans, dramatic look. Untuk acara atau yang suka mata pop.','price_idr',500000),
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitleddsafasdfasd-removebg-preview.png','name','Lash Lift','description','Natural curl untuk bulu mata asli — no extensions. Tahan 6-8 minggu.','price_idr',280000)
  ),
  'brows', jsonb_build_array(
    jsonb_build_object('url','https://ik.imagekit.io/nepgaxllc/Untitledddsssss-removebg-preview.png','name','Brow Shaping','description','Threading + shaping sesuai face shape. Termasuk tinting untuk fuller look.','price_idr',180000)
  )
)
 where slug = 'demo-bp-dewi';
