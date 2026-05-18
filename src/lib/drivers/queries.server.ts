// ============================================================================
// Independent-rider data fetchers — SERVER ONLY
// ============================================================================
// Pulls from Supabase using the SSR/cookie-aware client. Use in Server
// Components, Server Actions, Route Handlers. NEVER import from client code.
// ============================================================================
import 'server-only'
import { getServerSupabase } from '@/lib/supabase/server'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { driverRowToRider } from '@/lib/drivers/queries'
import type { DriverRow } from '@/types/database'
import type { Rider } from '@/types/rider'

// Current authenticated rider (server-side)
export async function fetchMyDriverServer(): Promise<Rider | null> {
  const supabase = await getServerSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle()
  if (error || !data) return null
  return driverRowToRider(data as DriverRow)
}

// Single rider by slug (server-side, used by SSR pages)
export async function fetchDriverBySlugServer(slug: string): Promise<Rider | null> {
  const supabase = await getServerSupabase()
  if (!supabase) {
    return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  }
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !data) {
    return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  }
  return driverRowToRider(data as DriverRow)
}
