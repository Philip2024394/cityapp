import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { AvailabilityState } from '@/types/database'

// ============================================================================
// POST /api/drivers/availability
// ----------------------------------------------------------------------------
// Authenticated rider toggles their own availability between
// 'online' | 'busy' | 'offline'. Also updates last_active_at.
//
// Dev impersonation: on localhost the cr-dev-uid cookie (set by
// /api/dev/impersonate) is honored as the acting user so the dashboard
// availability switcher works without a real Supabase session. Off
// localhost the cookie is ignored and the normal Supabase auth path runs.
// ============================================================================
const ALLOWED: AvailabilityState[] = ['online', 'busy', 'offline']

function isLocalHost(host: string | null): boolean {
  if (!host) return false
  const h = host.toLowerCase().split(':')[0]
  return h === 'localhost' || h === '127.0.0.1'
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  let actingUserId: string | null = null
  const { data: { user } } = await userClient.auth.getUser()
  if (user) {
    actingUserId = user.id
  } else if (isLocalHost(req.headers.get('host'))) {
    const cookieStore = await cookies()
    const devUid = cookieStore.get('cr-dev-uid')?.value
    if (devUid) actingUserId = devUid
  }
  if (!actingUserId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

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
    .eq('user_id', actingUserId)
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
    .eq('user_id', actingUserId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    availability: body.availability,
    last_active_at: now,
    session_started_at: update.session_started_at ?? prior?.session_started_at ?? null,
  })
}
