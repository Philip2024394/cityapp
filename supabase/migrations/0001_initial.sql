-- City Rider — initial schema. Run via Supabase dashboard or `supabase db push`.
-- Requires PostGIS for nearest-rider queries.

create extension if not exists postgis;

-- ───────────────────────────────────────────────────────────────
create table riders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid unique references auth.users(id) on delete cascade,
  slug                  text unique not null,
  name                  text not null,
  photo_url             text,
  whatsapp_e164         text not null,
  bio                   text,
  area                  text,
  city                  text,
  is_online             boolean not null default false,
  last_seen_at          timestamptz,
  subscription_status   text not null default 'trial',  -- 'trial' | 'active' | 'past_due' | 'canceled'
  trial_ends_at         timestamptz default (now() + interval '30 days'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index riders_online_idx on riders (is_online) where is_online = true;
create index riders_slug_idx   on riders (slug);

-- ───────────────────────────────────────────────────────────────
-- One row per rider, upserted on GPS update. PostGIS Point for fast nearby queries.
create table rider_locations (
  rider_id     uuid primary key references riders(id) on delete cascade,
  lat          double precision not null,
  lng          double precision not null,
  accuracy_m   integer,
  speed_mps    double precision,
  heading_deg  double precision,
  geog         geography(Point, 4326) generated always as (st_makepoint(lng, lat)::geography) stored,
  updated_at   timestamptz not null default now()
);

create index rider_locations_geog_idx on rider_locations using gist (geog);

-- ───────────────────────────────────────────────────────────────
create table rider_services (
  rider_id      uuid not null references riders(id) on delete cascade,
  service_type  text not null check (service_type in ('package', 'food', 'courier', 'personal')),
  enabled       boolean not null default true,
  primary key (rider_id, service_type)
);

-- ───────────────────────────────────────────────────────────────
create table rider_bikes (
  rider_id   uuid primary key references riders(id) on delete cascade,
  model      text not null,
  type       text not null check (type in ('matic', 'sport', 'manual')),
  photo_url  text,
  plate      text,
  has_box    boolean not null default false
);

-- ───────────────────────────────────────────────────────────────
create table rider_pricing (
  rider_id        uuid primary key references riders(id) on delete cascade,
  price_per_km    integer not null check (price_per_km > 0),
  min_fee         integer not null check (min_fee >= 0),
  currency        text not null default 'IDR',
  updated_at      timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
create table subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  rider_id                    uuid not null references riders(id) on delete cascade,
  plan                        text not null default 'standard',
  status                      text not null,           -- 'active' | 'past_due' | 'canceled'
  current_period_end          timestamptz,
  midtrans_subscription_id    text,
  created_at                  timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- Every WhatsApp tap is logged here. Source of analytics + social proof.
create table quote_events (
  id                  uuid primary key default gen_random_uuid(),
  rider_id            uuid not null references riders(id) on delete cascade,
  customer_session    text,                   -- anon cookie, no PII
  pickup_lat          double precision not null,
  pickup_lng          double precision not null,
  pickup_label        text,
  dropoff_lat         double precision not null,
  dropoff_lng         double precision not null,
  dropoff_label       text,
  distance_km         numeric(8, 2) not null,
  estimated_fare      integer not null,
  source              text not null,          -- 'marketplace' | 'profile_page' | 'offline_fallback'
  rider_notified_at   timestamptz,
  rider_read_at       timestamptz,
  rider_responded     boolean not null default false,
  created_at          timestamptz not null default now()
);

create index quote_events_rider_created_idx on quote_events (rider_id, created_at desc);

-- ───────────────────────────────────────────────────────────────
-- Web Push subscriptions per rider device.
create table rider_push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  rider_id     uuid not null references riders(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- Row Level Security
alter table riders                    enable row level security;
alter table rider_locations           enable row level security;
alter table rider_services            enable row level security;
alter table rider_bikes               enable row level security;
alter table rider_pricing             enable row level security;
alter table subscriptions             enable row level security;
alter table quote_events              enable row level security;
alter table rider_push_subscriptions  enable row level security;

-- Public can read online + paying riders only (privacy + paywall)
create policy "riders_public_select" on riders
  for select using (
    is_online = true
    and subscription_status in ('active', 'trial')
  );

create policy "riders_owner_all" on riders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rider_locations_public_select_when_online" on rider_locations
  for select using (
    exists (
      select 1 from riders r
      where r.id = rider_id
        and r.is_online = true
        and r.subscription_status in ('active', 'trial')
    )
  );

create policy "rider_locations_owner_all" on rider_locations
  for all using (
    exists (select 1 from riders r where r.id = rider_id and r.user_id = auth.uid())
  );

create policy "rider_services_public_select" on rider_services for select using (true);
create policy "rider_bikes_public_select"    on rider_bikes    for select using (true);
create policy "rider_pricing_public_select"  on rider_pricing  for select using (true);

create policy "rider_services_owner_all" on rider_services
  for all using (exists (select 1 from riders r where r.id = rider_id and r.user_id = auth.uid()));
create policy "rider_bikes_owner_all" on rider_bikes
  for all using (exists (select 1 from riders r where r.id = rider_id and r.user_id = auth.uid()));
create policy "rider_pricing_owner_all" on rider_pricing
  for all using (exists (select 1 from riders r where r.id = rider_id and r.user_id = auth.uid()));

create policy "quote_events_insert_anyone" on quote_events for insert with check (true);
create policy "quote_events_owner_select"  on quote_events for select
  using (exists (select 1 from riders r where r.id = rider_id and r.user_id = auth.uid()));

create policy "push_subs_owner_all" on rider_push_subscriptions
  for all using (exists (select 1 from riders r where r.id = rider_id and r.user_id = auth.uid()));

create policy "subscriptions_owner_select" on subscriptions
  for select using (exists (select 1 from riders r where r.id = rider_id and r.user_id = auth.uid()));

-- ───────────────────────────────────────────────────────────────
-- Nearest N online riders to a customer GPS point — the killer query.
create or replace function nearest_online_riders(
  customer_lng double precision,
  customer_lat double precision,
  exclude_rider_id uuid default null,
  limit_n integer default 10
)
returns table (
  rider_id    uuid,
  slug        text,
  name        text,
  photo_url   text,
  whatsapp_e164 text,
  area        text,
  city        text,
  price_per_km integer,
  min_fee     integer,
  distance_km double precision
)
language sql stable as $$
  select
    r.id, r.slug, r.name, r.photo_url, r.whatsapp_e164, r.area, r.city,
    p.price_per_km, p.min_fee,
    (st_distance(rl.geog, st_makepoint(customer_lng, customer_lat)::geography) / 1000.0) as distance_km
  from riders r
  join rider_locations rl on rl.rider_id = r.id
  join rider_pricing  p   on p.rider_id  = r.id
  where r.is_online = true
    and r.subscription_status in ('active', 'trial')
    and (exclude_rider_id is null or r.id != exclude_rider_id)
  order by rl.geog <-> st_makepoint(customer_lng, customer_lat)::geography
  limit limit_n;
$$;
