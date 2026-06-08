-- ============================================================================
-- 0220 — Car Wash / Cuci Mobil & Motor vertical (Phase 14 of 15
-- new lifestyle categories)
-- ----------------------------------------------------------------------------
-- Mirrors tailor_providers byte-for-byte at the column level (0219),
-- with five semantic tweaks for the independent Indonesian car wash /
-- cuci mobil & motor industry:
--   • specialties vocab = VEHICLE TYPE + WASH-LEVEL axis the car wash
--     offers (motor, mobil_kecil, mobil_sedang, suv, pickup, mpv,
--     sedan, body_only, body_plus_dalam, detailing, polish_wax,
--     ceramic_coating, engine_bay, interior_shampoo, home_call,
--     mixed, other). Indonesian indie cuci kendaraan cluster around
--     two axes: VEHICLE SIZE TIER (motor cheapest → mobil_kecil →
--     sedang → SUV → MPV besar → premium) and WASH LEVEL (body_only
--     cheapest → body_plus_dalam → polish_wax → detailing →
--     ceramic_coating most expensive). Buyers shortlist by vehicle
--     then sort by per-level pricing.
--   • theme_color default = '#0284C7' (clean water blue) — car wash
--     signage in Indonesia trends bright blue + chrome (DetailMaster,
--     Cuci Mobil Auto Glow, indie cuci-kilat banners). Reads as
--     fresh / hydrophobic / professional vs tailor's bridal violet.
--     button_text_color = '#FFFFFF' so the CTA pills read clean
--     white-on-blue, high contrast.
--   • pricing — car wash is PER-VEHICLE with SIZE-TIER surcharge,
--     similar to pet's species+size matrix. Distinct from tailor's
--     per-garment because car wash multiplies per (vehicle, level).
--     Cheapest motor body-only floor: Rp 15k. Premium coating SUV:
--     Rp 4-8jt. Home-call surcharge typically +Rp 20-50k.
--     Local rates (Yogya / Bandung / Jakarta indie cuci mobil, 2026):
--       - Motor body only:                 Rp 15k    (floor — express 15 menit)
--       - Mobil kecil body only:           Rp 25-30k
--       - Mobil sedang body only:          Rp 35k
--       - Mobil sedang body + dalam:       Rp 50k
--       - SUV body only:                   Rp 45k
--       - SUV body + dalam:                Rp 70k
--       - Detailing premium SUV:           Rp 350k-500k (3-4 jam)
--       - Polish wax mobil sedang:         Rp 250k-400k
--       - Coating ceramic 9H mobil sedang: Rp 3-5jt
--       - Coating ceramic 9H SUV:          Rp 4-8jt (garansi 1 tahun)
--     Member-card tier (10x cuci diskon): typically saves 10-15%.
--     hourly_rate_idr is reused as the ANCHOR "starting from" price
--     (cheapest line, floor Rp 15k motor body-only). day_rate_idr
--     becomes the optional PAKET DETAILING / PAKET COATING all-in
--     rate (e.g. Rp 3.5jt coating ceramic 9H mobil sedang include
--     prep + clay-bar + 1-tahun garansi, or Rp 500k full detailing
--     SUV). Distinct from tailor's TWO-axis (garment + fabric)
--     because car wash has TWO axes (vehicle size + wash level).
--   • has_own_tools boolean repurposed as "Datang ke Rumah" (siap
--     panggilan ke rumah / hotel valet vs lokasi cuci only).
--     Defaults true since panggilan ke rumah is increasingly the
--     differentiator for indie cuci mobil vs mall / SPBU chains.
--   • bio mentions spesialisasi (motor / mobil / detailing /
--     coating), peralatan profesional + shampoo non-acid + lap
--     microfiber, antar-jemput dalam kota, member card 10x diskon,
--     panggilan ke rumah, pengalaman tahun. Car wash credentialing
--     in Indonesia is informal (no mandatory sertifikat); the bio
--     is the de-facto trust signal. Specialties vocab cap stays at
--     3 so the profile card stays scannable.
-- ============================================================================

