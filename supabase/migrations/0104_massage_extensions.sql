-- 0104 — Massage providers: feature columns + bookings table
-- ============================================================================
-- Brings the massage vertical to feature parity with the beautician vertical
-- (migs 0074, 0077, 0081, 0082, 0085). Adds the same hero overlay, marquee
-- promo text, calendar busy-dates, per-service photo gallery, and primary
-- marketplace categories to `massage_providers`, plus a `massage_bookings`
-- table that mirrors `beautician_bookings` so the shared ContactBookingPopup
-- component can target either vertical with the same JSON contract.
--
-- Column data types mirror the beautician reference exactly (busy_dates is
-- jsonb, not text[]; service_photos is jsonb keyed by tier; etc.). The
-- platform never custodies money — booking rows exist only so the therapist
-- sees the request in his/her dashboard and the actual handshake continues
-- on WhatsApp.
-- ============================================================================

-- ── Feature columns on massage_providers ──────────────────────────────────
-- hero_text: per-provider customisable 3-line hero overlay
--   { line1, line2, tagline, color, effect }   (mirrors mig 0081)
alter table public.massage_providers
  add column if not exists hero_text jsonb;

comment on column public.massage_providers.hero_text is
  'Per-provider hero overlay JSON: {line1, line2, tagline, color, effect}. NULL renders the global defaults.';

-- promo_text: running marquee message (mirrors mig 0082)
alter table public.massage_providers
  add column if not exists promo_text text;

alter table public.massage_providers
  drop constraint if exists massage_providers_promo_text_check,
  add  constraint massage_providers_promo_text_check check (
    promo_text is null or length(promo_text) <= 500
  );

-- busy_dates: self-marked unavailable dates as ISO YYYY-MM-DD strings
-- jsonb to match beautician_providers (mig 0085); customer date picker
-- on the public profile greys these out.
alter table public.massage_providers
  add column if not exists busy_dates jsonb default '[]'::jsonb;

comment on column public.massage_providers.busy_dates is
  'Array of ISO date strings (YYYY-MM-DD) the therapist marked busy. Customer date picker on the public profile greys these out.';

-- service_photos: Record<tier, photoUrl[]> per-service gallery
-- jsonb default '{}' to match mig 0074. No CHECK on keys here — the
-- massage vertical uses different tier keys than beautician services,
-- so the API layer validates the shape instead of a DB allowlist.
alter table public.massage_providers
  add column if not exists service_photos jsonb default '{}'::jsonb;

-- marketplace_categories: filter chip values the provider appears under
-- text[] default '{}' to match mig 0077. No CHECK constraint on the
-- allowlist here — massage taxonomy is open-ended and validated in the
-- API layer (see lib/massage/types.ts for the active set).
alter table public.massage_providers
  add column if not exists marketplace_categories text[] default '{}';


-- ── Bookings table — mirrors beautician_bookings (mig 0085) ──────────────
create table if not exists public.massage_bookings (
  id                 uuid primary key default gen_random_uuid(),
  massage_id         uuid not null references public.massage_providers(id) on delete cascade,
  customer_name      text not null,
  customer_whatsapp  text not null,
  service_name       text,
  -- ISO date + 24h HH:MM time, validated in the API layer.
  requested_date     date not null,
  requested_time     text not null,
  -- pending = just submitted, confirmed = therapist accepted in dashboard,
  -- declined = therapist marked unavailable, completed = past appointment
  -- that went through. Cancelled = customer changed mind (rare path).
  status             text not null default 'pending'
                       check (status in ('pending','confirmed','declined','completed','cancelled')),
  notes              text,
  -- Lightweight abuse / spam tracking — we hash the submitter's IP so the
  -- API can rate-limit without storing PII directly.
  submitter_ip_hash  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists massage_bookings_by_provider_date
  on public.massage_bookings (massage_id, requested_date desc);

create index if not exists massage_bookings_pending
  on public.massage_bookings (massage_id, status)
  where status = 'pending';

-- Touch updated_at on row update --------------------------------------------
create or replace function public.touch_massage_bookings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_massage_bookings_touch on public.massage_bookings;
create trigger trg_massage_bookings_touch
  before update on public.massage_bookings
  for each row execute function public.touch_massage_bookings_updated_at();

-- RLS -----------------------------------------------------------------------
-- Reads: only the owning therapist sees her own bookings.
-- Writes: customers submit via service_role through the API; therapist
-- updates her own rows via API too. RLS keeps direct supabase-js clients
-- (anon role) from reading anyone's bookings.
alter table public.massage_bookings enable row level security;

drop policy if exists massage_bookings_owner_read on public.massage_bookings;
create policy massage_bookings_owner_read on public.massage_bookings
  for select using (
    exists (
      select 1 from public.massage_providers mp
      where mp.id = massage_bookings.massage_id
        and mp.user_id = auth.uid()
    )
  );

drop policy if exists massage_bookings_owner_update on public.massage_bookings;
create policy massage_bookings_owner_update on public.massage_bookings
  for update using (
    exists (
      select 1 from public.massage_providers mp
      where mp.id = massage_bookings.massage_id
        and mp.user_id = auth.uid()
    )
  );

-- No anon insert — POST /api/massage/[slug]/book uses service_role.
