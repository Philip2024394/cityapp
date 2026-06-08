-- ============================================================================
-- 0199 — Seed Tata's lash portfolio carousel (service_photos JSONB).
-- ----------------------------------------------------------------------------
-- The /beautician/[slug] PortfolioCarousel reads service_photos and flattens
-- every service entry under each service key into the auto-drifting card row
-- below the hero. For Tata's lash specialty we seed three categories so the
-- carousel has real content from day one: Design (custom set), Curling
-- (lash lift, no extensions), and Repair (refill / damage repair).
--
-- Image URLs reuse Tata's cover + profile images for now — the founder will
-- upload per-service photos later. Until then the carousel reads as a
-- visually consistent (if repetitive) preview rather than empty.
-- ============================================================================

update public.beautician_providers
   set service_photos = jsonb_build_object(
         'lashes', jsonb_build_array(
           jsonb_build_object(
             'name',        'Lash Design',
             'description', 'Custom-designed lash set — natural, classic, hybrid, or full volume. Konsultasi shape & curl style sebelum apply, hasil tahan 3–4 minggu.',
             'price_idr',   450000,
             'url',         'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_14_33%20PM.png'
           ),
           jsonb_build_object(
             'name',        'Lash Curling (Lash Lift)',
             'description', 'Lift + curl bulu mata asli kamu tanpa extension. Hasil natural, tahan 6–8 minggu. Cocok untuk look low-maintenance.',
             'price_idr',   300000,
             'url',         'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_12_38%20PM.png'
           ),
           jsonb_build_object(
             'name',        'Lash Repair / Refill',
             'description', 'Refill atau perbaiki extension yang sudah jarang. Termasuk pengecekan kesehatan bulu mata sebelum apply ulang.',
             'price_idr',   200000,
             'url',         'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_14_33%20PM.png'
           )
         )
       )
 where slug = 'demo-bp-tata';
