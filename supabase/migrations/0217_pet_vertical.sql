-- ============================================================================
-- 0217 — Pet Care / Pet Groomer + Sitter vertical (Phase 11 of 15
-- new lifestyle categories)
-- ----------------------------------------------------------------------------
-- Mirrors tutoring_providers byte-for-byte at the column level (0216),
-- with five semantic tweaks for the independent Indonesian pet
-- groomer / pet sitter / pet care industry:
--   • specialties vocab = service track + species/size axis the pet
--     business offers (cat, dog, rabbit, hamster, bird, exotic,
--     grooming_bath, full_grooming, nail_trim, ear_cleaning,
--     pet_hotel, pet_sitting, pet_daycare, pet_training, mixed,
--     other). Indonesian indie pet businesses cluster around two axes:
--     species (cat + dog ~90% of inquiries; rabbit/hamster/bird/exotic
--     fill the rest) and service type (mandi cheap baseline, full
--     grooming premium, pet hotel per-malam, pet sitting per-hari).
--     Buyers shortlist by species + service then sort by size-tier
--     pricing.
--   • theme_color default = '#F97316' (warm orange) — friendly,
--     playful, pet-care brands trend bright warm. Reads as cheerful /
--     animal-friendly vs tutoring's academic blue and yoga's
--     breath-violet. button_text_color = '#FFFFFF' so the CTA pills
--     read clean white-on-orange, high contrast.
--   • pricing — pet care has TWO axes:
--     1. SERVICE TYPE (mandi cheap, full grooming premium, pet hotel
--        per-malam, pet sitting per-hari, training per-sesi).
--     2. PET SIZE TIER (small / medium / large / extra-large — grooming
--        prices scale with size; XL anjing besar (Husky / Golden)
--        costs ~3x small cat (Persian dewasa)).
--     Local rates (Yogya / Bandung / Jakarta indie groomer):
--       - Cat bath S (Persian, anak):        Rp 80k  (floor — anchor)
--       - Cat bath L (Maine Coon dewasa):    Rp 150k
--       - Dog bath S (Chihuahua / Pom):      Rp 100k
--       - Dog full-groom M (Shih Tzu):       Rp 200k
--       - Dog full-groom XL (Husky/Golden):  Rp 250-350k
--       - Pet hotel kucing per-malam:        Rp 80-150k (AC + makan)
--       - Pet hotel anjing per-malam:        Rp 120-250k
--       - Pet sitting datang ke rumah:       Rp 100-200k per hari
--     hourly_rate_idr is reused as the ANCHOR "starting from" price
--     (cheapest small-pet bath; floor Rp 80k cat S). day_rate_idr
--     becomes the optional PET HOTEL per-malam OR PET SITTING per-hari
--     rate (e.g. Rp 120k/malam for kucing AC). Distinct from tutoring
--     per-pertemuan because pet care has TWO axes: service type AND
--     pet size.
--   • has_own_tools boolean repurposed as "Datang ke rumah" (antar-
--     jemput grooming dalam kota / pet sitting di rumah pemilik vs
--     salon-only walk-in). Defaults true since indie groomers and pet
--     sitters typically advertise home pickup / home visit as their
--     main differentiator vs walk-in pet shop chains.
--   • bio mentions vaksin policy (wajib untuk boarding), sertifikat
--     groomer, peralatan steril, antar-jemput dalam kota, kandang
--     ber-AC. Pet-care credentialing in Indonesia is informal (no
--     mandatory sertifikat groomer yet); the bio is the de-facto
--     trust signal. Specialties vocab cap stays at 3 so the profile
--     card stays scannable.
-- ============================================================================

