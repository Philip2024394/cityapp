-- ============================================================================
-- 0228 — Sweep beautician-reference schema into the remaining verticals
-- ----------------------------------------------------------------------------
-- Foundation for the UI sweeps of tasks 7 (QRIS), 10 (Draft lock), and
-- 11 (Multi-page). Three schema changes per vertical:
--   A. qr_payment_url text                                          (task 7)
--   B. is_draft boolean + draft_password text + CHECK constraint   (task 10)
--   C. drop user_id UNIQUE + add non-unique index +
--      drop at_least_one_* check (so stub rows can be inserted)    (task 11)
--
-- Reference migrations:
--   0224 — beautician qris url
--   0226 — beautician draft lock
--   0227 — beautician multi-page (drops UNIQUE + at_least_one_service)
--
-- Scope decisions:
--   • 22 verticals were requested. `food` has no _providers table and
--     `tour` uses the differently-shaped `tour_guide_listings` table —
--     both skipped. 20 verticals migrated.
--   • `facial` and `massage` (original Kita2u verticals) have no user_id
--     UNIQUE and no at_least_one_* check, so Sweep C is a no-op for them
--     and only Sweep A + B are applied. (`drop constraint if exists` is
--     still emitted defensively but matches nothing.)
--   • `skincare_providers` exists in the DB but is not in the requested
--     scope, so it is left untouched.
--
-- Idempotent: every ALTER uses IF [NOT] EXISTS so re-running is safe.
-- ============================================================================


-- ──────────────────────────────────────────────────────────────────────
-- Sweep A — qr_payment_url (task 7)
-- ──────────────────────────────────────────────────────────────────────
alter table public.handyman_providers   add column if not exists qr_payment_url text;
alter table public.laundry_providers    add column if not exists qr_payment_url text;
alter table public.massage_providers    add column if not exists qr_payment_url text;
alter table public.home_clean_providers add column if not exists qr_payment_url text;
alter table public.facial_providers     add column if not exists qr_payment_url text;
alter table public.tattoo_providers     add column if not exists qr_payment_url text;
alter table public.barber_providers     add column if not exists qr_payment_url text;
alter table public.photo_providers      add column if not exists qr_payment_url text;
alter table public.video_providers      add column if not exists qr_payment_url text;
alter table public.catering_providers   add column if not exists qr_payment_url text;
alter table public.cake_providers       add column if not exists qr_payment_url text;
alter table public.florist_providers    add column if not exists qr_payment_url text;
alter table public.fitness_providers    add column if not exists qr_payment_url text;
alter table public.yoga_providers       add column if not exists qr_payment_url text;
alter table public.tutoring_providers   add column if not exists qr_payment_url text;
alter table public.pet_providers        add column if not exists qr_payment_url text;
alter table public.mover_providers      add column if not exists qr_payment_url text;
alter table public.tailor_providers     add column if not exists qr_payment_url text;
alter table public.carwash_providers    add column if not exists qr_payment_url text;
alter table public.parcel_providers     add column if not exists qr_payment_url text;


-- ──────────────────────────────────────────────────────────────────────
-- Sweep B — Draft lock columns (task 10)
-- ──────────────────────────────────────────────────────────────────────
-- One ALTER per table adds both columns, then a second ALTER adds a
-- per-vertical CHECK constraint. Constraint names follow the
-- `<table_prefix>_draft_password_required` pattern (all ≤ 63 chars).

alter table public.handyman_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.handyman_providers
  drop constraint if exists handyman_providers_draft_password_required;
alter table public.handyman_providers
  add  constraint handyman_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.laundry_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.laundry_providers
  drop constraint if exists laundry_providers_draft_password_required;
alter table public.laundry_providers
  add  constraint laundry_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.massage_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.massage_providers
  drop constraint if exists massage_providers_draft_password_required;
alter table public.massage_providers
  add  constraint massage_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.home_clean_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.home_clean_providers
  drop constraint if exists home_clean_providers_draft_password_required;
alter table public.home_clean_providers
  add  constraint home_clean_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.facial_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.facial_providers
  drop constraint if exists facial_providers_draft_password_required;
