-- ============================================================================
-- 0219 — Tailor / Penjahit / Custom Clothing vertical (Phase 13 of 15
-- new lifestyle categories)
-- ----------------------------------------------------------------------------
-- Mirrors mover_providers byte-for-byte at the column level (0218),
-- with five semantic tweaks for the independent Indonesian tailor /
-- penjahit / custom-clothing studio industry:
--   • specialties vocab = GARMENT TYPE axis the tailor offers
--     (kemeja, jas, kebaya, batik, gaun, seragam, streetwear, vermak,
--     dress, blazer, celana_bahan, muslim_wear, bridal, mixed, other).
--     Indonesian indie penjahit cluster around two axes: GARMENT TYPE
--     (vermak/alteration cheapest → kemeja → celana_bahan → seragam →
--     gaun → jas → kebaya → bridal most expensive) and FABRIC SUPPLY
--     ("bahan dari customer" vs "bahan dari kami" — adding fabric
--     typically doubles the price). Buyers shortlist by garment then
--     sort by per-garment pricing.
--   • theme_color default = '#9333EA' (rich violet) — bridal / couture
--     signage in Indonesia trends violet-purple for luxe + custom-craft
--     (Vera Wang, Jenny Yoo, Indonesian celebrity-bridal couture
--     Instagram palettes). Reads as bespoke / premium / hand-finished
--     vs mover's logistics-teal and pet's playful orange.
--     button_text_color = '#FFFFFF' so the CTA pills read clean
--     white-on-violet, high contrast.
--   • pricing — tailoring is per-garment with fabric-supply option,
--     NOT per-trip or per-hour. Distinct from mover's per-trip because
--     tailor is purely time-and-materials and customer-provides-fabric
--     is a real option. Vermak/alteration is per-job flat fee
--     (Rp 25k pendekan celana). Tailor has TWO axes:
--     1. GARMENT TYPE (vermak cheapest → bridal premium).
--     2. FABRIC SUPPLY ("bahan dari customer" Rp 800k vs "bahan dari
--        kami" Rp 1.5jt-3jt — adding fabric typically doubles).
--     Local rates (Yogya / Bandung / Jakarta indie penjahit, 2026):
--       - Vermak / alteration floor:           Rp 25k    (pendekan celana / resleting)
--       - Kemeja custom tanpa bahan:           Rp 150-250k (lead time 1-2 minggu)
--       - Seragam kantor (kemeja kerah):       Rp 200k/pcs (min 12 pcs)
--       - Gaun pesta tanpa bahan:              Rp 600k-1.2jt
--       - Jas pria 2-piece tanpa bahan:        Rp 800k-1.5jt (2x fitting, lead time 2 minggu)
--       - Kebaya pesta:                        Rp 800k-2jt
--       - Kebaya bridal premium full payet:    Rp 3.5jt-15jt (3x fitting, 4-6 minggu)
--     Hand-finish surcharge: payet hand-made +30-50% baseline.
--     Bahan dari kami add-on: +Rp 200k-1jt depending on fabric tier
--     (poly cotton vs brokat import vs sutra).
--     hourly_rate_idr is reused as the ANCHOR "starting from" price
--     (cheapest line, floor Rp 25k vermak/alteration). day_rate_idr
--     becomes the optional PAKET BRIDAL / PAKET SERAGAM all-in rate
--     (e.g. Rp 3.5jt kebaya bridal include payet + 3 fitting + lead
--     time 4-6 minggu, or Rp 2.4jt paket seragam 12 pcs). Distinct
--     from mover's THREE-axis (vehicle + distance + crew) because
--     tailor has TWO axes (garment + fabric).
--   • has_own_tools boolean repurposed as "Datang ke Rumah" (siap
--     home-visit for measurement + fitting vs studio-visit only).
--     Defaults true since most indie penjahit advertise home-visit
--     measurement as their main differentiator vs walk-in mall tailor
--     chains.
--   • bio mentions spesialisasi (kebaya / jas / kemeja / seragam /
--     vermak), bahan dari customer atau stock, fitting 2-3x, lead time
--     standar 1-2 minggu, datang ke rumah untuk ukur, pengalaman
--     tahun. Tailor credentialing in Indonesia is informal (no mandatory
--     sertifikat penjahit); the bio is the de-facto trust signal.
--     Specialties vocab cap stays at 3 so the profile card stays
--     scannable.
-- ============================================================================

create table if not exists public.tailor_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Specialties — multi-select text[] from the canonical list in
  -- src/lib/tailor/types.ts. CHECK constrains to that vocab.
  specialties text[] not null default '{}'
    check (specialties <@ array[
      'kemeja','jas','kebaya','batik','gaun','seragam','streetwear',
      'vermak','dress','blazer','celana_bahan','muslim_wear','bridal',
      'mixed','other'
    ]::text[]),

  -- Cap at 3 specialties — same UX rule as cake / catering / photo / barber / handyman / tattoo / video / florist / fitness / yoga / tutoring / pet / mover.
  constraint tailor_providers_specialties_max3
    check (coalesce(array_length(specialties, 1), 0) between 1 and 3),

  -- Pricing — anchor "starting from" price (hourly_rate_idr column
  -- kept for renderer parity; surfaces as "Mulai dari" on dashboard).
  -- Optional paket bridal / paket seragam all-in (day_rate_idr column).
  -- CHECK enforces at least one is set so every public card shows a
  -- starting-from number.
  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),
  constraint tailor_providers_at_least_one_price
    check (
      hourly_rate_idr is not null
      or day_rate_idr is not null
    ),

  -- "Own tools" stays as a generic boolean — for tailor it means
  -- "Datang ke Rumah" (siap home-visit for measurement + fitting vs
  -- studio-visit only). Defaults true since most indie penjahit
  -- advertise home-visit measurement as their main differentiator vs
  -- walk-in mall tailor chains.
  has_own_tools    boolean not null default true,

  -- Location
  city               text,
  service_area_notes text,

  -- Contact
  whatsapp_e164    text not null,

  -- Media
  profile_image_url text,
  cover_image_url   text,
  ktp_image_url     text,
  gallery_image_urls text[] default '{}',

  -- Availability + verification + subscription
  availability     text not null default 'offline'
                   check (availability in ('online','busy','offline')),
  status           text not null default 'pending'
                   check (status in ('pending','active','suspended','removed')),
  verified_at      timestamptz,
  verified_by      uuid references auth.users(id),
  rejected_reason  text,

  subscription_status text not null default 'trial'
                   check (subscription_status in ('trial','active','expired','cancelled')),
  trial_ends_at    timestamptz not null default (now() + interval '7 days'),
  paid_until       timestamptz,

  -- Mock pool flags
  is_mock          boolean not null default false,
  mock_hidden_at   timestamptz,

  -- Universal profile fields (mig 0072 equiv)
  languages        text[] default '{id}',
  instagram_url    text,
  tiktok_url       text,
  facebook_url     text,
  operating_hours  jsonb,
  certifications   text[] default '{}',
  last_active_at   timestamptz,
  inquiry_count    int not null default 0,
  visitor_count    int not null default 0,

  -- Reviews (mig 0076 equiv)
  rating           numeric(3,2),
  rating_count     int not null default 0,

  -- Per-provider theme accent (mig 0087 equiv). Default rich violet
  -- so bridal / couture / luxe-craft energy reads — distinct from
  -- mover's logistics-teal and pet's playful orange.
  theme_color      text default '#9333EA'
                   check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$'),
  -- Tailor-specific: CTA label colour. Defaults to white so on the
  -- default rich-violet brand the contrast is white-on-violet, high
  -- contrast for the CTA pills. mig 0202 mirror for tailor.
  button_text_color text default '#FFFFFF'
                   check (button_text_color is null or button_text_color ~* '^#[0-9A-F]{6}$'),

  -- Profile-parity fields (mig 0089 equiv).
  promo_text             text check (promo_text is null or char_length(promo_text) <= 280),
  service_photos         jsonb        not null default '[]'::jsonb
                          check (jsonb_typeof(service_photos) = 'array'),
  busy_dates             date[]       not null default '{}'::date[],
  busy_time_slots        jsonb        not null default '{}'::jsonb,
  has_physical_location  boolean      not null default false,
  latitude               double precision
                          check (latitude is null or (latitude between -90 and 90)),
  longitude              double precision
                          check (longitude is null or (longitude between -180 and 180)),

  -- Hero overlay text (mig 0091 equiv).
  hero_text              jsonb,

  -- Extra socials (mig 0130 equiv)
  x_url           text,
  snapchat_url    text,
  website_url     text,

  -- Chat handles (mig 0132 equiv)
  telegram_handle text,
  wechat_id       text,
  line_id         text,
  kakaotalk_id    text,

  -- Contact form opt-in (mig 0137 equiv)
  contact_form_enabled boolean not null default false,
  contact_email        text,

  -- Country + custom services escape valve (mig 0131 equiv)
  country_code             text not null default 'ID',
  custom_services_offered  text[],

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Use tailorp_ prefix to avoid colliding with mover's moverp_*
  -- policy/constraint namespace (and the rest).
  constraint tailorp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  ),
  constraint tailor_providers_gallery_max check (
    gallery_image_urls is null
    or array_length(gallery_image_urls, 1) is null
    or array_length(gallery_image_urls, 1) <= 12
  )
);

