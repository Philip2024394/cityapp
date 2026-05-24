import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { TOUR_SERVICE_IDS, type TourServiceId } from '@/data/tourServices'

// POST /api/tour-guide/me/service { service: <TourServiceId> }
// One tour guide picks ONE primary specialty. The DB column is
// text[] (legacy multi-select on the signup form) — we just write
// a single-element array here, which the marketplace card already
// renders via slice(0, 3) so it'll show one chip.

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { service?: string }
  try { body = (await req.json()) as { service?: string } } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const next = body.service as TourServiceId | undefined
  if (!next || !(TOUR_SERVICE_IDS as ReadonlyArray<string>).includes(next)) {
    return NextResponse.json({ error: 'invalid_service' }, { status: 400 })
  }

  const { data: row, error: readErr } = await admin
    .from('tour_guide_listings')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()
  if (readErr) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  if (!row)    return NextResponse.json({ error: 'no_listing' }, { status: 404 })

  const { error: updErr } = await admin
    .from('tour_guide_listings')
    .update({ services: [next], updated_at: new Date().toISOString() })
    .eq('id', row.id)
  if (updErr) return NextResponse.json({ error: 'update_failed' }, { status: 500 })

  return NextResponse.json({ ok: true, service: next })
}
