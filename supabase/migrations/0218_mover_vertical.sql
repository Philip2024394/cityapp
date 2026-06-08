-- ============================================================================
-- 0218 — Mover / Jasa Pindahan / Cargo Service vertical (Phase 12 of 15
-- new lifestyle categories)
-- ----------------------------------------------------------------------------
-- Mirrors pet_providers byte-for-byte at the column level (0217),
-- with five semantic tweaks for the independent Indonesian mover /
-- jasa pindahan / antar-kota cargo industry:
--   • specialties vocab = vehicle tier + service type axis the
--     mover offers (grandmax, pickup, box, cdd, wing, tronton,
--     home_small, home_full, office_relocation, single_furniture,
--     heavy_lifting, packing_service, insurance, mixed, other).
--     Indonesian indie movers cluster around two axes: VEHICLE TIER
--     (Grandmax cheapest dalam-kota → Pickup antar-kota → Box CDD
--     rumah penuh → Wing kantor weekend → Tronton cargo besar) and
--     SERVICE TYPE (home_small kost / studio, home_full rumah penuh
--     dengan survey + crew, office_relocation kantor weekend night,
--     single_furniture 1 barang dalam kota, heavy_lifting tenaga saja
--     no transport, packing_service kardus + bubble wrap include,
--     insurance asuransi all-risk). Buyers shortlist by vehicle +
--     service then sort by per-trip pricing.
--   • theme_color default = '#0F766E' (deep teal) — moving / logistics
--     signage in Indonesia trends teal-green for trustworthy + sturdy
--     (GoBox / Lalamove / Mover ID Instagram palettes). Reads as
--     reliable / professional / heavy-duty vs pet's playful orange and
--     yoga's breath-violet. button_text_color = '#FFFFFF' so the CTA
--     pills read clean white-on-teal, high contrast.
--   • pricing — moving is per-trip based on VEHICLE + DISTANCE + CREW,
--     NOT per-hour or per-package. Distinct from pet's per-pet
--     pricing — closer to handyman's per-job but with vehicle-capacity
--     tiers as the primary axis:
--     1. VEHICLE TIER (Grandmax cheapest → Pickup → Box → CDD →
--        Wing → Tronton most expensive — capacity drives base fare).
--     2. DISTANCE (dalam kota base + Rp/km after first 10km; antar
--        kota fixed-route quoted; antar provinsi survey first).
--     3. CREW SIZE (driver-only / +1 helper / +2 crew — each helper
--        adds Rp 100-150k for full house move).
--     Local rates (Yogya / Bandung / Jakarta indie mover, 2026):
--       - Grandmax dalam kota base:           Rp 350k   (10km, driver+1)
--       - Pickup antar kota Yogya-Solo:       Rp 850k   (driver+1, ~100km)
--       - Box CDD pindahan rumah penuh:       Rp 2.5jt  (2 crew, survey, packing)
--       - CDD antar provinsi Yogya-Jakarta:   Rp 4-6jt  (survey first)
--       - Wing kantor weekend night:          Rp 3-5jt  (2-3 crew)
--       - Single furniture pickup-drop:       Rp 180k   (floor — sofa/kasur)
--     Packing material add-on: +Rp 150-300k (kardus + bubble wrap).
--     Asuransi all-risk: +1-2% nilai barang.
--     Stairs/lift surcharge: +Rp 50-100k per lantai >2nd no-lift.
--     hourly_rate_idr is reused as the ANCHOR "starting from" price
--     (cheapest dalam-kota base; floor Rp 350k Grandmax). day_rate_idr
--     becomes the optional PAKET RUMAH-PENUH all-in rate (e.g.
--     Rp 2.5jt Box CDD + 2 crew + packing + survey). Distinct from
--     pet's TWO-axis (service + size) because mover has THREE axes
--     (vehicle + distance + crew).
--   • has_own_tools boolean repurposed as "Antar Provinsi" (siap
--     interstate cross-Java / cross-island vs dalam-kota only).
--     Defaults true since most indie movers advertise antar kota +
--     antar provinsi as their main differentiator vs walk-in expedisi
--     chains.
--   • bio mentions armada (Grandmax / Pickup / Box CDD), area jangkauan
--     (Yogya + Jateng + Jatim), crew profesional 1-2 orang, packing
--     material + asuransi tersedia, gratis survey untuk pindahan rumah
--     penuh. Mover credentialing in Indonesia is informal (KIR vehicle
--     inspection mandatory but no mandatory sertifikat mover yet); the
--     bio is the de-facto trust signal. Specialties vocab cap stays at
--     3 so the profile card stays scannable.
-- ============================================================================

