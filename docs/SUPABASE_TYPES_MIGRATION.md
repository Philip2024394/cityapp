# Supabase Typed-Client Migration

**Status:** Generated types committed, typed clients **deferred** (2026-05-30).

## What landed

- `src/types/supabase.ts` — 6,794 lines, ~170 tables, regenerable via:
  ```sh
  SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN \
    npx supabase gen types typescript --project-id $SUPABASE_PROJECT_REF \
    > src/types/supabase.ts
  ```
- `src/lib/supabase/{admin,client,server}.ts` — **NOT typed**. Comments
  point here for the rollout plan.

## Why deferred

Wiring `createClient<Database>` into the three client factories surfaced
**108 type errors across 68 source files** in one pass. The user's hard
ceiling for this hardening pass was >100 errors → defer + document.

## Error categories (raw counts on 2026-05-30)

| Category                                                  | Count |
|-----------------------------------------------------------|-------|
| `RejectExcessProperties` on insert/update payloads        | 56    |
| `SelectQueryError` — `.select('col')` columns missing     | 30    |
| `TS2345` — argument type mismatch (broader)               | 65    |
| `TS2339` — property missing after `SelectQueryError` fan-out | 19 |
| `TS2769` — no overload matches (chained query builder)    | 12    |
| Table-name assigned to `never` (table missing in schema)  | 11    |

(Categories overlap — e.g. every `SelectQueryError` row also counts as
`TS2339`.)

## Top files (errors per file)

| File                                              | Errors |
|---------------------------------------------------|-------:|
| `src/app/admin/providers/page.tsx`                |     13 |
| `src/lib/admin/health.ts`                         |      5 |
| `src/app/api/reviews/route.ts`                    |      5 |
| `src/app/api/dashboard/[category]/route.ts`       |      5 |
| `src/app/api/webhooks/midtrans/route.ts`          |      4 |
| `src/app/api/orders/[id]/route.ts`                |      4 |
| `src/lib/drivers/queries.ts`                      |      3 |
| `src/app/api/connect-intent/route.ts`             |      3 |
| `src/lib/admin/guard.ts`                          |      2 |
| `src/app/r/[slug]/page.tsx`                       |      2 |

## Drift the typed client revealed

The compiler caught real schema/code drift that hand-typed `database.ts`
had not. Two flavours:

### A. Code references columns the DB no longer has

The generator pulls live schema; if code still selects an old column, the
whole row is poisoned with `SelectQueryError`.

- `tour_guide_listings.paid_until` — column gone
- `affiliate_agents.display_name` — column gone
- `affiliate_agents.user_id` — column gone
- `affiliate_agents.midtrans_server_key_enc` — column gone
- `affiliate_payouts.user_id`, `display_name`, `midtrans_server_key_enc` — same
- `beautician_providers.mock_hidden_at`, `handyman_providers.mock_hidden_at` — gone
- `drivers.bike_photo_url`, `drivers_public.bike_photo_url` — gone

### B. Tables the codebase mentions that the typed schema doesn't expose

The generated `Database['public']['Tables']` union is missing entries the
runtime code happily writes to. Either RLS / generation flags exclude them,
or they live in another schema and need to be queried via the schema
selector:

- `push_send_log`
- `tour_guide_providers` (the schema has `tour_guide_listings` instead)

### C. Insert/update payloads built as `Record<string, unknown>`

56 of the 108 errors are `RejectExcessProperties<...>` failures. Most
admin/CRUD routes assemble update objects dynamically (spread from form
state, JSON.parse, etc.) and the typed client cannot prove the shape
without per-route refactors.

## Recommended rollout order

1. **Schema reconciliation first (no client typing yet).** Land a migration
   that either restores or removes the drifted columns/tables in section A.
   This is the highest-value fix because the *runtime* is probably already
   silently failing on some of these queries.
2. **Cast dynamic payloads.** Wrap the `Record<string, unknown>` builders
   in `lib/admin/*` and `app/api/admin/**/route.ts` with typed helpers
   (`AdminUpdate<'drivers'>`-style aliases) so section C drops to near zero.
3. **Flip the typed client one factory at a time.** Order:
   1. `client.ts` (smallest blast radius, browser code is already narrow)
   2. `server.ts` (Server Components / Route Handlers)
   3. `admin.ts` (privileged writes — last, biggest blast radius)
4. **Re-run `tsc --noEmit` between each step.** Expect the error count to
   drop from 108 → ~30 → ~10 → 0 if section A is properly fixed first.

## Regeneration cadence

Re-run `supabase gen types typescript` after every migration that adds,
renames, or drops a column. Add it to the migration PR template so the
typed file moves in lockstep with the SQL.
