-- 0160_tour_packages_active_driver_gate.sql
--
-- Tighten the public-read RLS policy on driver_tour_packages so that a
-- suspended or lapsed driver's published tours no longer leak through the
-- /tour browser. The old policy only checked `published = true`, which
-- meant a driver who had been set to status != 'active' or whose
-- paid_until was in the past still showed their inventory publicly.
--
-- New rule mirrors the gate used on /cari + /car:
--   driver row exists with status = 'active'
--   AND (paid_until is null OR paid_until >= current_date)

drop policy if exists "Published tours readable by all" on public.driver_tour_packages;
create policy "Published tours readable by all"
  on public.driver_tour_packages for select
  using (
    published = true
    and exists (
      select 1 from public.drivers d
      where d.user_id = driver_id
        and d.status = 'active'
        and (d.paid_until is null or d.paid_until >= current_date)
    )
  );
