-- ============================================================================
-- 0063 — Bike Home Clean marketplace
-- ----------------------------------------------------------------------------
-- Home cleaning service delivered by motorbike. Pricing convention:
--   • hourly_rate_idr — per-hour rate (most common booking)
--   • day_rate_idr    — full-day flat (8 hours)
-- At least one of hour/day must be set. No specialties; no callout fee.
-- ============================================================================

create table if not exists public.home_clean_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),
  constraint home_clean_providers_at_least_one_price
    check (hourly_rate_idr is not null or day_rate_idr is not null),

  city               text,
  service_area_notes text,

  whatsapp_e164    text not null,

  profile_image_url text,
  ktp_image_url     text,

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

  is_mock          boolean not null default false,
  mock_hidden_at   timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint hcp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  )
);

create index if not exists idx_hcp_listing
  on public.home_clean_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_hcp_owner
  on public.home_clean_providers (user_id);

create or replace function public.touch_home_clean_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_home_clean_providers on public.home_clean_providers;
create trigger trg_touch_home_clean_providers
  before update on public.home_clean_providers
  for each row execute function public.touch_home_clean_providers();

create or replace function public.hide_one_mock_home_clean_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.home_clean_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.home_clean_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_home_clean_signup on public.home_clean_providers;
create trigger trg_hide_mock_on_real_home_clean_signup
  after insert on public.home_clean_providers
  for each row execute function public.hide_one_mock_home_clean_provider();

alter table public.home_clean_providers enable row level security;
drop policy if exists hcp_public_read on public.home_clean_providers;
create policy hcp_public_read on public.home_clean_providers for select to anon, authenticated using (status = 'active');
drop policy if exists hcp_owner_read on public.home_clean_providers;
create policy hcp_owner_read on public.home_clean_providers for select to authenticated using (user_id = auth.uid());
drop policy if exists hcp_owner_update on public.home_clean_providers;
create policy hcp_owner_update on public.home_clean_providers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed 4 mock cleaners — variety of rates, cities, availability
insert into public.home_clean_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  hourly_rate_idr, day_rate_idr,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  availability, status
)
values
  (true, null, 'demo-hc-bu-siti', 'Bu Siti', 9,
    'Bersih-bersih rumah harian. Bawa peralatan sendiri (vacuum, pel, lap microfiber). Sabar dengan barang-barang Anda.',
    45000, 320000,
    'Yogyakarta', 'Yogya · Sleman · Bantul', '+62000000701',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'online', 'active'),
  (true, null, 'demo-hc-mbak-rina', 'Mbak Rina', 6,
    'Bersih dalam (deep clean), kitchen + kamar mandi specialist. Per jam atau borongan harian.',
    55000, 400000,
    'Bali — Denpasar', 'Denpasar · Sanur · Renon', '+62000000702',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'busy', 'active'),
  (true, null, 'demo-hc-bu-yanti', 'Bu Yanti', 12,
    'Cleaning villa, Airbnb turnover. 12 tahun pengalaman. Bisa weekly contract.',
    50000, 380000,
    'Bali — Kuta', 'Kuta · Seminyak · Canggu', '+62000000703',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'online', 'active'),
  (true, null, 'demo-hc-bu-dewi', 'Bu Dewi', 4,
    'Bersih rumah + lipat baju + setrika ringan. Cocok untuk keluarga sibuk.',
    40000, 300000,
    'Yogyakarta', 'Yogya Central', '+62000000704',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'offline', 'active')
on conflict (slug) do nothing;
