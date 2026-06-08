-- ============================================================================
-- 0214 — Fitness / Personal Trainer vertical (Phase 8 of 15 new lifestyle
-- categories)
-- ----------------------------------------------------------------------------
-- Mirrors florist_providers byte-for-byte at the column level (0213), with
-- five semantic tweaks for the independent Indonesian personal trainer /
-- fitness coach industry:
--   • specialties vocab = training type the coach covers (strength,
--     hiit, yoga, pilates, boxing, functional, weight_loss, muscle_gain,
--     postnatal, senior, online, outdoor, mixed, other) — Indonesian
--     indie PTs cluster around fat-loss + muscle-gain (the two most
--     searched goals), plus the lifestyle modalities (yoga, pilates,
--     boxing) that drive small-group classes. `online` is its own genre
--     because video-call coaching has its own pricing curve. `outdoor`
--     covers sunrise track / pantai / car-free-day sessions.
--   • theme_color default = '#0EA5E9' (sky blue) — sport / active energy.
--     Reads as clean, energetic, sweat-and-water vs florist's botanical
--     green / cake's bakery pink. button_text_color = '#FFFFFF' so the
--     CTA pills read clean white-on-blue, high contrast.
--   • pricing — hourly_rate_idr is reused as the per-SESSION drop-in
--     price (per-session, NOT per-pax — most PTs in Indonesia quote
--     "Rp 200k/sesi 60 menit" for a single drop-in, then offer 5-pack
--     or 10-pack discount tiers). Distinct from florist's per-arrangement
--     because clients buy COMMITMENT PACKAGES, not individual items —
--     the 10-pack carries a 10% discount as the standard PT business
--     model (Rp 200k drop-in → Rp 180k/sesi for 10-pack). day_rate_idr
--     becomes the optional MONTHLY COACHING bundle (e.g. 12 sesi/bulan
--     + nutrition plan + WA check-in 24/7, from Rp 2.5jt). Keeping the
--     column names matches the shared marketplace renderer; only the
--     dashboard + profile label changes ("Drop-in from" / "Monthly
--     coaching"). Pricing FLOOR is Rp 200k (single drop-in), higher
--     than florist's Rp 150k because PT is hands-on time-intensive
--     work and Indonesian indie PTs don't sell sessions below Rp 200k
--     in 2026 (small group / community-class formats are the exception
--     but those are reserved for the catalog's photo-tier).
--   • has_own_tools boolean repurposed as "Trainer brings equipment"
--     (resistance bands, suspension trainer, kettlebell, jump rope vs
--     gym-equipment only). Defaults true since Indonesian indie PTs
--     typically carry a small kit for home / outdoor sessions — the
--     client doesn't always have weights at home and outdoor sessions
--     need portable gear.
--   • bio mentions certification (ACE-CPT / NASM-CPT / ISSA / local
--     SKKNI) — fitness is a regulated profession in Indonesia under
--     SKKNI Kepelatihan Olahraga. The bio is the trust signal here;
--     specialties vocab cap stays at 3 so the profile card stays
--     scannable while the bio carries the cert credentials.
-- ============================================================================

create table if not exists public.fitness_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Specialties — multi-select text[] from the canonical list in
  -- src/lib/fitness/types.ts. CHECK constrains to that vocab.
  specialties text[] not null default '{}'
    check (specialties <@ array[
      'strength','hiit','yoga','pilates','boxing','functional',
      'weight_loss','muscle_gain','postnatal','senior',
      'online','outdoor','mixed','other'
    ]::text[]),

  -- Cap at 3 specialties — same UX rule as cake / catering / photo / barber / handyman / tattoo / video / florist.
  constraint fitness_providers_specialties_max3
    check (coalesce(array_length(specialties, 1), 0) between 1 and 3),

  -- Pricing — per-session drop-in (hourly_rate_idr column kept for
  -- renderer parity; surfaces as "Drop-in from" on dashboard).
  -- Optional monthly coaching bundle (day_rate_idr column). CHECK
  -- enforces at least one is set so every public card shows a
  -- starting-from number.
  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),
  constraint fitness_providers_at_least_one_price
    check (
      hourly_rate_idr is not null
      or day_rate_idr is not null
    ),

  -- "Own tools" stays as a generic boolean — for fitness it means
  -- "Trainer brings equipment" (resistance bands, suspension trainer,
  -- kettlebell, jump rope vs gym-equipment only). Defaults true since
  -- Indonesian indie PTs typically carry a small kit for home /
  -- outdoor sessions.
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

  -- Per-provider theme accent (mig 0087 equiv). Default sky blue
  -- so sport / active energy reads — distinct from florist's
  -- botanical green and cake's bakery pink.
  theme_color      text default '#0EA5E9'
                   check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$'),
  -- Fitness-specific: CTA label colour. Defaults to white so on the
  -- default sky-blue brand the contrast is white-on-blue, high contrast
  -- for the CTA pills. mig 0202 mirror for fitness.
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

  -- Use fitnessp_ prefix to avoid colliding with florist's floristp_*
  -- policy/constraint namespace (and cake's cakep_* / catering's
  -- caterp_* / photo's photop_* / barber's barberp_* / handyman's hp_* /
  -- tattoo's tp_* / video's videop_*).
  constraint fitnessp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  ),
  constraint fitness_providers_gallery_max check (
    gallery_image_urls is null
    or array_length(gallery_image_urls, 1) is null
    or array_length(gallery_image_urls, 1) <= 12
  )
);

