-- ============================================================================
-- 0221 — Parcel / Kurir Antar Barang / Same-Day Delivery vertical
-- (Phase 15 of 15 — FINAL vertical of the activation series).
-- ----------------------------------------------------------------------------
-- Mirrors carwash_providers byte-for-byte at the column level (0220),
-- with five semantic tweaks for the independent Indonesian parcel
-- courier / jasa kurir antar barang / same-day delivery business:
--   • specialties vocab = VEHICLE TYPE + SERVICE LEVEL + COVERAGE axis
--     the kurir offers (motor, pickup_van, box_cdd, sepeda, same_day,
--     next_day, instant_60min, cargo_besar, dokumen_express,
--     ecommerce_return, antar_kota, dalam_kota, mixed, other).
--     Indonesian indie kurir cluster around three axes: VEHICLE TYPE
--     (motor cheapest dalam kota → pickup_van mid → box CDD bulk),
--     SERVICE LEVEL (next_day cheapest → same_day mid → instant_60min
--     premium), and COVERAGE (dalam_kota cheapest → antar_kota mid →
--     cargo besar antar provinsi). Buyers shortlist by vehicle-tier
--     then sort by service-level pricing.
--   • theme_color default = '#EA580C' (urgent orange) — kurir signage
--     in Indonesia trends bright orange (JNE, J&T, GoSend, AnterAja,
--     SiCepat) so the urgency / fast-handover energy reads. Distinct
--     from carwash's clean water blue (#0284C7) and tailor's bridal
--     violet. button_text_color = '#FFFFFF' so the CTA pills read
--     clean white-on-orange, high contrast.
--   • pricing — parcel is BASE-FARE + PER-KM, similar to mover's
--     larger-vehicle per-trip rate. Distinct from mover's per-trip
--     because parcel is small-payload + fast turnaround (motor max
--     20kg dalam kota, pickup max 300kg antar kota). Cheapest motor
--     dalam kota floor: Rp 8k base + Rp 2.5k/km (round to ~Rp 15k
--     anchor for typical 3-5km job). Premium instant-60min:
--     Rp 35k + Rp 3.5k/km. Box CDD bulk pickup: Rp 350k + Rp 5k/km.
--     Local rates (Yogya / Bandung / Jakarta indie kurir, 2026):
--       - Motor dalam kota:        Rp 8k base + Rp 2.5k/km (floor — max 20kg)
--       - Motor same-day:          Rp 15k base + Rp 3k/km
--       - Instant 60-menit motor:  Rp 35k + Rp 3.5k/km (garansi 60 menit)
--       - Pickup van antar kota:   Rp 250k base + Rp 4k/km (max 300kg)
--       - Box CDD bulk pickup:     Rp 350k base + Rp 5k/km (~12m3)
--       - Cargo besar antar provinsi: Rp 500k base + Rp 6k/km
--     COD surcharge: typically 1-2% of barang value (cap Rp 5k min).
--     Asuransi paket berharga: optional, ~0.2-0.5% of declared value.
--     hourly_rate_idr is reused as the ANCHOR "starting from" price
--     (cheapest line, floor Rp 15k motor dalam kota typical job).
--     day_rate_idr becomes the optional all-in PAKET BULK (e.g.
--     Rp 350k box CDD e-commerce bulk pickup) rate. Distinct from
--     carwash's TWO-axis (vehicle + wash-level) because parcel has
--     THREE axes (vehicle + service-level + coverage).
--   • has_own_tools boolean repurposed as "Pickup di Lokasi" (siap
--     pickup di lokasi pengirim vs drop-off only). Defaults true
--     since pickup-di-lokasi is the differentiator for indie kurir
--     vs counter-only chains (JNE counter, Pos Indonesia drop-off).
--   • bio mentions vehicle armada (motor / pickup / box CDD),
--     coverage area (dalam kota / antar kota / antar provinsi),
--     GPS-track share real-time, COD tersedia, asuransi paket
--     berharga, instant 60-menit garansi, pengalaman tahun. Kurir
--     credentialing in Indonesia is informal for indie operators
--     (no mandatory sertifikat AKAP); the bio is the de-facto trust
--     signal. Specialties vocab cap stays at 3 so the profile card
--     stays scannable.
--
-- CityDrivers boundary: this is PARCEL COURIER for goods (kurir
-- antar barang). NOT food delivery, NOT passenger ride-hail (those
-- are CityDrivers concerns and stay denied on kita2u — see
-- feedback_cityriders_no_payments_directory + the project memory).
-- Marketing copy stays goods-only (paket / dokumen / cargo /
-- ecommerce). No "ojek" / "penumpang" / "ride" wording anywhere.
-- ============================================================================

