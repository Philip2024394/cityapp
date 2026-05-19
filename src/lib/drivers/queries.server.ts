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
import type { DriverRow, SubscriptionStatus } from '@/types/database'
import type { Rider } from '@/types/rider'

type SubInfo = {
  status: SubscriptionStatus | null
  trial_ends_at: string | null
  current_period_end: string | null
} | null

type RowWithSub = DriverRow & {
  subscriptions?: SubInfo | SubInfo[] | null
}

function pickSub(row: RowWithSub): SubInfo {
  const s = row.subscriptions
  if (!s) return null
  if (Array.isArray(s)) return s[0] ?? null
  return s
}

// Current authenticated rider (server-side)
export async function fetchMyDriverServer(): Promise<Rider | null> {
  const supabase = await getServerSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('drivers')
    .select('*, subscriptions(status, trial_ends_at, current_period_end)')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) return null
  const row = data as RowWithSub
  return driverRowToRider(row, pickSub(row))
}

// Single rider by slug (server-side, used by SSR pages)
export async function fetchDriverBySlugServer(slug: string): Promise<Rider | null> {
  const supabase = await getServerSupabase()
  if (!supabase) {
    return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  }
  const { data, error } = await supabase
    .from('drivers')
    .select('*, subscriptions(status, trial_ends_at, current_period_end)')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !data) {
    return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  }
  const row = data as RowWithSub
  return driverRowToRider(row, pickSub(row))
}
