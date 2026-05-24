import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/cron/partner-suspend?secret=$CRON_SECRET
// ----------------------------------------------------------------------------
// Weekly sweep — calls suspend_delinquent_partner_drivers() (defined in
// 0044_partner_program.sql). Any driver with a partner_bookings row in
// status='pending' past its due_at (7 days from booking creation) gets
// flipped to partner_program_status='suspended'. While suspended:
//
//   • new partner-QR attributions skip them (see /api/contact/ping gate)
//   • driver sees red banner on /dashboard/balances asking them to settle
//
// Drivers auto-reactivate the moment the partner marks the last overdue
// booking 'settled' in their dashboard (handled in /api/partners/me/settle).
//
// Scheduled in vercel.json at 03:00 UTC Mondays (10:00 WIB) — late enough
// that a partner who got paid Sunday night has a chance to mark settled
// before the driver gets suspended.
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