create index if not exists idx_tailorp_listing
  on public.tailor_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_tailorp_owner
  on public.tailor_providers (user_id);
create index if not exists idx_tailorp_specialties
  on public.tailor_providers using gin (specialties)
  where status = 'active';

-- updated_at touch trigger (mirrors mover / pet / tutoring / yoga / etc).
create or replace function public.touch_tailor_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_tailor_providers on public.tailor_providers;
create trigger trg_touch_tailor_providers
  before update on public.tailor_providers
  for each row execute function public.touch_tailor_providers();

-- Hide-mock-on-real-signup trigger (mirrors mover 0218 / pet 0217).
create or replace function public.hide_one_mock_tailor_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.tailor_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.tailor_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_tailor_signup on public.tailor_providers;
create trigger trg_hide_mock_on_real_tailor_signup
  after insert on public.tailor_providers
  for each row execute function public.hide_one_mock_tailor_provider();

-- RLS — mirrors mover policies, renamed tailorp_*.
alter table public.tailor_providers enable row level security;
drop policy if exists tailorp_public_select on public.tailor_providers;
create policy tailorp_public_select on public.tailor_providers
  for select to anon, authenticated using (status = 'active');
drop policy if exists tailorp_owner_select on public.tailor_providers;
create policy tailorp_owner_select on public.tailor_providers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists tailorp_owner_update on public.tailor_providers;
create policy tailorp_owner_update on public.tailor_providers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bookings table (mig 0090 equiv).
create table if not exists public.tailor_bookings (
  id                 uuid primary key default gen_random_uuid(),
  tailor_id          uuid not null references public.tailor_providers(id) on delete cascade,
  customer_name      text not null,
  customer_whatsapp  text not null,
  service_name       text,
  requested_date     date not null,
  requested_time     text not null,
  status             text not null default 'pending'
                       check (status in ('pending','confirmed','declined','completed','cancelled')),
  notes              text,
  submitter_ip_hash  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists tailor_bookings_by_provider_date
  on public.tailor_bookings (tailor_id, requested_date desc);
create index if not exists tailor_bookings_pending
  on public.tailor_bookings (tailor_id, status)
  where status = 'pending';

create or replace function public.touch_tailor_bookings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_tailor_bookings_touch on public.tailor_bookings;
create trigger trg_tailor_bookings_touch
  before update on public.tailor_bookings
  for each row execute function public.touch_tailor_bookings_updated_at();

alter table public.tailor_bookings enable row level security;
drop policy if exists tailor_bookings_owner_read on public.tailor_bookings;
create policy tailor_bookings_owner_read on public.tailor_bookings
  for select using (
    exists (
      select 1 from public.tailor_providers vp
      where vp.id = tailor_bookings.tailor_id
        and vp.user_id = auth.uid()
    )
  );
drop policy if exists tailor_bookings_owner_update on public.tailor_bookings;
create policy tailor_bookings_owner_update on public.tailor_bookings
  for update using (
    exists (
      select 1 from public.tailor_providers vp
      where vp.id = tailor_bookings.tailor_id
        and vp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Wire 'tailor' into the polymorphic constraints / triggers that the rest
-- of the platform relies on. Without these the profile-view tracker,
-- rating recomputer, and contact form would 500 on tailor rows.
-- ============================================================================

-- reviews_provider_type_check (mig 0072 ... 0218) — allow 'tailor'
alter table public.reviews
  drop constraint if exists reviews_provider_type_check;
alter table public.reviews
  add constraint reviews_provider_type_check
  check (provider_type is null or provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring', 'pet', 'mover', 'tailor'
  ));

-- provider_profile_views CHECK (mig 0072 ... 0218) — allow 'tailor'
alter table public.provider_profile_views
  drop constraint if exists provider_profile_views_provider_type_check;
alter table public.provider_profile_views
  add constraint provider_profile_views_provider_type_check
  check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring', 'pet', 'mover', 'tailor'
  ));

