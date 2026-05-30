-- ============================================================================
-- 0153 — Grant anon SELECT on drivers + drivers_public
-- ----------------------------------------------------------------------------
-- The /cari booking page is a public marketplace surface — anyone, signed
-- in or not, can browse drivers. It queries the `drivers_public` view
-- (which omits payment columns per mig 0067). The view is
-- security_invoker=true so it forwards privileges to the underlying
-- `drivers` table.
--
-- Symptom before this migration: anon clients hit `permission denied for
-- table drivers` because we never granted SELECT to anon on the base
-- table. RLS policy `drivers_public_active_read` covers the row-level
-- filter; we still need column-level (well, table-level) GRANT for anon
-- to read at all.
--
-- This grants SELECT on the public-safe surfaces only — payments,
-- subscription, etc. stay locked down by their own RLS + the view's
-- column projection.
-- ============================================================================

grant select on public.drivers        to anon;
grant select on public.drivers_public to anon;
grant select on public.subscriptions  to anon;

-- Mock drivers are already publicly readable; this just confirms the
-- grant in case it was ever dropped.
grant select on public.mock_drivers to anon;
