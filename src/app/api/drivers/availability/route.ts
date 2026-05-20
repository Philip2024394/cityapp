import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { AvailabilityState } from '@/types/database'

// ============================================================================
// POST /api/drivers/availability
// ----------------------------------------------------------------------------
// Authenticated rider toggles their own availability between
// 'online' | 'busy' | 'offline'. Also updates last_active_at.
// ============================================================================
const ALLOWED: AvailabilityState[] = ['online', 'busy', 'offline']

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { availability?: AvailabilityState }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.availability || !ALLOWED.includes(body.availability)) {
    return NextResponse.json({ error: 'availability must be online | busy | offline' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  // Read prior availability so we can flip session_started_at on the
  // offline→online edge (start the session) and clear it on online→offline
  // (end the session). Cheap single-row lookup.
  const { data: prior } = await admin
    .from('drivers')
    .select('availability, session_started_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    availability: body.availability,
    last_active_at: now,
    // No shift expiry — driver toggles offline when finished.
    online_until: null,
  }

  const wasOnlineish = prior?.availability === 'online' || prior?.availability === 'busy'
  const willBeOnlineish = body.availability === 'online' || body.availability === 'busy'

  if (!wasOnlineish && willBeOnlineish) {
    update.session_started_at = now
  } else if (wasOnlineish && !willBeOnlineish) {
    update.session_started_at = null
  }

  const { error } = await admin
    .from('drivers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    availability: body.availability,
    last_active_at: now,
    session_started_at: update.session_started_at ?? prior?.session_started_at ?? null,
  })
}