-- bump_provider_visitor_count (mig 0072 ... 0218) — add 'tailor' case
create or replace function public.bump_provider_visitor_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  case new.provider_type
    when 'bike_rental'  then update public.bike_rentals         set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'tour_guide'   then update public.tour_guide_listings  set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'massage'      then update public.massage_providers    set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'beautician'   then update public.beautician_providers set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'laundry'      then update public.laundry_providers    set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'handyman'     then update public.handyman_providers   set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'home_clean'   then update public.home_clean_providers set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'tattoo'       then update public.tattoo_providers     set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'barber'       then update public.barber_providers     set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'photo'        then update public.photo_providers      set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'video'        then update public.video_providers      set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'catering'     then update public.catering_providers   set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'cake'         then update public.cake_providers       set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'florist'      then update public.florist_providers    set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'fitness'      then update public.fitness_providers    set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'yoga'         then update public.yoga_providers       set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'tutoring'     then update public.tutoring_providers   set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'pet'          then update public.pet_providers        set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'mover'        then update public.mover_providers      set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'tailor'       then update public.tailor_providers     set visitor_count = visitor_count + 1 where id = new.provider_id;
    else
      return new;
  end case;
  return new;
end;
$$;

-- _recompute_provider_rating (mig 0075 ... 0218) — add 'tailor' case
create or replace function public._recompute_provider_rating(
  p_provider_type text,
  p_provider_id   uuid
) returns void
language plpgsql
as $$
declare
  v_avg numeric;
  v_cnt int;
