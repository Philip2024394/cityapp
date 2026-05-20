-- ============================================================================
-- 0022_indonesia_admin_hierarchy.sql
-- ----------------------------------------------------------------------------
-- Full Indonesia administrative hierarchy — 4 levels, BPS-derived data:
--
--   provinces   →  38 rows (Provinsi)
--   regencies   → 514 rows (Kabupaten + Kota)
--   districts   → 7,277 rows (Kecamatan)
--   villages    → 83,344 rows (Desa + Kelurahan)
--
-- Data source: emsifa/api-wilayah-indonesia (MIT, sourced from BPS).
-- See scripts/seed-indonesia-admin.mjs for the loader.
--
-- Why centroid points (not polygons): polygon boundaries are ~100-500MB and
-- require PostGIS. Centroids are ~10MB and give us nearest-point lookup,
-- which is sufficient for "what district is this driver in?" with 99%+
-- accuracy for normal driver positions. If we ever need true boundary
-- containment, add PostGIS in a follow-up migration.
--
-- Why all 4 levels: the user explicitly asked for complete coverage so
-- every driver, no matter where in Indonesia, can be assigned to a
-- specific village/district/regency/province. This also unlocks village-
-- level marketing, regency-level filters, and province-level analytics.
-- ============================================================================

-- ─── provinces (Provinsi) ─────────────────────────────────────────────
create table if not exists public.provinces (
  id             text primary key,             -- BPS 2-digit code (e.g. '34' for DI Yogyakarta)
  name           text not null,                -- 'DI YOGYAKARTA'
  centroid_lat   double precision,
  centroid_lng   double precision,
  created_at     timestamptz not null default now()
);

create index if not exists provinces_name_idx on public.provinces (lower(name));

-- ─── regencies (Kabupaten / Kota) ─────────────────────────────────────
create table if not exists public.regencies (
  id             text primary key,             -- BPS 4-digit code (e.g. '3471' for Kota Yogyakarta)
  province_id    text not null references public.provinces(id) on delete cascade,
  name           text not null,                -- 'KOTA YOGYAKARTA' or 'KABUPATEN SLEMAN'
  type           text not null check (type in ('kabupaten','kota')),
  centroid_lat   double precision,
  centroid_lng   double precision,
  created_at     timestamptz not null default now()
);

create index if not exists regencies_province_idx on public.regencies (province_id);
create index if not exists regencies_name_idx     on public.regencies (lower(name));
create index if not exists regencies_centroid_idx on public.regencies (centroid_lat, centroid_lng)
  where centroid_lat is not null;

-- ─── districts (Kecamatan) ────────────────────────────────────────────
create table if not exists public.districts (
  id             text primary key,             -- BPS 7-digit code
  regency_id     text not null references public.regencies(id) on delete cascade,
  name           text not null,
  centroid_lat   double precision,
  centroid_lng   double precision,
  created_at     timestamptz not null default now()
);

create index if not exists districts_regency_idx  on public.districts (regency_id);
create index if not exists districts_name_idx     on public.districts (lower(name));
create index if not exists districts_centroid_idx on public.districts (centroid_lat, centroid_lng)
  where centroid_lat is not null;

-- ─── villages (Desa / Kelurahan) ──────────────────────────────────────
create table if not exists public.villages (
  id             text primary key,             -- BPS 10-digit code
  district_id    text not null references public.districts(id) on delete cascade,
  name           text not null,
  centroid_lat   double precision,
  centroid_lng   double precision,
  created_at     timestamptz not null default now()
);

create index if not exists villages_district_idx  on public.villages (district_id);
create index if not exists villages_name_idx      on public.villages (lower(name));
create index if not exists villages_centroid_idx  on public.villages (centroid_lat, centroid_lng)
  where centroid_lat is not null;

-- ─── RLS — public read access (the dataset is public BPS data) ────────
alter table public.provinces enable row level security;
alter table public.regencies enable row level security;
alter table public.districts enable row level security;
alter table public.villages  enable row level security;

create policy "Public read provinces" on public.provinces for select using (true);
create policy "Public read regencies" on public.regencies for select using (true);
create policy "Public read districts" on public.districts for select using (true);
create policy "Public read villages"  on public.villages  for select using (true);

-- Writes go through service-role only (the seed script). No app-side
-- policy is created because no app path should ever insert/update admin
-- rows at runtime.

-- ─── drivers — add admin-hierarchy FK columns ─────────────────────────
-- These are populated automatically by /api/geo/admin-lookup when the
-- driver picks their location. Keeping the existing free-text `city` +
-- `area` columns for backwards compatibility — they shadow the new FKs
-- during the migration window and can be dropped in a later migration
-- once all driver rows have admin_* values.
alter table public.drivers
  add column if not exists province_id text references public.provinces(id) on delete set null,
  add column if not exists regency_id  text references public.regencies(id) on delete set null,
  add column if not exists district_id text references public.districts(id) on delete set null,
  add column if not exists village_id  text references public.villages(id)  on delete set null;

create index if not exists drivers_province_idx on public.drivers (province_id) where province_id is not null;
create index if not exists drivers_regency_idx  on public.drivers (regency_id)  where regency_id is not null;
create index if not exists drivers_district_idx on public.drivers (district_id) where district_id is not null;
create index if not exists drivers_village_idx  on public.drivers (village_id)  where village_id is not null;
