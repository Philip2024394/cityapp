-- ============================================================================
-- 0211 — Catering vertical (Phase 5 of 15 new lifestyle categories)
-- ----------------------------------------------------------------------------
-- Mirrors video_providers byte-for-byte at the column level, with three
-- semantic tweaks for the independent Indonesian catering industry:
--   • specialties vocab = cuisine / format categories (indonesian, padang,
--     jawa, chinese, western, vegan, halal, snack_box, tumpeng,
--     buffet_wedding, prasmanan, nasi_box, mixed, other) — Indonesian
--     caterers cluster around home-style cooking, nasi-box delivery,
--     tumpeng selamatan, and prasmanan for weddings. Halal + vegan are
--     first-class tags because clients screen for them.
--   • theme_color default = '#DC2626' (warm red) — Indonesian catering
--     signage trends warm reds + golds for appetite (rendang brown,
--     sambal red, tumpeng yellow). button_text_color = '#FFFFFF' so the
--     CTA pills read clean white-on-red, high contrast.
--   • pricing — hourly_rate_idr is reused as the per-pax starter price
--     (e.g. Rp 22,000/pax snack box, Rp 35,000/pax nasi box, Rp 95,000/
--     pax buffet). Catering is PER-PAX with a minimum order count as a
--     first-class constraint. day_rate_idr becomes the optional paket
--     bundle (e.g. Tumpeng Mini Rp 450k for 7-10 orang) when per-pax
--     doesn't apply. Keeping the column names matches the shared
--     marketplace renderer; only the dashboard + profile label changes
--     ("Per-pax from" / "Paket bundle"). Pricing FLOOR is much lower
--     per-unit than video (Rp 22k snack box vs Rp 2.5jt social reel)
--     but the total order is anchored by minimum-pax × per-pax.
--   • has_own_tools boolean repurposed as "delivery dalam kota" (free
--     in-city drop-off vs setup-on-site / dine-in studio pickup).
--     Defaults true since Indonesian indie caterers almost always
--     deliver hot food to the venue / office / customer house.
-- ============================================================================

create table if not exists public.catering_providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete cascade,
  slug             text not null unique,
  display_name     text not null,

  -- Profile
  years_experience integer not null default 0
                   check (years_experience >= 0 and years_experience <= 60),
  bio              text not null check (length(bio) <= 300),

  -- Specialties — multi-select text[] from the canonical list in
  -- src/lib/catering/types.ts. CHECK constrains to that vocab.
  specialties text[] not null default '{}'
    check (specialties <@ array[
      'indonesian','padang','jawa','chinese','western','vegan','halal',
      'snack_box','tumpeng','buffet_wedding','prasmanan','nasi_box',
      'mixed','other'
    ]::text[]),

  -- Cap at 3 specialties — same UX rule as photo / barber / handyman / tattoo / video.
  constraint catering_providers_specialties_max3
    check (coalesce(array_length(specialties, 1), 0) between 1 and 3),

  -- Pricing — per-pax starter (hourly_rate_idr column kept for
  -- renderer parity; surfaces as "Per-pax from" on dashboard).
  -- Optional paket bundle (day_rate_idr column). CHECK enforces at
  -- least one is set so every public card shows a starting-from number.
  hourly_rate_idr  integer check (hourly_rate_idr is null or hourly_rate_idr >= 0),
  day_rate_idr     integer check (day_rate_idr    is null or day_rate_idr    >= 0),
  constraint catering_providers_at_least_one_price
    check (
      hourly_rate_idr is not null
      or day_rate_idr is not null
    ),

  -- "Own tools" stays as a generic boolean — for catering it means
  -- "delivery dalam kota" (free in-city drop-off vs setup-on-site /
  -- studio pickup). Defaults true since Indonesian indie caterers
  -- almost always deliver.
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

  -- Per-provider theme accent (mig 0087 equiv). Default warm red
  -- so the food imagery pops with appetite-tuned signage.
  theme_color      text default '#DC2626'
                   check (theme_color is null or theme_color ~* '^#[0-9A-F]{6}$'),
  -- Catering-specific: CTA label colour. Defaults to white so on the
  -- default red brand the contrast is white-on-red, high contrast for
  -- the CTA pills. mig 0202 mirror for catering.
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

  -- Use caterp_ prefix to avoid colliding with photo's photop_*
  -- policy/constraint namespace (and beautician's bp_* / handyman's
  -- hp_* / tattoo's tp_* / barber's barberp_* / video's videop_*).
  constraint caterp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  ),
  constraint catering_providers_gallery_max check (
    gallery_image_urls is null
    or array_length(gallery_image_urls, 1) is null
    or array_length(gallery_image_urls, 1) <= 12
  )
);

