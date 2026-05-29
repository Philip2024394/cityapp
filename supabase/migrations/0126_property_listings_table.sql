-- ============================================================================
-- 0126 — Property listings (new category)
-- ----------------------------------------------------------------------------
-- New category surfaced by the 2026-05-29 template-marketplace pivot.
-- Per founder direction the two primary templates are SALE and RENTAL;
-- listing_type is gated to those two for v1. new_construction can land
-- later by widening the CHECK + adding the dev/units/completion fields.
--
-- Pricing:
--   for_sale → price_idr (lump sum), price_negotiable
--   for_rent → daily_rent_idr, weekly_rent_idr, monthly_rent_idr,
--              deposit_idr, min_lease_months
--
-- Schema posture mirrors beautician/places/handyman pattern so the shared
-- ProviderDashboard can mount with a config swap.
-- ============================================================================

create extension if not exists postgis;

create table if not exists public.property_listings (
  id uuid primary key default gen_random_uuid(),

  -- Identity / ownership
  user_id        uuid    references auth.users(id) on delete cascade,
  slug           text    not null unique,
  display_name   text    not null,
  business_name  text,
  bio            text,

  -- Listing type + property type (the two dropdowns)
  listing_type   text    not null check (listing_type in ('for_sale','for_rent')),
  property_type  text    not null check (property_type in (
    'house','apartment','villa','land','shophouse','warehouse','office','shop'
  )),

  -- SALE pricing (nullable; required only when listing_type='for_sale')
  price_idr            bigint,
  price_negotiable     boolean not null default false,
  price_on_request     boolean not null default false,

  -- RENTAL pricing (nullable; required only when listing_type='for_rent')
  daily_rent_idr       bigint,
  weekly_rent_idr      bigint,
  monthly_rent_idr     bigint,
  deposit_idr          bigint,
  min_lease_months     smallint,

  -- Universal property attributes
  bedrooms             smallint,
  bathrooms            smallint,
  land_size_sqm        numeric(10,2),
  building_size_sqm    numeric(10,2),
  floors               smallint,
  certificate_type     text check (certificate_type is null or certificate_type in (
    'SHM','HGB','SHGB','Strata','Girik','AJB'
  )),
  facing_direction     text,
  year_built           smallint,
  furnished            text check (furnished is null or furnished in (
    'unfurnished','semi','fully'
  )),
  parking_cars         smallint,
  parking_bikes        smallint,
  has_pool             boolean default false,
  has_garden           boolean default false,
  electricity_va       integer,
  water_source         text check (water_source is null or water_source in ('PDAM','well','both')),

  -- Indonesia-specific differentiators
  kpr_eligible              boolean default false,
  accepted_banks            text[]  default '{}'::text[],
  flood_zone                text    check (flood_zone is null or flood_zone in ('none','occasional','frequent')),
  transit_score             jsonb   default '{}'::jsonb,
  drone_url                 text,
  virtual_tour_url          text,
  video_url                 text,
  expat_friendly            boolean default false,
  leasehold_years_remaining smallint,

  -- Location
  location  geography(Point, 4326),
  latitude  double precision,
  longitude double precision,
  city      text not null references public.city_zones(city),
  address   text,
  kelurahan text,
  kecamatan text,

  -- Universal profile fields (mirror beautician)
  whatsapp_e164      text not null,
  profile_image_url  text,
  cover_image_url    text,
  image_urls         text[]   default '{}'::text[],
  gallery_image_urls text[]   default '{}'::text[],
  hero_text          jsonb,
  promo_text         text check (promo_text is null or char_length(promo_text) <= 280),
  theme_color        text check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$'),
  service_photos     jsonb default '{}'::jsonb check (jsonb_typeof(service_photos) = 'object'),
  instagram_url      text,
  tiktok_url         text,
  facebook_url       text,
  languages          text[] default '{}'::text[],
  certifications     text[] default '{}'::text[],
  operating_hours    jsonb,
  tags               text[] default '{}'::text[],

  -- Compliance — Indonesian real-estate disclosure
  agent_license_no       text,                 -- AREBI broker license
  ktp_image_url          text,                 -- KTP-backed seller verification
  preferred_ppat_name    text,                 -- handoff to notary (PPAT)
  preferred_ppat_phone   text,

  -- Moderation / lifecycle (mirror places)
  status            text not null default 'pending' check (status in (
    'pending','active','sold','rented','withdrawn','suspended'
  )),
  verified          boolean not null default false,
  verified_at       timestamptz,
  verified_by       uuid,
  rejection_note    text,

  -- Subscription / billing (mirror provider tables)
  subscription_status text not null default 'trial' check (subscription_status in (
    'trial','active','expired','cancelled'
  )),
  trial_ends_at     timestamptz,
  paid_until        date,

  -- Mock / seed pattern (mirror mig 0049)
  is_mock          boolean not null default false,
  mock_hidden_at   timestamptz,

  -- Counters / timestamps
  rating           numeric(2,1),
  rating_count     integer not null default 0,
  inquiry_count    integer not null default 0,
  visitor_count    integer not null default 0,
  last_active_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Mock rule: mocks own no auth user; real rows must.
  constraint pl_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  ),

  -- Pricing rule: at least one matching pricing field per listing_type.
  constraint pl_pricing_matches_listing_type check (
    (listing_type = 'for_sale'
       and (price_idr is not null or price_on_request = true))
    or
    (listing_type = 'for_rent'
       and (daily_rent_idr is not null
         or weekly_rent_idr is not null
         or monthly_rent_idr is not null))
  ),

  -- Coordinate sanity
  constraint pl_latitude_range  check (latitude  is null or (latitude  between -90  and 90)),
  constraint pl_longitude_range check (longitude is null or (longitude between -180 and 180))
);

-- Indexes
create index if not exists idx_property_listings_status        on public.property_listings(status);
create index if not exists idx_property_listings_city          on public.property_listings(city);
create index if not exists idx_property_listings_listing_type  on public.property_listings(listing_type);
create index if not exists idx_property_listings_property_type on public.property_listings(property_type);
create index if not exists idx_property_listings_visible       on public.property_listings(mock_hidden_at) where mock_hidden_at is null;

-- RLS — public can read approved + non-hidden; only owner can write.
alter table public.property_listings enable row level security;

drop policy if exists property_listings_public_read on public.property_listings;
create policy property_listings_public_read on public.property_listings
  for select using (
    status = 'active'
    and (is_mock = false or mock_hidden_at is null)
  );

drop policy if exists property_listings_owner_write on public.property_listings;
create policy property_listings_owner_write on public.property_listings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Real-signup hides one oldest visible mock (mirror mig 0049).
create or replace function public.hide_one_mock_property_listing()
returns trigger language plpgsql security definer as $$
declare
  victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.property_listings
     where is_mock = true and mock_hidden_at is null
       and listing_type = new.listing_type
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.property_listings
         set mock_hidden_at = now()
       where id = victim_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_hide_mock_on_real_property_signup on public.property_listings;
create trigger trg_hide_mock_on_real_property_signup
  after insert on public.property_listings
  for each row execute function public.hide_one_mock_property_listing();
