-- ============================================================================
-- 0050 — Mock drivers (companion table to public.drivers)
-- ----------------------------------------------------------------------------
-- drivers.user_id is a FK to profiles → auth.users, so we can't easily
-- insert mock rows into drivers itself. Instead a parallel mock_drivers
-- table holds the demo data; the customer marketplace API unions real
-- rows + visible mocks and sorts reals first. When a REAL driver is
-- inserted into drivers, the AFTER-INSERT trigger hides the oldest
-- visible mock so the marketplace density stays honest.
-- ============================================================================

create table if not exists public.mock_drivers (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  business_name     text not null,
  bio               text,
  whatsapp_e164     text not null,
  profile_image_url text,
  city              text,
  area              text,
  services          text[] not null default '{person}',
  price_per_km      integer not null default 2500,
  min_fee           integer not null default 12000,
  bike_make         text,
  bike_model        text,
  bike_year         integer,
  bike_type         text check (bike_type in ('matic','sport','manual')),
  rating            numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  availability      text not null default 'online'
                    check (availability in ('online','busy','offline')),
  mock_hidden_at    timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_mock_drivers_visible
  on public.mock_drivers (availability, created_at desc)
  where mock_hidden_at is null;

-- Trigger on the REAL drivers table — fires on every real signup
create or replace function public.hide_one_mock_driver()
returns trigger language plpgsql security definer as $$
declare
  victim_id uuid;
begin
  select id into victim_id
    from public.mock_drivers
   where mock_hidden_at is null
   order by created_at asc
   limit 1;
  if victim_id is not null then
    update public.mock_drivers
       set mock_hidden_at = now()
     where id = victim_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_hide_mock_on_real_driver_signup on public.drivers;
create trigger trg_hide_mock_on_real_driver_signup
  after insert on public.drivers
  for each row execute function public.hide_one_mock_driver();

-- Seed 5 mock drivers (covering Bike Ride, Parcel, Food)
insert into public.mock_drivers (
  slug, business_name, bio, whatsapp_e164, profile_image_url,
  city, area, services, price_per_km, min_fee,
  bike_make, bike_model, bike_year, bike_type, rating, availability
)
values
  ('demo-andi-cb',     'Andi · Yogya Central', 'Daily ojek + parcel runs across central Yogya. Honda CB150R, fast across town.',
    '+62000000101', null, 'Yogyakarta', 'Yogya Central',
    array['person','parcel'], 3000, 15000, 'Honda', 'CB150R', 2024, 'sport', 4.8, 'online'),
  ('demo-citra-scoopy','Citra · Bantul daytime', 'Female rider, daytime only. School runs and groceries.',
    '+62000000102', null, 'Yogyakarta', 'Bantul',
    array['person','parcel'], 2500, 12000, 'Honda', 'Scoopy', 2024, 'matic', 4.9, 'online'),
  ('demo-budi-beat',   'Budi · Sleman',         'Multi-stop parcel + food delivery. Insulated box.',
    '+62000000103', null, 'Yogyakarta', 'Sleman',
    array['parcel','food'], 2500, 12000, 'Honda', 'BeAT', 2023, 'matic', 4.7, 'busy'),
  ('demo-rini-vario',  'Rini · Yogya North',    'Restaurant food runs + airport runs in evenings.',
    '+62000000104', null, 'Yogyakarta', 'Yogya North',
    array['food','person'], 2700, 13000, 'Honda', 'Vario', 2024, 'matic', 4.6, 'online'),
  ('demo-gilang-pcx',  'Gilang · Premium runs', 'Premium PCX for hotel pickups + long-distance parcels.',
    '+62000000105', null, 'Yogyakarta', 'Yogya South',
    array['person','parcel'], 3500, 20000, 'Honda', 'PCX', 2024, 'matic', 4.9, 'offline')
on conflict (slug) do nothing;

-- RLS — mocks are public-read; writes go through the admin/service-role
-- client only (no user-scoped policy needed since no user owns them).
alter table public.mock_drivers enable row level security;
drop policy if exists mock_drivers_public_read on public.mock_drivers;
create policy mock_drivers_public_read on public.mock_drivers
  for select to anon, authenticated using (mock_hidden_at is null);
