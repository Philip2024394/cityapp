import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role Supabase client. BYPASSES Row Level Security.
// NEVER import this from any file that runs in the browser.
// Use ONLY in server routes for privileged operations:
//   - admin moderation (places, rentals, drivers)
//   - seeding subscription on driver signup
//   - writing audit_log entries
//
// Note: deliberately UNTYPED against the Database schema. Runtime validation
// in each API route enforces the shape; we trade compile-time table-name
// safety for working type inference on insert/upsert payloads in v2.49+.
let cached: SupabaseClient | null = null

export function getAdminSupabase(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    throw new Error('getAdminSupabase() called from the browser — service-role key must stay server-side')
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cached
}
