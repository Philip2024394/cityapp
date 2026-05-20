-- ============================================================================
-- 0030_customer_saved_places.sql
-- ----------------------------------------------------------------------------
-- Customer-owned saved drop-off locations (Home, Office, Mom's house, etc).
-- Replaces the "Tap map" prompt on /cari with a chip row of saved places.
--
-- ACCOUNT GATE:
--   The drop-off tile shows a "[⭐ Saved]" chip to everyone. Anonymous
--   users see a signup prompt; authenticated customers see their own
--   places (RLS enforced on user_id = auth.uid()).
--
-- HARD CAP:
--   API route enforces 20 entries per user. We DON'T add a DB trigger —
--   the count check is cheap, lives next to the validation, and a stray
--   manual insert via service-role is fine (admin tooling).
--
-- DATA MINIMISATION (UU PDP):
--   • Lat/lng + freeform name — that's it
--   • No address parsing, no PII enrichment
--   • Bounded to Indonesia coords so a stray bad insert can't be used to
--     pin a customer to a foreign address
-- ============================================================================

create table if not exists public.customer_saved_places (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 30),
  emoji           text not null default '📍' check (char_length(emoji) <= 6),
  lat             double precision not null check (lat between -11 and 6),
  lng             double precision not null check (lng between 95 and 142),
  label           text check (label is null or char_length(label) <= 200),
  display_order   smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists customer_saved_places_user_idx
  on public.customer_saved_places(user_id, display_order);

alter table public.customer_saved_places enable row level security;

-- Read own only — never expose another user's saved places.
create policy "Read own saved places"
  on public.customer_saved_places for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Insert own saved places"
  on public.customer_saved_places for insert
  with check (auth.uid() = user_id);

create policy "Update own saved places"
  on public.customer_saved_places for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Delete own saved places"
  on public.customer_saved_places for delete
  using (auth.uid() = user_id or public.is_admin());
