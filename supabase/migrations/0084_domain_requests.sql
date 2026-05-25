-- ============================================================================
-- 0084 — Domain requests (custom .my.id domain on behalf of beautician)
-- ----------------------------------------------------------------------------
-- Beautician submits a domain name choice + 2 alternatives + their
-- contact info. Admin manually purchases the .my.id domain (~Rp 25k
-- cost) and sets up hosting/DNS. Retail price to beautician: Rp 150k/year
-- (locked at request time).
-- ============================================================================

create table if not exists public.domain_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  beautician_id     uuid references public.beautician_providers(id) on delete cascade,
  domain_choice_1   text not null,
  domain_choice_2   text,
  domain_choice_3   text,
  tld               text not null default '.my.id',
  price_idr         int  not null default 150000,
  contact_name      text not null,
  contact_whatsapp  text not null,
  contact_city      text,
  status            text not null default 'pending'
                    check (status in ('pending','registered','rejected','cancelled')),
  registered_domain text,                       -- which choice we ended up registering
  registrar_notes   text,                       -- admin notes
  created_at        timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid references auth.users(id)
);

create index if not exists domain_requests_user_idx   on public.domain_requests (user_id, created_at desc);
create index if not exists domain_requests_status_idx on public.domain_requests (status, created_at desc);

alter table public.domain_requests enable row level security;
drop policy if exists "domain_requests_owner_read" on public.domain_requests;
create policy "domain_requests_owner_read" on public.domain_requests
  for select using (auth.uid() = user_id);
