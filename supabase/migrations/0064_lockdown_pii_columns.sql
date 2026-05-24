-- ============================================================================
-- 0064 — Lock down PII columns on partner + 5 provider tables
-- ----------------------------------------------------------------------------
-- Root cause: the prior `*_public_read` RLS policies were row-coarse with
-- `using (status = 'active')` and granted to anon + authenticated. RLS
-- cannot filter columns. So a raw `supabase-js` call from any browser
-- console could `select ktp_image_url, payout_account_number, ...`
-- and pull every active row's sensitive PII. Comments in 0047 admitted
-- the API "masks at the application layer" — that's wishful; RLS is
-- the only contract that matters for direct supabase-js calls.
--
-- Fix: server-side API routes are the ONLY supported read path for
-- these tables. They use the service role which bypasses RLS + grants.
-- So we can safely revoke select on these tables from anon + authenticated
-- entirely, and rely on `getAdminSupabase()` server-side access for both
-- public marketplace listings and owner dashboards.
--
-- The provider-side dashboards (/dashboard/{vertical}) all fetch via
-- /api/{vertical}/me which is server-side — verified in audit.
--
-- DEFERRED: `public.drivers` and `public.bike_rentals` are queried from
-- browser code (lib/drivers/queries.ts, lib/rentals/queries.browser.ts)
-- and need a query refactor before the same lockdown can land. Tracked
-- as a separate migration to follow.
-- ============================================================================

-- ── 1. PARTNERS ─────────────────────────────────────────────────────────────
-- Leaked columns: payout_account_number/name/bank_code, contact_email,
-- contact_phone, contact_whatsapp, owner_user_id, notes
drop policy if exists partners_public_read         on public.partners;
drop policy if exists partners_driver_payout_read  on public.partners;
revoke select on public.partners from anon, authenticated;
-- partners_owner_full policy still grants owner row visibility, but the
-- table grant revoke above means the owner cannot directly SELECT either.
-- Owner reads happen via /api/partners/me/* (service role) — confirmed.

-- ── 2. MASSAGE_PROVIDERS ────────────────────────────────────────────────────
-- Leaked: ktp_image_url, verified_*, rejected_reason, subscription_*,
-- trial_ends_at, paid_until, user_id, verified_by
drop policy if exists mp_public_read on public.massage_providers;
revoke select on public.massage_providers from anon, authenticated;
-- mp_owner_read policy is now moot (no table grant) — owner reads via
-- /api/massage/me (service role). Drop for cleanliness.
drop policy if exists mp_owner_read   on public.massage_providers;
drop policy if exists mp_owner_update on public.massage_providers;

-- ── 3. BEAUTICIAN_PROVIDERS ─────────────────────────────────────────────────
drop policy if exists bp_public_read  on public.beautician_providers;
revoke select on public.beautician_providers from anon, authenticated;
drop policy if exists bp_owner_read   on public.beautician_providers;
drop policy if exists bp_owner_update on public.beautician_providers;

-- ── 4. LAUNDRY_PROVIDERS ────────────────────────────────────────────────────
drop policy if exists lp_public_read  on public.laundry_providers;
revoke select on public.laundry_providers from anon, authenticated;
drop policy if exists lp_owner_read   on public.laundry_providers;
drop policy if exists lp_owner_update on public.laundry_providers;

-- ── 5. HANDYMAN_PROVIDERS ───────────────────────────────────────────────────
drop policy if exists hp_public_read  on public.handyman_providers;
revoke select on public.handyman_providers from anon, authenticated;
drop policy if exists hp_owner_read   on public.handyman_providers;
drop policy if exists hp_owner_update on public.handyman_providers;

-- ── 6. HOME_CLEAN_PROVIDERS ─────────────────────────────────────────────────
drop policy if exists hcp_public_read  on public.home_clean_providers;
revoke select on public.home_clean_providers from anon, authenticated;
drop policy if exists hcp_owner_read   on public.home_clean_providers;
drop policy if exists hcp_owner_update on public.home_clean_providers;

-- ============================================================================
-- POST-CONDITIONS
--   • anon + authenticated browser clients can no longer SELECT from any of
--     these 6 tables. Public marketplace listings + owner dashboards both
--     route through server-side `/api/*` endpoints that use service role.
--   • Service role (used by getAdminSupabase()) bypasses RLS + grants, so
--     all API routes continue to work unchanged.
--   • UPDATE / INSERT paths are unaffected — they were always service-role
--     gated.
-- ============================================================================
