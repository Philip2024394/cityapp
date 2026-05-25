-- Seed real reviews for the 3 demo beauticians who currently have
-- no ratings (mira, ayu, rina). The trigger from mig 0075 auto-
-- recomputes rating + rating_count after each insert.

do $$
declare
  v_mira uuid;
  v_ayu  uuid;
  v_rina uuid;
begin
  select id into v_mira from public.beautician_providers where slug = 'demo-bp-mira';
  select id into v_ayu  from public.beautician_providers where slug = 'demo-bp-ayu';
  select id into v_rina from public.beautician_providers where slug = 'demo-bp-rina';

  delete from public.reviews
   where provider_type = 'beautician'
     and source        = 'imported'
     and session_id like 'seed-other-%';

  if v_mira is not null then
    insert into public.reviews (provider_type, provider_id, reviewer_name, rating, comment, session_id, status, source, created_at) values
      ('beautician', v_mira, 'Nadia', 5, 'Bridal look-nya elegant, makeup-nya tahan seharian.',                    'seed-other-mira-1', 'visible', 'imported', now() - interval '10 days'),
      ('beautician', v_mira, 'Linda', 5, 'Nail art-nya rapi, gel-nya awet 3 minggu.',                              'seed-other-mira-2', 'visible', 'imported', now() - interval '24 days'),
      ('beautician', v_mira, 'Ratih', 4, 'Service bagus, sedikit terlambat datang ke hotel.',                       'seed-other-mira-3', 'visible', 'imported', now() - interval '40 days'),
      ('beautician', v_mira, 'Salma', 5, 'Hair styling untuk acara wisuda — perfect, recommended.',                'seed-other-mira-4', 'visible', 'imported', now() - interval '55 days'),
      ('beautician', v_mira, 'Erika', 5, 'Facial-nya relaxing dan kulit cerah setelahnya.',                        'seed-other-mira-5', 'visible', 'imported', now() - interval '70 days');
  end if;

  if v_ayu is not null then
    insert into public.reviews (provider_type, provider_id, reviewer_name, rating, comment, session_id, status, source, created_at) values
      ('beautician', v_ayu,  'Tania',   5, 'Bridal makeup natural & soft, suami pun pangling.',                    'seed-other-ayu-1', 'visible', 'imported', now() - interval '6 days'),
      ('beautician', v_ayu,  'Vivi',    5, 'Pedicure detail, kaki jadi super halus.',                              'seed-other-ayu-2', 'visible', 'imported', now() - interval '18 days'),
      ('beautician', v_ayu,  'Mega',    5, 'Lash extension-nya nyaman, awet 5 minggu.',                            'seed-other-ayu-3', 'visible', 'imported', now() - interval '28 days'),
      ('beautician', v_ayu,  'Indah',   5, 'Datang on time, bawa peralatan lengkap dan steril.',                   'seed-other-ayu-4', 'visible', 'imported', now() - interval '42 days'),
      ('beautician', v_ayu,  'Putri',   5, 'Hair color sesuai sample, follow-up via WA juga responsif.',           'seed-other-ayu-5', 'visible', 'imported', now() - interval '58 days'),
      ('beautician', v_ayu,  'Sasa',    5, 'Brow shaping shape-nya rapi sesuai face shape.',                       'seed-other-ayu-6', 'visible', 'imported', now() - interval '76 days');
  end if;

  if v_rina is not null then
    insert into public.reviews (provider_type, provider_id, reviewer_name, rating, comment, session_id, status, source, created_at) values
      ('beautician', v_rina, 'Yulia', 4, 'Hasil makeup bagus, butuh notice 2 hari lebih dulu.',                    'seed-other-rina-1', 'visible', 'imported', now() - interval '12 days'),
      ('beautician', v_rina, 'Bella', 5, 'Henna pengantin detail-nya cantik, fade-nya merata.',                    'seed-other-rina-2', 'visible', 'imported', now() - interval '36 days'),
      ('beautician', v_rina, 'Citra', 5, 'Skin treatment-nya cocok untuk acne-prone skin.',                        'seed-other-rina-3', 'visible', 'imported', now() - interval '54 days');
  end if;
end $$;
