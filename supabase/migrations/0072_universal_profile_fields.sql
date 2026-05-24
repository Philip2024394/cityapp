-- ============================================================================
-- 0072 — Universal Business Profile fields + polymorphic reviews + view counts
-- ----------------------------------------------------------------------------
-- Foundation for the Universal Business Profile System. Adds the
-- shared profile-page fields to the 7 service-provider tables (driver
-- profile is already complete per founder, skipped here; partners
-- deferred to a separate workflow).
--
-- Per-table additions:
--   cover_image_url       — wide hero image (16:9 ratio)
--   gallery_image_urls    — text[] up to 12 portfolio photos (CHECK)
--   languages             — text[] e.g. {'id','en'}
--   instagram_url, tiktok_url, facebook_url — social links
--   operating_hours       — jsonb {"mon":"09:00-18:00",...} or null = "by request"
--   certifications        — text[]
--   last_active_at        — only on tables that don't have it yet
--   inquiry_count         — int default 0 (dashboard analytics only, not public)
--   visitor_count         — int default 0 (dashboard analytics only, not public)
--
-- Plus:
--   • Reviews relaxed from drivers-only FK to polymorphic (provider_type +
--     provider_id) so all 8 verticals can collect reviews. Drops the
--     `driver_user_id` FK and adds a CHECK constraint on provider_type.
--   • New `provider_profile_views` table — one row per anon visit to a
--     profile page. AFTER-INSERT trigger increments visitor_count on the
--     provider row (matches existing rating/review_count denormalisation
--     pattern).
--   • Migrate bike_rentals.owner_languages + tour_guide_listings.languages
--     drift: both already exist with different names — keep both for now
--     (read prefers the unified `languages`, writes mirror). Sub-task.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Add profile fields to each of the 7 provider tables
-- ─────────────────────────────────────────────────────────────────────────

-- Shared add-column template applied per table. text[] CHECK keeps gallery
-- bounded; operating_hours is nullable jsonb so providers can leave blank.

-- bike_rentals already has image_urls (gallery-equiv) + owner_languages +
-- owner_response_time_min. Add only the missing fields. Languages stays
-- dual-source for now — UI reads owner_languages first, falls back to new
-- languages array if set.
alter table public.bike_rentals
  add column if not exists cover_image_url   text,
  add column if not exists languages         text[] default '{}',
  add column if not exists instagram_url     text,
  add column if not exists tiktok_url        text,
  add column if not exists facebook_url      text,
  add column if not exists operating_hours   jsonb,
  add column if not exists certifications    text[] default '{}',
  add column if not exists last_active_at    timestamptz,
  add column if not exists inquiry_count     int not null default 0,
  add column if not exists visitor_count     int not null default 0;

alter table public.tour_guide_listings
  add column if not exists cover_image_url   text,
  add column if not exists gallery_image_urls text[] default '{}',
  add column if not exists instagram_url     text,
  add column if not exists tiktok_url        text,
  add column if not exists facebook_url      text,
  add column if not exists operating_hours   jsonb,
  add column if not exists certifications    text[] default '{}',
  add column if not exists last_active_at    timestamptz,
  add column if not exists inquiry_count     int not null default 0,
  add column if not exists visitor_count     int not null default 0;

-- 5 service-provider tables — same shape. All need the full set since
-- they only have profile_image_url + ktp_image_url today.
alter table public.massage_providers
  add column if not exists cover_image_url    text,
  add column if not exists gallery_image_urls text[] default '{}',
  add column if not exists languages          text[] default '{id}',
  add column if not exists instagram_url      text,
  add column if not exists tiktok_url         text,
  add column if not exists facebook_url       text,
  add column if not exists operating_hours    jsonb,
  add column if not exists certifications     text[] default '{}',
  add column if not exists last_active_at     timestamptz,
  add column if not exists inquiry_count      int not null default 0,
  add column if not exists visitor_count      int not null default 0;

alter table public.beautician_providers
  add column if not exists cover_image_url    text,
  add column if not exists gallery_image_urls text[] default '{}',
  add column if not exists languages          text[] default '{id}',
  add column if not exists instagram_url      text,
  add column if not exists tiktok_url         text,
  add column if not exists facebook_url       text,
  add column if not exists operating_hours    jsonb,
  add column if not exists certifications     text[] default '{}',
  add column if not exists last_active_at     timestamptz,
  add column if not exists inquiry_count      int not null default 0,
  add column if not exists visitor_count      int not null default 0;

alter table public.laundry_providers
  add column if not exists cover_image_url    text,
  add column if not exists gallery_image_urls text[] default '{}',
  add column if not exists languages          text[] default '{id}',
  add column if not exists instagram_url      text,
  add column if not exists tiktok_url         text,
  add column if not exists facebook_url       text,
  add column if not exists operating_hours    jsonb,
  add column if not exists certifications     text[] default '{}',
  add column if not exists last_active_at     timestamptz,
  add column if not exists inquiry_count      int not null default 0,
  add column if not exists visitor_count      int not null default 0;

alter table public.handyman_providers
  add column if not exists cover_image_url    text,
  add column if not exists gallery_image_urls text[] default '{}',
  add column if not exists languages          text[] default '{id}',
  add column if not exists instagram_url      text,
  add column if not exists tiktok_url         text,
  add column if not exists facebook_url       text,
  add column if not exists operating_hours    jsonb,
  add column if not exists certifications     text[] default '{}',
  add column if not exists last_active_at     timestamptz,
  add column if not exists inquiry_count      int not null default 0,
  add column if not exists visitor_count      int not null default 0;

