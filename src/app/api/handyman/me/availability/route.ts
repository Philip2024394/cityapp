import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })
  let body: { availability?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const next = body.availability as 'online'|'busy'|'offline' | undefined
  if (!next || !['online','busy','offline'].includes(next)) {
    return NextResponse.json({ error: 'invalid_availability' }, { status: 400 })
  }
  const { data: row } = await admin.from('handyman_providers').select('id').eq('user_id', user.id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'no_provider_row' }, { status: 404 })
  const { error } = await admin
    .from('handyman_providers')
    .update({ availability: next, updated_at: new Date().toISOString() })
    .eq('id', row.id)
  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  return NextResponse.json({ ok: true, availability: next })
}