create table if not exists public.carwash_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Specialties — multi-select text[] from the canonical list in
  -- src/lib/carwash/types.ts. CHECK constrains to that vocab.
  specialties text[] not null default '{}'
    check (specialties <@ array[
      'motor','mobil_kecil','mobil_sedang','suv','pickup','mpv','sedan',
      'body_only','body_plus_dalam','detailing','polish_wax','ceramic_coating',
      'engine_bay','interior_shampoo','home_call',
      'mixed','other'
    ]::text[]),

  -- Cap at 3 specialties — same UX rule as tailor / cake / catering / photo / barber / handyman / tattoo / video / florist / fitness / yoga / tutoring / pet / mover.
  constraint carwash_providers_specialties_max3
    check (coalesce(array_length(specialties, 1), 0) between 1 and 3),

  -- Pricing — anchor "starting from" price (hourly_rate_idr column
  -- kept for renderer parity; surfaces as "Mulai dari" on dashboard).
  -- Optional paket detailing / paket coating all-in (day_rate_idr column).
  -- CHECK enforces at least one is set so every public card shows a
  -- starting-from number.
  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),
  constraint carwash_providers_at_least_one_price
    check (
      hourly_rate_idr is not null
      or day_rate_idr is not null
    ),

  -- "Own tools" stays as a generic boolean — for car wash it means
  -- "Datang ke Rumah" (siap panggilan ke rumah / hotel valet vs
  -- lokasi cuci only). Defaults true since panggilan ke rumah is
  -- increasingly the differentiator for indie cuci mobil vs mall /
  -- SPBU chains.
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

  -- Per-provider theme accent (mig 0087 equiv). Default clean water
  -- blue so car-wash fresh / hydrophobic / professional energy reads
  -- — distinct from tailor's bridal violet and pet's playful orange.
  theme_color      text default '#0284C7'
                   check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$'),
  -- Carwash-specific: CTA label colour. Defaults to white so on the
  -- default clean blue brand the contrast is white-on-blue, high
  -- contrast for the CTA pills. mig 0202 mirror for carwash.
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

  -- Use carwashp_ prefix to avoid colliding with tailor's tailorp_*
  -- policy/constraint namespace (and the rest).
  constraint carwashp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  ),
  constraint carwash_providers_gallery_max check (
    gallery_image_urls is null
    or array_length(gallery_image_urls, 1) is null
    or array_length(gallery_image_urls, 1) <= 12
  )
);

create index if not exists idx_carwashp_listing
  on public.carwash_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_carwashp_owner
  on public.carwash_providers (user_id);
create index if not exists idx_carwashp_specialties
  on public.carwash_providers using gin (specialties)
  where status = 'active';

-- updated_at touch trigger (mirrors tailor / mover / pet / etc).
create or replace function public.touch_carwash_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_carwash_providers on public.carwash_providers;
create trigger trg_touch_carwash_providers
  before update on public.carwash_providers
  for each row execute function public.touch_carwash_providers();

-- Hide-mock-on-real-signup trigger (mirrors tailor 0219 / mover 0218).
create or replace function public.hide_one_mock_carwash_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.carwash_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.carwash_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_carwash_signup on public.carwash_providers;
create trigger trg_hide_mock_on_real_carwash_signup
  after insert on public.carwash_providers
  for each row execute function public.hide_one_mock_carwash_provider();

-- RLS — mirrors tailor policies, renamed carwashp_*.
alter table public.carwash_providers enable row level security;
drop policy if exists carwashp_public_select on public.carwash_providers;
create policy carwashp_public_select on public.carwash_providers
  for select to anon, authenticated using (status = 'active');
