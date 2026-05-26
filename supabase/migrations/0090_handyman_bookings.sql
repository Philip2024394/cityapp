-- 0090_handyman_bookings.sql
--
-- handyman_bookings — customer-submitted booking request rows.
-- Mirrors beautician_bookings (mig 0085) so the shared
-- ContactBookingPopup component can target either vertical with the
-- same JSON contract. Platform never custodies money — the row exists
-- only so the tukang sees the request in his dashboard and can confirm
-- / decline. The actual handshake continues on WhatsApp.

create table if not exists public.handyman_bookings (
  id                 uuid primary key default gen_random_uuid(),
  handyman_id        uuid not null references public.handyman_providers(id) on delete cascade,
  customer_name      text not null,
  customer_whatsapp  text not null,
  service_name       text,
  requested_date     date not null,
  requested_time     text not null,
  status             text not null default 'pending'
                       check (status in ('pending','confirmed','declined','completed','cancelled')),
  notes              text,
  submitter_ip_hash  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists handyman_bookings_by_provider_date
  on public.handyman_bookings (handyman_id, requested_date desc);

create index if not exists handyman_bookings_pending
  on public.handyman_bookings (handyman_id, status)
  where status = 'pending';

create or replace function public.touch_handyman_bookings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_handyman_bookings_touch on public.handyman_bookings;
create trigger trg_handyman_bookings_touch
  before update on public.handyman_bookings
  for each row execute function public.touch_handyman_bookings_updated_at();

alter table public.handyman_bookings enable row level security;

drop policy if exists handyman_bookings_owner_read on public.handyman_bookings;
create policy handyman_bookings_owner_read on public.handyman_bookings
  for select using (
    exists (
      select 1 from public.handyman_providers hp
      where hp.id = handyman_bookings.handyman_id
        and hp.user_id = auth.uid()
    )
  );

drop policy if exists handyman_bookings_owner_update on public.handyman_bookings;
create policy handyman_bookings_owner_update on public.handyman_bookings
  for update using (
    exists (
      select 1 from public.handyman_providers hp
      where hp.id = handyman_bookings.handyman_id
        and hp.user_id = auth.uid()
    )
  );

-- No anon insert — POST /api/handyman/[slug]/book uses service_role.
