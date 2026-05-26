-- ============================================================================
-- IndoCity — Independent Rider Booking Platform
-- ============================================================================
-- IndoCity is software infrastructure for INDEPENDENT rider businesses.
-- It is NOT ride-hailing, NOT a fleet manager, NOT a dispatch service.
--
-- Core rules baked into this schema:
--   * One driver = one independent rider business (no fleet hierarchy)
--   * Customer ALWAYS picks the rider manually (no auto-assign)
--   * Platform NEVER touches money (no wallet/escrow/payouts/commissions)
--   * Payments happen directly customer ↔ rider (cash / qr / transfer)
--   * Platform records payment_method + payment_status only
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- PROFILES — extends auth.users with role + display info
-- ============================================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text not null unique,
  full_name     text,
  photo_url     text,
  role          text not null default 'customer'
                check (role in ('customer','driver','admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- ============================================================================
-- DRIVERS — one row = one independent rider business
-- ============================================================================
create table public.drivers (
  user_id                       uuid primary key references public.profiles(id) on delete cascade,
  slug                          text unique not null,
  business_name                 text not null,
  bio                           text,
  whatsapp_e164                 text not null,
  brand_logo_url                text,
  city                          text,
  area                          text,
  service_zone_center_lat       double precision,
  service_zone_center_lng       double precision,
  service_zone_radius_km        numeric(5,2) default 10,

  -- Account status (admin moderation tool)
  status                        text not null default 'active'
                                check (status in ('active','suspended')),

  -- Three availability states, all visible on discovery; only 'online' is bookable
  availability                  text not null default 'offline'
                                check (availability in ('online','busy','offline')),
  current_lat                   double precision,
  current_lng                   double precision,
  current_location_updated_at   timestamptz,
  last_active_at                timestamptz,

  -- Bike spec
  bike_make                     text,
  bike_model                    text,
  bike_year                     int,
  bike_color                    text,
  bike_plate                    text,
  bike_type                     text check (bike_type in ('matic','sport','manual')),
  bike_cc                       int,
  has_box                       boolean not null default false,

  -- Services & rider-controlled pricing
  services                      text[] not null default '{}',
  price_per_km                  int not null,
  min_fee                       int not null,
  pitstop_fee                   int not null default 0,

  -- Payment methods the rider accepts (platform records, never processes)
  accepts_cash                  boolean not null default true,
  accepts_qr                    boolean not null default false,
  accepts_transfer              boolean not null default false,
  qr_payment_url                text,
  transfer_details              text,

  -- Cached stats
  rating                        numeric(2,1),
  trips_count                   int not null default 0,

  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);
create index drivers_active_idx on public.drivers (status, availability) where status = 'active';
create index drivers_city_idx on public.drivers (city);
create index drivers_location_idx on public.drivers (current_lat, current_lng)
  where availability = 'online' and status = 'active';

-- ============================================================================
-- SUBSCRIPTIONS — per-rider subscription state
-- MVP: manually managed by platform admin. Midtrans/Xendit integration later.
-- ============================================================================
create table public.subscriptions (
  driver_id            uuid primary key references public.drivers(user_id) on delete cascade,
  status               text not null default 'trial'
                       check (status in ('trial','active','past_due','canceled')),
  trial_ends_at        timestamptz,
  current_period_end   timestamptz,
  amount_idr           int not null default 38000,
  payment_reference    text,
  notes                text,
  updated_at           timestamptz not null default now()
);

-- ============================================================================
-- TRIPS — bookings. Customer ALWAYS picks driver_id manually.
-- driver_id is REQUIRED on insert; there is no "auto-assign" path.
-- ============================================================================
create table public.trips (
  id                 uuid primary key default gen_random_uuid(),
  driver_id          uuid not null references public.profiles(id),
  customer_phone     text not null,
  customer_name      text,
  customer_user_id   uuid references public.profiles(id),

  service            text not null check (service in ('person','parcel','food')),
  status             text not null default 'requested'
                     check (status in (
                       'requested','accepted','arrived',
                       'in_progress','completed','canceled','expired'
                     )),

  pickup_lat         double precision not null,
  pickup_lng         double precision not null,
  pickup_label       text,
  dropoff_lat        double precision not null,
  dropoff_lng        double precision not null,
  dropoff_label      text,
  pitstop_note       text,

  distance_km        numeric(6,2),
  estimated_fare     int,

  -- Recorded only, NOT processed by the platform
  payment_method     text check (payment_method in ('cash','qr','transfer')),
  payment_status     text not null default 'pending'
                     check (payment_status in ('pending','confirmed','disputed')),

  rating             int check (rating between 1 and 5),
  rating_comment     text,
  cancel_reason      text,

  created_at         timestamptz not null default now(),
  accepted_at        timestamptz,
  completed_at       timestamptz
);
create index trips_driver_status_idx on public.trips (driver_id, status);
create index trips_customer_phone_idx on public.trips (customer_phone, created_at desc);
create index trips_customer_user_idx on public.trips (customer_user_id)
  where customer_user_id is not null;
create index trips_active_idx on public.trips (status, created_at)
  where status in ('requested','accepted','in_progress');

-- Prevent a single driver from having more than one active trip at a time.
-- Active = requested | accepted | arrived | in_progress.
create unique index trips_one_active_per_driver_idx
  on public.trips (driver_id)
  where status in ('requested','accepted','arrived','in_progress');

-- ============================================================================
-- TRIP EVENTS — append-only audit log of every trip state change
-- ============================================================================
create table public.trip_events (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  actor_id    uuid references public.profiles(id),
  event_type  text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index trip_events_trip_idx on public.trip_events (trip_id, created_at);

-- ============================================================================
-- AUDIT LOG — platform admin actions
-- ============================================================================
create table public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles(id),
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  before_data  jsonb,
  after_data   jsonb,
  created_at   timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ============================================================================
-- TRIGGERS — auto-update timestamps on writes
-- ============================================================================
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger drivers_set_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- AUTO-CREATE PROFILE when a new auth.users row is inserted
-- The role can be set via auth.signUp options.data.role (e.g. 'driver')
-- ============================================================================
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, phone, full_name, role)
  values (
    new.id,
    coalesce(new.phone, ''),
    coalesce(new.raw_user_meta_data->>'full_name', null),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ENABLE RLS on every public table
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.drivers       enable row level security;
alter table public.subscriptions enable row level security;
alter table public.trips         enable row level security;
alter table public.trip_events   enable row level security;
alter table public.audit_log     enable row level security;

-- ============================================================================
-- IMPORTANT: NO server-side dispatch functions exist in this schema.
--
-- The platform never auto-selects a rider for a customer. Discovery returns
-- a list (sorted by distance, rating, availability); the customer chooses.
--
-- A trip row is only inserted when the customer explicitly picks a driver_id.
-- The unique index trips_one_active_per_driver_idx prevents double-booking.
-- ============================================================================