alter table public.facial_providers
  add  constraint facial_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.tattoo_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.tattoo_providers
  drop constraint if exists tattoo_providers_draft_password_required;
alter table public.tattoo_providers
  add  constraint tattoo_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.barber_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.barber_providers
  drop constraint if exists barber_providers_draft_password_required;
alter table public.barber_providers
  add  constraint barber_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.photo_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.photo_providers
  drop constraint if exists photo_providers_draft_password_required;
alter table public.photo_providers
  add  constraint photo_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.video_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.video_providers
  drop constraint if exists video_providers_draft_password_required;
alter table public.video_providers
  add  constraint video_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.catering_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.catering_providers
  drop constraint if exists catering_providers_draft_password_required;
alter table public.catering_providers
  add  constraint catering_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.cake_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.cake_providers
  drop constraint if exists cake_providers_draft_password_required;
alter table public.cake_providers
  add  constraint cake_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.florist_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.florist_providers
  drop constraint if exists florist_providers_draft_password_required;
alter table public.florist_providers
  add  constraint florist_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.fitness_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.fitness_providers
  drop constraint if exists fitness_providers_draft_password_required;
alter table public.fitness_providers
  add  constraint fitness_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.yoga_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.yoga_providers
  drop constraint if exists yoga_providers_draft_password_required;
alter table public.yoga_providers
  add  constraint yoga_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.tutoring_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.tutoring_providers
  drop constraint if exists tutoring_providers_draft_password_required;
alter table public.tutoring_providers
  add  constraint tutoring_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.pet_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.pet_providers
  drop constraint if exists pet_providers_draft_password_required;
alter table public.pet_providers
  add  constraint pet_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.mover_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.mover_providers
  drop constraint if exists mover_providers_draft_password_required;
alter table public.mover_providers
  add  constraint mover_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.tailor_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.tailor_providers
  drop constraint if exists tailor_providers_draft_password_required;
alter table public.tailor_providers
  add  constraint tailor_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.carwash_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.carwash_providers
  drop constraint if exists carwash_providers_draft_password_required;
alter table public.carwash_providers
  add  constraint carwash_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));

alter table public.parcel_providers
  add column if not exists is_draft       boolean not null default false,
  add column if not exists draft_password text;
alter table public.parcel_providers
  drop constraint if exists parcel_providers_draft_password_required;
alter table public.parcel_providers
  add  constraint parcel_providers_draft_password_required
  check (is_draft = false or (draft_password is not null and length(trim(draft_password)) > 0));


-- ──────────────────────────────────────────────────────────────────────
-- Sweep C — Multi-page: drop user_id UNIQUE, add non-unique index,
--           drop at_least_one_* check (so stub rows can insert)
-- ──────────────────────────────────────────────────────────────────────
-- Per the live-DB audit, `facial` and `massage` have no `user_id` UNIQUE
-- nor an `at_least_one_*` check — the `if exists` guards make them
-- no-ops, kept for symmetry/idempotency.

-- handyman
alter table public.handyman_providers
  drop constraint if exists handyman_providers_user_id_key;
alter table public.handyman_providers
  drop constraint if exists handyman_providers_at_least_one_price;
create index if not exists idx_handymanp_user_id
  on public.handyman_providers (user_id);

-- laundry
alter table public.laundry_providers
  drop constraint if exists laundry_providers_user_id_key;
alter table public.laundry_providers
  drop constraint if exists laundry_at_least_one_package;
create index if not exists idx_laundryp_user_id
  on public.laundry_providers (user_id);

-- massage  (no UNIQUE, no at_least_one — both are no-ops)
alter table public.massage_providers
  drop constraint if exists massage_providers_user_id_key;
create index if not exists idx_massagep_user_id
  on public.massage_providers (user_id);

-- home_clean
alter table public.home_clean_providers
  drop constraint if exists home_clean_providers_user_id_key;
alter table public.home_clean_providers
  drop constraint if exists home_clean_providers_at_least_one_price;
create index if not exists idx_home_cleanp_user_id
  on public.home_clean_providers (user_id);

-- facial  (no UNIQUE, no at_least_one — both are no-ops)
alter table public.facial_providers
  drop constraint if exists facial_providers_user_id_key;
