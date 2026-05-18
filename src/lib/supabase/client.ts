'use client'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Browser-only Supabase client.
// Returns null in dev when env not configured so the app boots in demo mode.
// Deliberately untyped against the Database schema (see lib/supabase/admin.ts
// for the same tradeoff) — we validate inserts/updates at the call site.
let cached: SupabaseClient | null = null

export function getBrowserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (!cached) cached = createBrowserClient(url, key)
  return cached
}

// True when Supabase is configured. Components can use this to choose
// between real queries and the legacy mock-data path during migration.
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
