-- ============================================================================
-- 0060 — Bike Handyman (Tukang) marketplace
-- ----------------------------------------------------------------------------
-- Indonesian tukang pricing convention:
--   • visit_fee_idr     — callout fee just to show up (always required)
--   • hourly_rate_idr   — after-arrival hourly rate (optional, most have it)
--   • day_rate_idr      — full-day flat rate (optional, for big jobs)
-- Multi-select specialties (electrical, plumbing, AC, etc.) — tukang
-- typically do 2-3 trades.
-- ============================================================================

create table if not exists public.handyman_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Specialties — multi-select text[] from the canonical list in
  -- src/lib/handyman/types.ts. CHECK constrains to that vocab.
  specialties text[] not null default '{}'
    check (specialties <@ array[
      'electrical','plumbing','ac_service','carpentry','painting',
      'general_repair','furniture_assembly','appliance_repair',
      'roof_repair','tiling','welding','locksmith','gardening','other'
    ]::text[]),

  -- Pricing — visit fee is mandatory; hourly + day are optional
  visit_fee_idr    integer not null check (visit_fee_idr >= 0),
  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),

  has_own_tools    boolean not null default true,

  -- Location
  city               text,
  service_area_notes text,

  -- Contact
  whatsapp_e164    text not null,

  -- Media
  profile_image_url text,
  ktp_image_url     text,

  -- Availability + verification + subscription
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

  constraint hp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  )
);

create index if not exists idx_hp_listing
  on public.handyman_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_hp_owner
  on public.handyman_providers (user_id);
create index if not exists idx_hp_specialties
  on public.handyman_providers using gin (specialties)
  where status = 'active';

create or replace function public.touch_handyman_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_handyman_providers on public.handyman_providers;
create trigger trg_touch_handyman_providers
  before update on public.handyman_providers
  for each row execute function public.touch_handyman_providers();

create or replace function public.hide_one_mock_handyman_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.handyman_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.handyman_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_handyman_signup on public.handyman_providers;
create trigger trg_hide_mock_on_real_handyman_signup
  after insert on public.handyman_providers
  for each row execute function public.hide_one_mock_handyman_provider();

alter table public.handyman_providers enable row level security;
drop policy if exists hp_public_read on public.handyman_providers;
create policy hp_public_read on public.handyman_providers for select to anon, authenticated using (status = 'active');
drop policy if exists hp_owner_read on public.handyman_providers;
create policy hp_owner_read on public.handyman_providers for select to authenticated using (user_id = auth.uid());
drop policy if exists hp_owner_update on public.handyman_providers;
create policy hp_owner_update on public.handyman_providers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed 4 mock handymen — variety of trades, rates, availability
insert into public.handyman_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  specialties, visit_fee_idr, hourly_rate_idr, day_rate_idr, has_own_tools,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  availability, status
)
values
  (true, null, 'demo-hp-pak-joko', 'Pak Joko', 12,
    'Tukang listrik + AC service. 12 tahun pengalaman, brings own tools. Same-day untuk Yogya.',
    array['electrical','ac_service','appliance_repair'], 80000, 75000, 450000, true,
    'Yogyakarta', 'Yogya · Sleman', '+62000000601',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'online', 'active'),
  (true, null, 'demo-hp-pak-budi', 'Pak Budi', 8,
    'Plumbing + general repair. Pipa bocor, WC mampet, pompa air. Cepat datang.',
    array['plumbing','general_repair'], 60000, 50000, null, true,
    'Bali — Denpasar', 'Denpasar · Sanur · Renon', '+62000000602',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'busy', 'active'),
  (true, null, 'demo-hp-mas-andi', 'Mas Andi', 5,
    'Carpentry + furniture assembly + tiling. IKEA / Informa specialist, lemari kustom juga bisa.',
    array['carpentry','furniture_assembly','tiling'], 100000, null, 350000, true,
    'Bali — Kuta', 'Kuta · Seminyak · Canggu', '+62000000603',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'online', 'active'),
  (true, null, 'demo-hp-pak-eko', 'Pak Eko', 15,
    'Painting + general repair. Cat rumah, plafon, dinding bocor. Tukang senior.',
    array['painting','general_repair','roof_repair'], 75000, 60000, 400000, true,
    'Yogyakarta', 'Yogya Central · Bantul', '+62000000604',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'offline', 'active')
on conflict (slug) do nothing;
