import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'

// ============================================================================
// Room-scoped rules CRUD. Mirrors the global agent_rules endpoints but
// always scoped to a room_id derived from the URL.
// ============================================================================

export const dynamic = 'force-dynamic'

const CATEGORIES = new Set(['general','cost','privacy','marketing','approval','tone','schedule','budget'])

export const POST = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  const url = new URL(req.url)
  const segs = url.pathname.split('/').filter(Boolean)
  const roomId = segs[segs.length - 2]
  if (!roomId) return fail('Missing room id', 400)
  let body: { rule_text?: string; priority?: number; category?: string; active?: boolean }
  try { body = (await req.json()) as typeof body } catch { return fail('Invalid JSON', 400) }
  if (!body.rule_text?.trim()) return fail('rule_text required', 400)
  const category = body.category && CATEGORIES.has(body.category) ? body.category : 'general'
  const { data, error } = await sl.from('room_rules').insert({
    room_id: roomId,
    rule_text: body.rule_text.trim().slice(0, 1000),
    priority: body.priority ?? 100,
    category,
    active: body.active !== false,
  }).select().single()
  if (error) return fail(error.message, 500)
  return ok({ rule: data })
})

export const PATCH = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  let body: { id?: string; rule_text?: string; priority?: number; category?: string; active?: boolean }
  try { body = (await req.json()) as typeof body } catch { return fail('Invalid JSON', 400) }
  if (!body.id) return fail('id required', 400)
  const patch: Record<string, unknown> = {}
  if (typeof body.rule_text === 'string') patch.rule_text = body.rule_text.slice(0, 1000)
  if (typeof body.priority === 'number') patch.priority = body.priority
  if (typeof body.category === 'string' && CATEGORIES.has(body.category)) patch.category = body.category
  if (typeof body.active === 'boolean') patch.active = body.active
  const { data, error } = await sl.from('room_rules').update(patch).eq('id', body.id).select().maybeSingle()
  if (error) return fail(error.message, 500)
  if (!data) return fail('Rule not found', 404)
  return ok({ rule: data })
})

export const DELETE = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  const url = new URL(req.url)
  const ruleId = url.searchParams.get('id')
  if (!ruleId) return fail('id query param required', 400)
  const { error } = await sl.from('room_rules').delete().eq('id', ruleId)
  if (error) return fail(error.message, 500)
  return ok({ deleted: ruleId })
})

export const OPTIONS = withGateway(async () => ok({}))
