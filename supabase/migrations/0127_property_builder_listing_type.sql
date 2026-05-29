-- ============================================================================
-- 0127 — Add 'new_construction' (Property Builder) to listing_type + columns
-- ----------------------------------------------------------------------------
-- Founder direction (2026-05-29): explore page exposes ONE Property button
-- whose browse view shows three filter chips — Sales / Rental / Builder —
-- but each gets its own dashboard. Builder = pre-launch / under-construction
-- developer listing. This widens the listing_type CHECK and adds the
-- developer-specific pricing/timeline columns the agent's earlier brainstorm
-- pass surfaced.
-- ============================================================================

alter table public.property_listings
  drop constraint if exists property_listings_listing_type_check;

alter table public.property_listings
  add  constraint property_listings_listing_type_check
  check (listing_type in ('for_sale','for_rent','new_construction'));

alter table public.property_listings
  add column if not exists starting_price_idr bigint,
  add column if not exists completion_date    date,
  add column if not exists units_total        smallint,
  add column if not exists units_available    smallint,
  add column if not exists developer_name     text,
  add column if not exists nup_idr            bigint;          -- Nomor Urut Pemesanan (booking fee)

-- Re-state the pricing-by-type rule including new_construction.
alter table public.property_listings
  drop constraint if exists pl_pricing_matches_listing_type;

alter table public.property_listings
  add  constraint pl_pricing_matches_listing_type
  check (
    (listing_type = 'for_sale'
       and (price_idr is not null or price_on_request = true))
    or
    (listing_type = 'for_rent'
       and (daily_rent_idr is not null
         or weekly_rent_idr is not null
         or monthly_rent_idr is not null))
    or
    (listing_type = 'new_construction'
       and (starting_price_idr is not null or price_on_request = true))
  );
