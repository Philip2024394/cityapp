import { createBrowserClient } from '@supabase/ssr'

// Browser-only Supabase client. Cookies handled by @supabase/ssr.
// Falls back to no-op stub when env not configured so the app boots in dev.
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createBrowserClient(url, key)
}
