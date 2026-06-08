-- ============================================================================
-- 0216 — Tutoring / Private Tutor (Les Privat) vertical (Phase 10 of 15
-- new lifestyle categories)
-- ----------------------------------------------------------------------------
-- Mirrors yoga_providers byte-for-byte at the column level (0215),
-- with five semantic tweaks for the independent Indonesian private
-- tutor / les privat industry:
--   • specialties vocab = subject + exam-prep tracks the tutor
--     offers (math, physics, chemistry, biology, english, bahasa,
--     mengaji, coding, music, sat_toefl_ielts, utbk_sbmptn,
--     cambridge_ib, mixed, other). Indonesian indie tutors cluster
--     around the academic core (math + physics) plus the two
--     language anchors (english + bahasa) and the religious staple
--     (mengaji — tartil/tajwid/hafalan juz 30 for SD-SMP). The two
--     exam-prep tracks (UTBK/SBMPTN for masuk PTN and SAT/TOEFL/IELTS
--     for studi luar negeri) carry 2-3× the price of regular subjects
--     so they're their own genre. cambridge_ib flags Cambridge
--     curriculum / IB Diploma fluency for the international-school
--     market.
--   • theme_color default = '#2563EB' (knowledge / academic blue) —
--     scholarly, trustworthy, knowledge-anchored. Reads as
--     study-and-focus vs yoga's breath-violet and fitness's sport-
--     blue. button_text_color = '#FFFFFF' so the CTA pills read
--     clean white-on-blue, high contrast.
--   • pricing — hourly_rate_idr is reused as the per-PERTEMUAN
--     (per-session) price (the unit Indonesian parents and students
--     quote — e.g. "Rp 120k per pertemuan 90 menit" for SMA math).
--     Distinct from yoga because tutoring is INDIVIDUAL (1-on-1 or
--     small-group 2-4 students max) so per-pertemuan prices are
--     higher than group yoga drop-ins. Local rates: SD math Rp 80k,
--     SMP math/physics Rp 100k, SMA math/physics Rp 120-150k, UTBK
--     SBMPTN Rp 200-300k, English conversation Rp 150k, mengaji
--     anak SD-SMP Rp 80k. day_rate_idr becomes the optional PACKAGE
--     BUNDLE (paket 8x, 12x, monthly intensive — e.g. Rp 2.2jt for
--     UTBK 12x with simulasi mingguan, ~15% discount vs per-session).
--     Pricing FLOOR is Rp 80k (SD math + mengaji anak — anak SD-SMP
--     market). Online via Zoom is the cheap baseline; "datang ke
--     rumah" (home-visit) carries a Rp 20-30k surcharge in most
--     metros.
--   • has_own_tools boolean repurposed as "Datang ke rumah" (home-
--     visit available vs online/studio only). Defaults true since
--     Indonesian indie tutors typically offer home-visit as the
--     premium option, with online via Zoom as the cheaper
--     alternative. Music + coding tutors with own studio may sit on
--     false.
--   • bio mentions qualifikasi (S1 / S2 / S3 jurusan + kampus,
--     sertifikat, pengalaman tahun, kurikulum Merdeka / Cambridge /
--     IB). Tutor credentialing in Indonesia is informal (no SKKNI
--     yet — bimbel franchises certify their own staff); the
--     qualifikasi-in-bio is the de-facto trust signal. Specialties
--     vocab cap stays at 3 so the profile card stays scannable.
-- ============================================================================

