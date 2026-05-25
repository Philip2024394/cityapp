-- Seed 6 visible reviews for demo-bp-dewi so the Reviews panel renders
-- live data. Spread across the last ~3 months to look organic.
-- The AFTER-INSERT trigger from mig 0075 will auto-update rating +
-- rating_count on the provider row.

do $$
declare
  v_pid uuid;
begin
  select id into v_pid from public.beautician_providers where slug = 'demo-bp-dewi';
  if v_pid is null then raise notice 'demo-bp-dewi not found'; return; end if;

  -- Clear any prior demo reviews so re-running is idempotent.
  delete from public.reviews
   where provider_type = 'beautician'
     and provider_id   = v_pid
     and source        = 'imported'
     and session_id like 'seed-%';

  insert into public.reviews (provider_type, provider_id, reviewer_name, rating, comment, session_id, status, source, created_at) values
    ('beautician', v_pid, 'Andini',  5, 'Bridal makeup-nya juara! Tahan dari pagi sampai malam, hasilnya natural & soft.',           'seed-andini',  'visible', 'imported', now() - interval '14 days'),
    ('beautician', v_pid, 'Riska',   5, 'Nail art-nya rapi dan sesuai request. Pasti repeat order untuk acara berikutnya.',          'seed-riska',   'visible', 'imported', now() - interval '32 days'),
    ('beautician', v_pid, 'Maya P.', 5, 'Datang on time ke villa, soft glam makeupnya cantik banget. Recommended.',                  'seed-maya',    'visible', 'imported', now() - interval '38 days'),
    ('beautician', v_pid, 'Putri',   4, 'Lash extension-nya nyaman, awet 4 minggu. Lokasi parkir agak jauh dari villa.',             'seed-putri',   'visible', 'imported', now() - interval '60 days'),
    ('beautician', v_pid, 'Sari D.', 5, 'Hair color sesuai sample, tone warm dan flattering. Konsultasi-nya thorough.',              'seed-sari',    'visible', 'imported', now() - interval '85 days'),
    ('beautician', v_pid, 'Wulan',   5, 'Pedicure-nya thorough, super relaxing. Bawa peralatan sendiri yang steril.',                'seed-wulan',   'visible', 'imported', now() - interval '95 days');
end $$;