create index if not exists idx_fitnessp_listing
  on public.fitness_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_fitnessp_owner
  on public.fitness_providers (user_id);
create index if not exists idx_fitnessp_specialties
  on public.fitness_providers using gin (specialties)
  where status = 'active';

-- updated_at touch trigger (mirrors cake / catering / photo / barber / handyman / tattoo / video / florist).
create or replace function public.touch_fitness_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_fitness_providers on public.fitness_providers;
create trigger trg_touch_fitness_providers
  before update on public.fitness_providers
  for each row execute function public.touch_fitness_providers();

-- Hide-mock-on-real-signup trigger (mirrors cake 0212 / florist 0213).
create or replace function public.hide_one_mock_fitness_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.fitness_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.fitness_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_fitness_signup on public.fitness_providers;
create trigger trg_hide_mock_on_real_fitness_signup
  after insert on public.fitness_providers
  for each row execute function public.hide_one_mock_fitness_provider();

-- RLS — mirrors florist policies, renamed fitnessp_*.
alter table public.fitness_providers enable row level security;
drop policy if exists fitnessp_public_select on public.fitness_providers;
create policy fitnessp_public_select on public.fitness_providers
  for select to anon, authenticated using (status = 'active');
drop policy if exists fitnessp_owner_select on public.fitness_providers;
create policy fitnessp_owner_select on public.fitness_providers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists fitnessp_owner_update on public.fitness_providers;
create policy fitnessp_owner_update on public.fitness_providers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bookings table (mig 0090 equiv).
create table if not exists public.fitness_bookings (
  id                 uuid primary key default gen_random_uuid(),
  fitness_id         uuid not null references public.fitness_providers(id) on delete cascade,
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

create index if not exists fitness_bookings_by_provider_date
  on public.fitness_bookings (fitness_id, requested_date desc);
create index if not exists fitness_bookings_pending
  on public.fitness_bookings (fitness_id, status)
  where status = 'pending';

create or replace function public.touch_fitness_bookings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_fitness_bookings_touch on public.fitness_bookings;
create trigger trg_fitness_bookings_touch
  before update on public.fitness_bookings
  for each row execute function public.touch_fitness_bookings_updated_at();

alter table public.fitness_bookings enable row level security;
drop policy if exists fitness_bookings_owner_read on public.fitness_bookings;
create policy fitness_bookings_owner_read on public.fitness_bookings
  for select using (
    exists (
      select 1 from public.fitness_providers vp
      where vp.id = fitness_bookings.fitness_id
        and vp.user_id = auth.uid()
    )
  );
drop policy if exists fitness_bookings_owner_update on public.fitness_bookings;
create policy fitness_bookings_owner_update on public.fitness_bookings
  for update using (
    exists (
      select 1 from public.fitness_providers vp
      where vp.id = fitness_bookings.fitness_id
        and vp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Wire 'fitness' into the polymorphic constraints / triggers that the
-- rest of the platform relies on. Without these the profile-view
-- tracker, rating recomputer, and contact form would 500 on fitness
-- rows.
-- ============================================================================

-- reviews_provider_type_check (mig 0072 / 0207 / 0208 / 0210 / 0211 / 0212 / 0213) — allow 'fitness'
alter table public.reviews
  drop constraint if exists reviews_provider_type_check;
alter table public.reviews
  add constraint reviews_provider_type_check
  check (provider_type is null or provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness'
  ));

-- provider_profile_views CHECK (mig 0072 / 0207 / 0208 / 0210 / 0211 / 0212 / 0213) — allow 'fitness'
alter table public.provider_profile_views
  drop constraint if exists provider_profile_views_provider_type_check;
alter table public.provider_profile_views
  add constraint provider_profile_views_provider_type_check
  check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering', 'cake', 'florist', 'fitness'
  ));

-- bump_provider_visitor_count (mig 0072 / 0207 / 0208 / 0210 / 0211 / 0212 / 0213) — add 'fitness' case
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
    else
      return new;
  end case;
  return new;
end;
$$;

-- _recompute_provider_rating (mig 0075 / 0207 / 0208 / 0210 / 0211 / 0212 / 0213) — add 'fitness' case
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
    when 'tour_guide' then update public.tour_guide_listings  set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    when 'bike_rental' then update public.bike_rentals        set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    else null;
  end case;
end;
$$;

-- contact_messages provider_type CHECK (mig 0137 / 0207 / 0208 / 0210 / 0211 / 0212 / 0213) — allow 'fitness'
alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;
alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','tattoo','barber','photo','video','catering','cake','florist','fitness'
  ));

