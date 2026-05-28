-- 0107 — Tour guide listings: feature columns + bookings table
-- ============================================================================
-- Brings tour_guide_listings (mig 0037) to feature parity with the beautician
-- vertical's customer-side popup contract:
--   • has_physical_location boolean    (mirror mig 0079 — Visit Us toggle)
--   • busy_dates            text[]     (self-marked unavailable ISO dates)
--   • promo_text            text       (mirror mig 0082 — marquee message)
-- Plus a tour_bookings table that mirrors beautician_bookings (mig 0085) so
-- the shared ContactBookingPopup component can target this vertical with the
-- same JSON contract. Platform never custodies money — the row exists only so
-- the tour guide sees the request in his dashboard and can confirm / decline.
-- The actual handshake continues on WhatsApp.
--
-- IMPORTANT: tour_guide_listings already stores coordinates as lat/lng (mig
-- 0037), NOT latitude/longitude. This migration does NOT add lat/lng columns.
-- ============================================================================

-- ── Feature columns on tour_guide_listings ──────────────────────────────────

-- has_physical_location: gates the Visit Us panel on the public profile.
alter table public.tour_guide_listings
  add column if not exists has_physical_location boolean default false;

comment on column public.tour_guide_listings.has_physical_location is
  'When true, the public profile shows the Visit Us panel using the tour guide''s lat/lng pin.';

-- busy_dates: self-marked unavailable dates as ISO YYYY-MM-DD strings.
-- text[] (per spec) — customer date picker on the public profile greys these
-- out so customers do not pick them.
alter table public.tour_guide_listings
  add column if not exists busy_dates text[] default '{}';

comment on column public.tour_guide_listings.busy_dates is
  'Array of ISO date strings (YYYY-MM-DD) the tour guide marked busy. Customer date picker on the public profile greys these out.';

-- promo_text: running marquee message at the top of the public profile.
alter table public.tour_guide_listings
  add column if not exists promo_text text default null;

alter table public.tour_guide_listings
  drop constraint if exists tour_guide_listings_promo_text_check,
  add  constraint tour_guide_listings_promo_text_check check (
    promo_text is null or length(promo_text) <= 500
  );

-- ============================================================================
-- tour_bookings — mirror beautician_bookings (mig 0085)
-- ============================================================================

create table if not exists public.tour_bookings (
  id                 uuid primary key default gen_random_uuid(),
  tour_id            uuid not null references public.tour_guide_listings(id) on delete cascade,
  customer_name      text not null,
  customer_whatsapp  text not null,
  service_name       text,
  -- ISO date + 24h HH:MM time, validated in the API layer.
  requested_date     date not null,
  requested_time     text not null,
  -- pending = just submitted, confirmed = guide accepted in dashboard,
  -- declined = guide marked unavailable, completed = past tour that went
  -- through. Cancelled = customer changed mind (rare path).
  status             text not null default 'pending'
                       check (status in ('pending','confirmed','declined','completed','cancelled')),
  notes              text,
  -- Lightweight abuse / spam tracking — we hash the submitter's IP so the
  -- API can rate-limit without storing PII directly.
  submitter_ip_hash  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists tour_bookings_by_provider_date
  on public.tour_bookings (tour_id, requested_date desc);

create index if not exists tour_bookings_pending
  on public.tour_bookings (tour_id, status)
  where status = 'pending';

-- Touch updated_at on row update --------------------------------------------
create or replace function public.touch_tour_bookings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_tour_bookings_touch on public.tour_bookings;
create trigger trg_tour_bookings_touch
  before update on public.tour_bookings
  for each row execute function public.touch_tour_bookings_updated_at();

-- RLS -----------------------------------------------------------------------
-- Reads: only the owning tour guide sees her own bookings (joins via
--   tour_guide_listings.owner_user_id, the column added in mig 0037).
-- Inserts: anon allowed — customers submit booking requests from the public
--   profile without authenticating. The API layer rate-limits with the
--   submitter_ip_hash column.
-- Updates: only the owning provider can change status. Direct supabase-js
--   anon clients cannot read anyone's bookings.
alter table public.tour_bookings enable row level security;

drop policy if exists tour_bookings_owner_read on public.tour_bookings;
create policy tour_bookings_owner_read on public.tour_bookings
  for select using (
    exists (
      select 1 from public.tour_guide_listings tgl
      where tgl.id = tour_bookings.tour_id
        and tgl.owner_user_id = auth.uid()
    )
  );

drop policy if exists tour_bookings_owner_update on public.tour_bookings;
create policy tour_bookings_owner_update on public.tour_bookings
  for update using (
    exists (
      select 1 from public.tour_guide_listings tgl
      where tgl.id = tour_bookings.tour_id
        and tgl.owner_user_id = auth.uid()
    )
  );

drop policy if exists tour_bookings_anon_insert on public.tour_bookings;
create policy tour_bookings_anon_insert on public.tour_bookings
  for insert to anon, authenticated with check (true);
