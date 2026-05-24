-- ============================================================================
-- 0051 — Mock bike rentals (companion to public.bike_rentals)
-- ----------------------------------------------------------------------------
-- Same pattern as 0050 (mock_drivers). Customer marketplace at /rent
-- unions real listings + visible mocks; reals first; one mock hidden
-- per real listing inserted.
-- ============================================================================

create table if not exists public.mock_bike_rentals (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  owner_name          text not null,
  owner_whatsapp_e164 text not null,
  brand               text not null,
  model               text not null,
  year                integer,
  cc                  integer,
  transmission        text check (transmission in ('automatic','manual')),
  bike_type           text,
  color               text,
  daily_price_idr     integer not null,
  weekly_price_idr    integer,
  monthly_price_idr   integer,
  security_deposit_idr integer,
  city                text,
  image_urls          text[] not null default '{}',
  rating              numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  available_now       boolean not null default true,
  mock_hidden_at      timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists idx_mock_rentals_visible
  on public.mock_bike_rentals (city, daily_price_idr)
  where mock_hidden_at is null;

create or replace function public.hide_one_mock_bike_rental()
returns trigger language plpgsql security definer as $$
declare
  victim_id uuid;
begin
  select id into victim_id
    from public.mock_bike_rentals
   where mock_hidden_at is null
   order by created_at asc
   limit 1;
  if victim_id is not null then
    update public.mock_bike_rentals
       set mock_hidden_at = now()
     where id = victim_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_hide_mock_on_real_bike_rental on public.bike_rentals;
create trigger trg_hide_mock_on_real_bike_rental
  after insert on public.bike_rentals
  for each row execute function public.hide_one_mock_bike_rental();

-- Seed 4 mock rental listings
insert into public.mock_bike_rentals (
  slug, owner_name, owner_whatsapp_e164,
  brand, model, year, cc, transmission, bike_type, color,
  daily_price_idr, weekly_price_idr, monthly_price_idr, security_deposit_idr,
  city, rating, available_now
)
values
  ('demo-scoopy-2024',  'Wayan · Bali Rentals',  '+62000000201',
    'Honda', 'Scoopy', 2024, 110, 'automatic', 'matic', 'red',
    75000, 480000, 1700000, 1000000, 'Bali — Kuta', 4.8, true),
  ('demo-nmax-2024',    'Made · Bali Rentals',   '+62000000202',
    'Yamaha', 'NMAX', 2024, 155, 'automatic', 'matic', 'black',
    120000, 770000, 2800000, 1500000, 'Bali — Seminyak', 4.7, true),
  ('demo-vario-2023',   'Putu · Sanur Rentals',  '+62000000203',
    'Honda', 'Vario 125', 2023, 125, 'automatic', 'matic', 'white',
    85000, 540000, 1900000, 1000000, 'Bali — Sanur', 4.6, true),
  ('demo-cb150r-2024',  'Adi · Yogya Rentals',   '+62000000204',
    'Honda', 'CB150R', 2024, 150, 'manual', 'sport', 'matte black',
    140000, 900000, 3200000, 2000000, 'Yogyakarta', 4.9, true)
on conflict (slug) do nothing;

alter table public.mock_bike_rentals enable row level security;
drop policy if exists mock_rentals_public_read on public.mock_bike_rentals;
create policy mock_rentals_public_read on public.mock_bike_rentals
  for select to anon, authenticated using (mock_hidden_at is null);
