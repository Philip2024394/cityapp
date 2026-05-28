-- 0105 — Home Clean providers: feature columns + bookings table
-- ============================================================================
-- Brings home_clean_providers to parity with beautician_providers feature set
-- (migs 0074 / 0079 / 0081 / 0082 / 0085) so the shared profile + booking
-- components can render a cleaner's public page with the same data contract.
--
-- Columns added:
--   • service_photos        — per-service photo map (mirrors mig 0074)
--   • has_physical_location — opt-in "Visit Us" panel flag (mirrors mig 0079)
--   • latitude / longitude  — coordinates for the stylised map (mirrors 0079)
--   • busy_dates            — self-marked unavailable dates (mirrors mig 0085)
--   • hero_text             — editable 3-line hero overlay (mirrors mig 0081)
--   • promo_text            — editable marquee strip (mirrors mig 0082)
--
-- New table:
--   • home_clean_bookings   — customer-submitted booking requests
--     (mirrors beautician_bookings from mig 0085 exactly; only the FK +
--     policy names are renamed for this vertical). Platform never custodies
--     payment; row exists so the cleaner sees the request in her dashboard.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Provider feature columns
-- ---------------------------------------------------------------------------
alter table public.home_clean_providers
  add column if not exists service_photos        jsonb            default '{}'::jsonb,
  add column if not exists has_physical_location boolean not null default false,
  add column if not exists latitude              double precision,
  add column if not exists longitude             double precision,
  add column if not exists busy_dates            text[]  not null default '{}'::text[],
  add column if not exists hero_text             jsonb,
  add column if not exists promo_text            text;

-- Lat/lng range check — pair must be valid when set; both null is allowed
-- because a cleaner can flag has_physical_location without pinning a map.
alter table public.home_clean_providers
  drop constraint if exists home_clean_providers_latlng_check,
  add  constraint home_clean_providers_latlng_check check (
    (latitude is null and longitude is null)
    or
    (latitude between -90 and 90 and longitude between -180 and 180)
  );

-- promo_text length cap (mirrors beautician mig 0082).
alter table public.home_clean_providers
  drop constraint if exists home_clean_providers_promo_text_check,
  add  constraint home_clean_providers_promo_text_check check (
    promo_text is null or length(promo_text) <= 500
  );

comment on column public.home_clean_providers.busy_dates is
  'Array of ISO date strings (YYYY-MM-DD) the cleaner marked busy. Customer date picker on the public profile greys these out.';

-- ---------------------------------------------------------------------------
-- Bookings table — mirrors beautician_bookings (mig 0085)
-- ---------------------------------------------------------------------------
create table if not exists public.home_clean_bookings (
  id                 uuid primary key default gen_random_uuid(),
  home_clean_id      uuid not null references public.home_clean_providers(id) on delete cascade,
  customer_name      text not null,
  customer_whatsapp  text not null,
  service_name       text,
  -- ISO date + 24h HH:MM time, validated in the API layer.
  requested_date     date not null,
  requested_time     text not null,
  -- pending = just submitted, confirmed = cleaner accepted in dashboard,
  -- declined = cleaner marked unavailable, completed = past appointment
  -- that went through, cancelled = customer changed mind (rare path).
  status             text not null default 'pending'
                       check (status in ('pending','confirmed','declined','completed','cancelled')),
  notes              text,
  -- Lightweight abuse / spam tracking — we hash the submitter's IP so the
  -- API can rate-limit without storing PII directly.
  submitter_ip_hash  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists home_clean_bookings_by_provider_date
  on public.home_clean_bookings (home_clean_id, requested_date desc);

create index if not exists home_clean_bookings_pending
  on public.home_clean_bookings (home_clean_id, status)
  where status = 'pending';

-- Touch updated_at on row update --------------------------------------------
create or replace function public.touch_home_clean_bookings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_home_clean_bookings_touch on public.home_clean_bookings;
create trigger trg_home_clean_bookings_touch
  before update on public.home_clean_bookings
  for each row execute function public.touch_home_clean_bookings_updated_at();

-- RLS -----------------------------------------------------------------------
-- Reads: only the owning cleaner sees her own bookings.
-- Writes: customers submit via service_role through the API; cleaner
-- updates her own rows via API too. RLS keeps direct supabase-js clients
-- (anon role) from reading anyone's bookings.
alter table public.home_clean_bookings enable row level security;

drop policy if exists home_clean_bookings_owner_read on public.home_clean_bookings;
create policy home_clean_bookings_owner_read on public.home_clean_bookings
  for select using (
    exists (
      select 1 from public.home_clean_providers hcp
      where hcp.id = home_clean_bookings.home_clean_id
        and hcp.user_id = auth.uid()
    )
  );

drop policy if exists home_clean_bookings_owner_update on public.home_clean_bookings;
create policy home_clean_bookings_owner_update on public.home_clean_bookings
  for update using (
    exists (
      select 1 from public.home_clean_providers hcp
      where hcp.id = home_clean_bookings.home_clean_id
        and hcp.user_id = auth.uid()
    )
  );

-- No anon insert — POST /api/home-clean/[slug]/book uses service_role.
