import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GET /api/partners/me/bookings
// Returns all bookings attributed to partners owned by the calling user,
// plus a summary by status. Used by /dashboard/partner.

export const runtime = 'nodejs'

// Mirror of the driver dashboards' dev impersonation — on localhost a
// `cr-dev-uid` cookie set by /api/dev/impersonate?partner=<slug> stands
// in for an auth user so the partner dashboard works without phone OTP.
async function resolveDevUserId(): Promise<string | null> {
  const hdrs = await headers()
  const host = (hdrs.get('host') || '').toLowerCase().split(':')[0]
  if (host !== 'localhost' && host !== '127.0.0.1') return null
  if (process.env.NODE_ENV === 'production') return null
  const cookieStore = await cookies()
  return cookieStore.get('cr-dev-uid')?.value ?? null
}

export async function GET() {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'server_not_configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  const devUid = user ? null : await resolveDevUserId()
  const actingUserId = user?.id ?? devUid
  if (!actingUserId) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 500 })

  // Look up the partner(s) this user owns.
  const { data: partners } = await admin
    .from('partners')
    .select(`
      id, slug, name, partner_type, status, commission_rate, city,
      payout_method, payout_account_number, payout_account_name,
      payout_bank_code, payout_qris_image_url, payout_notes
    `)
    .eq('owner_user_id', actingUserId)

  if (!partners || partners.length === 0) {
    return NextResponse.json({ partners: [], bookings: [], summary: emptySummary() })
  }

  const partnerIds = partners.map((p) => p.id)
  const { data: bookings } = await admin
    .from('partner_bookings')
    .select(`
      id, partner_id, driver_user_id,
      pickup_name, dropoff_name, service_type,
      fare_idr, commission_idr,
      status, settled_at, dispute_reason,
      created_at, due_at
    `)
    .in('partner_id', partnerIds)
    .order('created_at', { ascending: false })
    .limit(200)

  // Join driver names for display.
  const driverIds = Array.from(new Set((bookings ?? []).map((b) => b.driver_user_id)))
  const driverMap = new Map<string, { business_name: string; slug: string; whatsapp_e164: string }>()
  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from('drivers')
      .select('user_id, business_name, slug, whatsapp_e164')
      .in('user_id', driverIds)
    for (const d of drivers ?? []) {
      driverMap.set(d.user_id, {
        business_name: d.business_name,
        slug: d.slug,
        whatsapp_e164: d.whatsapp_e164,
      })
    }
  }

  // Per-status summary.
  const summary = emptySummary()
  for (const b of bookings ?? []) {
    summary.totalBookings += 1
    if (b.status === 'pending')  { summary.pendingCount  += 1; summary.pendingIdr  += b.commission_idr }
    if (b.status === 'settled')  { summary.settledCount  += 1; summary.settledIdr  += b.commission_idr }
    if (b.status === 'disputed') { summary.disputedCount += 1 }
    if (b.status === 'waived')   { summary.waivedCount   += 1 }
    if (b.status === 'pending' && new Date(b.due_at) < new Date()) {
      summary.overdueCount += 1
      summary.overdueIdr   += b.commission_idr
    }
  }

  return NextResponse.json({
    partners,
    bookings: (bookings ?? []).map((b) => ({
      ...b,
      driver: driverMap.get(b.driver_user_id) ?? null,
    })),
    summary,
  })
}

function emptySummary() {
  return {
    totalBookings: 0,
    pendingCount:  0, pendingIdr:  0,
    settledCount:  0, settledIdr:  0,
    disputedCount: 0,
    waivedCount:   0,
    overdueCount:  0, overdueIdr:  0,
  }
}
