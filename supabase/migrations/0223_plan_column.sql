-- ============================================================================
-- 0223 — plan column on user_accounts
-- ----------------------------------------------------------------------------
-- Adds the 3-tier billing plan (free / pro / studio) that powers the new
-- /pricing structure. Orthogonal to subscription_status (active/inactive/
-- expired) which stays the rental-company / tour-guide entitlement signal.
--
-- `plan` is the user's CURRENT tier on the Kita2u-presentation product:
--   - free   = default for every new signup, drives the "Made with
--              Kita2u" badge on public profile pages (viral hook) and
--              gates Pro/Studio-only features later.
--   - pro    = paid presentation tier (badge hidden, more photos, custom
--              theme, etc.).
--   - studio = top tier (custom domain features etc.).
--
-- Backfill rule: any user who already has subscription_status='active'
-- AND a non-null subscription_plan (i.e. already paying for a
-- rental_company subscription) is grandfathered to 'pro'. Everyone else
-- stays on the default 'free'. The subscription_status column is
-- untouched — its 'active' / 'inactive' / 'expired' state machine is
-- preserved exactly as is.
-- ============================================================================

alter table public.user_accounts
  add column if not exists plan text not null default 'free';

-- Constrain to the three known tiers. Using a named constraint so a
-- future migration can drop+re-add to extend the enum (e.g. add an
-- 'enterprise' tier) without surgery.
alter table public.user_accounts
  drop constraint if exists user_accounts_plan_check;

alter table public.user_accounts
  add constraint user_accounts_plan_check
  check (plan in ('free','pro','studio'));

-- Backfill: grandfather existing paying rental_company users to 'pro'.
-- Everyone else stays at the 'free' default.
update public.user_accounts
   set plan = 'pro'
 where subscription_status = 'active'
   and subscription_plan is not null
   and plan = 'free';
