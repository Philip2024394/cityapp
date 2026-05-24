-- ============================================================================
-- 0059 — Bike Laundry marketplace
-- ----------------------------------------------------------------------------
-- Same shape as beautician_providers (mig 0058). Three package per-kg
-- prices — pickup + dropoff is always included in the price:
--   • price_wash_per_kg_idr        — wash only
--   • price_wash_dry_per_kg_idr    — wash + dry
--   • price_wash_iron_per_kg_idr   — wash + dry + iron
-- A laundry shop can offer any combination — NULL price means they
-- don't offer that package.
-- ============================================================================

create table if not exists public.laundry_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Per-kg package prices — NULL = service not offered
  price_wash_per_kg_idr      integer check (price_wash_per_kg_idr      is null or price_wash_per_kg_idr      >= 0),
  price_wash_dry_per_kg_idr  integer check (price_wash_dry_per_kg_idr  is null or price_wash_dry_per_kg_idr  >= 0),
  price_wash_iron_per_kg_idr integer check (price_wash_iron_per_kg_idr is null or price_wash_iron_per_kg_idr >= 0),

  -- Minimum order in kg (e.g. 2 kg minimum) — optional
  min_kg            numeric(3,1),
  -- Turnaround in hours (optional)
  turnaround_hours  integer check (turnaround_hours is null or (turnaround_hours > 0 and turnaround_hours <= 168)),

  -- At least one package must be priced
  constraint laundry_at_least_one_package check (
    price_wash_per_kg_idr      is not null
    or price_wash_dry_per_kg_idr  is not null
    or price_wash_iron_per_kg_idr is not null
  ),

  -- Location
  city               text,
  service_area_notes text,

  -- Contact
  whatsapp_e164    text not null,

  -- Media
  profile_image_url text,
  ktp_image_url     text,

  -- Availability + verification + subscription (mirror massage)
  availability     text not null default 'offline'
                   check (availability in ('online','busy','offline')),
  status           text not null default 'pending'
                   check (status in ('pending','active','suspended','removed')),
  verified_at      timestamptz,
  verified_by      uuid references auth.users(id),
  rejected_reason  text,

  subscription_status text not null default 'trial'
                   check (subscription_status in ('trial','active','expired','cancelled')),
  trial_ends_at    timestamptz not null default (now() + interval '7 days'),
  paid_until       timestamptz,

  -- Mock pool flags
  is_mock          boolean not null default false,
  mock_hidden_at   timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint lp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  )
);

create index if not exists idx_lp_listing
  on public.laundry_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_lp_owner
  on public.laundry_providers (user_id);

-- touch updated_at on every UPDATE
create or replace function public.touch_laundry_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_laundry_providers on public.laundry_providers;
create trigger trg_touch_laundry_providers
  before update on public.laundry_providers
  for each row execute function public.touch_laundry_providers();

-- Real signup hides one oldest visible mock
create or replace function public.hide_one_mock_laundry_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.laundry_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.laundry_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_laundry_signup on public.laundry_providers;
create trigger trg_hide_mock_on_real_laundry_signup
  after insert on public.laundry_providers
  for each row execute function public.hide_one_mock_laundry_provider();

-- RLS
alter table public.laundry_providers enable row level security;
drop policy if exists lp_public_read   on public.laundry_providers;
create policy lp_public_read   on public.laundry_providers for select to anon, authenticated using (status = 'active');
drop policy if exists lp_owner_read    on public.laundry_providers;
create policy lp_owner_read    on public.laundry_providers for select to authenticated using (user_id = auth.uid());
drop policy if exists lp_owner_update  on public.laundry_providers;
create policy lp_owner_update  on public.laundry_providers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed 4 mock laundry shops
insert into public.laundry_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  price_wash_per_kg_idr, price_wash_dry_per_kg_idr, price_wash_iron_per_kg_idr,
  min_kg, turnaround_hours,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  availability, status
)
values
  (true, null, 'demo-lp-merdeka', 'Laundry Merdeka', 6,
    'Express pickup + dropoff in Kuta. Same-day return on orders before 9am.',
    7000, 9000, 12000, 3.0, 24,
    'Bali — Kuta', 'Kuta · Legian', '+62000000501',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'online',  'active'),
  (true, null, 'demo-lp-cepat',   'Cepat Laundry',  4,
    'Wash + iron only — no separate dry option. Same-day on orders under 5kg.',
    null, null, 11000, 2.0, 12,
    'Yogyakarta', 'Yogya Central · Sleman', '+62000000502',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'busy',    'active'),
  (true, null, 'demo-lp-bersih',  'Bersih Laundry', 8,
    'Family laundry, wash + dry packages. Hotel partners welcome.',
    6500, 8500, null, 2.5, 36,
    'Denpasar', 'Denpasar · Sanur', '+62000000503',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'online',  'active'),
  (true, null, 'demo-lp-segar',   'Segar Laundry',  3,
    'Eco detergent, gentle wash for delicate fabrics. All three packages.',
    8000, 10000, 13000, 2.0, 48,
    'Bali — Ubud', 'Ubud · Tegallalang', '+62000000504',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'offline', 'active')
on conflict (slug) do nothing;
