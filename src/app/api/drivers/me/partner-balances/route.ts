import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GET /api/drivers/me/partner-balances
// Returns per-partner outstanding commission owed by the calling driver,
// plus the recent booking list so they can see exactly what's due.

export const runtime = 'nodejs'

type Booking = {
  id: string
  partner_id: string
  pickup_name: string | null
  dropoff_name: string | null
  fare_idr: number
  commission_idr: number
  status: string
  created_at: string
  due_at: string
}

export async function GET() {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'server_not_configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 500 })

  const { data: bookings } = await admin
    .from('partner_bookings')
    .select(`
      id, partner_id, pickup_name, dropoff_name,
      fare_idr, commission_idr, status, created_at, due_at
    `)
    .eq('driver_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (bookings ?? []) as Booking[]
  const partnerIds = Array.from(new Set(rows.map((b) => b.partner_id)))

  const partnerMap = new Map<string, { name: string; slug: string; contact_whatsapp: string | null; contact_phone: string | null }>()
  if (partnerIds.length > 0) {
    const { data: partners } = await admin
      .from('partners')
      .select('id, name, slug, contact_whatsapp, contact_phone')
      .in('id', partnerIds)
    for (const p of partners ?? []) {
      partnerMap.set(p.id, {
        name: p.name, slug: p.slug,
        contact_whatsapp: p.contact_whatsapp, contact_phone: p.contact_phone,
      })
    }
  }

  // Build per-partner balance summary.
  const now = Date.now()
  const balances = new Map<string, {
    partner_id: string
    partner_name: string
    partner_slug: string
    contact_whatsapp: string | null
    contact_phone: string | null
    outstanding_idr: number
    bookings_count: number
    oldest_due_at: string | null
    is_overdue: boolean
  }>()
  for (const b of rows) {
    if (b.status !== 'pending') continue
    const p = partnerMap.get(b.partner_id)
    if (!p) continue
    let entry = balances.get(b.partner_id)
    if (!entry) {
      entry = {
        partner_id: b.partner_id,
        partner_name: p.name,
        partner_slug: p.slug,
        contact_whatsapp: p.contact_whatsapp,
        contact_phone: p.contact_phone,
        outstanding_idr: 0,
        bookings_count: 0,
        oldest_due_at: null,
        is_overdue: false,
      }
      balances.set(b.partner_id, entry)
    }
    entry.outstanding_idr += b.commission_idr
    entry.bookings_count += 1
    if (!entry.oldest_due_at || b.due_at < entry.oldest_due_at) {
      entry.oldest_due_at = b.due_at
    }
    if (new Date(b.due_at).getTime() < now) entry.is_overdue = true
  }

  // Pull driver's current program status so the dashboard banner shows.
  const { data: driverRow } = await admin
    .from('drivers')
    .select('partner_program_status, partner_suspended_at, partner_suspended_reason')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    balances: Array.from(balances.values())
      .sort((a, b) => b.outstanding_idr - a.outstanding_idr),
    bookings: rows.map((b) => ({
      ...b,
      partner_name: partnerMap.get(b.partner_id)?.name ?? '—',
    })),
    program: driverRow ?? { partner_program_status: 'eligible' },
  })
}
