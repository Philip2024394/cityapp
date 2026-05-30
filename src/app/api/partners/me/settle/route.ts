import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

// POST /api/partners/me/settle
// Body: { bookingId: string, action: 'settled' | 'disputed' | 'waived', reason?: string }
// Marks a partner_booking as paid/disputed/waived by the partner owner.

export const runtime = 'nodejs'

type Body = {
  bookingId?: string
  action?: 'settled' | 'disputed' | 'waived'
  reason?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'server_not_configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 500 })

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const bookingId = (body.bookingId || '').trim()
  if (!UUID_RE.test(bookingId)) {
    return NextResponse.json({ error: 'invalid_booking_id' }, { status: 400 })
  }
  const action = body.action
  if (!action || !['settled','disputed','waived'].includes(action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  // Verify the caller owns the partner this booking belongs to.
  const { data: booking } = await admin
    .from('partner_bookings')
    .select('id, partner_id, status')
    .eq('id', bookingId)
    .maybeSingle()
  if (!booking) return NextResponse.json({ error: 'booking_not_found' }, { status: 404 })

  const { data: partner } = await admin
    .from('partners')
    .select('owner_user_id')
    .eq('id', booking.partner_id)
    .maybeSingle()
  if (!partner || partner.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'not_authorised' }, { status: 403 })
  }

  // Apply the update. Once settled we don't allow reverting (audit trail
  // matters more than convenience here — the partner can always file a
  // dispute as a separate row if money got refunded later).
  if (booking.status === 'settled' && action !== 'disputed') {
    return NextResponse.json({ error: 'already_settled' }, { status: 409 })
  }

  const update: TableUpdate<'partner_bookings'> = { status: action }
  if (action === 'settled') {
    update.settled_at = new Date().toISOString()
    update.settled_by = user.id
  }
  if (action === 'disputed') {
    update.dispute_reason = (body.reason || '').slice(0, 500) || null
  }

  const { error } = await admin
    .from('partner_bookings')
    .update(update)
    .eq('id', bookingId)
  if (error) {
    return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  }

  // If we just settled the LAST overdue booking for this driver, lift the
  // suspension automatically. This keeps drivers honest without manual
  // admin intervention.
  if (action === 'settled') {
    const { data: bookingRow } = await admin
      .from('partner_bookings')
      .select('driver_user_id')
      .eq('id', bookingId)
      .maybeSingle()
    const driverUserId = (bookingRow as { driver_user_id?: string } | null)?.driver_user_id
    if (driverUserId) {
      const { data: stillOverdue } = await admin
        .from('partner_bookings')
        .select('id')
        .eq('driver_user_id', driverUserId)
        .eq('status', 'pending')
        .lt('due_at', new Date().toISOString())
        .limit(1)
      if (!stillOverdue || stillOverdue.length === 0) {
        await admin
          .from('drivers')
          .update({
            partner_program_status: 'eligible',
            partner_suspended_at: null,
            partner_suspended_reason: null,
          })
          .eq('user_id', driverUserId)
          .eq('partner_program_status', 'suspended')
      }
    }
  }

  return NextResponse.json({ ok: true })
}
