-- ============================================================================
-- 0103 — Places: free_delivery toggle
-- ----------------------------------------------------------------------------
-- Venues can opt to offer free delivery (their own staff or arrangement).
-- When true, the customer cart hides the "estimate from a bike rider near
-- you" row and shows a "Free delivery by venue" pill instead. Default
-- false — most venues don't deliver and customers see the bike estimate.
--
-- The cart never books or processes delivery either way. This is a label
-- toggle only — IndoCity stays a software directory.
-- ============================================================================

alter table public.places
  add column if not exists free_delivery boolean not null default false;

comment on column public.places.free_delivery is
  'Owner-controlled label. When true, the cart sheet on /places/[slug] '
  'shows "Free delivery by venue" instead of the bike-rider estimate '
  'row. IndoCity does not arrange or book delivery either way — this is '
  'a display flag only.';
