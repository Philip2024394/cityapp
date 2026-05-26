import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GET /api/beautician/me/bookings
// Returns every booking request for the signed-in beautician, newest first.
// The dashboard /bookings page consumes this to build the calendar dots +
// day-detail list.

export const runtime = 'nodejs'

export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data: bp } = await admin
    .from('beautician_providers')
    .select('id, busy_dates')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!bp) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  const { data: bookings, error } = await admin
    .from('beautician_bookings')
    .select('id, customer_name, customer_whatsapp, service_name, requested_date, requested_time, status, notes, created_at, updated_at')
    .eq('beautician_id', bp.id)
    .order('requested_date', { ascending: false })
    .order('requested_time', { ascending: true })
    .limit(500)
  if (error) {
    console.error('[me/bookings] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  return NextResponse.json({
    bookings:   bookings ?? [],
    busy_dates: Array.isArray(bp.busy_dates) ? bp.busy_dates : [],
  })
}
