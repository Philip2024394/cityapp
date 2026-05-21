-- ============================================================================
-- 0038_qr_payment_receipts.sql
-- ----------------------------------------------------------------------------
-- Replaces the Midtrans Snap settlement path with a QR-code + admin
-- screenshot verification flow:
--
--   1. Admin uploads a QR code per amount (Rp 38.000 monthly,
--      Rp 350.000 yearly) via /admin/qr-codes.
--   2. User picks a plan on /rent/upgrade or /tour/upgrade, sees the
--      matching QR, scans + pays via any QRIS-capable app, screenshots
--      the receipt and uploads it.
--   3. On insert into payment_receipts the auto-activate trigger:
--      a. Creates a payment_intents row (provider='qris_manual'),
--      b. Flips it to status='paid', which cascades through the
--         existing extend_*_on_payment triggers → account active
--         within seconds.
--   4. Admin reviews the receipt later. If approved → no-op (already
--      active). If rejected → /api/admin/receipts/:id/reject reverses
--      the activation (intent → cancelled + account flip).
--
-- Why we keep the existing payment_intents pipeline: it already wires
-- the driver subscription, rental_company, AND tour_guide triggers.
-- Reusing it means QR-paid subs feed every downstream behaviour for
-- free (renewals, lapse cleanup, listing un-pause, etc.).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────
-- admin_qr_codes — one ACTIVE QR per amount
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.admin_qr_codes (
  id              uuid primary key default gen_random_uuid(),
  label           text not null,                       -- "QRIS Bulanan", "QRIS Tahunan"
  amount_idr      int not null check (amount_idr > 0), -- 38000 or 350000
  image_url       text not null,                       -- supabase storage URL
  bank_name       text,                                -- "BCA", "QRIS Indonesia", etc.
  account_name    text,                                -- holder name (display only)
  account_number  text,                                -- last-4 / full, depends on admin
  active          boolean not null default true,
  notes           text,                                -- internal admin notes
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- At most one active QR per amount. Admin swaps by deactivating old + activating new.
drop index if exists qr_one_active_per_amount;
create unique index qr_one_active_per_amount
  on public.admin_qr_codes (amount_idr)
  where active = true;

create index if not exists qr_active_idx
  on public.admin_qr_codes (active, amount_idr);

alter table public.admin_qr_codes enable row level security;

-- Public read of ACTIVE QR codes only (users need them to pay).
drop policy if exists "qr_public_read_active" on public.admin_qr_codes;
create policy "qr_public_read_active"
  on public.admin_qr_codes for select
  using (active = true);

-- All writes via service role / admin endpoints.

drop trigger if exists qr_set_updated_at on public.admin_qr_codes;
create trigger qr_set_updated_at
  before update on public.admin_qr_codes
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- payment_receipts — one row per user-submitted screenshot
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.payment_receipts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,

  product            text not null check (product in (
    'subscription',
    'subscription_yearly',
    'rental_company_monthly',
    'rental_company_yearly',
    'tour_guide_monthly',
    'tour_guide_yearly'
  )),
  amount_idr         int not null check (amount_idr > 0),
  qr_code_id         uuid references public.admin_qr_codes(id),
  receipt_url        text not null,                       -- supabase storage URL
  payer_note         text,                                -- optional message to admin
  payer_phone        text,                                -- denormalised for WA reach

  status             text not null default 'pending_review'
                     check (status in ('pending_review','approved','rejected')),
  admin_reviewed_at  timestamptz,
  admin_reviewed_by  uuid references auth.users(id) on delete set null,
  rejection_reason   text,

  payment_intent_id  uuid references public.payment_intents(id) on delete set null,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists pr_user_idx       on public.payment_receipts (user_id, created_at desc);
create index if not exists pr_status_idx     on public.payment_receipts (status, created_at desc);
create index if not exists pr_pending_idx    on public.payment_receipts (status) where status = 'pending_review';

alter table public.payment_receipts enable row level security;

-- Owner reads their own receipts (dashboard "my payments" view, future).
drop policy if exists "pr_owner_select" on public.payment_receipts;
create policy "pr_owner_select"
  on public.payment_receipts for select
  to authenticated
  using (user_id = auth.uid());

-- Owner inserts their own receipt — the server endpoint validates
-- product + amount + receipt_url before the row reaches the DB.
drop policy if exists "pr_owner_insert" on public.payment_receipts;
create policy "pr_owner_insert"
  on public.payment_receipts for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending_review');

-- All updates via service role (admin review path).

drop trigger if exists pr_set_updated_at on public.payment_receipts;
create trigger pr_set_updated_at
  before update on public.payment_receipts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- payment_intents — accept the new manual provider
-- ─────────────────────────────────────────────────────────────────────
alter table public.payment_intents
  drop constraint if exists payment_intents_provider_check;

alter table public.payment_intents
  add constraint payment_intents_provider_check
  check (provider in ('midtrans','manual','xendit','qris_manual'));

-- ─────────────────────────────────────────────────────────────────────
-- Auto-activate on receipt submission
-- ─────────────────────────────────────────────────────────────────────
-- On insert into payment_receipts we create a payment_intent and flip
-- it to status='paid'. The flip cascades through the existing
-- extend_*_on_payment triggers (drivers / rental_company / tour_guide)
-- which un-pause listings, extend expiry, etc. — so the user's account
-- activates within seconds of the upload.
create or replace function public.activate_on_receipt_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent_id   uuid;
  v_extends     int;
begin
  -- Derive extends_days from the product suffix
  v_extends := case
    when new.product like '%_yearly' then 365
    else 30
  end;

  -- 1. Create the payment_intent (pending). Use the receipt's own id
  --    as the order_id so it's traceable both ways.
  insert into public.payment_intents (
    driver_user_id, product, amount_idr,
    provider, provider_order_id, extends_days,
    status
  ) values (
    new.user_id, new.product, new.amount_idr,
    'qris_manual', 'qris-' || new.id::text, v_extends,
    'pending'
  )
  returning id into v_intent_id;

  -- 2. Link the receipt → intent (no trigger recursion: we use UPDATE
  --    on payment_receipts, but this trigger only fires on INSERT).
  update public.payment_receipts
  set payment_intent_id = v_intent_id
  where id = new.id;

  -- 3. Flip the intent to PAID. The trigger pi_extend_subscription /
  --    pi_extend_rental_company / pi_extend_tour_guide fire on this
  --    UPDATE of status and handle the rest (extend, un-pause, etc.).
  update public.payment_intents
  set status   = 'paid',
      paid_at  = now()
  where id = v_intent_id;

  return new;
end;
$$;

drop trigger if exists pr_activate_on_insert on public.payment_receipts;
create trigger pr_activate_on_insert
  after insert on public.payment_receipts
  for each row execute function public.activate_on_receipt_insert();

-- ─────────────────────────────────────────────────────────────────────
-- Storage policies — qr-codes (public read) + receipts (owner write)
-- ─────────────────────────────────────────────────────────────────────
-- Buckets are created via the Supabase dashboard (or admin API). Policies:
--   * 'qr-codes' bucket: world-readable (the QR image needs to render on
--     /rent/upgrade for anyone, including anonymous visitors).
--   * 'payment-receipts' bucket: owner can insert under receipts/<uid>/,
--     owner can read their own files, admin reads everything (service role).

drop policy if exists "qr_codes_public_read" on storage.objects;
create policy "qr_codes_public_read"
  on storage.objects for select
  using (bucket_id = 'qr-codes');

drop policy if exists "receipts_authed_insert_own" on storage.objects;
create policy "receipts_authed_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = 'receipts'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "receipts_authed_select_own" on storage.objects;
create policy "receipts_authed_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────────────────
-- Helper: revert activation when admin rejects a receipt
-- ─────────────────────────────────────────────────────────────────────
-- Called from /api/admin/receipts/:id/reject. Cancels the linked intent
-- and rolls back the entitlement (drivers → past_due, rental_company →
-- expired + listings paused, tour_guide → expired + listings paused).
create or replace function public.revert_receipt_activation(p_receipt_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent record;
  v_user   uuid;
begin
  select pr.user_id, pi.id, pi.product, pi.extends_days
    into v_user, v_intent.id, v_intent.product, v_intent.extends_days
  from public.payment_receipts pr
  left join public.payment_intents pi on pi.id = pr.payment_intent_id
  where pr.id = p_receipt_id;

  if v_intent.id is null then return; end if;

  -- Mark the intent cancelled.
  update public.payment_intents
  set status = 'cancelled'
  where id = v_intent.id and status <> 'cancelled';

  -- Roll back the entitlement. We subtract the granted period from the
  -- relevant expiry column. If that pushes the column past now() we
  -- also flip status → expired/past_due and pause listings.
  if v_intent.product in ('rental_company_monthly','rental_company_yearly') then
    update public.user_accounts
    set subscription_expires_at = greatest(now() - interval '1 second',
                                           subscription_expires_at - (v_intent.extends_days || ' days')::interval),
        subscription_status     = case
          when (subscription_expires_at - (v_intent.extends_days || ' days')::interval) <= now() then 'expired'
          else subscription_status
        end,
        updated_at              = now()
    where user_id = v_user;

    update public.bike_rentals
    set status = 'paused', updated_at = now()
    where owner_user_id = v_user
      and status = 'approved';

  elsif v_intent.product in ('tour_guide_monthly','tour_guide_yearly') then
    update public.user_accounts
    set tour_guide_expires_at = greatest(now() - interval '1 second',
                                         tour_guide_expires_at - (v_intent.extends_days || ' days')::interval),
        tour_guide_status     = case
          when (tour_guide_expires_at - (v_intent.extends_days || ' days')::interval) <= now() then 'expired'
          else tour_guide_status
        end,
        updated_at            = now()
    where user_id = v_user;

    update public.tour_guide_listings
    set status = 'paused', updated_at = now()
    where owner_user_id = v_user
      and status = 'approved';

  elsif v_intent.product in ('subscription','subscription_yearly','verified') then
    update public.subscriptions
    set current_period_end = greatest(now() - interval '1 second',
                                      current_period_end - (v_intent.extends_days || ' days')::interval),
        status             = case
          when (current_period_end - (v_intent.extends_days || ' days')::interval) <= now() then 'past_due'
          else status
        end,
        updated_at         = now()
    where driver_id = v_user;
  end if;
end;
$$;