create table if not exists public.parcel_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Specialties — multi-select text[] from the canonical list in
  -- src/lib/parcel/types.ts. CHECK constrains to that vocab.
  specialties text[] not null default '{}'
    check (specialties <@ array[
      'motor','pickup_van','box_cdd','sepeda',
      'same_day','next_day','instant_60min','cargo_besar','dokumen_express','ecommerce_return',
      'antar_kota','dalam_kota',
      'mixed','other'
    ]::text[]),

  -- Cap at 3 specialties — same UX rule as carwash / tailor / cake / catering / photo / barber / handyman / tattoo / video / florist / fitness / yoga / tutoring / pet / mover.
  constraint parcel_providers_specialties_max3
    check (coalesce(array_length(specialties, 1), 0) between 1 and 3),

  -- Pricing — anchor "starting from" price (hourly_rate_idr column
  -- kept for renderer parity; surfaces as "Mulai dari" on dashboard).
  -- Optional paket bulk all-in (day_rate_idr column).
  -- CHECK enforces at least one is set so every public card shows a
  -- starting-from number.
  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),
  constraint parcel_providers_at_least_one_price
    check (
      hourly_rate_idr is not null
      or day_rate_idr is not null
    ),

  -- "Own tools" stays as a generic boolean — for parcel it means
  -- "Pickup di Lokasi" (siap pickup di lokasi pengirim vs drop-off
  -- only). Defaults true since pickup-di-lokasi is the differentiator
  -- for indie kurir vs counter-only chains.
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

  -- Per-provider theme accent (mig 0087 equiv). Default urgent orange
  -- so the parcel kurir fast-handover / urgency energy reads — distinct
  -- from carwash's clean water blue and tailor's bridal violet.
  theme_color      text default '#EA580C'
                   check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$'),
  -- Parcel-specific: CTA label colour. Defaults to white so on the
  -- default urgent orange brand the contrast is white-on-orange, high
  -- contrast for the CTA pills. mig 0202 mirror for parcel.
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

  -- Use parcelp_ prefix to avoid colliding with carwash's carwashp_*
  -- policy/constraint namespace (and the rest).
  constraint parcelp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  ),
  constraint parcel_providers_gallery_max check (
    gallery_image_urls is null
    or array_length(gallery_image_urls, 1) is null
    or array_length(gallery_image_urls, 1) <= 12
  )
);

create index if not exists idx_parcelp_listing
  on public.parcel_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_parcelp_owner
  on public.parcel_providers (user_id);
create index if not exists idx_parcelp_specialties
  on public.parcel_providers using gin (specialties)
  where status = 'active';

-- updated_at touch trigger (mirrors carwash / tailor / mover / pet / etc).
create or replace function public.touch_parcel_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_parcel_providers on public.parcel_providers;
create trigger trg_touch_parcel_providers
  before update on public.parcel_providers
  for each row execute function public.touch_parcel_providers();

-- Hide-mock-on-real-signup trigger (mirrors carwash 0220 / tailor 0219).
create or replace function public.hide_one_mock_parcel_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.parcel_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.parcel_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_parcel_signup on public.parcel_providers;
create trigger trg_hide_mock_on_real_parcel_signup
  after insert on public.parcel_providers
  for each row execute function public.hide_one_mock_parcel_provider();

-- RLS — mirrors carwash policies, renamed parcelp_*.
alter table public.parcel_providers enable row level security;
drop policy if exists parcelp_public_select on public.parcel_providers;
create policy parcelp_public_select on public.parcel_providers
  for select to anon, authenticated using (status = 'active');
