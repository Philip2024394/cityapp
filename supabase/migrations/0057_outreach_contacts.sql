-- ============================================================================
-- 0057 — Admin outreach CRM
-- ----------------------------------------------------------------------------
-- Tracks sales outreach to potential providers (rental shops, therapists,
-- tour guides, partner venues). Solo-founder sales tool — admin enters
-- contacts manually after finding them via Google Maps / Instagram /
-- referrals, then logs each touchpoint.
--
-- NOT a scraper. Just a CRM. RLS locks it to admin role only.
-- ============================================================================

create table if not exists public.outreach_contacts (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null,
  -- What we're trying to sign them up for
  category      text not null check (category in (
    'bike_rental','driver','massage','tour_guide','partner_venue','food_vendor','other'
  )),
  city          text,
  whatsapp_e164 text,
  email         text,
  website       text,
  notes         text,
  -- Sales funnel
  status        text not null default 'queued' check (status in (
    'queued','contacted','replied','meeting','converted','passed','no_reply'
  )),
  source        text,                       -- 'gmaps', 'instagram', 'referral', etc.
  contacted_at  timestamptz,
  last_touch_at timestamptz,
  touch_count   integer not null default 0,
  converted_at  timestamptz,
  -- Who in the team owns this lead (always admin user_id for now)
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_outreach_status_city
  on public.outreach_contacts (status, city, last_touch_at desc);
create index if not exists idx_outreach_category
  on public.outreach_contacts (category, status);

-- touch updated_at on every update
create or replace function public.touch_outreach_contacts()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists trg_touch_outreach_contacts on public.outreach_contacts;
create trigger trg_touch_outreach_contacts
  before update on public.outreach_contacts
  for each row execute function public.touch_outreach_contacts();

-- RLS — admin role only (read + write). is_admin() is provided by an
-- earlier migration; if missing this policy just falls back to denying.
alter table public.outreach_contacts enable row level security;

drop policy if exists outreach_admin_all on public.outreach_contacts;
create policy outreach_admin_all on public.outreach_contacts
  for all
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