create table if not exists public.pet_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Specialties — multi-select text[] from the canonical list in
  -- src/lib/pet/types.ts. CHECK constrains to that vocab.
  specialties text[] not null default '{}'
    check (specialties <@ array[
      'cat','dog','rabbit','hamster','bird','exotic',
      'grooming_bath','full_grooming','nail_trim','ear_cleaning',
      'pet_hotel','pet_sitting','pet_daycare','pet_training',
      'mixed','other'
    ]::text[]),

  -- Cap at 3 specialties — same UX rule as cake / catering / photo / barber / handyman / tattoo / video / florist / fitness / yoga / tutoring.
  constraint pet_providers_specialties_max3
    check (coalesce(array_length(specialties, 1), 0) between 1 and 3),

  -- Pricing — anchor "starting from" price (hourly_rate_idr column
  -- kept for renderer parity; surfaces as "Mulai dari" on dashboard).
  -- Optional pet-hotel per-malam / pet-sitting per-hari (day_rate_idr
  -- column). CHECK enforces at least one is set so every public card
  -- shows a starting-from number.
  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),
  constraint pet_providers_at_least_one_price
    check (
      hourly_rate_idr is not null
      or day_rate_idr is not null
    ),

  -- "Own tools" stays as a generic boolean — for pet care it means
  -- "Datang ke rumah" (antar-jemput grooming dalam kota / pet sitting
  -- di rumah pemilik vs salon-only walk-in). Defaults true since
  -- indie groomers and pet sitters typically advertise home pickup /
  -- home visit as their main differentiator vs walk-in pet shop
  -- chains.
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

  -- Per-provider theme accent (mig 0087 equiv). Default warm orange
  -- so cheerful / animal-friendly / playful energy reads — distinct
  -- from tutoring's academic blue and yoga's breath-violet.
  theme_color      text default '#F97316'
                   check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$'),
  -- Pet-specific: CTA label colour. Defaults to white so on the
  -- default warm-orange brand the contrast is white-on-orange, high
  -- contrast for the CTA pills. mig 0202 mirror for pet.
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

  -- Use petp_ prefix to avoid colliding with tutoring's tutorp_*
  -- policy/constraint namespace (and the rest).
  constraint petp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  ),
  constraint pet_providers_gallery_max check (
    gallery_image_urls is null
    or array_length(gallery_image_urls, 1) is null
    or array_length(gallery_image_urls, 1) <= 12
  )
);

create index if not exists idx_petp_listing
  on public.pet_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_petp_owner
  on public.pet_providers (user_id);
create index if not exists idx_petp_specialties
  on public.pet_providers using gin (specialties)
  where status = 'active';

-- updated_at touch trigger (mirrors tutoring / yoga / fitness / etc).
create or replace function public.touch_pet_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_pet_providers on public.pet_providers;
create trigger trg_touch_pet_providers
  before update on public.pet_providers
  for each row execute function public.touch_pet_providers();

-- Hide-mock-on-real-signup trigger (mirrors tutoring 0216 / yoga 0215).
create or replace function public.hide_one_mock_pet_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.pet_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.pet_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_pet_signup on public.pet_providers;
create trigger trg_hide_mock_on_real_pet_signup
  after insert on public.pet_providers
  for each row execute function public.hide_one_mock_pet_provider();

-- RLS — mirrors tutoring policies, renamed petp_*.
alter table public.pet_providers enable row level security;
drop policy if exists petp_public_select on public.pet_providers;
create policy petp_public_select on public.pet_providers
  for select to anon, authenticated using (status = 'active');