drop policy if exists parcelp_owner_select on public.parcel_providers;
create policy parcelp_owner_select on public.parcel_providers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists parcelp_owner_update on public.parcel_providers;
create policy parcelp_owner_update on public.parcel_providers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bookings table (mig 0090 equiv).
create table if not exists public.parcel_bookings (
  id                 uuid primary key default gen_random_uuid(),
  parcel_id          uuid not null references public.parcel_providers(id) on delete cascade,
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

create index if not exists parcel_bookings_by_provider_date
  on public.parcel_bookings (parcel_id, requested_date desc);
create index if not exists parcel_bookings_pending
  on public.parcel_bookings (parcel_id, status)
  where status = 'pending';

create or replace function public.touch_parcel_bookings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_parcel_bookings_touch on public.parcel_bookings;
create trigger trg_parcel_bookings_touch
  before update on public.parcel_bookings
  for each row execute function public.touch_parcel_bookings_updated_at();

alter table public.parcel_bookings enable row level security;
drop policy if exists parcel_bookings_owner_read on public.parcel_bookings;
create policy parcel_bookings_owner_read on public.parcel_bookings
  for select using (
    exists (
      select 1 from public.parcel_providers vp
      where vp.id = parcel_bookings.parcel_id
        and vp.user_id = auth.uid()
    )
  );
drop policy if exists parcel_bookings_owner_update on public.parcel_bookings;
create policy parcel_bookings_owner_update on public.parcel_bookings
  for update using (
    exists (
      select 1 from public.parcel_providers vp
      where vp.id = parcel_bookings.parcel_id
        and vp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Wire 'parcel' into the polymorphic constraints / triggers that the rest
-- of the platform relies on. Without these the profile-view tracker,
-- rating recomputer, and contact form would 500 on parcel rows.
-- ============================================================================

-- reviews_provider_type_check (mig 0072 ... 0220) — allow 'parcel'
alter table public.reviews
  drop constraint if exists reviews_provider_type_check;
alter table public.reviews
  add constraint reviews_provider_type_check
  check (provider_type is null or provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring', 'pet', 'mover', 'tailor', 'carwash', 'parcel'
  ));

-- provider_profile_views CHECK (mig 0072 ... 0220) — allow 'parcel'
alter table public.provider_profile_views
  drop constraint if exists provider_profile_views_provider_type_check;
alter table public.provider_profile_views
  add constraint provider_profile_views_provider_type_check
  check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring', 'pet', 'mover', 'tailor', 'carwash', 'parcel'
  ));

-- bump_provider_visitor_count (mig 0072 ... 0220) — add 'parcel' case
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
    when 'carwash'      then update public.carwash_providers    set visitor_count = visitor_count + 1 where id = new.provider_id;
    when 'parcel'       then update public.parcel_providers     set visitor_count = visitor_count + 1 where id = new.provider_id;
    else
      return new;
  end case;
  return new;
end;
$$;

-- _recompute_provider_rating (mig 0075 ... 0220) — add 'parcel' case
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
    when 'carwash'    then update public.carwash_providers    set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'parcel'     then update public.parcel_providers     set rating = v_avg, rating_count = v_cnt where id = p_provider_id;
    when 'tour_guide' then update public.tour_guide_listings  set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    when 'bike_rental' then update public.bike_rentals        set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    else null;
  end case;
end;
$$;

-- contact_messages provider_type CHECK (mig 0137 ... 0220) — allow 'parcel'
alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;
alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','tattoo','barber','photo','video','catering','cake','florist','fitness','yoga','tutoring','pet','mover','tailor','carwash','parcel'
  ));

-- contact_messages_own_select RLS — add 'parcel' branch
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
      when 'carwash'     then exists (select 1 from public.carwash_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'parcel'      then exists (select 1 from public.parcel_providers       p where p.id = provider_id and p.user_id = auth.uid())
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

-- payment_intents.product CHECK (mig 0068 ... 0220) — add parcel_monthly + parcel_yearly
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
    'tailor_monthly',      'tailor_yearly',
    'carwash_monthly',     'carwash_yearly',
    'parcel_monthly',      'parcel_yearly'
  ));

-- extend_parcel_on_payment trigger — mirrors the verticals in mig 0068 ... 0220
create or replace function public.extend_parcel_on_payment()
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
  if new.product not in ('parcel_monthly','parcel_yearly') then
    return new;
  end if;

  v_plan := case when new.product = 'parcel_yearly' then 'yearly' else 'monthly' end;

  select coalesce(paid_until, now())
    into v_basis
    from public.parcel_providers
    where user_id = new.driver_user_id
    for update;

  if v_basis is null then return new; end if;
  if v_basis < now() then v_basis := now(); end if;

  update public.parcel_providers
  set subscription_status = 'active',
      paid_until          = v_basis + (new.extends_days || ' days')::interval,
      updated_at          = now()
  where user_id = new.driver_user_id;

  return new;
end;
$body$;

drop trigger if exists pi_extend_parcel on public.payment_intents;
create trigger pi_extend_parcel
  after update of status on public.payment_intents
  for each row execute function public.extend_parcel_on_payment();