drop policy if exists carwashp_owner_select on public.carwash_providers;
create policy carwashp_owner_select on public.carwash_providers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists carwashp_owner_update on public.carwash_providers;
create policy carwashp_owner_update on public.carwash_providers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bookings table (mig 0090 equiv).
create table if not exists public.carwash_bookings (
  id                 uuid primary key default gen_random_uuid(),
  carwash_id         uuid not null references public.carwash_providers(id) on delete cascade,
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

create index if not exists carwash_bookings_by_provider_date
  on public.carwash_bookings (carwash_id, requested_date desc);
create index if not exists carwash_bookings_pending
  on public.carwash_bookings (carwash_id, status)
  where status = 'pending';

create or replace function public.touch_carwash_bookings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_carwash_bookings_touch on public.carwash_bookings;
create trigger trg_carwash_bookings_touch
  before update on public.carwash_bookings
  for each row execute function public.touch_carwash_bookings_updated_at();

alter table public.carwash_bookings enable row level security;
drop policy if exists carwash_bookings_owner_read on public.carwash_bookings;
create policy carwash_bookings_owner_read on public.carwash_bookings
  for select using (
    exists (
      select 1 from public.carwash_providers vp
      where vp.id = carwash_bookings.carwash_id
        and vp.user_id = auth.uid()
    )
  );
drop policy if exists carwash_bookings_owner_update on public.carwash_bookings;
create policy carwash_bookings_owner_update on public.carwash_bookings
  for update using (
    exists (
      select 1 from public.carwash_providers vp
      where vp.id = carwash_bookings.carwash_id
        and vp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Wire 'carwash' into the polymorphic constraints / triggers that the rest
-- of the platform relies on. Without these the profile-view tracker,
-- rating recomputer, and contact form would 500 on carwash rows.
-- ============================================================================

-- reviews_provider_type_check (mig 0072 ... 0219) — allow 'carwash'
alter table public.reviews
  drop constraint if exists reviews_provider_type_check;
alter table public.reviews
  add constraint reviews_provider_type_check
  check (provider_type is null or provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring', 'pet', 'mover', 'tailor', 'carwash'
  ));

-- provider_profile_views CHECK (mig 0072 ... 0219) — allow 'carwash'
alter table public.provider_profile_views
  drop constraint if exists provider_profile_views_provider_type_check;
alter table public.provider_profile_views
  add constraint provider_profile_views_provider_type_check
  check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring', 'pet', 'mover', 'tailor', 'carwash'
  ));

-- bump_provider_visitor_count (mig 0072 ... 0219) — add 'carwash' case
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
    else
      return new;
  end case;
  return new;
end;
$$;

-- _recompute_provider_rating (mig 0075 ... 0219) — add 'carwash' case
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
    when 'tour_guide' then update public.tour_guide_listings  set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    when 'bike_rental' then update public.bike_rentals        set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    else null;
  end case;
end;
$$;

-- contact_messages provider_type CHECK (mig 0137 ... 0219) — allow 'carwash'
alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;
alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','tattoo','barber','photo','video','catering','cake','florist','fitness','yoga','tutoring','pet','mover','tailor','carwash'
  ));

-- contact_messages_own_select RLS — add 'carwash' branch
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
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

-- payment_intents.product CHECK (mig 0068 ... 0219) — add carwash_monthly + carwash_yearly
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
    'carwash_monthly',     'carwash_yearly'
  ));

-- extend_carwash_on_payment trigger — mirrors the verticals in mig 0068 ... 0219
create or replace function public.extend_carwash_on_payment()
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
  if new.product not in ('carwash_monthly','carwash_yearly') then
    return new;
  end if;

  v_plan := case when new.product = 'carwash_yearly' then 'yearly' else 'monthly' end;

  select coalesce(paid_until, now())
    into v_basis
    from public.carwash_providers
    where user_id = new.driver_user_id
    for update;

  if v_basis is null then return new; end if;
  if v_basis < now() then v_basis := now(); end if;

  update public.carwash_providers
  set subscription_status = 'active',
      paid_until          = v_basis + (new.extends_days || ' days')::interval,
      updated_at          = now()
  where user_id = new.driver_user_id;

  return new;
end;
$body$;

drop trigger if exists pi_extend_carwash on public.payment_intents;
create trigger pi_extend_carwash
  after update of status on public.payment_intents
  for each row execute function public.extend_carwash_on_payment();

