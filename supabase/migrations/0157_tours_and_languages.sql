-- ============================================================================
-- 0157 — Tour packages + driver languages
-- ----------------------------------------------------------------------------
-- Tour packages: drivers self-publish curated itineraries (e.g. "Borobudur
-- Sunrise Tour: Rp 650k, 12h, English-speaking, 4 pax max, includes water").
-- A package = driver + sequence of Places + duration + price + what's
-- included. Sits alongside Hourly Hire and Parcel B2B as a third revenue
-- channel for car + bike drivers. Customers tap a tour card on the driver
-- profile → calendar popup → WhatsApp deep-link with the package prefilled.
--
-- Languages: which languages the driver speaks. Renders as a flag-icon row
-- under the rating on the public profile (max 3 surfaced). Tourist market
-- signal — a French/Chinese/Arabic-speaking driver lands premium bookings.
--
-- Compliance: IndoCity remains a software directory under PM 12/2019. The
-- driver publishes every price + every itinerary. The platform never sets
-- fares and never owns the tour relationship. WhatsApp handoff is the
-- contract; we just present the listing.
-- ============================================================================

-- ── Languages ───────────────────────────────────────────────────────────────
alter table public.drivers
  add column if not exists languages text[] not null default array['id']::text[];

comment on column public.drivers.languages is
  'ISO 639-1 codes for languages the driver speaks (id, en, zh, ar, fr, nl, de, ja, ko, es, ru, hi, ms, jv, th, vi). Default Indonesian.';

-- ── Tour packages table ─────────────────────────────────────────────────────
create table if not exists public.driver_tour_packages (
  id              uuid        primary key default gen_random_uuid(),
  driver_id       uuid        not null references public.drivers(user_id) on delete cascade,
  template_id     text,
  title           text        not null,
  description     text,
  duration_hours  numeric(4,1) not null check (duration_hours > 0 and duration_hours <= 24),
  max_pax         integer     check (max_pax is null or max_pax between 1 and 60),
  price_idr       integer     not null check (price_idr between 0 and 50000000),
  includes        text[]      not null default '{}',
  excludes        text[]      not null default '{}',
  place_slugs     text[]      not null default '{}',
  photo_url       text,
  published       boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists driver_tour_packages_driver_idx on public.driver_tour_packages(driver_id);
create index if not exists driver_tour_packages_pub_idx on public.driver_tour_packages(published) where published = true;
create index if not exists driver_tour_packages_places_idx on public.driver_tour_packages using gin (place_slugs);

comment on table public.driver_tour_packages is
  'Driver-published tour packages (curated itineraries). Each row = a sellable tour. Customer taps card on profile → WhatsApp deep-link with package details.';

-- updated_at trigger
create or replace function public.driver_tour_packages_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists driver_tour_packages_updated_at on public.driver_tour_packages;
create trigger driver_tour_packages_updated_at
  before update on public.driver_tour_packages
  for each row execute function public.driver_tour_packages_set_updated_at();

-- RLS
alter table public.driver_tour_packages enable row level security;

drop policy if exists "Published tours readable by all" on public.driver_tour_packages;
create policy "Published tours readable by all"
  on public.driver_tour_packages for select
  using (published = true);

drop policy if exists "Drivers manage own tours" on public.driver_tour_packages;
create policy "Drivers manage own tours"
  on public.driver_tour_packages for all
  to authenticated
  using (auth.uid() = driver_id)
  with check (auth.uid() = driver_id);

grant select on public.driver_tour_packages to anon, authenticated;
grant insert, update, delete on public.driver_tour_packages to authenticated;

-- ============================================================================
-- POST-CONDITIONS
--   • drivers.languages text[] default ['id'] (Bahasa Indonesia)
--   • driver_tour_packages table created with RLS + indexes + updated_at trigger
--   • anon role reads published tours; authenticated drivers manage own
-- ============================================================================
