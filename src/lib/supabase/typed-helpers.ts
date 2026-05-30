import type { Database } from '@/types/supabase'

// Typed payload helpers for the generated `Database` schema.
//
// Why these exist:
//   When the supabase-js client is parameterised with <Database>, methods like
//   `.update()` and `.insert()` enforce the row's exact shape. A loosely typed
//   builder such as `const u: Record<string, unknown> = {...}` then trips TS's
//   `RejectExcessProperties` guard, even when the runtime payload is correct.
//
//   These aliases let admin/CRUD code declare the payload as a partial of the
//   exact table row — keeps the dynamic builder ergonomics, restores compile-
//   time safety, and matches the migration plan in
//   docs/SUPABASE_TYPES_MIGRATION.md (Phase 2).
//
// Use:
//   import type { TableUpdate } from '@/lib/supabase/typed-helpers'
//   const updates: TableUpdate<'beautician_providers'> = { status: 'active' }
//   await admin.from('beautician_providers').update(updates).eq('id', id)

/** Partial row of a known table — safe for Supabase `.update()` payloads. */
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Partial<Database['public']['Tables'][T]['Update']>

/** Full insert row of a known table — safe for `.insert()` payloads. */
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/** Selected row of a known table — for typing query results. */
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
