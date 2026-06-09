-- mig 0227 — Studio tier multi-location / agency sub-accounts
--
-- Task 11/12 of the Linktree-beat rollout. Studio plan (Rp 149K/mo)
-- justifies itself with "up to 5 pages under one billing seat". The
-- original beautician_providers schema (mig 0058) modeled one row per
-- user via `user_id unique` plus a check requiring at least one priced
-- service. Both conflict with the multi-page feature:
--
--   • Drop the user_id UNIQUE constraint so a single auth user can own
--     N beautician_providers rows (cap enforced server-side via
--     pageCapForPlan()). A non-unique index keeps the user_id lookup
--     in /api/beautician/me/pages fast.
--   • Drop the at_least_one_service check so the "+ Add a new page"
--     flow can insert a stub row with display_name only — the owner
--     fills in pricing from the dashboard. UI still nudges them to
--     price at least one service before they share the public link.

-- Drop the unique constraint Postgres created from the `user_id unique`
-- column definition. The constraint name is the standard PG default.
alter table public.beautician_providers
  drop constraint if exists beautician_providers_user_id_key;

-- Non-unique B-tree index so the listing query (GET pages) stays O(log n).
create index if not exists idx_bp_user_id
  on public.beautician_providers (user_id);

-- Allow stub rows with no priced service. UI guidance handles the
-- "you should probably set a price" nudge; the DB no longer hard-fails
-- on insert for multi-page Studio users.
alter table public.beautician_providers
  drop constraint if exists beautician_at_least_one_service;
