import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'

// ============================================================================
// GET  /api/admin/gateway/rooms       — list all rooms (active first, sorted)
// POST /api/admin/gateway/rooms       — create a custom room
// ============================================================================

export const dynamic = 'force-dynamic'

export const GET = withGateway(async () => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)

  // Pull rooms + count of open tasks per room in one round trip.
  const { data: rooms, error } = await sl
    .from('rooms')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
  if (error) return fail(error.message, 500)

  const ids = (rooms ?? []).map((r) => r.id)
  const counts: Record<string, { queued: number; running: number; awaiting_approval: number }> = {}
  for (const id of ids) counts[id] = { queued: 0, running: 0, awaiting_approval: 0 }

  if (ids.length > 0) {
    const { data: openTasks } = await sl
      .from('tasks')
      .select('room_id, status')
      .in('room_id', ids)
      .in('status', ['queued', 'running', 'awaiting_approval'])
    for (const t of (openTasks ?? []) as Array<{ room_id: string; status: string }>) {
      const c = counts[t.room_id]
      if (c && t.status in c) (c as Record<string, number>)[t.status]++
    }
  }

  return ok({
    rooms: (rooms ?? []).map((r) => ({ ...r, open_counts: counts[r.id] })),
  })
})

export const POST = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  let body: { slug?: string; name?: string; icon?: string; description?: string; system_prompt_addendum?: string; allowed_tools?: string[] }
  try { body = (await req.json()) as typeof body } catch { return fail('Invalid JSON', 400) }
  if (!body.slug?.trim() || !body.name?.trim()) return fail('slug + name required', 400)
  const { data, error } = await sl.from('rooms').insert({
    slug: body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40),
    name: body.name.trim(),
    icon: body.icon || '🤖',
    description: body.description || null,
    system_prompt_addendum: body.system_prompt_addendum || null,
    allowed_tools: body.allowed_tools || [],
    sort_order: 1000,
  }).select().single()
  if (error) return fail(error.message, 500)
  return ok({ room: data })
})

export const OPTIONS = withGateway(async () => ok({}))
