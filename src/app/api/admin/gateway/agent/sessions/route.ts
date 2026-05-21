import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'

export const dynamic = 'force-dynamic'

export const GET = withGateway(async () => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  const { data, error } = await sl.from('agent_sessions').select('*').order('started_at', { ascending: false }).limit(50)
  if (error) return fail(error.message, 500)
  return ok({ sessions: data ?? [] })
})

export const OPTIONS = withGateway(async () => ok({}))