begin
  if p_provider_type is null or p_provider_id is null then return; end if;

  select round(avg(rating)::numeric, 2), count(*)
    into v_avg, v_cnt
  from public.reviews
  where provider_type = p_provider_type
    and provider_id   = p_provider_id
    and status        = 'visible';

  case p_provider_type
    when 'massage'    then update public.massage_providers    set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'beautician' then update public.beautician_providers set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'laundry'    then update public.laundry_providers    set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'handyman'   then update public.handyman_providers   set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'home_clean' then update public.home_clean_providers set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'tattoo'     then update public.tattoo_providers     set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'barber'     then update public.barber_providers     set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'photo'      then update public.photo_providers      set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'video'      then update public.video_providers      set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'catering'   then update public.catering_providers   set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'cake'       then update public.cake_providers       set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'florist'    then update public.florist_providers    set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'fitness'    then update public.fitness_providers    set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'yoga'       then update public.yoga_providers       set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'tutoring'   then update public.tutoring_providers   set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'pet'        then update public.pet_providers        set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'mover'      then update public.mover_providers      set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'tailor'     then update public.tailor_providers     set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'tour_guide' then update public.tour_guide_listings  set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    when 'bike_rental' then update public.bike_rentals        set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    else null;
  end case;
end;
$$;

-- contact_messages provider_type CHECK (mig 0137 ... 0218) — allow 'tailor'
alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;
alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','tattoo','barber','photo','video','catering','cake','florist','fitness','yoga','tutoring','pet','mover','tailor'
  ));

