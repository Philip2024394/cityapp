import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// DELETE /api/beautician/promo-pages/[id]
// Archive a promo so /promo/{slug} starts 404'ing. Archived rows stay
// in the table for analytics history; we don't hard-delete on the v1
// cut. POST with { restore: true } un-archives within 7 days.

export const runtime = 'nodejs'

const UNDO_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

async function resolveOwner(userId: string) {
  const admin = getAdminSupabase()
  if (!admin) return null
  const { data: provider } = await admin
    .from('beautician_providers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return provider ? { providerId: provider.id as string, admin } : null
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const owner = await resolveOwner(user.id)
  if (!owner) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  const { error } = await owner.admin
    .from('promo_pages')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('provider_type', 'beautician')
    .eq('provider_id',   owner.providerId)
  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// POST /api/beautician/promo-pages/[id]
// Body: { restore: true } — un-archive a promo. Only allowed while the
// archived_at timestamp is within the 7-day undo window, so users
// can't resurrect long-buried pages by accident.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  let body: { restore?: boolean }
  try { body = await req.json() } catch { body = {} }
  if (!body.restore) return NextResponse.json({ error: 'no_op' }, { status: 400 })

  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const owner = await resolveOwner(user.id)
  if (!owner) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  // Confirm archival timestamp falls inside the undo window.
  const { data: row } = await owner.admin
    .from('promo_pages')
    .select('archived_at')
    .eq('id', id)
    .eq('provider_type', 'beautician')
    .eq('provider_id',   owner.providerId)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!row.archived_at) return NextResponse.json({ error: 'not_archived' }, { status: 400 })
  const archivedAge = Date.now() - new Date(row.archived_at as string).getTime()
  if (archivedAge > UNDO_WINDOW_MS) {
    return NextResponse.json({ error: 'undo_window_expired' }, { status: 410 })
  }

  const { error } = await owner.admin
    .from('promo_pages')
    .update({ archived_at: null })
    .eq('id', id)
    .eq('provider_type', 'beautician')
    .eq('provider_id',   owner.providerId)
  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