create index if not exists idx_caterp_listing
  on public.catering_providers (status, availability, city)
  where status = 'active';
create index if not exists idx_caterp_owner
  on public.catering_providers (user_id);
create index if not exists idx_caterp_specialties
  on public.catering_providers using gin (specialties)
  where status = 'active';

-- updated_at touch trigger (mirrors photo / barber / handyman / tattoo / video).
create or replace function public.touch_catering_providers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_catering_providers on public.catering_providers;
create trigger trg_touch_catering_providers
  before update on public.catering_providers
  for each row execute function public.touch_catering_providers();

-- Hide-mock-on-real-signup trigger (mirrors photo 0208 / barber 0207 / tattoo 0206 / video 0210).
create or replace function public.hide_one_mock_catering_provider()
returns trigger language plpgsql security definer as $$
declare victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.catering_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.catering_providers set mock_hidden_at = now() where id = victim_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_hide_mock_on_real_catering_signup on public.catering_providers;
create trigger trg_hide_mock_on_real_catering_signup
  after insert on public.catering_providers
  for each row execute function public.hide_one_mock_catering_provider();

-- RLS — mirrors photo / barber / handyman / tattoo / video policies, renamed caterp_*.
alter table public.catering_providers enable row level security;
drop policy if exists caterp_public_select on public.catering_providers;
create policy caterp_public_select on public.catering_providers
  for select to anon, authenticated using (status = 'active');
drop policy if exists caterp_owner_select on public.catering_providers;
create policy caterp_owner_select on public.catering_providers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists caterp_owner_update on public.catering_providers;
create policy caterp_owner_update on public.catering_providers
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bookings table (mig 0090 equiv).
create table if not exists public.catering_bookings (
  id                 uuid primary key default gen_random_uuid(),
  catering_id        uuid not null references public.catering_providers(id) on delete cascade,
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

create index if not exists catering_bookings_by_provider_date
  on public.catering_bookings (catering_id, requested_date desc);
create index if not exists catering_bookings_pending
  on public.catering_bookings (catering_id, status)
  where status = 'pending';

create or replace function public.touch_catering_bookings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_catering_bookings_touch on public.catering_bookings;
create trigger trg_catering_bookings_touch
  before update on public.catering_bookings
  for each row execute function public.touch_catering_bookings_updated_at();

alter table public.catering_bookings enable row level security;
drop policy if exists catering_bookings_owner_read on public.catering_bookings;
create policy catering_bookings_owner_read on public.catering_bookings
  for select using (
    exists (
      select 1 from public.catering_providers vp
      where vp.id = catering_bookings.catering_id
        and vp.user_id = auth.uid()
    )
  );
drop policy if exists catering_bookings_owner_update on public.catering_bookings;
create policy catering_bookings_owner_update on public.catering_bookings
  for update using (
    exists (
      select 1 from public.catering_providers vp
      where vp.id = catering_bookings.catering_id
        and vp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Wire 'catering' into the polymorphic constraints / triggers that the rest
-- of the platform relies on. Without these the profile-view tracker,
-- rating recomputer, and contact form would 500 on catering rows.
-- ============================================================================

-- reviews_provider_type_check (mig 0072 / 0207 / 0208 / 0210) — allow 'catering'
alter table public.reviews
  drop constraint if exists reviews_provider_type_check;
alter table public.reviews
  add constraint reviews_provider_type_check
  check (provider_type is null or provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering'
  ));

-- provider_profile_views CHECK (mig 0072 / 0207 / 0208 / 0210) — allow 'catering'
alter table public.provider_profile_views
  drop constraint if exists provider_profile_views_provider_type_check;
alter table public.provider_profile_views
  add constraint provider_profile_views_provider_type_check
  check (provider_type in (
    'driver', 'bike_rental', 'tour_guide',
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
    'tattoo', 'barber', 'photo', 'video', 'catering'
  ));

-- bump_provider_visitor_count (mig 0072 / 0207 / 0208 / 0210) — add 'catering' case
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
    else
      return new;
  end case;
  return new;
end;
$$;

-- _recompute_provider_rating (mig 0075 / 0207 / 0208 / 0210) — add 'catering' case
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
    when 'tour_guide' then update public.tour_guide_listings  set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    when 'bike_rental' then update public.bike_rentals        set rating = v_avg, review_count = v_cnt where id = p_provider_id;
    else null;
  end case;
end;
$$;

-- contact_messages provider_type CHECK (mig 0137 / 0207 / 0208 / 0210) — allow 'catering'
alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;
alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','tattoo','barber','photo','video','catering'
  ));

