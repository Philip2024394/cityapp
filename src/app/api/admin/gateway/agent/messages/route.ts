import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'

export const dynamic = 'force-dynamic'

export const GET = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  if (!sessionId) return fail('session_id required', 400)
  const { data, error } = await sl
    .from('agent_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('occurred_at', { ascending: true })
    .limit(500)
  if (error) return fail(error.message, 500)

  // Also return pending actions for this session.
  const { data: actions } = await sl
    .from('agent_actions')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
  return ok({ messages: data ?? [], actions: actions ?? [] })
})

export const OPTIONS = withGateway(async () => ok({}))
