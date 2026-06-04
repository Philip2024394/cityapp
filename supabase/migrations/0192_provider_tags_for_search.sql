-- ============================================================================
-- 0192 — tags column on every provider table for cross-vertical search
-- ----------------------------------------------------------------------------
-- Phase 2 of the /explore search rollout. The visitor types something
-- like "computer service" or "pet supply" → /api/search runs an ILIKE on
-- name + description AND an overlap on `tags` across all provider tables
-- in parallel. Returns mixed results so a search for "potong rambut"
-- can surface a beautician AND a salon-tagged place.
--
-- `places` already had a tags column from an earlier migration; we only
-- backfill the 7 provider tables here.
--
-- Why text[] over a join table:
-- - Cheap to read on every search request (no join cost).
-- - Owners write tags from a small UI; cardinality is low (≤ 10/profile).
-- - We index with GIN so `tags && ARRAY['x','y']` overlap queries scale.
-- ============================================================================

alter table public.beautician_providers add column if not exists tags text[] not null default '{}';
alter table public.facial_providers     add column if not exists tags text[] not null default '{}';
alter table public.handyman_providers   add column if not exists tags text[] not null default '{}';
alter table public.home_clean_providers add column if not exists tags text[] not null default '{}';
alter table public.laundry_providers    add column if not exists tags text[] not null default '{}';
alter table public.massage_providers    add column if not exists tags text[] not null default '{}';
alter table public.skincare_providers   add column if not exists tags text[] not null default '{}';

-- GIN indexes for fast array-overlap lookups. `array_ops` is the correct
-- opclass for `&&` (overlap) and `@>` (contains) operators on text[].
create index if not exists beautician_providers_tags_idx on public.beautician_providers using gin (tags array_ops);
create index if not exists facial_providers_tags_idx     on public.facial_providers     using gin (tags array_ops);
create index if not exists handyman_providers_tags_idx   on public.handyman_providers   using gin (tags array_ops);
create index if not exists home_clean_providers_tags_idx on public.home_clean_providers using gin (tags array_ops);
create index if not exists laundry_providers_tags_idx    on public.laundry_providers    using gin (tags array_ops);
create index if not exists massage_providers_tags_idx    on public.massage_providers    using gin (tags array_ops);
create index if not exists skincare_providers_tags_idx   on public.skincare_providers   using gin (tags array_ops);

-- places already has both the column and a GIN index — left alone.

comment on column public.beautician_providers.tags is 'Self-published free-text tags (services, brands, neighbourhood). Used by /api/search cross-vertical lookup.';
comment on column public.handyman_providers.tags   is 'Self-published free-text tags (specialty, neighbourhood). Used by /api/search.';
