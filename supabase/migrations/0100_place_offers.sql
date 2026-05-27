-- ============================================================================
-- 0100 — Place offers (menu items / tickets / gallery) + contact toggle
-- ----------------------------------------------------------------------------
-- A place's profile page can now surface a carousel of "offers" — flexible
-- enough to cover:
--   • Restaurants: menu items (image + name + price + description)
--   • Bars: drinks, snacks, live-music nights
--   • Attractions / temples: ticket types OR plain photo gallery (no price,
--     description optional) — price_idr is nullable so image-only items work
--   • Kids playplace: entries / packages
--
-- Also adds places.contact_enabled so venue owners can hide the WhatsApp
-- CTA on their public profile (a temple with no phone, etc.) while still
-- keeping the "Get me there" transport CTA active.
-- ============================================================================

-- 1. place_offers table
-- ----------------------------------------------------------------------------
create table if not exists public.place_offers (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places(id) on delete cascade,

  -- Required by the popup; for an image-only gallery item, the owner can
  -- still type a one-word title (e.g. "Stupa") or leave the popup body
  -- focused on the photo + description.
  name        text not null,
  description text,

  -- NULLABLE — image-only gallery items + free events skip a price. UI
  -- detects null and renders the popup as image + description only.
  price_idr   int  check (price_idr is null or price_idr >= 0),

  image_url   text,

  -- Owner controls ordering in the dashboard via a drag handle (or
  -- numeric input in v1). Lowest first.
  sort_order  int not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_place_offers_place_order
  on public.place_offers (place_id, sort_order);

-- updated_at trigger reusing the existing helper if available, otherwise
-- inline a simple one.
create or replace function public.touch_place_offers_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_place_offers_touch on public.place_offers;
create trigger trg_place_offers_touch
  before update on public.place_offers
  for each row execute function public.touch_place_offers_updated_at();

-- 2. RLS — owner manages their offers; everyone reads offers for approved
--    places.
-- ----------------------------------------------------------------------------
alter table public.place_offers enable row level security;

drop policy if exists place_offers_public_read on public.place_offers;
create policy place_offers_public_read on public.place_offers
  for select using (
    exists (
      select 1
        from public.places p
       where p.id = place_offers.place_id
         and p.status = 'approved'
    )
  );

drop policy if exists place_offers_owner_read_own on public.place_offers;
create policy place_offers_owner_read_own on public.place_offers
  for select using (
    exists (
      select 1
        from public.places p
       where p.id = place_offers.place_id
         and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists place_offers_owner_insert on public.place_offers;
create policy place_offers_owner_insert on public.place_offers
  for insert with check (
    exists (
      select 1
        from public.places p
       where p.id = place_offers.place_id
         and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists place_offers_owner_update on public.place_offers;
create policy place_offers_owner_update on public.place_offers
  for update using (
    exists (
      select 1
        from public.places p
       where p.id = place_offers.place_id
         and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists place_offers_owner_delete on public.place_offers;
create policy place_offers_owner_delete on public.place_offers
  for delete using (
    exists (
      select 1
        from public.places p
       where p.id = place_offers.place_id
         and p.owner_user_id = auth.uid()
    )
  );

-- 3. contact_enabled toggle on places
-- ----------------------------------------------------------------------------
alter table public.places
  add column if not exists contact_enabled boolean not null default true;

-- 4. Helpful comments for future maintainers
-- ----------------------------------------------------------------------------
comment on table public.place_offers is
  'Flexible menu / tickets / gallery items surfaced as a horizontal '
  'carousel on /places/[slug]. price_idr is nullable so image-only '
  'gallery items work (temple photos with descriptions but no price).';

comment on column public.places.contact_enabled is
  'When false, the public WhatsApp CTA is hidden on /places/[slug]. '
  '"Get me there" transport CTA stays visible regardless — it routes '
  'to /cari and is independent of the venue having a phone.';
