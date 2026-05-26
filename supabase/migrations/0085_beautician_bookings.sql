-- ============================================================================
-- Beautician booking calendar
--   • beautician_providers.busy_dates  — array of ISO date strings (YYYY-MM-DD)
--     that the beautician has manually marked unavailable. Customer-side
--     calendar greys these out so customers don't pick them.
--   • beautician_bookings              — customer-submitted booking request
--     rows. Created when a customer fills the contact popup. The platform
--     never custodies payment; the beautician confirms / declines in her
--     dashboard and the actual exchange continues on WhatsApp.
-- ============================================================================

-- Self-marked busy dates ----------------------------------------------------
alter table public.beautician_providers
  add column if not exists busy_dates jsonb default '[]'::jsonb;

comment on column public.beautician_providers.busy_dates is
  'Array of ISO date strings (YYYY-MM-DD) the beautician marked busy. Customer date picker on the public profile greys these out.';

-- Booking requests ----------------------------------------------------------
create table if not exists public.beautician_bookings (
  id                 uuid primary key default gen_random_uuid(),
  beautician_id      uuid not null references public.beautician_providers(id) on delete cascade,
  customer_name      text not null,
  customer_whatsapp  text not null,
  service_name       text,
  -- ISO date + 24h HH:MM time, validated in the API layer.
  requested_date     date not null,
  requested_time     text not null,
  -- pending = just submitted, confirmed = beautician accepted in dashboard,
  -- declined = beautician marked unavailable, completed = past appointment
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

create index if not exists beautician_bookings_by_provider_date
  on public.beautician_bookings (beautician_id, requested_date desc);

create index if not exists beautician_bookings_pending
  on public.beautician_bookings (beautician_id, status)
  where status = 'pending';

-- Touch updated_at on row update --------------------------------------------
create or replace function public.touch_beautician_bookings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_beautician_bookings_touch on public.beautician_bookings;
create trigger trg_beautician_bookings_touch
  before update on public.beautician_bookings
  for each row execute function public.touch_beautician_bookings_updated_at();

-- RLS -----------------------------------------------------------------------
-- Reads: only the owning beautician sees her own bookings.
-- Writes: customers submit via service_role through the API; beautician
-- updates her own rows via API too. RLS keeps direct supabase-js clients
-- (anon role) from reading anyone's bookings.
alter table public.beautician_bookings enable row level security;

drop policy if exists beautician_bookings_owner_read on public.beautician_bookings;
create policy beautician_bookings_owner_read on public.beautician_bookings
  for select using (
    exists (
      select 1 from public.beautician_providers bp
      where bp.id = beautician_bookings.beautician_id
        and bp.user_id = auth.uid()
    )
  );

drop policy if exists beautician_bookings_owner_update on public.beautician_bookings;
create policy beautician_bookings_owner_update on public.beautician_bookings
  for update using (
    exists (
      select 1 from public.beautician_providers bp
      where bp.id = beautician_bookings.beautician_id
        and bp.user_id = auth.uid()
    )
  );

-- No anon insert — POST /api/beautician/[slug]/book uses service_role.
