-- ============================================================================
-- 0083 — Beautician banner purchases (premium banner exclusivity)
-- ----------------------------------------------------------------------------
-- A beautician taps a premium banner → pays Rp 100k via QRIS → uploads
-- payment screenshot → banner activates provisionally while admin
-- reviews. Admin can confirm (keeps active) or reject (deactivate +
-- revert beautician's cover).
--
-- Why a separate table (not just a flag on beautician_providers):
--   • One beautician can buy multiple premium banners over time
--   • Need audit trail for admin reviews + dispute resolution
--   • Need to revoke a banner from one beautician if payment fails
-- ============================================================================

create table if not exists public.banner_purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  beautician_id     uuid not null references public.beautician_providers(id) on delete cascade,
  banner_url        text not null,
  price_idr         int  not null,
  payment_proof_url text,
  status            text not null default 'pending'
                    check (status in ('pending','confirmed','rejected')),
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid references auth.users(id)
);

create index if not exists banner_purchases_user_idx
  on public.banner_purchases (user_id, created_at desc);

create index if not exists banner_purchases_status_idx
  on public.banner_purchases (status, created_at desc);

-- RLS: beauticians can read their own purchases. Inserts go through
-- the service-role API (no direct insert from the browser).
alter table public.banner_purchases enable row level security;

drop policy if exists "banner_purchases_owner_read" on public.banner_purchases;
create policy "banner_purchases_owner_read" on public.banner_purchases
  for select using (auth.uid() = user_id);
