-- ============================================================================
-- 0073 — Beautician: services_offered catalog
-- ----------------------------------------------------------------------------
-- Adds a text[] column listing which service categories the beautician
-- handles (Make Up, Nails, Hair, Skin, Lashes, Brows, Waxing, Facial,
-- Massage, Henna, Bridal, Spa). Independent of pricing — a beautician
-- may offer Skin without exposing a fixed price for it.
--
-- The public /beautician/[slug] page renders these as light-gray /
-- pink-icon badges under the "Services Provided" header.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists services_offered text[] default '{}';

-- Bound the list at 12 entries (same shape as the gallery cap added in
-- mig 0072) and enforce the catalog allowlist server-side.
alter table public.beautician_providers
  drop constraint if exists beautician_providers_services_offered_check,
  add  constraint beautician_providers_services_offered_check check (
    services_offered is null
    or array_length(services_offered, 1) is null
    or (
      array_length(services_offered, 1) <= 12
      and services_offered <@ array[
        'makeup','nails','hair','skin','lashes','brows',
        'waxing','facial','massage','henna','bridal','spa'
      ]::text[]
    )
  );

-- Backfill: any beautician with a price set on makeup/nail/hair already
-- implicitly offers that service — seed services_offered so the new badges
-- show up on day one without each provider having to re-edit.
update public.beautician_providers
   set services_offered = array_remove(array[
     case when coalesce(price_makeup_idr, 0) > 0 then 'makeup' end,
     case when coalesce(price_nail_idr,   0) > 0 then 'nails'  end,
     case when coalesce(price_hair_idr,   0) > 0 then 'hair'   end
   ], null)
 where coalesce(array_length(services_offered, 1), 0) = 0
   and (price_makeup_idr > 0 or price_nail_idr > 0 or price_hair_idr > 0);
