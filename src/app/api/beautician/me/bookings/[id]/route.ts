import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// PATCH /api/beautician/me/bookings/[id]
// Beautician updates a booking's status (confirm/decline/complete/cancel).
// Ownership enforced by joining through beautician_providers.user_id.

export const runtime = 'nodejs'

const STATUSES = new Set(['pending', 'confirmed', 'declined', 'completed', 'cancelled'])

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { status?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const status = (body.status || '').trim()
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  // Verify ownership via join. RLS would also block, but checking here lets
  // us return a clean 404 instead of an opaque RLS failure.
  const { data: bp } = await admin
    .from('beautician_providers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!bp) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  const { data, error } = await admin
    .from('beautician_bookings')
    .update({ status })
    .eq('id', id)
    .eq('beautician_id', bp.id)
    .select('id, status')
    .maybeSingle()
  if (error) {
    console.error('[me/bookings/:id] update failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ok: true, booking: data })
}
