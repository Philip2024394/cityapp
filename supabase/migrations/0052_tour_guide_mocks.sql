-- ============================================================================
-- 0052 — Mock tour guides (companion to public.tour_guide_listings)
-- ----------------------------------------------------------------------------
-- Same pattern as 0050 / 0051. /tour marketplace unions reals + visible
-- mocks; reals first; one mock hidden per real listing inserted.
-- ============================================================================

create table if not exists public.mock_tour_guide_listings (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  whatsapp_e164   text not null,
  city            text,
  address         text,
  services        text[] not null default '{}',
  languages       text[] not null default '{en,id}',
  day_rate_idr    integer not null,
  notes           text,
  image_urls      text[] not null default '{}',
  rating          numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  available_now   boolean not null default true,
  mock_hidden_at  timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_mock_tour_guide_visible
  on public.mock_tour_guide_listings (city, day_rate_idr)
  where mock_hidden_at is null;

create or replace function public.hide_one_mock_tour_guide()
returns trigger language plpgsql security definer as $$
declare
  victim_id uuid;
begin
  select id into victim_id
    from public.mock_tour_guide_listings
   where mock_hidden_at is null
   order by created_at asc
   limit 1;
  if victim_id is not null then
    update public.mock_tour_guide_listings
       set mock_hidden_at = now()
     where id = victim_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_hide_mock_on_real_tour_guide on public.tour_guide_listings;
create trigger trg_hide_mock_on_real_tour_guide
  after insert on public.tour_guide_listings
  for each row execute function public.hide_one_mock_tour_guide();

-- Seed 4 mock tour guides
insert into public.mock_tour_guide_listings (
  slug, name, whatsapp_e164, city, address,
  services, languages, day_rate_idr, notes, rating, available_now
)
values
  ('demo-made-bali-temples',  'Made · Bali Temples',     '+62000000301',
    'Bali — Ubud', 'Ubud Centre',
    array['cultural','temples','photography'], array['en','id'],
    750000, 'Ubud temples + rice terraces, 8 hours.', 4.9, true),
  ('demo-ketut-volcano',      'Ketut · Volcano sunrise', '+62000000302',
    'Bali — Kintamani', 'Mt Batur basecamp',
    array['hiking','sunrise','photography'], array['en','id'],
    900000, 'Mt Batur sunrise hike, breakfast at the summit.', 4.8, true),
  ('demo-yusuf-jogja-history','Yusuf · Yogya history',   '+62000000303',
    'Yogyakarta', 'Malioboro area',
    array['cultural','history','food'], array['en','id'],
    600000, 'Kraton, Taman Sari + warung hopping.', 4.7, true),
  ('demo-pak-eko-batik',      'Pak Eko · Batik & craft', '+62000000304',
    'Yogyakarta', 'Kotagede',
    array['cultural','craft','shopping'], array['en','id'],
    550000, 'Kotagede silver + batik workshop visit.', 4.8, true)
on conflict (slug) do nothing;

alter table public.mock_tour_guide_listings enable row level security;
drop policy if exists mock_tour_guide_public_read on public.mock_tour_guide_listings;
create policy mock_tour_guide_public_read on public.mock_tour_guide_listings
  for select to anon, authenticated using (mock_hidden_at is null);
