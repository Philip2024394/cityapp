import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  // Task 11 — Studio tier multi-location: one user can own many
  // tailor_providers rows. The dashboard passes ?slug=<x> so the
  // currently-selected page is the one fetched here. Without ?slug, fall
  // back to the oldest row (the user's "original" page) — this also
  // covers Free/Pro accounts that only have one row.
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')?.trim() || null

  let query = admin
    .from('tailor_providers')
    .select('*')
    .eq('user_id', user.id)

  if (slug) {
    query = query.eq('slug', slug)
  } else {
    query = query.order('created_at', { ascending: true })
  }

  const { data, error } = await query.limit(1).maybeSingle()

  if (error) {
    console.error('[tailor/me] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  return NextResponse.json({ provider: data ?? null })
}
