-- =============================================================================
-- 0161 — Partner Program: 48h pay cycle + opt-in default
-- =============================================================================
-- Founder decision 2026-05-31:
--   • Pay cycle: 48 hours (was 7 days)
--   • Default eligibility for NEW drivers: 'opted_out' (was 'eligible')
--     Existing 'eligible' drivers are grandfathered — they don't get flipped
--     out of the program; only new signups must opt IN explicitly.
--   • Suspension reason copy updated to match 48h cycle.
--
-- Touches:
--   • partner_bookings.due_at default → 48 hours
--   • drivers.partner_program_status default → 'opted_out' (new rows only)
--   • suspend_delinquent_partner_drivers() reason text → 48 hours
-- =============================================================================

-- 1. New partner_bookings rows default to due_at = now() + 48h
alter table public.partner_bookings
  alter column due_at set default (now() + interval '48 hours');

-- 2. New drivers default to 'opted_out' — they must explicitly flip to
--    'eligible' via the dashboard toggle to start receiving partner-referred
--    bookings. Existing drivers untouched.
alter table public.drivers
  alter column partner_program_status set default 'opted_out';

-- 3. Refresh the suspend function with updated reason copy.
create or replace function public.suspend_delinquent_partner_drivers()
returns integer language plpgsql security definer as $$
declare
  affected integer := 0;
begin
  update public.drivers d
  set partner_program_status   = 'suspended',
      partner_suspended_at     = now(),
      partner_suspended_reason = 'Outstanding partner commissions overdue (>48 hours)'
  where d.partner_program_status = 'eligible'
    and exists (
      select 1 from public.partner_bookings b
      where b.driver_user_id = d.user_id
        and b.status = 'pending'
        and b.due_at < now()
    );
  get diagnostics affected = row_count;
  return affected;
end;
$$;
