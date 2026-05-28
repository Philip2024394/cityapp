-- 0106 — Laundry providers: feature columns + bookings table
-- ============================================================================
-- Brings laundry_providers to feature parity with beautician_providers:
--   • has_physical_location / latitude / longitude  (mirror mig 0079)
--   • hero_text jsonb                               (mirror mig 0081)
--   • promo_text text                               (mirror mig 0082)
-- Plus a laundry_bookings table that mirrors beautician_bookings (mig 0085)
-- so the shared ContactBookingPopup component can target this vertical
-- with the same JSON contract. Platform never custodies money — the row
-- exists only so the laundry sees the request in her dashboard and can
-- confirm / decline. The actual handshake continues on WhatsApp.
-- ============================================================================

-- Physical "Visit Us" location (mirror mig 0079) -----------------------------
alter table public.laundry_providers
  add column if not exists has_physical_location boolean not null default false,
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;

alter table public.laundry_providers
  drop constraint if exists laundry_providers_latlng_check,
  add  constraint laundry_providers_latlng_check check (
    (latitude is null and longitude is null)
    or
    (latitude  between -90 and 90 and longitude between -180 and 180)
  );

-- Customisable hero text (mirror mig 0081) -----------------------------------
alter table public.laundry_providers
  add column if not exists hero_text jsonb;

-- Running promo text (mirror mig 0082) ---------------------------------------
alter table public.laundry_providers
  add column if not exists promo_text text;

alter table public.laundry_providers
  drop constraint if exists laundry_providers_promo_text_check,
  add  constraint laundry_providers_promo_text_check check (
    promo_text is null or length(promo_text) <= 500
  );

-- ============================================================================
-- laundry_bookings — mirror beautician_bookings (mig 0085)
-- ============================================================================

create table if not exists public.laundry_bookings (
  id                 uuid primary key default gen_random_uuid(),
  laundry_id         uuid not null references public.laundry_providers(id) on delete cascade,
  customer_name      text not null,
  customer_whatsapp  text not null,
  service_name       text,
  requested_date     date not null,
  requested_time     text not null,
  status             text not null default 'pending'
                       check (status in ('pending','confirmed','declined','completed','cancelled')),
  notes              text,
  submitter_ip_hash  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists laundry_bookings_by_provider_date
  on public.laundry_bookings (laundry_id, requested_date desc);

create index if not exists laundry_bookings_pending
  on public.laundry_bookings (laundry_id, status)
  where status = 'pending';

-- Touch updated_at on row update --------------------------------------------
create or replace function public.touch_laundry_bookings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_laundry_bookings_touch on public.laundry_bookings;
create trigger trg_laundry_bookings_touch
  before update on public.laundry_bookings
  for each row execute function public.touch_laundry_bookings_updated_at();

-- RLS -----------------------------------------------------------------------
-- Reads: only the owning laundry provider sees her own bookings.
-- Inserts: anon allowed (customers submit booking requests from the public
-- profile). Updates: only the owning provider can change status. Direct
-- supabase-js anon clients cannot read anyone's bookings.
alter table public.laundry_bookings enable row level security;

drop policy if exists laundry_bookings_owner_read on public.laundry_bookings;
create policy laundry_bookings_owner_read on public.laundry_bookings
  for select using (
    exists (
      select 1 from public.laundry_providers lp
      where lp.id = laundry_bookings.laundry_id
        and lp.user_id = auth.uid()
    )
  );

drop policy if exists laundry_bookings_owner_update on public.laundry_bookings;
create policy laundry_bookings_owner_update on public.laundry_bookings
  for update using (
    exists (
      select 1 from public.laundry_providers lp
      where lp.id = laundry_bookings.laundry_id
        and lp.user_id = auth.uid()
    )
  );

drop policy if exists laundry_bookings_anon_insert on public.laundry_bookings;
create policy laundry_bookings_anon_insert on public.laundry_bookings
  for insert to anon, authenticated with check (true);
