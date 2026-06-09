-- ============================================================================
-- 0230 — Free-tier theme picker + free_profiles table
-- ----------------------------------------------------------------------------
-- Free tier is now expressed as 15 distinct one-page link-in-bio templates.
-- The 23 vertical-specific templates stay paywalled behind Pro. To support
-- this:
--   1. user_accounts.free_theme_id  — the currently-selected Free template.
--   2. public.free_profiles         — the editable Free profile row (one
--      per Free user). Holds display name, bio, links, socials, brand
--      colour, avatar placement, etc. All content is the strict Free set:
--      profile photo, display name, bio, WA CTA, links, socials. NO
--      portfolio / services / before-after / QRIS / reviews (those live
--      on the per-vertical Pro tables).
--
-- RLS: owner can select/update their row, anyone can read for the public
-- /u/<slug> page.
-- ============================================================================

alter table public.user_accounts
  add column if not exists free_theme_id text default 'minimalist-mono';

create table if not exists public.free_profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  slug             text unique not null,
  display_name     text not null,
  bio              text,
  profile_image_url   text,
  cover_image_url     text,
  page_background_image_url text,
  brand_color      text default '#FACC15',
  button_text_color text default '#0A0A0A',
  whatsapp_e164    text,
  avatar_placement text default 'center'  check (avatar_placement in ('center','top-left','bottom-left')),
  show_url_under_avatar boolean default false,
  free_theme_id    text default 'minimalist-mono',
  links            jsonb default '[]'::jsonb,    -- [{title, url}]
  socials          jsonb default '{}'::jsonb,    -- {instagram, tiktok, facebook, youtube, x, email}
  visitor_count    integer default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_free_profiles_user_id on public.free_profiles(user_id);

alter table public.free_profiles enable row level security;

drop policy if exists "fp_owner_select" on public.free_profiles;
create policy "fp_owner_select"
  on public.free_profiles for select
  to authenticated using (user_id = auth.uid());

drop policy if exists "fp_owner_update" on public.free_profiles;
create policy "fp_owner_update"
  on public.free_profiles for update
  to authenticated using (user_id = auth.uid());

drop policy if exists "fp_owner_insert" on public.free_profiles;
create policy "fp_owner_insert"
  on public.free_profiles for insert
  to authenticated with check (user_id = auth.uid());

drop policy if exists "fp_public_select" on public.free_profiles;
create policy "fp_public_select"
  on public.free_profiles for select
  to anon, authenticated using (true);
