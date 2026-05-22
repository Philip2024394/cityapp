-- ============================================================================
-- 0042_affiliate_banner_shares.sql
-- ----------------------------------------------------------------------------
-- Append-only audit of every banner share fired from the StreetLocal
-- affiliate dashboard (landing/src/Affiliate.jsx → Banner Studio). Powers
-- the admin "Banner Shares" panel which surfaces:
--   - which agents are actively distributing
--   - which banners convert (banner_id grouped by clicks vs signups)
--   - which platforms (whatsapp / facebook / telegram / copy_*) drive traffic
--
-- Two write paths feed this table:
--   (a) POST /api/affiliate/track-share — fired client-side from the
--       Banner Studio share + copy buttons (sendBeacon, fire-and-forget).
--       platform ∈ { whatsapp | facebook | twitter | telegram |
--                    copy_link | copy_code | email | other }
--   (b) Same endpoint, called from the cityrider landing client effect
--       when a visitor arrives with BOTH ?ref=... AND ?b=... query
--       params present. platform='direct' for those rows.
--
-- Schema is intentionally narrow — no PII beyond a hashed IP, no FKs
-- (agent_code is a soft reference; banner_id is opaque text owned by
-- the landing app, no enum). Mirrors the wa_click_events posture.
-- ============================================================================

create table if not exists public.affiliate_banner_shares (
  id            uuid primary key default gen_random_uuid(),
  agent_code    text not null,
  banner_id     text not null,
  platform      text,                 -- whatsapp | facebook | twitter | telegram | copy_link | copy_code | direct | email | other
  referrer_url  text,                 -- document.referrer when known
  user_agent    text,
  ip            inet,
  country_code  text,
  created_at    timestamptz not null default now()
);

create index if not exists affiliate_banner_shares_agent_idx
  on public.affiliate_banner_shares (agent_code, created_at desc);
create index if not exists affiliate_banner_shares_banner_idx
  on public.affiliate_banner_shares (banner_id, created_at desc);

alter table public.affiliate_banner_shares enable row level security;

-- Anon insert via /api/affiliate/track-share (route also uses service role
-- so this policy is belt-and-braces in case a future hook calls from the
-- anon client directly).
drop policy if exists "affiliate_banner_shares_anon_insert" on public.affiliate_banner_shares;
create policy "affiliate_banner_shares_anon_insert"
  on public.affiliate_banner_shares for insert
  with check (true);

-- No SELECT policy — admin reads go through service role via the gateway.