drop policy if exists petp_owner_select on public.pet_providers;
create policy petp_owner_select on public.pet_providers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists petp_owner_update on public.pet_providers;
create policy petp_owner_update on public.pet_providers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bookings table (mig 0090 equiv).
create table if not exists public.pet_bookings (
  id                 uuid primary key default gen_random_uuid(),
  pet_id             uuid not null references public.pet_providers(id) on delete cascade,
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

create index if not exists pet_bookings_by_provider_date
  on public.pet_bookings (pet_id, requested_date desc);
create index if not exists pet_bookings_pending
  on public.pet_bookings (pet_id, status)
  where status = 'pending';

create or replace function public.touch_pet_bookings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_pet_bookings_touch on public.pet_bookings;
create trigger trg_pet_bookings_touch
  before update on public.pet_bookings
  for each row execute function public.touch_pet_bookings_updated_at();

alter table public.pet_bookings enable row level security;
drop policy if exists pet_bookings_owner_read on public.pet_bookings;
create policy pet_bookings_owner_read on public.pet_bookings
  for select using (
    exists (
      select 1 from public.pet_providers vp
      where vp.id = pet_bookings.pet_id
        and vp.user_id = auth.uid()
    )
  );
drop policy if exists pet_bookings_owner_update on public.pet_bookings;
create policy pet_bookings_owner_update on public.pet_bookings
  for update using (
    exists (
      select 1 from public.pet_providers vp
      where vp.id = pet_bookings.pet_id
        and vp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Wire 'pet' into the polymorphic constraints / triggers that the rest
-- of the platform relies on. Without these the profile-view tracker,
-- rating recomputer, and contact form would 500 on pet rows.
-- ============================================================================

-- reviews_provider_type_check (mig 0072 ... 0216) — allow 'pet'
alter table public.reviews
  drop constraint if exists reviews_provider_type_check;
alter table public.reviews
  add constraint reviews_provider_type_check
  check (provider_type is null or provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring', 'pet'
  ));

-- provider_profile_views CHECK (mig 0072 ... 0216) — allow 'pet'
alter table public.provider_profile_views
  drop constraint if exists provider_profile_views_provider_type_check;
alter table public.provider_profile_views
  add constraint provider_profile_views_provider_type_check
  check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring', 'pet'
  ));

-- bump_provider_visitor_count (mig 0072 ... 0216) — add 'pet' case
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
    else
      return new;
  end case;
  return new;
end;
$$;

-- _recompute_provider_rating (mig 0075 ... 0216) — add 'pet' case
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
    when 'tour_guide' then update public.tour_guide_listings  set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    when 'bike_rental' then update public.bike_rentals        set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    else null;
  end case;
end;
$$;

-- contact_messages provider_type CHECK (mig 0137 ... 0216) — allow 'pet'
alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;
alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','tattoo','barber','photo','video','catering','cake','florist','fitness','yoga','tutoring','pet'
  ));

-- contact_messages_own_select RLS — add 'pet' branch
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
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

-- payment_intents.product CHECK (mig 0068 ... 0216) — add pet_monthly + pet_yearly
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
    'pet_monthly',         'pet_yearly'
  ));

-- extend_pet_on_payment trigger — mirrors the verticals in mig 0068 ... 0216
create or replace function public.extend_pet_on_payment()
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
  if new.product not in ('pet_monthly','pet_yearly') then
    return new;
  end if;

  v_plan := case when new.product = 'pet_yearly' then 'yearly' else 'monthly' end;

  select coalesce(paid_until, now())
    into v_basis
    from public.pet_providers
    where user_id = new.driver_user_id
    for update;

  if v_basis is null then return new; end if;
  if v_basis < now() then v_basis := now(); end if;

  update public.pet_providers
  set subscription_status = 'active',
      paid_until          = v_basis + (new.extends_days || ' days')::interval,
      updated_at          = now()
  where user_id = new.driver_user_id;

  return new;
end;
$body$;

drop trigger if exists pi_extend_pet on public.payment_intents;
create trigger pi_extend_pet
  after update of status on public.payment_intents
  for each row execute function public.extend_pet_on_payment();

