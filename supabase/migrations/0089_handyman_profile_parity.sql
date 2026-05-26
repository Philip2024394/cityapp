-- 0089_handyman_profile_parity.sql
--
-- Adds the fields handyman_providers needs to match beautician's
-- polished profile page (mig 0072 + 0078 + 0079 + 0086).
--
-- promo_text             — running marquee message at the top of the profile
-- service_photos         — JSONB array of {url, name, description, price, before_image_url, after_image_url}
--                          mirrors beautician_providers.service_photos
-- busy_dates             — fully-booked dates for the Contact popup calendar
-- has_physical_location  — gates the Visit Us panel
-- latitude / longitude   — coordinates for the stylised SVG map
--
-- All fields are NULL-able / safe defaults. No code paths rely on them
-- until the Phase 2-A profile-page rebuild ships.

alter table public.handyman_providers
  add column if not exists promo_text            text,
  add column if not exists service_photos        jsonb        not null default '[]'::jsonb,
  add column if not exists busy_dates            date[]       not null default '{}'::date[],
  add column if not exists has_physical_location boolean      not null default false,
  add column if not exists latitude              double precision,
  add column if not exists longitude             double precision;

-- Coordinate range checks — only applied when both columns are populated.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'handyman_providers_latitude_range'
  ) then
    alter table public.handyman_providers
      add constraint handyman_providers_latitude_range
      check (latitude is null or (latitude between -90 and 90));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'handyman_providers_longitude_range'
  ) then
    alter table public.handyman_providers
      add constraint handyman_providers_longitude_range
      check (longitude is null or (longitude between -180 and 180));
  end if;
end$$;

-- service_photos shape sanity — must be a JSON array.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'handyman_providers_service_photos_array'
  ) then
    alter table public.handyman_providers
      add constraint handyman_providers_service_photos_array
      check (jsonb_typeof(service_photos) = 'array');
  end if;
end$$;

-- promo_text length cap — keep marquee snappy.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'handyman_providers_promo_text_len'
  ) then
    alter table public.handyman_providers
      add constraint handyman_providers_promo_text_len
      check (promo_text is null or char_length(promo_text) <= 280);
  end if;
end$$;
