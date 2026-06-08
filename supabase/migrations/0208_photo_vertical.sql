-- ============================================================================
-- 0208 — Photo vertical (Phase 3 of 15 new lifestyle categories)
-- ----------------------------------------------------------------------------
-- Mirrors barber_providers byte-for-byte at the column level, with three
-- semantic tweaks for the independent photographer industry:
--   • specialties vocab = photographic genres (wedding, prewedding,
--     family, headshot, fashion, product, food, event, editorial,
--     travel, lifestyle, mixed, other) — not chair-side services or
--     trades or art styles.
--   • theme_color default = '#1F2937' (deep slate / charcoal) —
--     photography studios trend dark/charcoal aesthetics so finished
--     work pops against the chrome. button_text_color = '#FFFFFF'
--     so the CTA pills read clean white-on-slate, high contrast.
--   • pricing — hourly_rate_idr is reused as the "package from"
--     starter price (e.g. Rp 1,500,000 mini session) since the
--     photography industry quotes per-package, not per-hour.
--     day_rate_idr becomes the optional full-day rate (e.g. wedding
--     documentation, editorial full-day). Keeping the column names
--     matches the shared marketplace renderer; only the dashboard +
--     profile label changes ("Package from" / "Full-day").
--   • has_own_tools boolean repurposed as "travels to client" (on-
--     location vs studio-only). Most Indonesian indie photographers
--     travel to the venue / home / restaurant so it defaults true.
-- ============================================================================

create table if not exists public.photo_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Specialties — multi-select text[] from the canonical list in
  -- src/lib/photo/types.ts. CHECK constrains to that vocab.
  specialties text[] not null default '{}'
    check (specialties <@ array[
      'wedding','prewedding','family','headshot','fashion',
      'product','food','event','editorial','travel','lifestyle',
      'mixed','other'
    ]::text[]),

  -- Cap at 3 specialties — same UX rule as barber / handyman / tattoo.
  constraint photo_providers_specialties_max3
    check (coalesce(array_length(specialties, 1), 0) between 1 and 3),

  -- Pricing — per-package starter (hourly_rate_idr column kept for
  -- renderer parity; surfaces as "Package from" on dashboard).
  -- Optional full-day (day_rate column). CHECK enforces at least one
  -- is set so every public card shows a starting-from number.
  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),
  constraint photo_providers_at_least_one_price
    check (
      hourly_rate_idr is not null
      or day_rate_idr is not null
    ),

  -- "Own tools" stays as a generic boolean — for photo it means
  -- "travels to client" (on-location vs studio-only). Most Indonesian
  -- indie photogs travel so this defaults true.
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

  -- Per-provider theme accent (mig 0087 equiv). Default deep slate /
  -- charcoal so the imagery pops against it.
  theme_color      text default '#1F2937'
                   check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$'),
  -- Photo-specific: CTA label colour. Defaults to white so on the
  -- default slate brand the contrast is white-on-slate, high
  -- contrast for the CTA pills. mig 0202 mirror for photo.
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

  -- Use photop_ prefix to avoid colliding with barber's barberp_*
  -- policy/constraint namespace (and beautician's bp_* / handyman's
  -- hp_* / tattoo's tp_*).
  constraint photop_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  ),
  constraint photo_providers_gallery_max check (
    gallery_image_urls is null
    or array_length(gallery_image_urls, 1) is null
    or array_length(gallery_image_urls, 1) <= 12
  )
);

create index if not exists idx_photop_listing
  on public.photo_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_photop_owner
  on public.photo_providers (user_id);
create index if not exists idx_photop_specialties
  on public.photo_providers using gin (specialties)
  where status = 'active';

-- updated_at touch trigger (mirrors barber / handyman / tattoo).
create or replace function public.touch_photo_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_photo_providers on public.photo_providers;
create trigger trg_touch_photo_providers
  before update on public.photo_providers
  for each row execute function public.touch_photo_providers();

-- Hide-mock-on-real-signup trigger (mirrors barber 0207 / tattoo 0206).
create or replace function public.hide_one_mock_photo_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.photo_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.photo_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_photo_signup on public.photo_providers;
create trigger trg_hide_mock_on_real_photo_signup
  after insert on public.photo_providers
  for each row execute function public.hide_one_mock_photo_provider();

-- RLS — mirrors barber / handyman / tattoo policies, renamed photop_*.
alter table public.photo_providers enable row level security;
drop policy if exists photop_public_select on public.photo_providers;
create policy photop_public_select on public.photo_providers
  for select to anon, authenticated using (status = 'active');