-- contact_messages_own_select RLS — add 'fitness' branch
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
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

-- payment_intents.product CHECK (mig 0068 / 0207 / 0208 / 0210 / 0211 / 0212 / 0213) — add fitness_monthly + fitness_yearly
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
    'fitness_monthly',     'fitness_yearly'
  ));

-- extend_fitness_on_payment trigger — mirrors the verticals in mig 0068 / 0207 / 0208 / 0210 / 0211 / 0212 / 0213
create or replace function public.extend_fitness_on_payment()
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
  if new.product not in ('fitness_monthly','fitness_yearly') then
    return new;
  end if;

  v_plan := case when new.product = 'fitness_yearly' then 'yearly' else 'monthly' end;

  select coalesce(paid_until, now())
    into v_basis
    from public.fitness_providers
    where user_id = new.driver_user_id
    for update;

  if v_basis is null then return new; end if;
  if v_basis < now() then v_basis := now(); end if;

  update public.fitness_providers
  set subscription_status = 'active',
      paid_until          = v_basis + (new.extends_days || ' days')::interval,
      updated_at          = now()
  where user_id = new.driver_user_id;

  return new;
end;
$body$;

drop trigger if exists pi_extend_fitness on public.payment_intents;
create trigger pi_extend_fitness
  after update of status on public.payment_intents
  for each row execute function public.extend_fitness_on_payment();

-- Seed ONE demo personal trainer — Coach Galih, Yogyakarta. Sky-blue
-- theme (#0EA5E9) with white CTA. Stock Unsplash personal-trainer image
-- (HEAD-verified image/jpeg before commit). Idempotent: on conflict
-- (slug) do update keeps the demo row in sync with the schema.
insert into public.fitness_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  specialties, hourly_rate_idr, day_rate_idr, has_own_tools,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  theme_color, button_text_color,
  availability, status, rating, rating_count
)
values
  (true, null, 'demo-fitness-galih', 'Coach Galih', 7,
    'Sertifikat ACE-CPT, spesialis fat-loss + muscle-gain. Sesi 60 menit di gym, rumah, atau outdoor (pantai/sunrise track). Paket 10-pack diskon 10%. Free konsultasi nutrisi awal — body assessment + meal plan disesuaikan goal. WA check-in setiap hari.',
    array['strength','weight_loss','muscle_gain']::text[], 200000, 2500000, true,
    'Yogyakarta', 'Yogya · Sleman · Bantul · gym/rumah/outdoor · online via Zoom OK', '+62000000508',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&auto=format&fit=crop',
    '#0EA5E9', '#FFFFFF',
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
-- Seed PortfolioCarousel entries for demo-fitness-galih — mirrors
-- 0213's pattern for the florist demo. Flat JSONB array of {name,
-- description, price_idr, url}. Photo URLs are Unsplash CDN, all
-- HEAD-verified 200 OK image/jpeg on 2026-06-08 and unique across all
-- entries (including the profile image above).
--
-- Pricing follows the per-session-with-package-discounts model:
--   • Drop-in Rp 200k (single session)
--   • 10-pack Rp 1.8jt = Rp 180k/sesi (10% discount, the standard PT
--     industry commitment tier)
--   • Pair Rp 300k (2 orang sharing one 60-minute slot)
--   • Monthly Rp 2.5jt (12 sesi + nutrition plan + WA 24/7) — the
--     premium retention tier
--
-- Idempotent — re-running just re-asserts the same array.
-- ============================================================================
update public.fitness_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
      'name',        'Personal Training Drop-in 1-on-1',
      'description', '60 menit, gym/rumah/outdoor pilih lokasi. Program disesuaikan dengan goal (fat-loss / muscle-gain / strength). Trainer bawa resistance band + kettlebell untuk sesi rumah/outdoor.',
      'price_idr',   200000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
      'name',        '10-Pack Personal Training',
      'description', 'Rp 180k/sesi (hemat 10% dari drop-in). Valid 3 bulan, jadwal fleksibel. Free body assessment + foto progress di sesi pertama dan terakhir. Cocok untuk transformasi 8-12 minggu.',
      'price_idr',   1800000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1599058917212-d750089bc07e',
      'name',        'Pair Training (2 orang)',
      'description', '60 menit untuk 2 orang — cocok pasangan/teman yang mau workout bareng. Motivasi extra dengan partner yang sama-sama push. Trainer adjust intensitas per orang.',
      'price_idr',   300000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1594381898411-846e7d193883',
      'name',        'Monthly Coaching + Nutrition',
      'description', '12 sesi/bulan + meal plan personal sesuai goal (defisit / surplus / maintenance) + check-in WA 24/7. Body composition test bulanan. Tier paling efektif untuk komitmen jangka panjang.',
      'price_idr',   2500000
    )
  ),
  updated_at = now()
where slug = 'demo-fitness-galih';
