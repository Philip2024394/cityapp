-- ============================================================================
-- 0138 — AI-generated promo pages + monthly usage tracking
-- ----------------------------------------------------------------------------
-- Two new tables:
--
--   promo_pages          — one shareable landing page per AI-written promo.
--                          The provider picks a photo, AI writes a short
--                          pitch, the app mints a slug at /p/{slug}. The
--                          provider shares that link on Instagram /
--                          WhatsApp / Facebook; visitors land on a tiny
--                          page with photo + caption + Book Now button.
--
--   ai_usage_monthly     — per-provider per-month counter. Enforces tier
--                          caps (Free 0 / Pro 20 / Pro+ 100). Reset
--                          implicitly by being keyed on year_month.
--
-- Both tables are polymorphic via provider_type + provider_id so the
-- same surface works for handyman / massage / etc. later — only
-- beautician is wired in the dashboard for v1.
-- ============================================================================

create table if not exists public.promo_pages (
  id              uuid primary key default gen_random_uuid(),
  provider_type   text not null check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property'
  )),
  provider_id     uuid not null,
  -- URL-safe slug, generated server-side. unique across the whole table
  -- so /p/{slug} is unambiguous regardless of vertical.
  slug            text not null unique,
  -- The photo the promo wraps around. Must point at a Supabase /
  -- ImageKit URL the validator will accept.
  photo_url       text not null,
  -- Short headline + AI-written body. headline derived from service
  -- name + badge; body is the Claude output (max ~500 chars).
  headline        text not null check (char_length(headline) between 1 and 120),
  ai_caption      text not null check (char_length(ai_caption) between 1 and 1200),
  -- Optional badge carryover from the service photo (mig 0133).
  badge_type      text,
  badge_value     int,
  badge_color     text check (badge_color in ('red','yellow','black') or badge_color is null),
  -- Optional price displayed on the page (IDR, full integer).
  price_idr       int,
  -- Engagement counters — incremented atomically by the public page
  -- (view) + Book Now button (click).
  view_count      int not null default 0,
  click_count     int not null default 0,
  -- Lifecycle. expires_at is nullable; when set, the public page
  -- returns 410 Gone after that time.
  created_at      timestamptz not null default now(),
  expires_at      timestamptz,
  archived_at     timestamptz
);

create index if not exists promo_pages_provider_idx
  on public.promo_pages (provider_type, provider_id, created_at desc);

create index if not exists promo_pages_slug_idx
  on public.promo_pages (slug)
  where archived_at is null;

-- RLS — providers can SELECT / UPDATE / DELETE their own pages. Public
-- reads go through /p/{slug} which uses the service-role client.
alter table public.promo_pages enable row level security;

drop policy if exists promo_pages_own on public.promo_pages;
create policy promo_pages_own on public.promo_pages
  for all to authenticated
  using (
    case provider_type
      when 'beautician'  then exists (select 1 from public.beautician_providers   p where p.id = provider_id and p.user_id = auth.uid())
      when 'handyman'    then exists (select 1 from public.handyman_providers     p where p.id = provider_id and p.user_id = auth.uid())
      when 'laundry'     then exists (select 1 from public.laundry_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'massage'     then exists (select 1 from public.massage_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'home_clean'  then exists (select 1 from public.home_clean_providers   p where p.id = provider_id and p.user_id = auth.uid())
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

comment on table public.promo_pages is
  'AI-generated promo landing pages. Each row mints a unique /p/{slug} URL '
  'the provider shares on social. view_count + click_count drive the '
  'analytics card on /dashboard/<vertical>/promos.';

-- ─────────────────────────────────────────────────────────────────────────
-- ai_usage_monthly — caps + analytics
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.ai_usage_monthly (
  provider_type   text not null check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property'
  )),
  provider_id     uuid not null,
  -- 'YYYY-MM' in the provider's tz (Asia/Jakarta default). Computed
  -- server-side on insert; reset is implicit (next month = new row).
  year_month      text not null check (year_month ~ '^\d{4}-\d{2}$'),
  -- Counter — incremented by the /api/<v>/promo-pages POST handler
  -- BEFORE calling Claude. If Claude fails, the handler decrements.
  ai_promo_count  int not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (provider_type, provider_id, year_month)
);

create index if not exists ai_usage_monthly_updated_idx
  on public.ai_usage_monthly (updated_at desc);

alter table public.ai_usage_monthly enable row level security;

drop policy if exists ai_usage_own on public.ai_usage_monthly;
create policy ai_usage_own on public.ai_usage_monthly
  for select to authenticated
  using (
    case provider_type
      when 'beautician'  then exists (select 1 from public.beautician_providers   p where p.id = provider_id and p.user_id = auth.uid())
      when 'handyman'    then exists (select 1 from public.handyman_providers     p where p.id = provider_id and p.user_id = auth.uid())
      when 'laundry'     then exists (select 1 from public.laundry_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'massage'     then exists (select 1 from public.massage_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'home_clean'  then exists (select 1 from public.home_clean_providers   p where p.id = provider_id and p.user_id = auth.uid())
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

comment on table public.ai_usage_monthly is
  'Per-provider per-month counters for AI feature usage. Drives the tier '
  'cap on /dashboard/<vertical>/promos. Tier limits live in code: '
  'Free 0 / Pro 20 / Pro+ 100 (see ai-promo limits constant).';

-- ============================================================================
-- POST-CONDITIONS
--   • Providers can mint /p/{slug} promo pages tracked end-to-end.
--   • Tier caps enforced by the API; ai_usage_monthly is the single
--     source of truth for the dashboard cap chip.
--   • Public reads on /p/{slug} bypass RLS via service role; counter
--     increments are atomic via update + returning.
-- ============================================================================