create table if not exists public.mover_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Specialties — multi-select text[] from the canonical list in
  -- src/lib/mover/types.ts. CHECK constrains to that vocab.
  specialties text[] not null default '{}'
    check (specialties <@ array[
      'grandmax','pickup','box','cdd','wing','tronton',
      'home_small','home_full','office_relocation','single_furniture',
      'heavy_lifting','packing_service','insurance',
      'mixed','other'
    ]::text[]),

  -- Cap at 3 specialties — same UX rule as cake / catering / photo / barber / handyman / tattoo / video / florist / fitness / yoga / tutoring / pet.
  constraint mover_providers_specialties_max3
    check (coalesce(array_length(specialties, 1), 0) between 1 and 3),

  -- Pricing — anchor "starting from" price (hourly_rate_idr column
  -- kept for renderer parity; surfaces as "Mulai dari" on dashboard).
  -- Optional paket rumah-penuh all-in (day_rate_idr column). CHECK
  -- enforces at least one is set so every public card shows a
  -- starting-from number.
  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),
  constraint mover_providers_at_least_one_price
    check (
      hourly_rate_idr is not null
      or day_rate_idr is not null
    ),

  -- "Own tools" stays as a generic boolean — for mover it means
  -- "Antar Provinsi" (siap interstate cross-Java / cross-island vs
  -- dalam-kota only). Defaults true since most indie movers advertise
  -- antar kota + antar provinsi as their main differentiator vs
  -- walk-in expedisi chains.
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

  -- Per-provider theme accent (mig 0087 equiv). Default deep teal
  -- so trustworthy / sturdy / logistics-signage energy reads — distinct
  -- from pet's playful orange and yoga's breath-violet.
  theme_color      text default '#0F766E'
                   check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$'),
  -- Mover-specific: CTA label colour. Defaults to white so on the
  -- default deep-teal brand the contrast is white-on-teal, high
  -- contrast for the CTA pills. mig 0202 mirror for mover.
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

  -- Use moverp_ prefix to avoid colliding with pet's petp_*
  -- policy/constraint namespace (and the rest).
  constraint moverp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  ),
  constraint mover_providers_gallery_max check (
    gallery_image_urls is null
    or array_length(gallery_image_urls, 1) is null
    or array_length(gallery_image_urls, 1) <= 12
  )
);

create index if not exists idx_moverp_listing
  on public.mover_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_moverp_owner
  on public.mover_providers (user_id);
create index if not exists idx_moverp_specialties
  on public.mover_providers using gin (specialties)
  where status = 'active';

-- updated_at touch trigger (mirrors pet / tutoring / yoga / etc).
create or replace function public.touch_mover_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_mover_providers on public.mover_providers;
create trigger trg_touch_mover_providers
  before update on public.mover_providers
  for each row execute function public.touch_mover_providers();

-- Hide-mock-on-real-signup trigger (mirrors pet 0217 / tutoring 0216).
create or replace function public.hide_one_mock_mover_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.mover_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.mover_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_mover_signup on public.mover_providers;
create trigger trg_hide_mock_on_real_mover_signup
  after insert on public.mover_providers
  for each row execute function public.hide_one_mock_mover_provider();

-- RLS — mirrors pet policies, renamed moverp_*.
alter table public.mover_providers enable row level security;
drop policy if exists moverp_public_select on public.mover_providers;
create policy moverp_public_select on public.mover_providers
  for select to anon, authenticated using (status = 'active');
