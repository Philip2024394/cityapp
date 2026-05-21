import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/drivers/me/inbox
// ----------------------------------------------------------------------------
// Returns the signed-in driver's unacknowledged customer-contact pings
// from the last hour. The /dashboard Inbox widget polls this every 10s
// so the rider sees the "1 customer is waiting for your reply" card the
// moment a customer taps Contact on /r/[slug] or /cari/rider.
//
// Tapping the widget's "Got it" button calls /api/drivers/me/push-ack
// which sets acknowledged_at — that row disappears from this list and
// the customer's /cari/pending page lights up the green "Driver
// melihat pesanmu HH:MM" badge.
//
// LEGAL POSTURE (PM 12/2019):
//   This is private platform telemetry between us and our user (the
//   driver). The customer does not see anything from this endpoint —
//   only the boolean ack appearing on /cari/pending via the public
//   /api/contact/ack-status read. Same posture as Yelp showing a
//   business owner unread customer messages.
// ============================================================================

const ONE_HOUR_MS = 60 * 60 * 1000

type PingRow = {
  id: string
  pinged_at: string
  source_page: string | null
  customer_anon_id: string | null
}

export async function GET() {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  const sinceIso = new Date(Date.now() - ONE_HOUR_MS).toISOString()

  const { data, error } = await admin
    .from('driver_contact_pings')
    .select('id, pinged_at, source_page, customer_anon_id')
    .eq('driver_user_id', user.id)
    .is('acknowledged_at', null)
    .gte('pinged_at', sinceIso)
    .order('pinged_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const pings = (data ?? []) as PingRow[]
  return NextResponse.json(
    { pings },
    {
      headers: {
        // Driver-private — never cache.
        'Cache-Control': 'no-store',
      },
    },
  )
}