create table if not exists public.tutoring_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Specialties — multi-select text[] from the canonical list in
  -- src/lib/tutoring/types.ts. CHECK constrains to that vocab.
  specialties text[] not null default '{}'
    check (specialties <@ array[
      'math','physics','chemistry','biology',
      'english','bahasa','mengaji',
      'coding','music',
      'sat_toefl_ielts','utbk_sbmptn','cambridge_ib',
      'mixed','other'
    ]::text[]),

  -- Cap at 3 specialties — same UX rule as cake / catering / photo / barber / handyman / tattoo / video / florist / fitness / yoga.
  constraint tutoring_providers_specialties_max3
    check (coalesce(array_length(specialties, 1), 0) between 1 and 3),

  -- Pricing — per-pertemuan (hourly_rate_idr column kept for renderer
  -- parity; surfaces as "Per pertemuan from" on dashboard). Optional
  -- package bundle (day_rate_idr column). CHECK enforces at least
  -- one is set so every public card shows a starting-from number.
  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),
  constraint tutoring_providers_at_least_one_price
    check (
      hourly_rate_idr is not null
      or day_rate_idr is not null
    ),

  -- "Own tools" stays as a generic boolean — for tutoring it means
  -- "Datang ke rumah" (home-visit available vs online/studio only).
  -- Defaults true since Indonesian indie tutors typically offer
  -- home-visit as the premium option, with online via Zoom as the
  -- cheap baseline.
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

  -- Per-provider theme accent (mig 0087 equiv). Default academic
  -- blue so scholarly / trustworthy / knowledge-anchored energy
  -- reads — distinct from yoga's breath-violet and fitness's
  -- sport-blue.
  theme_color      text default '#2563EB'
                   check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$'),
  -- Tutoring-specific: CTA label colour. Defaults to white so on the
  -- default academic-blue brand the contrast is white-on-blue, high
  -- contrast for the CTA pills. mig 0202 mirror for tutoring.
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

  -- Use tutorp_ prefix to avoid colliding with yoga's yogap_*
  -- policy/constraint namespace (and the rest).
  constraint tutorp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  ),
  constraint tutoring_providers_gallery_max check (
    gallery_image_urls is null
    or array_length(gallery_image_urls, 1) is null
    or array_length(gallery_image_urls, 1) <= 12
  )
);

create index if not exists idx_tutorp_listing
  on public.tutoring_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_tutorp_owner
  on public.tutoring_providers (user_id);
create index if not exists idx_tutorp_specialties
  on public.tutoring_providers using gin (specialties)
  where status = 'active';

-- updated_at touch trigger (mirrors yoga / fitness / etc).
create or replace function public.touch_tutoring_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_tutoring_providers on public.tutoring_providers;
create trigger trg_touch_tutoring_providers
  before update on public.tutoring_providers
  for each row execute function public.touch_tutoring_providers();

-- Hide-mock-on-real-signup trigger (mirrors yoga 0215 / fitness 0214).
create or replace function public.hide_one_mock_tutoring_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.tutoring_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.tutoring_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_tutoring_signup on public.tutoring_providers;
create trigger trg_hide_mock_on_real_tutoring_signup
  after insert on public.tutoring_providers
  for each row execute function public.hide_one_mock_tutoring_provider();

-- RLS — mirrors yoga policies, renamed tutorp_*.
alter table public.tutoring_providers enable row level security;
drop policy if exists tutorp_public_select on public.tutoring_providers;
create policy tutorp_public_select on public.tutoring_providers
  for select to anon, authenticated using (status = 'active');
