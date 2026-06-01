-- =============================================================================
-- 0173 — Partner Program: 24h grace window + T&Cs acceptance gate
-- =============================================================================
-- Founder decision 2026-06-01 (stricter Partner Program flow):
--   • 48h after booking creation → payment is DUE  (driver should pay)
--   • 48–72h after booking       → OVERDUE         (warning banner / popup,
--                                                    NOT deactivated yet)
--   • > 72h after booking        → DEACTIVATED     (suspended from program;
--                                                    every partner skips them)
--
-- Implementation: cron + queries compute `due_at + interval '24 hours'`
-- inline. (Postgres rejects this expression as a STORED generated column
-- because timestamptz arithmetic with an interval involving days/larger is
-- treated as non-immutable; an indexed expression won't help here, so we
-- just compute it in queries — cheap, no row rewrite.)
--
-- Plus a new `drivers.partner_terms_accepted_at TIMESTAMPTZ`. The driver
-- dashboard refuses to opt in until the T&Cs modal is confirmed; on accept
-- the API stamps `partner_terms_accepted_at = now()`. Existing opted-in
-- ('eligible') drivers are back-filled with now() so they aren't
-- retroactively gated out of the program.
--
-- Touches:
--   • partner_bookings — supporting index on (due_at) for the grace query
--   • drivers.partner_terms_accepted_at (new, nullable timestamptz)
--   • suspend_delinquent_partner_drivers() — sweep changed to due_at + 24h
-- =============================================================================

-- 1. Supporting index for the 72h sweep (driver_user_id, pending, due_at).
create index if not exists partner_bookings_pending_due_idx
  on public.partner_bookings (driver_user_id, due_at)
  where status = 'pending';

-- 2. Track T&Cs acceptance.
alter table public.drivers
  add column if not exists partner_terms_accepted_at timestamptz;

-- 3. Backfill: any driver already opted IN at the time of this migration is
--    grandfathered — they don't get re-gated by the new T&Cs flow.
update public.drivers
   set partner_terms_accepted_at = now()
 where partner_program_status = 'eligible'
   and partner_terms_accepted_at is null;

-- 4. Refresh the suspend function to use the 72h (due_at + 24h) threshold
--    instead of the 48h (due_at) threshold. Reason copy updated too.
create or replace function public.suspend_delinquent_partner_drivers()
returns integer language plpgsql security definer as $$
declare
  affected integer := 0;
begin
  update public.drivers d
  set partner_program_status   = 'suspended',
      partner_suspended_at     = now(),
      partner_suspended_reason = 'Outstanding partner commissions overdue (>72 hours — 48h due + 24h grace exceeded)'
  where d.partner_program_status = 'eligible'
    and exists (
      select 1 from public.partner_bookings b
      where b.driver_user_id = d.user_id
        and b.status = 'pending'
        and (b.due_at + interval '24 hours') < now()
    );
  get diagnostics affected = row_count;
  return affected;
end;
$$;