drop policy if exists moverp_owner_select on public.mover_providers;
create policy moverp_owner_select on public.mover_providers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists moverp_owner_update on public.mover_providers;
create policy moverp_owner_update on public.mover_providers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bookings table (mig 0090 equiv).
create table if not exists public.mover_bookings (
  id                 uuid primary key default gen_random_uuid(),
  mover_id           uuid not null references public.mover_providers(id) on delete cascade,
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

create index if not exists mover_bookings_by_provider_date
  on public.mover_bookings (mover_id, requested_date desc);
create index if not exists mover_bookings_pending
  on public.mover_bookings (mover_id, status)
  where status = 'pending';

create or replace function public.touch_mover_bookings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_mover_bookings_touch on public.mover_bookings;
create trigger trg_mover_bookings_touch
  before update on public.mover_bookings
  for each row execute function public.touch_mover_bookings_updated_at();

alter table public.mover_bookings enable row level security;
drop policy if exists mover_bookings_owner_read on public.mover_bookings;
create policy mover_bookings_owner_read on public.mover_bookings
  for select using (
    exists (
      select 1 from public.mover_providers vp
      where vp.id = mover_bookings.mover_id
        and vp.user_id = auth.uid()
    )
  );
drop policy if exists mover_bookings_owner_update on public.mover_bookings;
create policy mover_bookings_owner_update on public.mover_bookings
  for update using (
    exists (
      select 1 from public.mover_providers vp
      where vp.id = mover_bookings.mover_id
        and vp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Wire 'mover' into the polymorphic constraints / triggers that the rest
-- of the platform relies on. Without these the profile-view tracker,
-- rating recomputer, and contact form would 500 on mover rows.
-- ============================================================================

-- reviews_provider_type_check (mig 0072 ... 0217) — allow 'mover'
alter table public.reviews
  drop constraint if exists reviews_provider_type_check;
alter table public.reviews
  add constraint reviews_provider_type_check
  check (provider_type is null or provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring', 'pet', 'mover'
  ));

-- provider_profile_views CHECK (mig 0072 ... 0217) — allow 'mover'
alter table public.provider_profile_views
  drop constraint if exists provider_profile_views_provider_type_check;
alter table public.provider_profile_views
  add constraint provider_profile_views_provider_type_check
  check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring', 'pet', 'mover'
  ));

-- bump_provider_visitor_count (mig 0072 ... 0217) — add 'mover' case
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
    else
      return new;
  end case;
  return new;
end;
$$;

-- _recompute_provider_rating (mig 0075 ... 0217) — add 'mover' case
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
    when 'tour_guide' then update public.tour_guide_listings  set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    when 'bike_rental' then update public.bike_rentals        set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    else null;
  end case;
end;
$$;

-- contact_messages provider_type CHECK (mig 0137 ... 0217) — allow 'mover'
alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;
alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','tattoo','barber','photo','video','catering','cake','florist','fitness','yoga','tutoring','pet','mover'
  ));

-- contact_messages_own_select RLS — add 'mover' branch
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
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

-- payment_intents.product CHECK (mig 0068 ... 0217) — add mover_monthly + mover_yearly
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
    'mover_monthly',       'mover_yearly'
  ));

-- extend_mover_on_payment trigger — mirrors the verticals in mig 0068 ... 0217
create or replace function public.extend_mover_on_payment()
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
  if new.product not in ('mover_monthly','mover_yearly') then
    return new;
  end if;

  v_plan := case when new.product = 'mover_yearly' then 'yearly' else 'monthly' end;

  select coalesce(paid_until, now())
    into v_basis
    from public.mover_providers
    where user_id = new.driver_user_id
    for update;

  if v_basis is null then return new; end if;
  if v_basis < now() then v_basis := now(); end if;

  update public.mover_providers
  set subscription_status = 'active',
      paid_until          = v_basis + (new.extends_days || ' days')::interval,
      updated_at          = now()
  where user_id = new.driver_user_id;

  return new;
end;
$body$;

drop trigger if exists pi_extend_mover on public.payment_intents;
create trigger pi_extend_mover
  after update of status on public.payment_intents
  for each row execute function public.extend_mover_on_payment();