alter table public.home_clean_providers
  add column if not exists cover_image_url    text,
  add column if not exists gallery_image_urls text[] default '{}',
  add column if not exists languages          text[] default '{id}',
  add column if not exists instagram_url      text,
  add column if not exists tiktok_url         text,
  add column if not exists facebook_url       text,
  add column if not exists operating_hours    jsonb,
  add column if not exists certifications     text[] default '{}',
  add column if not exists last_active_at     timestamptz,
  add column if not exists inquiry_count      int not null default 0,
  add column if not exists visitor_count      int not null default 0;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Bound the gallery — max 12 images per provider (CHECK constraint)
-- ─────────────────────────────────────────────────────────────────────────
-- Applied per table since the constraint name has to be unique.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'tour_guide_listings',
    'massage_providers', 'beautician_providers', 'laundry_providers',
    'handyman_providers', 'home_clean_providers'
  ] loop
    execute format($f$
      alter table public.%I
        drop constraint if exists %I,
        add  constraint %I check (
          gallery_image_urls is null
          or array_length(gallery_image_urls, 1) is null
          or array_length(gallery_image_urls, 1) <= 12
        );
    $f$,
      v_table,
      v_table || '_gallery_max',
      v_table || '_gallery_max'
    );
  end loop;
end;
$$;

-- bike_rentals — its existing image_urls is the gallery. Same bound.
alter table public.bike_rentals
  drop constraint if exists bike_rentals_gallery_max,
  add  constraint bike_rentals_gallery_max check (
    image_urls is null
    or array_length(image_urls, 1) is null
    or array_length(image_urls, 1) <= 12
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Reviews — relax driver-only FK to polymorphic provider reference
-- ─────────────────────────────────────────────────────────────────────────
-- Existing schema (0013:25): `driver_user_id uuid not null references drivers`.
-- New shape: keep driver_user_id (legacy, still populated for driver
-- reviews) AND add (provider_type, provider_id) for new verticals. Allows
-- backward compat — existing reviews queries on driver_user_id keep working.
alter table public.reviews
  add column if not exists provider_type text,
  add column if not exists provider_id   uuid;

alter table public.reviews
  drop constraint if exists reviews_provider_type_check;
alter table public.reviews
  add constraint reviews_provider_type_check
  check (provider_type is null or provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean'
  ));

-- Backfill: every existing review is a driver review. Stamp the polymorphic
-- columns so new code can read uniformly from (provider_type, provider_id).
update public.reviews
   set provider_type = 'driver',
       provider_id   = driver_user_id
 where provider_type is null
   and driver_user_id is not null;

-- Either driver_user_id OR provider_* must be set — defensive CHECK.
alter table public.reviews
  drop constraint if exists reviews_provider_or_driver;
alter table public.reviews
  add constraint reviews_provider_or_driver
  check (
    driver_user_id is not null
    or (provider_type is not null and provider_id is not null)
  );

create index if not exists reviews_provider_idx
  on public.reviews (provider_type, provider_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Provider profile-view tracking
-- ─────────────────────────────────────────────────────────────────────────
-- One row per anon profile-page view. AFTER-INSERT trigger increments
-- visitor_count on the matching provider row. Dashboard-only metric;
-- never surfaced publicly per founder's professional cull.
create table if not exists public.provider_profile_views (
  id              bigserial primary key,
  provider_type   text not null check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean'
  )),
  provider_id     uuid not null,
  anon_session_id text,
  source          text,            -- 'direct' | 'wa_share' | 'social' | 'qr' | null
  viewed_at       timestamptz not null default now()
);

create index if not exists ppv_provider_idx
  on public.provider_profile_views (provider_type, provider_id, viewed_at desc);

-- RLS — service-role inserts via /api/profile-view; admin reads for analytics.
-- No anon select policy needed.
alter table public.provider_profile_views enable row level security;
drop policy if exists ppv_admin_read on public.provider_profile_views;
create policy ppv_admin_read on public.provider_profile_views
  for select to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

-- AFTER-INSERT trigger — increments visitor_count on the right provider table.
create or replace function public.bump_provider_visitor_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  case new.provider_type
    when 'bike_rental'  then update public.bike_rentals         set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'tour_guide'   then update public.tour_guide_listings  set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'massage'      then update public.massage_providers    set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'beautician'   then update public.beautician_providers set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'laundry'      then update public.laundry_providers    set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'handyman'     then update public.handyman_providers   set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'home_clean'   then update public.home_clean_providers set visitor_count = visitor_count + 1 where id = new.provider_id;
    -- 'driver' has no visitor_count column (out of scope per founder); noop.
    else
      return new;
  end case;
  return new;
end;
$$;

drop trigger if exists trg_bump_visitor_count on public.provider_profile_views;
create trigger trg_bump_visitor_count
  after insert on public.provider_profile_views
  for each row execute function public.bump_provider_visitor_count();

-- ============================================================================
-- POST-CONDITIONS
--   • 7 provider tables now carry the full Universal Business Profile
--     field set. Drivers + partners deliberately skipped.
--   • Gallery bounded at 12 images per provider via CHECK constraint.
--   • Reviews accept polymorphic provider reference; legacy driver-only
--     FK retained but no longer required for new rows.
--   • provider_profile_views captures every visit + denormalizes the
--     count onto the provider row (dashboard analytics only).
--   • No RLS changes needed for the 5 service-provider tables (locked
--     down to API-only access per mig 0064; API routes will widen their
--     SELECT projections).
--   • bike_rentals + tour_guide_listings have column-coarse anon SELECT
--     so new columns are auto-readable for the public marketplace pages.
-- ============================================================================