-- contact_messages_own_select RLS — add 'tailor' branch
drop policy if exists contact_messages_own_select on public.contact_messages;
create policy contact_messages_own_select on public.contact_messages
  for select to authenticated
  using (
    case provider_type
      when 'beautician'  then exists (select 1 from public.beautician_providers   p where p.id = provider_id and p.user_id = auth.uid())
      when 'handyman'    then exists (select 1 from public.handyman_providers     p where p.id = provider_id and p.user_id = auth.uid())
      when 'laundry'     then exists (select 1 from public.laundry_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'massage'     then exists (select 1 from public.massage_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'home_clean'  then exists (select 1 from public.home_clean_providers   p where p.id = provider_id and p.user_id = auth.uid())
      when 'tattoo'      then exists (select 1 from public.tattoo_providers       p where p.id = provider_id and p.user_id = auth.uid())
      when 'barber'      then exists (select 1 from public.barber_providers       p where p.id = provider_id and p.user_id = auth.uid())
      when 'photo'       then exists (select 1 from public.photo_providers        p where p.id = provider_id and p.user_id = auth.uid())
      when 'video'       then exists (select 1 from public.video_providers        p where p.id = provider_id and p.user_id = auth.uid())
      when 'catering'    then exists (select 1 from public.catering_providers     p where p.id = provider_id and p.user_id = auth.uid())
      when 'cake'        then exists (select 1 from public.cake_providers         p where p.id = provider_id and p.user_id = auth.uid())
      when 'florist'     then exists (select 1 from public.florist_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'fitness'     then exists (select 1 from public.fitness_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'yoga'        then exists (select 1 from public.yoga_providers         p where p.id = provider_id and p.user_id = auth.uid())
      when 'tutoring'    then exists (select 1 from public.tutoring_providers     p where p.id = provider_id and p.user_id = auth.uid())
      when 'pet'         then exists (select 1 from public.pet_providers          p where p.id = provider_id and p.user_id = auth.uid())
      when 'mover'       then exists (select 1 from public.mover_providers        p where p.id = provider_id and p.user_id = auth.uid())
      when 'tailor'      then exists (select 1 from public.tailor_providers       p where p.id = provider_id and p.user_id = auth.uid())
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

-- payment_intents.product CHECK (mig 0068 ... 0218) — add tailor_monthly + tailor_yearly
alter table public.payment_intents
  drop constraint if exists payment_intents_product_check;
alter table public.payment_intents
  add constraint payment_intents_product_check
  check (product in (
    'subscription', 'subscription_yearly', 'verified',
    'rental_company_monthly', 'rental_company_yearly',
    'tour_guide_monthly',     'tour_guide_yearly',
    'massage_monthly',     'massage_yearly',
    'beautician_monthly',  'beautician_yearly',
    'laundry_monthly',     'laundry_yearly',
    'handyman_monthly',    'handyman_yearly',
    'home_clean_monthly',  'home_clean_yearly',
    'tattoo_monthly',      'tattoo_yearly',
    'barber_monthly',      'barber_yearly',
    'photo_monthly',       'photo_yearly',
    'video_monthly',       'video_yearly',
    'catering_monthly',    'catering_yearly',
    'cake_monthly',        'cake_yearly',
    'florist_monthly',     'florist_yearly',
    'fitness_monthly',     'fitness_yearly',
    'yoga_monthly',        'yoga_yearly',
    'tutoring_monthly',    'tutoring_yearly',
    'pet_monthly',         'pet_yearly',
    'mover_monthly',       'mover_yearly',
    'tailor_monthly',      'tailor_yearly'
  ));

-- extend_tailor_on_payment trigger — mirrors the verticals in mig 0068 ... 0218
create or replace function public.extend_tailor_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $body$
declare
  v_basis timestamptz;
  v_plan  text;
begin
  if new.status <> 'paid' or old.status = 'paid' then
    return new;
  end if;
  if new.product not in ('tailor_monthly','tailor_yearly') then
    return new;
  end if;

  v_plan := case when new.product = 'tailor_yearly' then 'yearly' else 'monthly' end;

  select coalesce(paid_until, now())
    into v_basis
    from public.tailor_providers
    where user_id = new.driver_user_id
    for update;

  if v_basis is null then return new; end if;
  if v_basis < now() then v_basis := now(); end if;

  update public.tailor_providers
  set subscription_status = 'active',
      paid_until          = v_basis + (new.extends_days || ' days')::interval,
      updated_at          = now()
  where user_id = new.driver_user_id;

  return new;
end;
$body$;

drop trigger if exists pi_extend_tailor on public.payment_intents;
create trigger pi_extend_tailor
  after update of status on public.payment_intents
  for each row execute function public.extend_tailor_on_payment();

-- Seed ONE demo tailor business — Rosa Jahit Custom, Yogyakarta. Rich
-- violet theme (#9333EA) with white CTA. Stock Unsplash tailor /
-- sewing image (HEAD-verified image/jpeg before commit). Idempotent:
-- on conflict (slug) do update keeps the demo row in sync with the
-- schema. Note: no `demo-` slug prefix — flagged with is_mock=true
-- instead.
insert into public.tailor_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  specialties, hourly_rate_idr, day_rate_idr, has_own_tools,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  theme_color, button_text_color,
  availability, status, rating, rating_count
)
values
  (true, null, 'tailor-rosa-jahit', 'Rosa Jahit Custom', 10,
    'Spesialis kebaya bridal + jas pria custom + gaun pesta, pengalaman 10+ tahun. Bahan dari customer atau stock kami (brokat import / wool / poly cotton). Fitting 2-3x include, lead time standar 2 minggu (bridal 4-6 minggu). FREE konsultasi design via WhatsApp.',
    array['kebaya','jas','bridal']::text[], 25000, 3500000, true,
    'Yogyakarta', 'Yogya · DIY · Jateng · datang ke rumah untuk ukur · bahan dari customer atau stock · fitting 2-3x · free konsultasi design', '+62000000513',
    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&auto=format&fit=crop',
    '#9333EA', '#FFFFFF',
    'online', 'active', null, 0)
on conflict (slug) do update set
  display_name        = excluded.display_name,
  years_experience    = excluded.years_experience,
  bio                 = excluded.bio,
  specialties         = excluded.specialties,
  hourly_rate_idr     = excluded.hourly_rate_idr,
  day_rate_idr        = excluded.day_rate_idr,
  has_own_tools       = excluded.has_own_tools,
  city                = excluded.city,
  service_area_notes  = excluded.service_area_notes,
  whatsapp_e164       = excluded.whatsapp_e164,
  profile_image_url   = excluded.profile_image_url,
  theme_color         = excluded.theme_color,
  button_text_color   = excluded.button_text_color,
  availability        = excluded.availability,
  status              = excluded.status,
  updated_at          = now();

-- ============================================================================
-- Seed PortfolioCarousel entries for tailor-rosa-jahit — mirrors 0218's
-- pattern for the mover demo. Flat JSONB array of {name, description,
-- price_idr, url}. Photo URLs are Unsplash CDN, all HEAD-verified 200
-- OK image/jpeg on 2026-06-09 and unique across all entries (including
-- the profile image above).
--
-- Pricing follows the garment-type + fabric-supply model:
--   • Vermak / Alteration Cepat Rp 25k (pendekan celana / ganti
--     resleting / sesuaikan ukuran, selesai 3 hari; the floor for
--     vermak market)
--   • Jas Pria Custom Tanpa Bahan Rp 800k (jahit jas 2-piece sesuai
--     ukuran, free 2x fitting, lead time 2 minggu; the floor for
--     custom jas market without fabric)
--   • Kebaya Bridal Premium Rp 3.5jt (full payet hand-made, bahan
--     brokat import, design custom, 3x fitting, lead time 4-6 minggu;
--     the premium tier for bridal kebaya market)
--   • Seragam Kantor Paket 12 pcs Rp 2.4jt (Rp 200k/pcs, kemeja kerah
--     standar + logo bordir, bahan poly cotton stock kami; the floor
--     for corporate uniform bulk order)
--
-- Idempotent — re-running just re-asserts the same array.
-- ============================================================================
update public.tailor_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1604176354204-9268737828e4',
      'name',        'Vermak / Alteration Cepat',
      'description', 'Rp 25,000 — pendekan celana, ganti resleting, sesuaikan ukuran. Selesai 3 hari. Floor price untuk vermak/alteration market Yogya. Antar-jemput dalam kota tersedia.',
      'price_idr',   25000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1595777216528-071e0127ccbf',
      'name',        'Jas Pria Custom (Tanpa Bahan)',
      'description', 'Rp 800,000 — jahit jas 2-piece sesuai ukuran, free 2x fitting, lead time 2 minggu. Bahan dari customer (wool / poly cotton). Untuk bahan dari kami +Rp 700k-2jt depending fabric tier.',
      'price_idr',   800000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1564859228273-274232fdb516',
      'name',        'Kebaya Bridal Premium',
      'description', 'Rp 3,500,000 — full payet hand-made, bahan brokat import, design custom sesuai konsep pernikahan, 3x fitting, lead time 4-6 minggu. Include konsultasi design dengan referensi Pinterest / Instagram.',
      'price_idr',   3500000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1582142306909-195724d33ffc',
      'name',        'Seragam Kantor Paket (12 pcs)',
      'description', 'Rp 2,400,000 — Rp 200k/pcs, kemeja kerah standar + logo bordir, bahan poly cotton stock kami. Min order 12 pcs. Lead time 3 minggu. Tambahan untuk size XXL/XXXL +10%.',
      'price_idr',   2400000
    )
  ),
  updated_at = now()
where slug = 'tailor-rosa-jahit';
