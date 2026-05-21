import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/contact/ack-status?driverId=<uuid>&customerAnonId=<uuid>&sinceMs=<ms>
// ----------------------------------------------------------------------------
// Customer-side polling: returns whether the driver has acknowledged the
// most recent contact ping (from /api/contact/ping) for this driver +
// customer pair since `sinceMs`. Used by /cari/pending to show a green
// "Driver melihat pesanmu · HH:MM ✓" badge once the driver taps Got-it
// on their dashboard inbox.
//
// PRIVACY:
//   Returns only the acknowledged_at timestamp + the channel ('app_button',
//   'app_foreground', 'wa_opened'). No driver-private data. Same posture
//   as WhatsApp's "read tick" — surfaces that the directory ping arrived.
//
// RATE LIMITS:
//   Same per-IP throttle as /api/contact/ping (20/60s). Pending page polls
//   every 5s while customer is on screen so each session uses ~12 calls/min
//   in the worst case.
// ============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: Request) {
  const url = new URL(req.url)
  const driverId = (url.searchParams.get('driverId') ?? '').trim()
  const customerAnonId = (url.searchParams.get('customerAnonId') ?? '').slice(0, 64)
  const sinceMs = parseInt(url.searchParams.get('sinceMs') ?? '0', 10)

  if (!driverId || !UUID_RE.test(driverId)) {
    return NextResponse.json({ error: 'driverId must be a UUID' }, { status: 400 })
  }
  if (!customerAnonId) {
    return NextResponse.json({ ackedAt: null })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ ackedAt: null })

  // 5-minute floor on `sinceMs` so a stale customer client can't probe
  // ancient ping history. Practical pending sessions live < 10 min.
  const sinceIso = new Date(
    Math.max(Date.now() - 60 * 60 * 1000, Number.isFinite(sinceMs) ? sinceMs - 60_000 : 0),
  ).toISOString()

  const { data } = await admin
    .from('driver_contact_pings')
    .select('acknowledged_at, acknowledged_via')
    .eq('driver_user_id', driverId)
    .eq('customer_anon_id', customerAnonId)
    .gte('pinged_at', sinceIso)
    .not('acknowledged_at', 'is', null)
    .order('acknowledged_at', { ascending: false })
    .limit(1)

  const row = data?.[0] as { acknowledged_at: string | null; acknowledged_via: string | null } | undefined
  return NextResponse.json(
    {
      ackedAt: row?.acknowledged_at ?? null,
      ackedVia: row?.acknowledged_via ?? null,
    },
    {
      headers: {
        // No edge caching — polling clients want fresh data each tick.
        'Cache-Control': 'no-store',
      },
    },
  )
}