create index if not exists idx_facialp_user_id
  on public.facial_providers (user_id);

-- tattoo
alter table public.tattoo_providers
  drop constraint if exists tattoo_providers_user_id_key;
alter table public.tattoo_providers
  drop constraint if exists tattoo_providers_at_least_one_price;
create index if not exists idx_tattoop_user_id
  on public.tattoo_providers (user_id);

-- barber
alter table public.barber_providers
  drop constraint if exists barber_providers_user_id_key;
alter table public.barber_providers
  drop constraint if exists barber_providers_at_least_one_price;
create index if not exists idx_barberp_user_id
  on public.barber_providers (user_id);

-- photo
alter table public.photo_providers
  drop constraint if exists photo_providers_user_id_key;
alter table public.photo_providers
  drop constraint if exists photo_providers_at_least_one_price;
create index if not exists idx_photop_user_id
  on public.photo_providers (user_id);

-- video
alter table public.video_providers
  drop constraint if exists video_providers_user_id_key;
alter table public.video_providers
  drop constraint if exists video_providers_at_least_one_price;
create index if not exists idx_videop_user_id
  on public.video_providers (user_id);

-- catering
alter table public.catering_providers
  drop constraint if exists catering_providers_user_id_key;
alter table public.catering_providers
  drop constraint if exists catering_providers_at_least_one_price;
create index if not exists idx_cateringp_user_id
  on public.catering_providers (user_id);

-- cake
alter table public.cake_providers
  drop constraint if exists cake_providers_user_id_key;
alter table public.cake_providers
  drop constraint if exists cake_providers_at_least_one_price;
create index if not exists idx_cakep_user_id
  on public.cake_providers (user_id);

-- florist
alter table public.florist_providers
  drop constraint if exists florist_providers_user_id_key;
alter table public.florist_providers
  drop constraint if exists florist_providers_at_least_one_price;
create index if not exists idx_floristp_user_id
  on public.florist_providers (user_id);

-- fitness
alter table public.fitness_providers
  drop constraint if exists fitness_providers_user_id_key;
alter table public.fitness_providers
  drop constraint if exists fitness_providers_at_least_one_price;
create index if not exists idx_fitnessp_user_id
  on public.fitness_providers (user_id);

-- yoga
alter table public.yoga_providers
  drop constraint if exists yoga_providers_user_id_key;
alter table public.yoga_providers
  drop constraint if exists yoga_providers_at_least_one_price;
create index if not exists idx_yogap_user_id
  on public.yoga_providers (user_id);

-- tutoring
alter table public.tutoring_providers
  drop constraint if exists tutoring_providers_user_id_key;
alter table public.tutoring_providers
  drop constraint if exists tutoring_providers_at_least_one_price;
create index if not exists idx_tutoringp_user_id
  on public.tutoring_providers (user_id);

-- pet
alter table public.pet_providers
  drop constraint if exists pet_providers_user_id_key;
alter table public.pet_providers
  drop constraint if exists pet_providers_at_least_one_price;
create index if not exists idx_petp_user_id
  on public.pet_providers (user_id);

-- mover
alter table public.mover_providers
  drop constraint if exists mover_providers_user_id_key;
alter table public.mover_providers
  drop constraint if exists mover_providers_at_least_one_price;
create index if not exists idx_moverp_user_id
  on public.mover_providers (user_id);

-- tailor
alter table public.tailor_providers
  drop constraint if exists tailor_providers_user_id_key;
alter table public.tailor_providers
  drop constraint if exists tailor_providers_at_least_one_price;
create index if not exists idx_tailorp_user_id
  on public.tailor_providers (user_id);

-- carwash
alter table public.carwash_providers
  drop constraint if exists carwash_providers_user_id_key;
alter table public.carwash_providers
  drop constraint if exists carwash_providers_at_least_one_price;
create index if not exists idx_carwashp_user_id
  on public.carwash_providers (user_id);

-- parcel
alter table public.parcel_providers
  drop constraint if exists parcel_providers_user_id_key;
alter table public.parcel_providers
  drop constraint if exists parcel_providers_at_least_one_price;
create index if not exists idx_parcelp_user_id
  on public.parcel_providers (user_id);
