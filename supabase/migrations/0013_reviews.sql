-- ============================================================================
-- 0013_reviews.sql
-- ----------------------------------------------------------------------------
-- Customer reviews for independent drivers — anonymous, public-page
-- submission. This is feedback aggregation only (like Yelp / Google
-- Reviews), NOT trip-lifecycle tracking. The platform never records
-- that a ride happened; the customer self-reports their experience.
-- This keeps the directory posture under PM 12/2019 intact.
--
-- Design choices:
--   * Anonymous submission — no auth required, just a reviewer_name
--     the customer types. Reduces friction so reviews actually happen.
--   * Spam control via:
--       (a) session_id token in the API route (rate limit per session)
--       (b) IP-based rate limit in the API route
--       (c) `status` column so admin can hide spam after the fact
--       (d) unique partial index prevents duplicate submissions from
--           the same session+driver
--   * Public read of `status='visible'` only — hidden / flagged rows
--     are admin-only.
-- ============================================================================

create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  driver_user_id   uuid not null references public.drivers(user_id) on delete cascade,
  reviewer_name    text not null check (char_length(reviewer_name) between 1 and 60),
  reviewer_country text,                                       -- 'AU', 'ID', 'FR' (optional)
  rating           smallint not null check (rating between 1 and 5),
  comment          text check (char_length(comment) <= 600),
  session_id       text,                                       -- signed session cookie, used for dedup
  ip_hash          text,                                       -- sha256(ip + salt), NOT raw IP — UU PDP compliance
  status           text not null default 'visible'
                   check (status in ('visible','hidden','flagged')),
  source           text not null default 'public'
                   check (source in ('public','imported','admin')),
  created_at       timestamptz not null default now()
);

-- Hot query: render top N reviews on /r/[slug]
create index if not exists reviews_driver_recent_visible_idx
  on public.reviews (driver_user_id, created_at desc)
  where status = 'visible';

-- Spam control: same session can't post more than 1 review per driver
create unique index if not exists reviews_one_per_session_per_driver_idx
  on public.reviews (driver_user_id, session_id)
  where session_id is not null;

-- Admin moderation queue
create index if not exists reviews_status_idx on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

-- ──────────────────────────────────────────────────────────────────────
-- Public read — only visible rows
-- ──────────────────────────────────────────────────────────────────────
drop policy if exists "reviews_public_read_visible" on public.reviews;
create policy "reviews_public_read_visible"
  on public.reviews for select
  using (status = 'visible');

-- ──────────────────────────────────────────────────────────────────────
-- Anonymous insert — anyone can submit a review (rate-limit + dedup in
-- the API route). Status must be 'visible' or 'flagged' on insert.
-- Service role (admin) handles status='hidden'.
-- ──────────────────────────────────────────────────────────────────────
drop policy if exists "reviews_anon_insert" on public.reviews;
create policy "reviews_anon_insert"
  on public.reviews for insert
  to anon, authenticated
  with check (
    status in ('visible','flagged')
    and source = 'public'
    and char_length(reviewer_name) between 1 and 60
    and rating between 1 and 5
  );

-- ──────────────────────────────────────────────────────────────────────
-- Drivers can read all reviews about themselves (including hidden ones)
-- so they can dispute false reviews via admin.
-- ──────────────────────────────────────────────────────────────────────
drop policy if exists "reviews_driver_read_own" on public.reviews;
create policy "reviews_driver_read_own"
  on public.reviews for select
  to authenticated
  using (driver_user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────
-- Drivers can flag reviews about themselves (sets status='flagged' for
-- admin attention). They cannot delete or set 'hidden' directly.
-- ──────────────────────────────────────────────────────────────────────
drop policy if exists "reviews_driver_flag_own" on public.reviews;
create policy "reviews_driver_flag_own"
  on public.reviews for update
  to authenticated
  using       (driver_user_id = auth.uid())
  with check  (driver_user_id = auth.uid() and status in ('visible','flagged'));