-- Seed ONE demo mover business — Jaya Pindahan, Yogyakarta. Deep teal
-- theme (#0F766E) with white CTA. Stock Unsplash moving image
-- (HEAD-verified image/jpeg before commit). Idempotent: on conflict
-- (slug) do update keeps the demo row in sync with the schema. Note:
-- no `demo-` slug prefix — flagged with is_mock=true instead.
insert into public.mover_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  specialties, hourly_rate_idr, day_rate_idr, has_own_tools,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  theme_color, button_text_color,
  availability, status, rating, rating_count
)
values
  (true, null, 'mover-jaya-pindah', 'Jaya Pindahan', 5,
    'Armada Grandmax + Pickup + Box CDD siap antar dalam kota Yogya, antar kota Jateng + Jatim, antar provinsi cross-Java. Packing material include (kardus + bubble wrap + wrapping) + asuransi all-risk tersedia. Crew profesional 1-2 orang. GRATIS survey untuk pindahan rumah penuh.',
    array['grandmax','box','home_full']::text[], 350000, 2500000, true,
    'Yogyakarta', 'Yogya · Jateng · Jatim · antar provinsi cross-Java · packing material include · asuransi all-risk · gratis survey rumah penuh', '+62000000512',
    'https://images.unsplash.com/photo-1600320254374-ce2d293c324e?w=1200&auto=format&fit=crop',
    '#0F766E', '#FFFFFF',
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
-- Seed PortfolioCarousel entries for mover-jaya-pindah — mirrors 0217's
-- pattern for the pet demo. Flat JSONB array of {name, description,
-- price_idr, url}. Photo URLs are Unsplash CDN, all HEAD-verified 200
-- OK image/jpeg on 2026-06-08 and unique across all entries (including
-- the profile image above).
--
-- Pricing follows the vehicle-tier + distance + crew model:
--   • Grandmax Dalam Kota Rp 350k (driver + 1 helper, 10km pertama,
--     cocok kasur/lemari/kulkas single; the floor for Grandmax
--     dalam-kota market)
--   • Pickup Antar Kota Yogya-Solo-Semarang Rp 850k (driver + 1
--     helper, packing material bubble wrap include, kapasitas ~3m³;
--     premium for cross-Jateng cargo)
--   • Box CDD Pindahan Rumah Penuh Rp 2.5jt (2 crew angkat, gratis
--     survey, packing premium + asuransi all-risk, kapasitas ~12m³;
--     the rumah-penuh floor for Box CDD market)
--   • Single Furniture Pickup-Drop Rp 180k (antar 1 barang besar
--     sofa/meja dalam kota, driver bantu loading; floor for
--     single-furniture market)
--
-- Idempotent — re-running just re-asserts the same array.
-- ============================================================================
update public.mover_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1530124566582-a618bc2615dc',
      'name',        'Grandmax Dalam Kota (Furnitur Single)',
      'description', 'Rp 350,000 — driver + 1 helper, jarak 10km pertama include, cocok kasur/lemari/kulkas single. Floor price untuk pindahan ringan dalam kota Yogya. Tambahan Rp 5k/km after 10km.',
      'price_idr',   350000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7',
      'name',        'Pickup Antar Kota Yogya-Solo-Semarang',
      'description', 'Rp 850,000 — driver + 1 helper, packing material bubble wrap include, kapasitas ~3m³. Cocok cargo cross-Jateng (Solo / Semarang / Magelang / Klaten). Estimasi 1 hari pulang-pergi.',
      'price_idr',   850000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1597348989645-46b190ce4918',
      'name',        'Box CDD Pindahan Rumah Penuh',
      'description', 'Rp 2,500,000 — 2 crew angkat, GRATIS survey ke lokasi sebelum quote, packing premium (kardus + bubble wrap + wrapping film), asuransi all-risk 1-2% nilai barang, kapasitas ~12m³. Estimasi 1-2 hari kerja.',
      'price_idr',   2500000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1558997519-83ea9252edf8',
      'name',        'Single Furniture Pickup Drop',
      'description', 'Rp 180,000 — antar 1 barang besar (sofa/meja/lemari/kasur) dalam kota Yogya, driver bantu loading + unloading. Floor price untuk pindahan 1-item. Tangga + lantai >2 charge tambahan.',
      'price_idr',   180000
    )
  ),
  updated_at = now()
where slug = 'mover-jaya-pindah';