-- Seed ONE demo pet care business — Bella Pet Care, Yogyakarta. Warm
-- orange theme (#F97316) with white CTA. Stock Unsplash pet-care image
-- (HEAD-verified image/jpeg before commit). Idempotent: on conflict
-- (slug) do update keeps the demo row in sync with the schema.
insert into public.pet_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  specialties, hourly_rate_idr, day_rate_idr, has_own_tools,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  theme_color, button_text_color,
  availability, status, rating, rating_count
)
values
  (true, null, 'demo-pet-bella', 'Bella Pet Care', 5,
    'Grooming kucing + anjing semua ukuran (S/M/L/XL), pet hotel ber-AC dengan foto update WA tiap hari, sertifikat groomer profesional. Antar-jemput dalam kota Yogya GRATIS. Vaksin wajib untuk boarding. Peralatan steril, shampoo organic, ruangan ber-AC.',
    array['cat','dog','full_grooming']::text[], 80000, 120000, true,
    'Yogyakarta', 'Yogya · Sleman · Bantul · antar-jemput dalam kota gratis · pet hotel ber-AC · grooming on-site / di rumah', '+62000000511',
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&auto=format&fit=crop',
    '#F97316', '#FFFFFF',
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
-- Seed PortfolioCarousel entries for demo-pet-bella — mirrors 0216's
-- pattern for the tutoring demo. Flat JSONB array of {name, description,
-- price_idr, url}. Photo URLs are Unsplash CDN, all HEAD-verified 200
-- OK image/jpeg on 2026-06-08 and unique across all entries (including
-- the profile image above).
--
-- Pricing follows the service-anchor + pet-hotel per-malam model:
--   • Cat/small-dog bath Rp 80k (mandi shampoo organic + blow dry +
--     sisir + parfum + free nail check; floor price for cat S /
--     anak Persian / Chihuahua market)
--   • Full grooming sedang-besar Rp 200k (bath + cut sesuai breed +
--     ear cleaning + nail trim + parfum + ribbon hiasan; SMA-grade
--     premium for anjing M/L Shih Tzu / Poodle / Maltese)
--   • Pet hotel per malam Rp 120k (kandang ber-AC + 3x makan + 2x
--     bermain + foto update WA setiap hari; the boarding floor for
--     kucing dewasa AC market)
--   • Pet sitting di rumah Rp 150k (2 jam/hari, kasih makan +
--     bersihkan litter + bermain; for pemilik traveling — premium
--     because sitter dedicates dedicated time)
--
-- Idempotent — re-running just re-asserts the same array.
-- ============================================================================
update public.pet_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1591946614720-90a587da4a36',
      'name',        'Bath + Blow Dry (Kucing/Anjing Kecil)',
      'description', 'Rp 80,000 — mandi shampoo organic, blow dry, sisir, parfum, free nail check. Floor price untuk kucing S (Persian dewasa/anak) atau anjing kecil (Chihuahua/Pom). Cocok rutin 2x sebulan.',
      'price_idr',   80000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a',
      'name',        'Full Grooming Premium (Sedang-Besar)',
      'description', 'Rp 200,000 — bath + cut sesuai breed + ear cleaning + nail trim + parfum + ribbon hiasan. Untuk anjing M/L (Shih Tzu / Poodle / Maltese / Golden). Estimasi 1.5-2 jam, hasil rapi & wangi.',
      'price_idr',   200000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1450778869180-41d0601e046e',
      'name',        'Pet Hotel per Malam (AC + Antar Jemput)',
      'description', 'Rp 120,000 per malam — kandang ber-AC + 3x makan + 2x bermain + foto update WA setiap hari. Antar-jemput dalam kota Yogya gratis. Vaksin wajib (rabies + tricat).',
      'price_idr',   120000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1583337130417-3346a1be7dee',
      'name',        'Pet Sitting di Rumah Kamu',
      'description', '2 jam/hari, kasih makan + bersihkan litter + bermain, foto update WA. Cocok untuk pemilik yang traveling tapi anabul stress kalau pindah tempat. Min 3 hari booking.',
      'price_idr',   150000
    )
  ),
  updated_at = now()
where slug = 'demo-pet-bella';
