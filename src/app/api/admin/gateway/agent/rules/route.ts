import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'

export const dynamic = 'force-dynamic'

const CATEGORIES = new Set(['general', 'cost', 'privacy', 'marketing', 'approval', 'tone'])

export const GET = withGateway(async () => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  const { data, error } = await sl.from('agent_rules').select('*').order('priority', { ascending: false }).order('created_at')
  if (error) return fail(error.message, 500)
  return ok({ rules: data ?? [] })
})

export const POST = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  let body: { rule_text?: string; priority?: number; category?: string; active?: boolean }
  try { body = (await req.json()) as typeof body } catch { return fail('Invalid JSON', 400) }
  if (!body.rule_text?.trim()) return fail('rule_text required', 400)
  const category = body.category && CATEGORIES.has(body.category) ? body.category : 'general'
  const { data, error } = await sl.from('agent_rules').insert({
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
  const { data, error } = await sl.from('agent_rules').update(patch).eq('id', body.id).select().maybeSingle()
  if (error) return fail(error.message, 500)
  if (!data) return fail('Rule not found', 404)
  return ok({ rule: data })
})

export const DELETE = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return fail('id query param required', 400)
  const { error } = await sl.from('agent_rules').delete().eq('id', id)
  if (error) return fail(error.message, 500)
  return ok({ deleted: id })
})

export const OPTIONS = withGateway(async () => ok({}))
