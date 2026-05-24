-- ============================================================================
-- 0058 — Bike Beautician marketplace
-- ----------------------------------------------------------------------------
-- Same shape as massage_providers (mig 0047), three package prices:
--   • price_makeup_idr   — full makeup session
--   • price_nail_idr     — nail art / manicure-pedicure
--   • price_hair_idr     — hair styling / blow-out / treatment
-- A beautician can offer any combination — NULL price means they don't
-- offer that service. KTP-backed identity, admin verification, same
-- 38k/month subscription model.
--
-- Mock pool + auto-hide trigger included from the start (no separate
-- companion table — same-table pattern as massage with is_mock flag).
-- ============================================================================

create table if not exists public.beautician_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  gender           text not null check (gender in ('woman','man')),
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Service package prices — NULL = service not offered
  price_makeup_idr integer check (price_makeup_idr is null or price_makeup_idr >= 0),
  price_nail_idr   integer check (price_nail_idr   is null or price_nail_idr   >= 0),
  price_hair_idr   integer check (price_hair_idr   is null or price_hair_idr   >= 0),

  -- At least one service must be priced
  constraint beautician_at_least_one_service check (
    price_makeup_idr is not null
    or price_nail_idr is not null
    or price_hair_idr is not null
  ),

  -- Location
  city               text,
  service_area_notes text,

  -- Contact
  whatsapp_e164    text not null,

  -- Media
  profile_image_url text,
  ktp_image_url     text,

  -- Live availability + verification + subscription (mirror massage)
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

  -- Mock rows have no user, real rows do
  constraint bp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  )
);

create index if not exists idx_bp_listing
  on public.beautician_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_bp_owner
  on public.beautician_providers (user_id);

-- touch updated_at on every UPDATE
create or replace function public.touch_beautician_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_beautician_providers on public.beautician_providers;
create trigger trg_touch_beautician_providers
  before update on public.beautician_providers
  for each row execute function public.touch_beautician_providers();

-- Real signup hides one oldest visible mock — same pattern as massage.
create or replace function public.hide_one_mock_beautician_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.beautician_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.beautician_providers
         set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_beautician_signup on public.beautician_providers;
create trigger trg_hide_mock_on_real_beautician_signup
  after insert on public.beautician_providers
  for each row execute function public.hide_one_mock_beautician_provider();

-- RLS
alter table public.beautician_providers enable row level security;
drop policy if exists bp_public_read on public.beautician_providers;
create policy bp_public_read on public.beautician_providers
  for select to anon, authenticated using (status = 'active');
drop policy if exists bp_owner_read on public.beautician_providers;
create policy bp_owner_read on public.beautician_providers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists bp_owner_update on public.beautician_providers;
create policy bp_owner_update on public.beautician_providers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed 4 mock beauticians — mix of services and availability states.
insert into public.beautician_providers (
  is_mock, user_id, slug, display_name, gender, years_experience, bio,
  price_makeup_idr, price_nail_idr, price_hair_idr,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  availability, status
)
values
  (true, null, 'demo-bp-ayu',   'Ayu',       'woman',  7,
    'Bridal + party makeup, nail art on request. Hotel + home outcalls in Kuta and Seminyak.',
    450000, 180000, null,
    'Bali — Kuta', 'Kuta · Seminyak · Legian', '+62000000401',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'online',  'active'),
  (true, null, 'demo-bp-dewi',  'Dewi',      'woman',  10,
    'Specialist in traditional Javanese hair + modern blow-outs. Wedding bookings welcome.',
    null, null, 350000,
    'Yogyakarta', 'Yogya · Bantul · Sleman', '+62000000402',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'busy',    'active'),
  (true, null, 'demo-bp-rina',  'Rina',      'woman',  5,
    'Gel nails + nail art + manicure-pedicure. Travels with full kit.',
    null, 220000, null,
    'Denpasar', 'Denpasar · Sanur · Renon', '+62000000403',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'online',  'active'),
  (true, null, 'demo-bp-mira',  'Mira',      'woman',  12,
    'Full glam: makeup, hair styling, nails. Pre-wedding and event specialist.',
    550000, 250000, 380000,
    'Bali — Ubud', 'Ubud · Tegallalang', '+62000000404',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'offline', 'active')
on conflict (slug) do nothing;
