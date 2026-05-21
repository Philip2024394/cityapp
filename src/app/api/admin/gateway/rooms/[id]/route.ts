import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'

// ============================================================================
// GET  /api/admin/gateway/rooms/[id]   — room detail + rules + recent tasks
// PATCH /api/admin/gateway/rooms/[id]  — update editable fields
// ============================================================================

export const dynamic = 'force-dynamic'

export const GET = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  const url = new URL(req.url)
  const id = url.pathname.split('/').pop() || ''
  if (!id) return fail('Missing room id', 400)

  const [{ data: room }, { data: rules }, { data: tasks }] = await Promise.all([
    sl.from('rooms').select('*').eq('id', id).maybeSingle(),
    sl.from('room_rules').select('*').eq('room_id', id).order('priority', { ascending: false }),
    sl.from('tasks').select('*').eq('room_id', id).order('assigned_at', { ascending: false }).limit(50),
  ])
  if (!room) return fail('Room not found', 404)
  return ok({ room, rules: rules ?? [], recent_tasks: tasks ?? [] })
})

export const PATCH = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  const url = new URL(req.url)
  const id = url.pathname.split('/').pop() || ''
  if (!id) return fail('Missing room id', 400)
  let body: { name?: string; icon?: string; description?: string; system_prompt_addendum?: string; allowed_tools?: string[]; active?: boolean }
  try { body = (await req.json()) as typeof body } catch { return fail('Invalid JSON', 400) }
  const patch: Record<string, unknown> = {}
  if (typeof body.name === 'string') patch.name = body.name
  if (typeof body.icon === 'string') patch.icon = body.icon
  if (typeof body.description === 'string') patch.description = body.description
  if (typeof body.system_prompt_addendum === 'string') patch.system_prompt_addendum = body.system_prompt_addendum
  if (Array.isArray(body.allowed_tools)) patch.allowed_tools = body.allowed_tools
  if (typeof body.active === 'boolean') patch.active = body.active
  const { data, error } = await sl.from('rooms').update(patch).eq('id', id).select().maybeSingle()
  if (error) return fail(error.message, 500)
  if (!data) return fail('Room not found', 404)
  return ok({ room: data })
})

export const OPTIONS = withGateway(async () => ok({}))
