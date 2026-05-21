import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'

// GET /api/admin/gateway/tasks/[id]/steps — execution log for the timeline UI
export const dynamic = 'force-dynamic'

export const GET = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  const url = new URL(req.url)
  const segs = url.pathname.split('/').filter(Boolean)
  const taskId = segs[segs.length - 2]
  if (!taskId) return fail('Missing task id', 400)
  const { data, error } = await sl.from('task_steps').select('*').eq('task_id', taskId).order('step_number', { ascending: true })
  if (error) return fail(error.message, 500)
  return ok({ steps: data ?? [] })
})

export const OPTIONS = withGateway(async () => ok({}))
