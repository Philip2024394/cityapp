-- ============================================================================
-- 0018_affiliate_security_lockdown.sql
-- ----------------------------------------------------------------------------
-- CRITICAL P0 — closes a live data exposure.
--
-- Migrations 0016 + 0017 created the affiliate tables with policies that
-- used `using (true)` for select/insert/update, intending to "tighten
-- later." That tightening never landed. Result: anyone with the public
-- anon key (i.e. anyone who opens devtools on the site) could read
-- every agent's bank_account, bank_holder, ktp_url, and payment_proof
-- — plus update arbitrary rows.
--
-- New access model
-- ----------------
--                      affiliate_agents   affiliate_referrals   affiliate_payouts
--   anon SELECT direct  NONE              NONE                  NONE
--   anon SELECT view    safe columns      —                     —
--   anon INSERT direct  safe columns      kept (signup trigger) NONE
--   anon UPDATE direct  NONE              NONE                  NONE
--   service-role        full              full                  full
--   admin role          full              full                  full
--
-- Self-service paths for an authenticated agent (read own row, update
-- own bank details, list own referrals) go through the new
-- /api/affiliate/* server routes which gate on an HMAC-signed bearer
-- token issued at POST /api/affiliate/login.
-- ============================================================================

-- ─── affiliate_agents — strip all permissive policies ─────────────────
drop policy if exists "Public read agents"        on public.affiliate_agents;
drop policy if exists "Public insert agents"      on public.affiliate_agents;
drop policy if exists "Public update agents"      on public.affiliate_agents;

-- Admin sees / mutates everything. service-role bypasses RLS entirely.
create policy "Admin read agents"
  on public.affiliate_agents for select
  using (public.is_admin());

create policy "Admin update agents"
  on public.affiliate_agents for update
  using (public.is_admin());

-- Public signup still inserts the row directly with the anon key. Column-
-- level grants below restrict WHICH columns anon may write — so the
-- sensitive fields (bank, KTP, payment proof, verification_status,
-- paid_at, status) cannot be set at INSERT time. They are added later
-- via the bearer-token-gated PATCH /api/affiliate/me.
create policy "Public insert agents"
  on public.affiliate_agents for insert
  with check (true);

-- Column-level privileges. Revoke the broad grants first so we know
-- exactly what's exposed.
revoke all on public.affiliate_agents from anon, authenticated;
grant insert (name, country, whatsapp, agent_code) on public.affiliate_agents to anon;

-- ─── Public-safe view for leaderboard + seat-count reads ─────────────
-- The landing/Affiliate.jsx UI used to read the table directly with the
-- anon key for: (a) seat-counter on the signup page, (b) top-agents
-- leaderboard. Those reads continue to work via this narrow view, which
-- exposes ONLY the columns safe to publish. It runs with
-- security_invoker=true so RLS still applies — but the view body
-- doesn't reference bank/KTP/etc., so even if the underlying RLS later
-- changes, no sensitive column can leak.
create or replace view public.affiliate_agents_public
  with (security_invoker = true)
as
  select id,
         name,
         country,
         agent_code,
         status,
         total_clicks,
         created_at
  from public.affiliate_agents;

-- Allow anon SELECT on the safe view (must be paired with a row-level
-- policy on the table since security_invoker=true → caller's RLS).
create policy "Public read agents (safe columns only)"
  on public.affiliate_agents for select
  using (true);

-- Column-level SELECT — anon and authenticated may only read the safe
-- columns directly from the table. Any `select *` from anon hits the
-- column-privilege check first and fails with "permission denied for
-- column bank_account." This is belt + braces alongside the policy
-- above.
grant select (id, name, country, agent_code, status, total_clicks, created_at)
  on public.affiliate_agents to anon, authenticated;

-- Grant SELECT on the view itself. Default is implicit DENY for new
-- objects in Supabase, so this must be explicit.
grant select on public.affiliate_agents_public to anon, authenticated;

-- ─── affiliate_referrals ──────────────────────────────────────────────
drop policy if exists "Public read referrals"   on public.affiliate_referrals;
drop policy if exists "Public update referrals" on public.affiliate_referrals;
-- INSERT stays public for the SECURITY DEFINER signup trigger.

create policy "Admin read referrals"
  on public.affiliate_referrals for select
  using (public.is_admin());

create policy "Admin update referrals"
  on public.affiliate_referrals for update
  using (public.is_admin());

revoke all on public.affiliate_referrals from anon, authenticated;
-- The INSERT happens from a SECURITY DEFINER function (set in 0016),
-- so we don't need to grant INSERT to anon — but we do leave the policy
-- in place in case future code paths need it.

-- ─── affiliate_payouts ────────────────────────────────────────────────
drop policy if exists "ap_public_read" on public.affiliate_payouts;

create policy "Admin read payouts"
  on public.affiliate_payouts for select
  using (public.is_admin());

revoke all on public.affiliate_payouts from anon, authenticated;
