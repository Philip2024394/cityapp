import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// Server-side Supabase client with cookie-based session.
// Use in Server Components, Server Actions, Route Handlers.
// Returns null when env not configured so callers can fall through to demo data.
// Untyped against Database schema — validate at the call site.
// Typed client migration is staged — see docs/SUPABASE_TYPES_MIGRATION.md.
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const cookieStore = await cookies()
  type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Components cannot set cookies; this is expected.
          // Middleware handles the actual cookie writes on refresh.
        }
      },
    },
  })
}

// Returns the authenticated user (auth.users) or null.
export async function getCurrentUser() {
  const supabase = await getServerSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

// Returns the full profile row (including role) for the authenticated user.
export async function getCurrentProfile() {
  const supabase = await getServerSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  return profile
}