-- Seed ONE demo parcel courier — Cepat Kurir Yogya. Urgent orange theme
-- (#EA580C) with white CTA. Stock Unsplash courier image (HEAD-verified
-- image/jpeg before commit). Idempotent: on conflict (slug) do update
-- keeps the demo row in sync with the schema. Note: no `demo-` slug
-- prefix — flagged with is_mock=true instead.
insert into public.parcel_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  specialties, hourly_rate_idr, day_rate_idr, has_own_tools,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  theme_color, button_text_color,
  availability, status, rating, rating_count
)
values
  (true, null, 'parcel-cepat-yogya', 'Cepat Kurir Yogya', 6,
    'Kurir motor + pickup + box CDD, antar dokumen + paket + cargo dalam kota Yogya + antar kota Jateng/DIY. GPS share real-time, COD tersedia (cap 1-2%), asuransi paket berharga 0.3% nilai, instant 60-menit garansi. Pengalaman 6 tahun, armada 8 motor + 2 pickup.',
    array['motor','same_day','dalam_kota']::text[], 15000, 350000, true,
    'Yogyakarta', 'Yogya · DIY · Jateng antar kota · pickup di lokasi · GPS share · COD cap 1-2% · asuransi 0.3% nilai · instant 60-menit garansi', '+62000000515',
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop',
    '#EA580C', '#FFFFFF',
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
-- Seed PortfolioCarousel entries for parcel-cepat-yogya — mirrors 0220's
-- pattern for the carwash demo. Flat JSONB array of {name, description,
-- price_idr, url}. Photo URLs are Unsplash CDN, all HEAD-verified 200
-- OK image/jpeg on 2026-06-09 and unique across all entries (including
-- the profile image above).
--
-- Pricing follows the vehicle + service-level + coverage matrix:
--   • Motor Dalam Kota (Max 20kg) Rp 15k base + Rp 2.5k/km — antar
--     dokumen + paket kecil, dalam kota Yogya, GPS share real-time;
--     the floor for motor kurir dalam kota market
--   • Pickup Antar Kota Jateng (300kg) Rp 250k base + Rp 4k/km —
--     pickup van max 300kg, antar provinsi Jateng/DIY, cargo +
--     furniture kecil; the floor for pickup antar kota market
--   • Same-Day Instant 60 Menit Premium Rp 35k + Rp 3.5k/km — pickup
--     + antar 60 menit urgent, dokumen + parcel kecil, garansi 60
--     menit; the premium tier for urgent same-day market
--   • Box CDD E-commerce Bulk Pickup Rp 350k base + Rp 5k/km — box
--     CDD ~12m3, pickup massal seller online, ecommerce-return
--     support, batch loading; the entry tier for e-commerce bulk
--
-- Idempotent — re-running just re-asserts the same array.
-- ============================================================================
update public.parcel_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1607344645866-009c320b63e0',
      'name',        'Motor Dalam Kota (Max 20kg)',
      'description', 'Rp 15,000 base + Rp 2,500/km — kurir motor dalam Yogya, max 20kg, antar dokumen + paket kecil, GPS share real-time. Floor price untuk motor kurir dalam kota market Yogya. Typical job 3-5km selesai 30-45 menit. COD tersedia cap 1-2%.',
      'price_idr',   15000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1530319067432-f2a729c03db5',
      'name',        'Pickup Antar Kota Jateng (300kg)',
      'description', 'Rp 250,000 base + Rp 4,000/km — pickup van max 300kg, antar provinsi Jateng/DIY, cargo + furniture kecil. Untuk single-drop dalam Jateng tambah Rp 50k. Asuransi paket berharga +0.3% nilai. Lead time 1-2 hari.',
      'price_idr',   250000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1494412519320-aa613dfb7738',
      'name',        'Same-Day Instant 60 Menit Premium',
      'description', 'Rp 35,000 base + Rp 3,500/km — pickup + antar 60 menit urgent, dokumen + parcel kecil, garansi 60 menit. Lewat 60 menit refund 50%. Dalam kota Yogya only. Booking H-0 sampai jam 4 sore.',
      'price_idr',   35000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1577563908411-5077b6dc7624',
      'name',        'Box CDD E-commerce Bulk Pickup',
      'description', 'Rp 350,000 base + Rp 5,000/km — box CDD ~12m3, pickup massal seller online, ecommerce-return support, batch loading. Untuk antar provinsi tambah Rp 200k. Lead time 1-3 hari. Cocok shopee/tokopedia seller volume tinggi.',
      'price_idr',   350000
    )
  ),
  updated_at = now()
where slug = 'parcel-cepat-yogya';
