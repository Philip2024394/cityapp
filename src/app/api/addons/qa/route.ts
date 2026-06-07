// ============================================================================
// /api/addons/qa
// ----------------------------------------------------------------------------
// CRUD for the current user's Q&A items.
//
//   GET                  → list all of my Q&A items
//   GET?owner=<uuid>     → list a specific provider's Q&A items (public read)
//   POST  { question, answer, sort_order? }  → create
//   PATCH { id, question?, answer?, sort_order? } → update one of mine
//   DELETE?id=<uuid>     → delete one of mine
//
// Write endpoints require the user to have the 'qa' add-on enabled. We
// re-check on every write so a cancelled add-on can't keep adding rows.
// ============================================================================

import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function requireAddon(supabase: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>, userId: string) {
  const { data } = await supabase
    .from('provider_addons')
    .select('addon_id, status')
    .eq('owner_user_id', userId)
    .eq('addon_id', 'qa')
    .maybeSingle()
  if (!data) return false
  return data.status === 'free' || data.status === 'trial' || data.status === 'paid'
}

export async function GET(req: Request) {
  const url   = new URL(req.url)
  const owner = url.searchParams.get('owner')?.trim() || null

  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ items: [] })

  if (owner) {
    // Public read for a specific provider — RLS already allows anon select.
    const { data } = await supabase
      .from('provider_qa')
      .select('id, question, answer, sort_order')
      .eq('owner_user_id', owner)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    return NextResponse.json({ items: data ?? [] })
  }

  // Otherwise return the signed-in user's own items
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const { data } = await supabase
    .from('provider_qa')
    .select('id, question, answer, sort_order')
    .eq('owner_user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'no_session' }, { status: 503 })

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  if (!(await requireAddon(supabase, user.id))) {
    return NextResponse.json({ error: 'addon_not_enabled' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as
    | { question?: unknown; answer?: unknown; sort_order?: unknown } | null
  if (!body) return NextResponse.json({ error: 'bad_body' }, { status: 400 })
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const answer   = typeof body.answer   === 'string' ? body.answer.trim()   : ''
  if (question.length < 3 || question.length > 200) {
    return NextResponse.json({ error: 'question_invalid' }, { status: 400 })
  }
  if (answer.length < 3 || answer.length > 1200) {
    return NextResponse.json({ error: 'answer_invalid' }, { status: 400 })
  }
  const sort_order = Number.isInteger(body.sort_order) ? body.sort_order as number : 0

  const { data, error } = await supabase
    .from('provider_qa')
    .insert({ owner_user_id: user.id, question, answer, sort_order })
    .select('id, question, answer, sort_order')
    .single()
  if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PATCH(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'no_session' }, { status: 503 })
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const body = await req.json().catch(() => null) as
    | { id?: unknown; question?: unknown; answer?: unknown; sort_order?: unknown } | null
  if (!body || typeof body.id !== 'string') return NextResponse.json({ error: 'bad_body' }, { status: 400 })
  const id = body.id

  const patch: Record<string, unknown> = {}
  if (typeof body.question === 'string') {
    const q = body.question.trim()
    if (q.length < 3 || q.length > 200) return NextResponse.json({ error: 'question_invalid' }, { status: 400 })
    patch.question = q
  }
  if (typeof body.answer === 'string') {
    const a = body.answer.trim()
    if (a.length < 3 || a.length > 1200) return NextResponse.json({ error: 'answer_invalid' }, { status: 400 })
    patch.answer = a
  }
  if (Number.isInteger(body.sort_order)) patch.sort_order = body.sort_order

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, noChange: true })

  const { error } = await supabase
    .from('provider_qa')
    .update(patch)
    .eq('id', id)
    .eq('owner_user_id', user.id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'no_session' }, { status: 503 })
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const url = new URL(req.url)
  const id = (url.searchParams.get('id') || '').trim()
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 })

  const { error } = await supabase
    .from('provider_qa')
    .delete()
    .eq('id', id)
    .eq('owner_user_id', user.id)
  if (error) return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