-- contact_messages_own_select RLS — add 'catering' branch
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
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

-- payment_intents.product CHECK (mig 0068 / 0207 / 0208 / 0210) — add catering_monthly + catering_yearly
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
    'catering_monthly',    'catering_yearly'
  ));

-- extend_catering_on_payment trigger — mirrors the verticals in mig 0068 / 0207 / 0208 / 0210
create or replace function public.extend_catering_on_payment()
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
  if new.product not in ('catering_monthly','catering_yearly') then
    return new;
  end if;

  v_plan := case when new.product = 'catering_yearly' then 'yearly' else 'monthly' end;

  select coalesce(paid_until, now())
    into v_basis
    from public.catering_providers
    where user_id = new.driver_user_id
    for update;

  if v_basis is null then return new; end if;
  if v_basis < now() then v_basis := now(); end if;

  update public.catering_providers
  set subscription_status = 'active',
      paid_until          = v_basis + (new.extends_days || ' days')::interval,
      updated_at          = now()
  where user_id = new.driver_user_id;

  return new;
end;
$body$;

drop trigger if exists pi_extend_catering on public.payment_intents;
create trigger pi_extend_catering
  after update of status on public.payment_intents
  for each row execute function public.extend_catering_on_payment();

-- Seed ONE demo caterer — Bunda Sari, Yogyakarta. Warm-red theme
-- (#DC2626) with white CTA. Stock Unsplash Indonesian-food image
-- (HEAD-verified image/jpeg before commit). Idempotent: on conflict
-- (slug) do update keeps the demo row in sync with the schema.
insert into public.catering_providers (
  is_mock, user_id, slug, display_name, years_experience, bio,
  specialties, hourly_rate_idr, day_rate_idr, has_own_tools,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  theme_color, button_text_color,
  availability, status, rating, rating_count
)
values
  (true, null, 'demo-catering-bunda-sari', 'Catering Bunda Sari', 12,
    'Catering rumahan Yogyakarta — masakan Padang dan Jawa, halal sertifikat. Nasi box, tumpeng selamatan, dan prasmanan wedding. Minimum 50 pax, antar dalam kota Yogya gratis. Gratis test rasa untuk pesanan 100+ pax. DP 50% lock the date.',
    array['indonesian','padang','jawa']::text[], 35000, 450000, true,
    'Yogyakarta', 'Yogya · Sleman · Bantul · setup on-site OK', '+62000000505',
    'https://images.unsplash.com/photo-1606851094291-6efae152bb87?w=1200&auto=format&fit=crop',
    '#DC2626', '#FFFFFF',
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
-- Seed PortfolioCarousel entries for demo-catering-bunda-sari — mirrors
-- 0210's pattern for the video demo. Flat JSONB array of {name,
-- description, price_idr, url}. Photo URLs are Unsplash CDN, all
-- HEAD-verified 200 OK image/jpeg on 2026-06-08 and unique across all
-- entries.
--
-- Idempotent — re-running just re-asserts the same array.
-- ============================================================================
update public.catering_providers set
  service_photos = jsonb_build_array(
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
      'name',        'Nasi Box Premium',
      'description', 'Lauk lengkap (rendang / ayam bakar / ikan), nasi putih, urap, kerupuk, sambal. Halal sertifikat, kotak premium dengan tutup. Antar dalam kota Yogya gratis. Minimum 50 pax.',
      'price_idr',   35000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1574484284002-952d92456975',
      'name',        'Tumpeng Mini Komplit',
      'description', 'Tumpeng kuning lengkap untuk 7-10 orang. Ayam ingkung, urap-urap, telur balado, perkedel, tempe orek, sambal goreng kentang ati. Cocok untuk selamatan, syukuran, ulang tahun.',
      'price_idr',   450000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
      'name',        'Prasmanan Wedding',
      'description', '5-7 menu utama + 2 menu pembuka + dessert + minuman. Lengkap dengan staff prasmanan, chafing dish, dan tableware. Cocok untuk wedding, gathering korporat. Minimum 100 pax.',
      'price_idr',   95000
    ),
    jsonb_build_object(
      'url',         'https://images.unsplash.com/photo-1559847844-5315695dadae',
      'name',        'Snack Box Meeting',
      'description', '3 kue tradisional (lemper / risoles / kue lapis) + 1 gorengan + air mineral. Halal sertifikat, packaging premium dengan tutup. Cocok untuk meeting, seminar, training. Minimum 20 box.',
      'price_idr',   22000
    )
  ),
  updated_at = now()
where slug = 'demo-catering-bunda-sari';
