-- ============================================================================
-- 0205 — Seed mock reviews for Tata + Sari, then resync rating counters
-- ----------------------------------------------------------------------------
-- Tata (eye-lash specialist) and Sari (hair-treatment specialist) shipped
-- with empty review lists, which made their profile pages read as "no
-- social proof yet" and made the front-card review counter (sourced from
-- beautician_providers.rating_count) show zero. Add 7 mock reviews each
-- in the same tone as the existing imported Ayu/Dewi/Mira reviews so the
-- profile demo reads as a live business.
--
-- The same migration also re-syncs `rating` + `rating_count` on every
-- demo-bp-% row to the actual visible-review count, which fixes a stale
-- drift on Salon Melati (rating_count=42 but actual visible rows=0). This
-- keeps the front-card counter and the per-profile review list aligned.
--
-- Idempotent — re-running the migration deletes the Tata/Sari mock rows
-- before re-inserting, so the count stays at exactly 7 per provider.
-- ============================================================================

-- 1. Clean slate for Tata + Sari demo reviews (idempotent re-run safety).
delete from public.reviews
 where provider_type = 'beautician'
   and provider_id in (
     select id from public.beautician_providers
      where slug in ('demo-bp-tata', 'demo-bp-sari')
   );

-- 2. Tata — eye-lash specialist. 7 mock reviews spread across the past 60
--    days. Comments stay in Indonesian (matching the existing Ayu/Dewi
--    seed tone) and reference lash extension / lash lift / repair.
insert into public.reviews (provider_type, provider_id, reviewer_name, rating, comment, status, source, created_at)
select 'beautician', p.id, r.reviewer_name, r.rating, r.comment, 'visible', 'imported', r.created_at
  from public.beautician_providers p
 cross join (values
   ('Nina',    5::smallint, 'Lash extension natural & ringan, gak terasa di mata.',     (now() - interval '52 days')),
   ('Putri',   5::smallint, 'Lash lift hasilnya lentik tanpa extension, suka banget!',  (now() - interval '41 days')),
   ('Adinda',  5::smallint, 'Repair lash yang berantakan, sekarang rapi lagi.',         (now() - interval '33 days')),
   ('Sasha',   4::smallint, 'Datang on time, hasil bagus, tahan 3 minggu.',             (now() - interval '24 days')),
   ('Cika',    5::smallint, 'Konsultasi dulu sebelum apply, jadi sesuai face shape.',   (now() - interval '18 days')),
   ('Maya',    5::smallint, 'Volume lashes tebal & glamor untuk acara wisuda.',         (now() - interval '11 days')),
   ('Hana',    5::smallint, 'Mobile service ke villa, praktis & profesional.',          (now() - interval '4 days'))
 ) as r(reviewer_name, rating, comment, created_at)
 where p.slug = 'demo-bp-tata';

-- 3. Sari — hair-treatment specialist. Same shape, hair-themed comments.
insert into public.reviews (provider_type, provider_id, reviewer_name, rating, comment, status, source, created_at)
select 'beautician', p.id, r.reviewer_name, r.rating, r.comment, 'visible', 'imported', r.created_at
  from public.beautician_providers p
 cross join (values
   ('Diah',    5::smallint, 'Keratin treatment bikin rambut super halus & shiny.',      (now() - interval '49 days')),
   ('Wulan',   5::smallint, 'Coloring balayage perfect, shade sesuai harapan.',         (now() - interval '38 days')),
   ('Indri',   5::smallint, 'Hair mask + steam rambut jadi sehat banget.',              (now() - interval '29 days')),
   ('Mega',    4::smallint, 'Styling untuk wedding tahan seharian, gak ngecewain.',     (now() - interval '21 days')),
   ('Lina',    5::smallint, 'Konsultasi dulu sebelum coloring, hasil sesuai.',          (now() - interval '14 days')),
   ('Vita',    5::smallint, 'Setup rapi, peralatan bersih, hasil top.',                 (now() - interval '8 days')),
   ('Reyna',   5::smallint, 'Pelayanan ramah & jadwal fleksibel, recommended.',         (now() - interval '2 days'))
 ) as r(reviewer_name, rating, comment, created_at)
 where p.slug = 'demo-bp-sari';

-- 4. Re-sync rating + rating_count on every demo-bp-% row to match the
--    actual visible-review count. Fixes Tata/Sari (NULL → real values)
--    and the stale Salon Melati count (42 stored vs 0 actual).
update public.beautician_providers p
   set rating       = sub.avg_rating,
       rating_count = sub.review_count
  from (
    select bp.id,
           round(coalesce(avg(r.rating)::numeric, 0), 2) as avg_rating,
           count(r.id)                                  as review_count
      from public.beautician_providers bp
      left join public.reviews r
        on r.provider_type = 'beautician'
       and r.provider_id   = bp.id
       and r.status        = 'visible'
     where bp.slug like 'demo-bp-%'
     group by bp.id
  ) as sub
 where p.id = sub.id;
