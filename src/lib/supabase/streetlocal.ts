import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Cross-Supabase admin client — reads streetlocal project data
// ----------------------------------------------------------------------------
// cityrider crons sometimes need to act on streetlocal data (e.g. the PDP
// data-deletion overdue reminder reads from data_deletion_requests). To do
// that we need a service-role client pointing at the STREETLOCAL Supabase.
//
// Env (cityrider Vercel project):
//   STREETLOCAL_SUPABASE_URL          — https://fjvafjkzvygkhiwjuvla.supabase.co
//   STREETLOCAL_SUPABASE_SERVICE_KEY  — service-role key from streetlocal
//
// Returns null when env not configured so the cron can short-circuit
// with a clear "not configured" response instead of crashing.
// ============================================================================

let cached: SupabaseClient | null = null

export function getStreetlocalAdminSupabase(): SupabaseClient | null {
  if (cached) return cached
  const url = process.env.STREETLOCAL_SUPABASE_URL
  const key = process.env.STREETLOCAL_SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
