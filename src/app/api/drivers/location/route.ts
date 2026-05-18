import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/drivers/location
// ----------------------------------------------------------------------------
// Online rider's browser pings their GPS location every ~15 seconds.
// We update current_lat/current_lng/current_location_updated_at and bump
// last_active_at. Customers tracking their accepted trip subscribe via
// Supabase Realtime to drivers.current_lat changes.
//
// Light validation only — drivers may have GPS jitter or no GPS at all.
// ============================================================================
export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { lat?: number; lng?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const lat = typeof body.lat === 'number' ? body.lat : NaN
  const lng = typeof body.lng === 'number' ? body.lng : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng required as numbers' }, { status: 400 })
  }
  // Indonesia bounding box (very rough — sanity check only)
  if (lat < -11 || lat > 6 || lng < 95 || lng > 142) {
    return NextResponse.json({ error: 'Coordinates outside expected region' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const now = new Date().toISOString()
  const { error } = await admin
    .from('drivers')
    .update({
      current_lat: lat,
      current_lng: lng,
      current_location_updated_at: now,
      last_active_at: now,
    })
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
