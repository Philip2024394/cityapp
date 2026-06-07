-- ============================================================================
-- 0193 — provider_addons + provider_qa: the add-on store backbone
-- ----------------------------------------------------------------------------
-- v1 of the add-on architecture (founder direction 2026-06-07).
--
-- Pattern: public storefront at /add-ons drives the "browse + activate"
-- experience; the provider's dashboard stays minimal (only profile data
-- entry). Add-on settings get their own per-add-on sub-route in the
-- dashboard, but the activation, pricing, and discovery happen on the
-- public site so the storefront also acts as a provider-acquisition
-- surface (non-providers can browse what's available before signing up).
--
-- Identity model: keyed by auth.users.id (owner_user_id). One human ⇒ one
-- set of enabled add-ons, regardless of how many verticals they list in.
-- A user who runs a beautician profile AND a food place gets the same
-- enabled add-ons applied to both — pay once, enable everywhere they own.
-- ============================================================================

create table if not exists public.provider_addons (
  owner_user_id  uuid           not null references auth.users (id) on delete cascade,
  addon_id       text           not null,
  enabled_at     timestamptz    not null default now(),
  trial_until    timestamptz,   -- null = no trial, trial ended, or never had one
  paid_until     timestamptz,   -- null = not paying; check status to know why
  status         text           not null default 'free'
                                 check (status in ('free','trial','paid','cancelled')),
  config         jsonb          not null default '{}'::jsonb,
  created_at     timestamptz    not null default now(),
  updated_at     timestamptz    not null default now(),
  primary key (owner_user_id, addon_id)
);

create index if not exists provider_addons_user_idx   on public.provider_addons (owner_user_id);
create index if not exists provider_addons_addon_idx  on public.provider_addons (addon_id);
create index if not exists provider_addons_status_idx on public.provider_addons (status);

comment on table  public.provider_addons is
  'Per-user add-on activations. Catalog of available add-ons lives in code (src/lib/addons/catalog.ts) — this table only records which are turned on for whom.';
comment on column public.provider_addons.addon_id is
  'Stable string id matching ADDONS[i].id in src/lib/addons/catalog.ts (e.g. ''qa'', ''payments'', ''social-auto'').';
comment on column public.provider_addons.config is
  'Per-addon settings. Schema is enforced in code, not in SQL, so adding a new addon never needs a migration.';

-- RLS — owner reads/writes their own row, public can read existence-only
-- (so the public profile page can answer "is QA enabled for this provider").
alter table public.provider_addons enable row level security;

drop policy if exists provider_addons_self_select on public.provider_addons;
create policy provider_addons_self_select on public.provider_addons
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists provider_addons_self_insert on public.provider_addons;
create policy provider_addons_self_insert on public.provider_addons
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

drop policy if exists provider_addons_self_update on public.provider_addons;
create policy provider_addons_self_update on public.provider_addons
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists provider_addons_self_delete on public.provider_addons;
create policy provider_addons_self_delete on public.provider_addons
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

-- updated_at autotouch — same pattern as other tables in this project.
drop trigger if exists provider_addons_updated_at on public.provider_addons;
create or replace function public.provider_addons_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger provider_addons_updated_at
  before update on public.provider_addons
  for each row execute function public.provider_addons_touch_updated_at();


-- ============================================================================
-- provider_qa — Q&A items for the Q&A add-on
-- ----------------------------------------------------------------------------
-- One row per Q&A pair. Rendered on the provider's public profile page when
-- the 'qa' add-on is enabled in provider_addons. Items belong to the user
-- (owner_user_id) — the same set displays across every profile that user
-- owns, regardless of vertical.
-- ============================================================================

create table if not exists public.provider_qa (
  id             uuid          primary key default gen_random_uuid(),
  owner_user_id  uuid          not null references auth.users (id) on delete cascade,
  question       text          not null check (char_length(question) between 3 and 200),
  answer         text          not null check (char_length(answer)   between 3 and 1200),
  sort_order     int           not null default 0,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

create index if not exists provider_qa_user_idx     on public.provider_qa (owner_user_id);
create index if not exists provider_qa_sort_idx     on public.provider_qa (owner_user_id, sort_order);

comment on table public.provider_qa is
  'Q&A pairs displayed on a provider''s public profile when the qa addon is enabled. Owned by the user, shared across all of that user''s profiles.';

alter table public.provider_qa enable row level security;

-- Public read — anyone can fetch (the public profile renders these). Auth
-- check happens at the addon-enabled level; if the addon isn''t enabled,
-- the page won''t query this table at all.
drop policy if exists provider_qa_public_read on public.provider_qa;
create policy provider_qa_public_read on public.provider_qa
  for select to anon, authenticated
  using (true);

-- Owner-only write
drop policy if exists provider_qa_self_write on public.provider_qa;
create policy provider_qa_self_write on public.provider_qa
  for all to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop trigger if exists provider_qa_updated_at on public.provider_qa;
create or replace function public.provider_qa_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger provider_qa_updated_at
  before update on public.provider_qa
  for each row execute function public.provider_qa_touch_updated_at();
