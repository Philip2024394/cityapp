import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'

// ============================================================================
// GET  /api/admin/gateway/tasks?room_id=...&status=... — list (admin queue view)
// POST /api/admin/gateway/tasks                        — create a task
// ============================================================================

export const dynamic = 'force-dynamic'

export const GET = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  const url = new URL(req.url)
  const roomId = url.searchParams.get('room_id')
  const status = url.searchParams.get('status')
  let q = sl.from('tasks').select('*').order('assigned_at', { ascending: false }).limit(100)
  if (roomId) q = q.eq('room_id', roomId)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return fail(error.message, 500)
  return ok({ tasks: data ?? [] })
})

export const POST = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  let body: { room_id?: string; title?: string; description?: string }
  try { body = (await req.json()) as typeof body } catch { return fail('Invalid JSON', 400) }
  if (!body.room_id || !body.title?.trim()) return fail('room_id + title required', 400)
  const { data, error } = await sl.from('tasks').insert({
    room_id: body.room_id,
    title: body.title.trim().slice(0, 200),
    description: body.description?.trim()?.slice(0, 2000) || null,
    status: 'queued',
  }).select().single()
  if (error) return fail(error.message, 500)
  return ok({ task: data })
})

export const OPTIONS = withGateway(async () => ok({}))