drop policy if exists tutorp_owner_select on public.tutoring_providers;
create policy tutorp_owner_select on public.tutoring_providers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists tutorp_owner_update on public.tutoring_providers;
create policy tutorp_owner_update on public.tutoring_providers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bookings table (mig 0090 equiv).
create table if not exists public.tutoring_bookings (
  id                 uuid primary key default gen_random_uuid(),
  tutoring_id        uuid not null references public.tutoring_providers(id) on delete cascade,
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

create index if not exists tutoring_bookings_by_provider_date
  on public.tutoring_bookings (tutoring_id, requested_date desc);
create index if not exists tutoring_bookings_pending
  on public.tutoring_bookings (tutoring_id, status)
  where status = 'pending';

create or replace function public.touch_tutoring_bookings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_tutoring_bookings_touch on public.tutoring_bookings;
create trigger trg_tutoring_bookings_touch
  before update on public.tutoring_bookings
  for each row execute function public.touch_tutoring_bookings_updated_at();

alter table public.tutoring_bookings enable row level security;
drop policy if exists tutoring_bookings_owner_read on public.tutoring_bookings;
create policy tutoring_bookings_owner_read on public.tutoring_bookings
  for select using (
    exists (
      select 1 from public.tutoring_providers vp
      where vp.id = tutoring_bookings.tutoring_id
        and vp.user_id = auth.uid()
    )
  );
drop policy if exists tutoring_bookings_owner_update on public.tutoring_bookings;
create policy tutoring_bookings_owner_update on public.tutoring_bookings
  for update using (
    exists (
      select 1 from public.tutoring_providers vp
      where vp.id = tutoring_bookings.tutoring_id
        and vp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Wire 'tutoring' into the polymorphic constraints / triggers that
-- the rest of the platform relies on. Without these the profile-view
-- tracker, rating recomputer, and contact form would 500 on tutoring
-- rows.
-- ============================================================================

-- reviews_provider_type_check (mig 0072 ... 0215) — allow 'tutoring'
alter table public.reviews
  drop constraint if exists reviews_provider_type_check;
alter table public.reviews
  add constraint reviews_provider_type_check
  check (provider_type is null or provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring'
  ));

-- provider_profile_views CHECK (mig 0072 ... 0215) — allow 'tutoring'
alter table public.provider_profile_views
  drop constraint if exists provider_profile_views_provider_type_check;
alter table public.provider_profile_views
  add constraint provider_profile_views_provider_type_check
  check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness', 'yoga', 'tutoring'
  ));

-- bump_provider_visitor_count (mig 0072 ... 0215) — add 'tutoring' case
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
    else
      return new;
  end case;
  return new;
end;
$$;

-- _recompute_provider_rating (mig 0075 ... 0215) — add 'tutoring' case
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
    when 'tour_guide' then update public.tour_guide_listings  set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    when 'bike_rental' then update public.bike_rentals        set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    else null;
  end case;
end;
$$;

-- contact_messages provider_type CHECK (mig 0137 ... 0215) — allow 'tutoring'
alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;
alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','tattoo','barber','photo','video','catering','cake','florist','fitness','yoga','tutoring'
  ));

-- contact_messages_own_select RLS — add 'tutoring' branch
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
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

-- payment_intents.product CHECK (mig 0068 ... 0215) — add tutoring_monthly + tutoring_yearly
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
    'tutoring_monthly',    'tutoring_yearly'
  ));

-- extend_tutoring_on_payment trigger — mirrors the verticals in mig 0068 ... 0215
create or replace function public.extend_tutoring_on_payment()
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
  if new.product not in ('tutoring_monthly','tutoring_yearly') then
    return new;
  end if;

  v_plan := case when new.product = 'tutoring_yearly' then 'yearly' else 'monthly' end;

  select coalesce(paid_until, now())
    into v_basis
    from public.tutoring_providers
    where user_id = new.driver_user_id
    for update;

  if v_basis is null then return new; end if;
  if v_basis < now() then v_basis := now(); end if;

  update public.tutoring_providers
  set subscription_status = 'active',
      paid_until          = v_basis + (new.extends_days || ' days')::interval,
      updated_at          = now()
  where user_id = new.driver_user_id;

  return new;
end;
$body$;

drop trigger if exists pi_extend_tutoring on public.payment_intents;
create trigger pi_extend_tutoring
  after update of status on public.payment_intents
  for each row execute function public.extend_tutoring_on_payment();

