import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/massage/me/availability { availability: 'online'|'busy'|'offline' }
// Quick toggle. Refuses to flip 'online' if the provider isn't verified
// (status !== 'active') — keeps unverified profiles off the marketplace
// even if a curious dev hits the endpoint directly.

export const runtime = 'nodejs'

const ALLOWED = ['online','busy','offline'] as const
type Allowed = typeof ALLOWED[number]

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { availability?: string }
  try { body = (await req.json()) as { availability?: string } } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const next = body.availability as Allowed | undefined
  if (!next || !ALLOWED.includes(next)) {
    return NextResponse.json({ error: 'invalid_availability' }, { status: 400 })
  }

  const { data: row, error: readErr } = await admin
    .from('massage_providers')
    .select('id, status, availability')
    .eq('user_id', user.id)
    .maybeSingle()
  if (readErr) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  if (!row)    return NextResponse.json({ error: 'no_provider_row' }, { status: 404 })

  if (next === 'online' && row.status !== 'active') {
    return NextResponse.json({ error: 'not_verified' }, { status: 403 })
  }

  const { error: updErr } = await admin
    .from('massage_providers')
    .update({ availability: next, updated_at: new Date().toISOString() })
    .eq('id', row.id)
  if (updErr) return NextResponse.json({ error: 'update_failed' }, { status: 500 })

  return NextResponse.json({ ok: true, availability: next })
}