-- Seed ONE demo car wash business — Anto Cuci Mobil & Motor, Yogyakarta.
-- Clean water blue theme (#0284C7) with white CTA. Stock Unsplash
-- car-wash image (HEAD-verified image/jpeg before commit). Idempotent:
-- on conflict (slug) do update keeps the demo row in sync with the
-- schema. Note: no `demo-` slug prefix — flagged with is_mock=true
-- instead.
insert into public.carwash_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  specialties, hourly_rate_idr, day_rate_idr, has_own_tools,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  theme_color, button_text_color,
  availability, status, rating, rating_count
)
values
  (true, null, 'carwash-anto-bersih', 'Anto Cuci Mobil & Motor', 8,
    'Cuci motor + mobil semua ukuran (LCGC sampai SUV), panggilan ke rumah dalam kota Yogya. Peralatan profesional, shampoo non-acid, lap microfiber bersih. Detailing + poles + coating ceramic 9H tersedia. Member card 10x cuci diskon. Antar-jemput dalam kota.',
    array['mobil_sedang','suv','detailing']::text[], 15000, 3500000, true,
    'Yogyakarta', 'Yogya · DIY · panggilan ke rumah dalam kota · antar-jemput tersedia · member card 10x diskon · garansi coating 1 tahun', '+62000000514',
    'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=1200&auto=format&fit=crop',
    '#0284C7', '#FFFFFF',
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
-- Seed PortfolioCarousel entries for carwash-anto-bersih — mirrors 0219's
-- pattern for the tailor demo. Flat JSONB array of {name, description,
-- price_idr, url}. Photo URLs are Unsplash CDN, all HEAD-verified 200
-- OK image/jpeg on 2026-06-09 and unique across all entries (including
-- the profile image above).
--
-- Pricing follows the vehicle-size + wash-level matrix:
--   • Cuci Motor Body Only (Express 15 menit) Rp 15k — shampoo +
--     bilas + lap kering, motor matic/sport semua ukuran, parkir
--     tertib di lokasi; the floor for motor wash market
--   • Cuci Mobil Sedang Body + Dalam Rp 50k — body + interior vacuum
--     + dashboard glow, 30-45 menit, cocok harian; the floor for
--     mobil sedang body+dalam market
--   • Detailing Premium SUV (Full Day) Rp 350k — body + dalam + engine
--     bay + poles + wax, 3-4 jam, premium clay-bar treatment; the
--     floor for detailing premium SUV market
--   • Coating Ceramic 9H Mobil (Garansi 1 Tahun) Rp 3.5jt — anti-gores
--     + anti-jamur + super hydrophobic, garansi resmi, mobil sedang/
--     SUV; the entry tier for ceramic coating market with garansi
--
-- Idempotent — re-running just re-asserts the same array.
-- ============================================================================
update public.carwash_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1601362840469-51e4d8d58785',
      'name',        'Cuci Motor Body Only (Express 15 menit)',
      'description', 'Rp 15,000 — shampoo + bilas + lap kering, motor matic/sport semua ukuran, parkir tertib di lokasi. Floor price untuk cuci motor market Yogya. Selesai 15 menit, antri biasa pagi & sore.',
      'price_idr',   15000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f',
      'name',        'Cuci Mobil Sedang Body + Dalam',
      'description', 'Rp 50,000 — body + interior vacuum + dashboard glow, 30-45 menit, cocok harian. Untuk LCGC / hatchback +Rp 10k off; untuk SUV +Rp 20k. Panggilan ke rumah dalam kota Yogya tambah Rp 30k.',
      'price_idr',   50000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1542621334-a254cf47733d',
      'name',        'Detailing Premium SUV (Full Day)',
      'description', 'Rp 350,000 — body + dalam + engine bay + poles + wax, 3-4 jam, premium clay-bar treatment. Untuk mobil sedang Rp 250k; untuk MPV besar (Innova/Alphard) Rp 450k. Include leather treatment dashboard.',
      'price_idr',   350000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7',
      'name',        'Coating Ceramic 9H Mobil (Garansi 1 Tahun)',
      'description', 'Rp 3,500,000 — anti-gores + anti-jamur + super hydrophobic, garansi resmi 1 tahun, mobil sedang/SUV. Lead time 2 hari (surface prep + clay-bar + apply + cure). Untuk SUV besar +Rp 1-2jt depending size.',
      'price_idr',   3500000
    )
  ),
  updated_at = now()
where slug = 'carwash-anto-bersih';
