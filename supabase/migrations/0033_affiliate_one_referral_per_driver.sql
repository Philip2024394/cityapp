-- ============================================================================
-- 0033_affiliate_one_referral_per_driver.sql
-- ----------------------------------------------------------------------------
-- Audit (2026-05) flagged: affiliate_referrals had a unique index on
-- (agent_id, registration_id) — preventing one agent from double-attributing
-- the same driver — but did NOT prevent TWO different agents from each
-- holding an approved referral for the SAME driver. On commission approval,
-- both rows get paid → platform pays out twice per driver signup.
--
-- This adds a global one-referral-per-driver unique index. First agent
-- wins; later inserts fail the constraint cleanly (caller can handle).
-- ============================================================================

create unique index if not exists uniq_referral_per_driver
  on public.affiliate_referrals(registration_id)
  where registration_id is not null;
