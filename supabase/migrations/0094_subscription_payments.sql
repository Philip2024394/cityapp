-- ============================================================================
-- 0094 — QRIS subscription payments (drivers self-serve)
-- ----------------------------------------------------------------------------
-- Founder direction: every paid vehicle dashboard (car, truck, premium_car,
-- minibus — bike is free for now) costs 38,000 IDR/month. No Midtrans —
-- drivers pay via QRIS in their banking app, upload a screenshot, and
-- the account activates immediately (optimistic). Admin reviews each
-- payment later and can reject if the screenshot is invalid.
--
-- Schema decisions:
--   • subscription_payments is the source of truth for each payment event.
--   • drivers.paid_until is the cached "active until" date, bumped on
--     upload and possibly reverted on admin reject. Existing /car
--     marketplace + /dashboard/car already gate on this column — no
--     changes needed there.
--   • Optimistic activation: insert with status='pending', extend
--     paid_until immediately. Admin approval is a paperwork formality.
--   • Status flow: pending → approved | rejected.
--     On 'rejected', admin OR a trigger reverts paid_until.
-- ============================================================================

create table if not exists public.subscription_payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,

  -- Which vehicle this payment subscribes. Mirrors the drivers.vehicle_type
  -- enum so a single user with multiple vehicles (future) can pay per
  -- dashboard independently. Bike is excluded here because bike is free,
  -- but the column allows it for symmetry.
  vehicle_type    text not null check (vehicle_type in ('bike','car','truck','premium_car','minibus')),

  -- Founder-set monthly fee. Snapshotted on the payment row so admin
  -- history is honest even if the fee changes later.
  amount_idr      int  not null default 38000 check (amount_idr > 0),

  -- The customer uploads a screenshot of their successful QRIS payment.
  -- Stored in the 'subscription-screenshots' bucket (created below).
  screenshot_url  text not null,

  -- Period this payment grants. Computed as today + 30d on upload.
  -- Stored explicitly so admin can see the granted window even after
  -- drivers.paid_until has been further extended by later payments.
  period_start    date not null default current_date,
  period_end      date not null,

  -- Review state. 'pending' on insert; admin transitions to approved
  -- or rejected via the /admin/subscriptions tool.
  status          text not null default 'pending'
                     check (status in ('pending','approved','rejected')),
  admin_notes     text,
  reviewed_at     timestamptz,
  reviewed_by     uuid references public.profiles(id),

  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_subscription_payments_status_submitted
  on public.subscription_payments (status, submitted_at desc);

create index if not exists idx_subscription_payments_user
  on public.subscription_payments (user_id, submitted_at desc);

-- updated_at trigger (reuses any existing function or inlines a simple one)
create or replace function public.touch_subscription_payments_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_subscription_payments_touch on public.subscription_payments;
create trigger trg_subscription_payments_touch
  before update on public.subscription_payments
  for each row execute function public.touch_subscription_payments_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — drivers can see their own payment history; admins (service-role)
-- via the admin client read all rows.
-- ---------------------------------------------------------------------------
alter table public.subscription_payments enable row level security;

drop policy if exists subscription_payments_owner_read on public.subscription_payments;
create policy subscription_payments_owner_read on public.subscription_payments
  for select using (auth.uid() = user_id);

-- Owner cannot insert/update/delete directly — the API endpoint uses the
-- service-role client to write, after validating subscription rules
-- (amount, ownership, vehicle_type matches their drivers row). Locking
-- writes to the service role keeps the audit trail tamper-proof.

-- ---------------------------------------------------------------------------
-- Storage bucket for screenshot uploads
-- ---------------------------------------------------------------------------
-- Private bucket — only the owner can read their own screenshots, plus
-- the service-role / admin client for review. We deliver to the admin
-- review page via signed URLs.
insert into storage.buckets (id, name, public)
values ('subscription-screenshots', 'subscription-screenshots', false)
on conflict (id) do nothing;

-- Owner can upload to their own folder (path prefix = their user_id).
-- Service role bypasses RLS so the admin review page can also read.
drop policy if exists subscription_screenshots_owner_upload on storage.objects;
create policy subscription_screenshots_owner_upload on storage.objects
  for insert
  with check (
    bucket_id = 'subscription-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists subscription_screenshots_owner_read on storage.objects;
create policy subscription_screenshots_owner_read on storage.objects
  for select
  using (
    bucket_id = 'subscription-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

comment on table public.subscription_payments is
  'QRIS subscription receipts. Drivers upload via /dashboard/{vehicle} — paid_until is bumped optimistically; admin verifies via /admin/subscriptions and can reject (which reverts paid_until via the admin tool).';
