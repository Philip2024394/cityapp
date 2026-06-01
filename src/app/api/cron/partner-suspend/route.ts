import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/cron/partner-suspend?secret=$CRON_SECRET
// ----------------------------------------------------------------------------
// Hourly sweep (founder spec 2026-06-01) — calls
// suspend_delinquent_partner_drivers() (refreshed in 0173). Threshold model:
//
//   • 0–48h after booking : due — driver should pay the partner
//   • 48–72h after booking: OVERDUE — yellow banner + popup on dashboard,
//                                       driver still eligible for routing
//   • >72h after booking  : DEACTIVATED — suspended from the partner program
//
// So the SQL condition for suspension is now
// `partner_bookings.status = 'pending' AND due_at + interval '24 hours' < now()`.
//
// While suspended:
//   • new partner-QR attributions skip them (see /api/contact/ping gate)
//   • driver sees red banner on /dashboard/balances + a sterner popup
//   • the /dashboard/{vehicle}/info opt-in toggle is locked
//
// Drivers auto-reactivate the moment the partner marks the last overdue
// booking 'settled' in their dashboard (handled in /api/partners/me/settle).
//
// Scheduled via Cloudflare Cron Triggers (wrangler.jsonc) at minute 0 of
// every hour. A driver crossing the 72h threshold is suspended within the
// next hour — fast enough to matter, slow enough that a partner who just
// marked the booking settled has a chance to land before the cron fires.
// ============================================================================

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const { data, error } = await admin.rpc('suspend_delinquent_partner_drivers')
  if (error) {
    return NextResponse.json({ error: 'rpc_failed', detail: error.message }, { status: 500 })
  }

  const suspended = typeof data === 'number' ? data : 0
  return NextResponse.json({
    ok: true,
    suspended,
    ranAt: new Date().toISOString(),
  })
}

export async function POST(req: Request) { return GET(req) }
