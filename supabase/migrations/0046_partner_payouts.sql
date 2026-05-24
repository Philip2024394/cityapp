-- ============================================================================
-- 0046 — Partner payouts + proof-of-payment workflow
-- ----------------------------------------------------------------------------
-- Adds:
--   • partners.payout_* columns          — how the partner wants to be paid.
--   • partner_bookings.proof_*           — driver-uploaded payment proof.
--   • partner_bookings.reject_*          — partner's reject metadata.
--   • status enum gets 'awaiting_review' — the driver has uploaded proof,
--                                          partner hasn't accepted yet.
--
-- INVARIANT: the platform STILL never holds funds. payout_account_number is
-- shown to the driver only (via RLS), the driver pays the partner directly,
-- and the proof is courtesy/audit. Partner remains the gatekeeper.
-- ============================================================================

-- ── 1. Payout details on partners ─────────────────────────────────────────
alter table public.partners
  add column if not exists payout_method text
    check (payout_method in
      ('bank_transfer','qris','gopay','ovo','dana','shopeepay','cash')),
  add column if not exists payout_account_number text,
  add column if not exists payout_account_name   text,
  add column if not exists payout_bank_code      text,
  add column if not exists payout_qris_image_url text,
  add column if not exists payout_notes          text;

-- ── 2. Proof-of-payment columns on partner_bookings ──────────────────────
alter table public.partner_bookings
  add column if not exists proof_image_url   text,
  add column if not exists proof_uploaded_at timestamptz,
  add column if not exists proof_uploaded_by uuid references auth.users(id),
  add column if not exists proof_amount_idr  integer check (proof_amount_idr is null or proof_amount_idr >= 0),
  add column if not exists proof_method      text,
  add column if not exists reject_reason     text,
  add column if not exists reject_at         timestamptz;

-- ── 3. Expand status enum ────────────────────────────────────────────────
alter table public.partner_bookings
  drop constraint if exists partner_bookings_status_check;
alter table public.partner_bookings
  add  constraint partner_bookings_status_check
  check (status in ('pending','awaiting_review','settled','disputed','waived'));

-- ── 4. Helpful index for the driver "Partner debts" view ─────────────────
-- Drivers query "what do I still owe" filtered by their user_id with status
-- in ('pending','awaiting_review'). A partial index keeps it lean — settled
-- and waived rows don't pollute it.
create index if not exists idx_pb_driver_outstanding
  on public.partner_bookings (driver_user_id, partner_id)
  where status in ('pending', 'awaiting_review');

-- ── 5. RLS: drivers can read partner payout_* only when they owe ─────────
-- A driver should be able to see partner bank details ONLY when there's an
-- outstanding (pending/awaiting_review) booking against that partner. We
-- drop the prior public-read policy if it accidentally exposed payout_*
-- and replace with a narrower one. Public-facing /p/[slug] page should
-- read partner.name / city via the existing api/partners/[slug]/public
-- route (service-role), not RLS — so this lockdown is safe.
drop policy if exists partners_driver_payout_read on public.partners;
create policy partners_driver_payout_read on public.partners
  for select
  to authenticated
  using (
    exists (
      select 1 from public.partner_bookings pb
      where pb.partner_id = partners.id
        and pb.driver_user_id = auth.uid()
        and pb.status in ('pending','awaiting_review')
    )
  );