-- Seed ONE demo tutor — Pak Rahmat, Yogyakarta. Academic blue
-- theme (#2563EB) with white CTA. Stock Unsplash tutor image (HEAD-
-- verified image/jpeg before commit). Idempotent: on conflict (slug)
-- do update keeps the demo row in sync with the schema.
insert into public.tutoring_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  specialties, hourly_rate_idr, day_rate_idr, has_own_tools,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  theme_color, button_text_color,
  availability, status, rating, rating_count
)
values
  (true, null, 'demo-tutoring-rahmat', 'Pak Rahmat — Les Privat', 8,
    'S1 Pendidikan Matematika UNY 2018, spesialis SMP-SMA matematika fisika + persiapan UTBK SBMPTN. Pengalaman 8 tahun ngajar les privat, alumni jadi mahasiswa UI/ITB/UGM. Datang ke rumah Yogya/Sleman atau online via Zoom. Gratis trial 30 menit dulu, kalau cocok baru lanjut.',
    array['math','physics','utbk_sbmptn']::text[], 120000, 2200000, true,
    'Yogyakarta', 'Yogya · Sleman · Bantul · datang ke rumah / online via Zoom · kurikulum Merdeka + Cambridge', '+62000000510',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&auto=format&fit=crop',
    '#2563EB', '#FFFFFF',
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
-- Seed PortfolioCarousel entries for demo-tutoring-rahmat — mirrors
-- 0215's pattern for the yoga demo. Flat JSONB array of {name,
-- description, price_idr, url}. Photo URLs are Unsplash CDN, all
-- HEAD-verified 200 OK image/jpeg on 2026-06-08 and unique across all
-- entries (including the profile image above).
--
-- Pricing follows the per-pertemuan + package-discount model:
--   • SMA math per pertemuan Rp 120k (90-min, kurikulum Merdeka /
--     Cambridge, drill soal + konsep, datang ke rumah)
--   • UTBK SBMPTN paket 12x Rp 2.2jt = Rp 183k/sesi (hemat 15% vs
--     per-sesi UTBK Rp 215k baseline; 12 pertemuan TPS + TKA,
--     simulasi mingguan, target masuk PTN)
--   • English conversation online Rp 150k (60-min via Zoom,
--     business / casual / IELTS prep, fokus speaking + writing)
--   • Mengaji anak SD-SMP Rp 80k (45-min per pertemuan, datang ke
--     rumah, tartil + tajwid + hafalan juz 30) — the floor price
--     for the anak SD-SMP religious-tutoring market
--
-- Idempotent — re-running just re-asserts the same array.
-- ============================================================================
update public.tutoring_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
      'name',        'Matematika SMA per Pertemuan',
      'description', 'Rp 120,000 — 90 menit, kurikulum Merdeka / Cambridge, drill soal + konsep, datang ke rumah Yogya. Untuk SMA kelas 10-12 yang butuh perhatian penuh per sesi.',
      'price_idr',   120000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1523240795612-9a054b0db644',
      'name',        'Persiapan UTBK SBMPTN Paket 12x',
      'description', 'Rp 183k/sesi (hemat 15% vs per-sesi). 12 pertemuan TPS + TKA, simulasi mingguan, target masuk PTN (UI/ITB/UGM/Unair). Cocok untuk kelas 12 + alumni.',
      'price_idr',   2200000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
      'name',        'English Conversation Online',
      'description', '60 menit via Zoom — business English, casual conversation, atau IELTS prep. Fokus speaking + writing, materi disesuaikan goal kamu. Akses recording 7 hari.',
      'price_idr',   150000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1488998427799-e3362cec87c3',
      'name',        'Mengaji Anak (SD-SMP) Mingguan',
      'description', '45 menit per pertemuan, datang ke rumah. Tartil + tajwid + hafalan juz 30. Untuk anak SD kelas 1-6 dan SMP kelas 7-9. Sabar, ramah anak, pelan-pelan.',
      'price_idr',   80000
    )
  ),
  updated_at = now()
where slug = 'demo-tutoring-rahmat';
