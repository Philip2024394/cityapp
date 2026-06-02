-- ============================================================================
-- 0180_drivers_status_deactivated.sql — add 'deactivated' status to drivers
-- ----------------------------------------------------------------------------
-- The H4 audit flagged that admin has only two driver states: 'active' /
-- 'suspended'. Suspension carries a policy-violation connotation. There
-- was no clean way to admin-hide a driver who simply asked to be paused,
-- retired, or who needs to be removed from discovery for non-disciplinary
-- reasons (e.g., expired KTP wait, manual review of business name).
--
-- This migration extends the status enum to include 'deactivated'. RLS
-- helpers and discovery queries already filter on status='active', so
-- 'deactivated' rows naturally drop out of public listings without any
-- application change.
--
-- Important: this is NOT a "remove from dispatch queue" operation —
-- IndoCity has no dispatch queue (mig 0010 removed trips). It's a
-- visibility / discovery toggle.
-- ============================================================================

alter table public.drivers
  drop constraint if exists drivers_status_check;

alter table public.drivers
  add constraint drivers_status_check
  check (status in ('active', 'suspended', 'deactivated'));

comment on column public.drivers.status is
  'Admin moderation tool. active = public; suspended = policy violation; '
  'deactivated = admin-hidden for non-disciplinary reasons (paused, '
  'retired, awaiting manual review). All non-active states hide the row '
  'from public discovery via the existing status=active filter.';
