-- ============================================================================
-- 0020_driver_online_until.sql
-- ----------------------------------------------------------------------------
-- Adds online_until to drivers — when the driver goes online they pick a
-- shift duration (1h / 2h / 4h / null=until-I-toggle). The marketplace
-- filters expired drivers out so a driver who forgets to toggle off
-- doesn't pollute results overnight.
--
-- DIRECTORY-POSTURE NOTE (PM 12/2019):
-- Driver-self timestamp only. Set by the driver's own toggle. No
-- customer-event recording. Safe.
-- ============================================================================

alter table public.drivers
  add column if not exists online_until timestamptz;

-- Partial index supports the "exclude expired drivers" filter cheaply.
create index if not exists drivers_online_until_idx
  on public.drivers (online_until)
  where status = 'active' and availability in ('online', 'busy');
