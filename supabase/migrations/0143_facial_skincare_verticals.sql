-- ============================================================================
-- 0143 — Facial + Skincare verticals
-- ----------------------------------------------------------------------------
-- Two new provider verticals. Each is structurally a clone of
-- beautician_providers (same columns including the mig 0142 payment +
-- legal + FAQ surface) so the dashboard / public-profile clone work can
-- reuse the same component shapes.
--
-- vendor_orders.vendor_type CHECK is widened to include 'facial' and
-- 'skincare' so the polymorphic orders table can hold their carts too.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────
-- facial_providers
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.facial_providers (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users(id) on delete set null,
  slug                     text not null unique,
  display_name             text not null,

  gender                   text not null default 'woman' check (gender in ('woman','man')),
  years_experience         integer not null default 0 check (years_experience >= 0),
  bio                      text not null default '',

  -- Service categories the facialist offers (taxonomy lives in
  -- src/lib/facial/types.ts; no CHECK so additions don't need a
  -- migration). Filter chips on the public profile read this array.
  services_offered         text[] not null default '{}',
  marketplace_categories   text[] not null default '{}',
  custom_services_offered  text[] not null default '{}',
  service_photos           jsonb not null default '{}'::jsonb,

  -- Money — facialists tend to offer 60/90/120 min sessions, mirroring
  -- the massage model rather than the beautician 3-pack pricing.
  price_60min_idr          integer,
  price_90min_idr          integer,
  price_120min_idr         integer,

  city                     text,
  service_area_notes       text,
  service_locations        text[],

  whatsapp_e164            text not null,
  country_code             text,

  -- Socials + chat
  instagram_url            text,
  tiktok_url               text,
  facebook_url             text,
  x_url                    text,
  snapchat_url             text,
  website_url              text,
  telegram_handle          text,
  wechat_id                text,
  line_id                  text,
  kakaotalk_id             text,

  profile_image_url        text,
  cover_image_url          text,
  gallery_image_urls       text[],

  -- Hero / promo / branding
  theme_color              text,
  hero_text                jsonb,
  promo_text               text,
  cta_button_effect        text default 'none' check (cta_button_effect in ('none','pulse','glow','shake')),
  avatar_frame_style       text default 'none' check (avatar_frame_style in ('none','gradient','pulse','rainbow')),

  -- Visit Us
  has_physical_location    boolean not null default false,
  latitude                 double precision,
  longitude                double precision,
  operating_hours          jsonb,
  busy_dates               text[],

  -- Contact form opt-in
  contact_form_enabled     boolean not null default false,
  contact_email            text,

  -- Languages / certifications
  languages                text[],
  certifications           text[],

  -- Lifecycle
  availability             text not null default 'online' check (availability in ('online','busy','offline')),
  status                   text not null default 'active' check (status in ('pending','active','suspended','removed')),
  is_mock                  boolean not null default false,
  mock_hidden_at           timestamptz,
  last_active_at           timestamptz,

  -- Subscription
  subscription_status      text not null default 'trial' check (subscription_status in ('trial','active','expired','cancelled')),
  trial_ends_at            timestamptz not null default (now() + interval '30 days'),
  paid_until               timestamptz,

  -- mig 0142 — payment configuration
  payment_provider         text not null default 'none' check (payment_provider in ('none','stripe','midtrans')),
  stripe_secret_key_enc    text,
  stripe_publishable_key   text,
  midtrans_server_key_enc  text,
  midtrans_client_key      text,
  midtrans_is_production   boolean not null default false,

  -- mig 0142 — legal + FAQ
  legal_terms              text,
  legal_privacy            text,
  faq_items                jsonb not null default '[]'::jsonb,
  faq_enabled              boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists facial_providers_user_idx on public.facial_providers(user_id);
create index if not exists facial_providers_status_idx on public.facial_providers(status);

alter table public.facial_providers enable row level security;

drop policy if exists facial_providers_public_read on public.facial_providers;
create policy facial_providers_public_read on public.facial_providers
  for select to public using (true);

drop policy if exists facial_providers_owner_write on public.facial_providers;
create policy facial_providers_owner_write on public.facial_providers
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- skincare_providers — identical shape to facial_providers
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.skincare_providers (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users(id) on delete set null,
  slug                     text not null unique,
  display_name             text not null,

  gender                   text not null default 'woman' check (gender in ('woman','man')),
  years_experience         integer not null default 0 check (years_experience >= 0),
  bio                      text not null default '',

  services_offered         text[] not null default '{}',
  marketplace_categories   text[] not null default '{}',
  custom_services_offered  text[] not null default '{}',
  service_photos           jsonb not null default '{}'::jsonb,

  price_60min_idr          integer,
  price_90min_idr          integer,
  price_120min_idr         integer,

  city                     text,
  service_area_notes       text,
  service_locations        text[],

  whatsapp_e164            text not null,
  country_code             text,

  instagram_url            text,
  tiktok_url               text,
  facebook_url             text,
  x_url                    text,
  snapchat_url             text,
  website_url              text,
  telegram_handle          text,
  wechat_id                text,
  line_id                  text,
  kakaotalk_id             text,

  profile_image_url        text,
  cover_image_url          text,
  gallery_image_urls       text[],

  theme_color              text,
  hero_text                jsonb,
  promo_text               text,
  cta_button_effect        text default 'none' check (cta_button_effect in ('none','pulse','glow','shake')),
  avatar_frame_style       text default 'none' check (avatar_frame_style in ('none','gradient','pulse','rainbow')),

  has_physical_location    boolean not null default false,
  latitude                 double precision,
  longitude                double precision,
  operating_hours          jsonb,
  busy_dates               text[],

  contact_form_enabled     boolean not null default false,
  contact_email            text,

  languages                text[],
  certifications           text[],

  availability             text not null default 'online' check (availability in ('online','busy','offline')),
  status                   text not null default 'active' check (status in ('pending','active','suspended','removed')),
  is_mock                  boolean not null default false,
  mock_hidden_at           timestamptz,
  last_active_at           timestamptz,

  subscription_status      text not null default 'trial' check (subscription_status in ('trial','active','expired','cancelled')),
  trial_ends_at            timestamptz not null default (now() + interval '30 days'),
  paid_until               timestamptz,

  payment_provider         text not null default 'none' check (payment_provider in ('none','stripe','midtrans')),
  stripe_secret_key_enc    text,
  stripe_publishable_key   text,
  midtrans_server_key_enc  text,
  midtrans_client_key      text,
  midtrans_is_production   boolean not null default false,

  legal_terms              text,
  legal_privacy            text,
  faq_items                jsonb not null default '[]'::jsonb,
  faq_enabled              boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists skincare_providers_user_idx on public.skincare_providers(user_id);
create index if not exists skincare_providers_status_idx on public.skincare_providers(status);

alter table public.skincare_providers enable row level security;

drop policy if exists skincare_providers_public_read on public.skincare_providers;
create policy skincare_providers_public_read on public.skincare_providers
  for select to public using (true);

drop policy if exists skincare_providers_owner_write on public.skincare_providers;
create policy skincare_providers_owner_write on public.skincare_providers
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- vendor_orders — widen the vendor_type allowlist to include the two
-- new verticals so /api/checkout can write their cart orders.
-- ─────────────────────────────────────────────────────────────────────

alter table public.vendor_orders
  drop constraint if exists vendor_orders_vendor_type_chk;
alter table public.vendor_orders
  add constraint vendor_orders_vendor_type_chk
  check (vendor_type in (
    'beautician','handyman','laundry','massage','home-clean',
    'tour-guide','rentals','place','facial','skincare'
  ));

-- ─────────────────────────────────────────────────────────────────────
-- contact_messages — widen provider_type to include facial + skincare
-- so the public contact form on those verticals can write rows.
-- ─────────────────────────────────────────────────────────────────────

alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;
alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','facial','skincare'
  ));

-- ============================================================================
-- POST-CONDITIONS
--   • facial_providers + skincare_providers exist with the full
--     beautician shape (including mig 0142 payments + legal + FAQ).
--   • vendor_orders accepts vendor_type='facial' or 'skincare'.
--   • contact_messages accepts provider_type='facial' or 'skincare'.
--   • RLS: public can SELECT; only the row owner (user_id = auth.uid())
--     can INSERT/UPDATE/DELETE.
-- ============================================================================