drop policy if exists photop_owner_select on public.photo_providers;
create policy photop_owner_select on public.photo_providers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists photop_owner_update on public.photo_providers;
create policy photop_owner_update on public.photo_providers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bookings table (mig 0090 equiv).
create table if not exists public.photo_bookings (
  id                 uuid primary key default gen_random_uuid(),
  photo_id           uuid not null references public.photo_providers(id) on delete cascade,
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

create index if not exists photo_bookings_by_provider_date
  on public.photo_bookings (photo_id, requested_date desc);
create index if not exists photo_bookings_pending
  on public.photo_bookings (photo_id, status)
  where status = 'pending';

create or replace function public.touch_photo_bookings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_photo_bookings_touch on public.photo_bookings;
create trigger trg_photo_bookings_touch
  before update on public.photo_bookings
  for each row execute function public.touch_photo_bookings_updated_at();

alter table public.photo_bookings enable row level security;
drop policy if exists photo_bookings_owner_read on public.photo_bookings;
create policy photo_bookings_owner_read on public.photo_bookings
  for select using (
    exists (
      select 1 from public.photo_providers pp
      where pp.id = photo_bookings.photo_id
        and pp.user_id = auth.uid()
    )
  );
drop policy if exists photo_bookings_owner_update on public.photo_bookings;
create policy photo_bookings_owner_update on public.photo_bookings
  for update using (
    exists (
      select 1 from public.photo_providers pp
      where pp.id = photo_bookings.photo_id
        and pp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Wire 'photo' into the polymorphic constraints / triggers that the rest
-- of the platform relies on. Without these the profile-view tracker,
-- rating recomputer, and contact form would 500 on photo rows.
-- ============================================================================

-- reviews_provider_type_check (mig 0072 / 0207) — allow 'photo'
alter table public.reviews
  drop constraint if exists reviews_provider_type_check;
alter table public.reviews
  add constraint reviews_provider_type_check
  check (provider_type is null or provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo'
  ));

-- provider_profile_views CHECK (mig 0072 / 0207) — allow 'photo'
alter table public.provider_profile_views
  drop constraint if exists provider_profile_views_provider_type_check;
alter table public.provider_profile_views
  add constraint provider_profile_views_provider_type_check
  check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo'
  ));

-- bump_provider_visitor_count (mig 0072 / 0207) — add 'photo' case
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
    else
      return new;
  end case;
  return new;
end;
$$;

-- _recompute_provider_rating (mig 0075 / 0207) — add 'photo' case
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
    when 'tour_guide' then update public.tour_guide_listings  set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    when 'bike_rental' then update public.bike_rentals        set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    else null;
  end case;
end;
$$;

-- contact_messages provider_type CHECK (mig 0137 / 0207) — allow 'photo'
alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;
alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','tattoo','barber','photo'
  ));

-- contact_messages_own_select RLS — add 'photo' branch
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
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

-- payment_intents.product CHECK (mig 0068 / 0207) — add photo_monthly + photo_yearly
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
    'photo_monthly',       'photo_yearly'
  ));

-- extend_photo_on_payment trigger — mirrors the verticals in mig 0068 / 0207
create or replace function public.extend_photo_on_payment()
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
  if new.product not in ('photo_monthly','photo_yearly') then
    return new;
  end if;

  v_plan := case when new.product = 'photo_yearly' then 'yearly' else 'monthly' end;

  select coalesce(paid_until, now())
    into v_basis
    from public.photo_providers
    where user_id = new.driver_user_id
    for update;

  if v_basis is null then return new; end if;
  if v_basis < now() then v_basis := now(); end if;

  update public.photo_providers
  set subscription_status = 'active',
      paid_until          = v_basis + (new.extends_days || ' days')::interval,
      updated_at          = now()
  where user_id = new.driver_user_id;

  return new;
end;
$body$;

drop trigger if exists pi_extend_photo on public.payment_intents;
create trigger pi_extend_photo
  after update of status on public.payment_intents
  for each row execute function public.extend_photo_on_payment();

-- Seed ONE demo photographer — Arka, Yogyakarta. Deep slate / charcoal
-- theme (#1F2937) with white CTA. Stock Unsplash photographer-at-work
-- image (HEAD-verified image/jpeg before commit). Idempotent: on
-- conflict (slug) do update keeps the demo row in sync with the schema.
insert into public.photo_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  specialties, hourly_rate_idr, day_rate_idr, has_own_tools,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  theme_color, button_text_color,
  availability, status, rating, rating_count
)
values
  (true, null, 'demo-photo-arka', 'Arka', 7,
    'Photographer Yogyakarta — wedding, prewedding, product. Mini session 1 jam · 25 foto edited. Turnaround 7 hari, deposit 30% lock the date. Konsultasi paket lewat WhatsApp.',
    array['wedding','prewedding','product'], 1500000, 4500000, true,
    'Yogyakarta', 'Yogya · Sleman · on-location welcome', '+62000000503',
    'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&auto=format&fit=crop',
    '#1F2937', '#FFFFFF',
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
