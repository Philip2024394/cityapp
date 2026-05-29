import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GET /api/facial/me/orders
// ----------------------------------------------------------------------------
// Returns every order for the signed-in facial provider, newest first. Used by
// /dashboard/facial/orders. Vendor sees full rows including customer
// PII, line items, and payment refs (their own data).
//
// Optional ?status=paid|pending|all filter. Default 'all'.

export const runtime = 'nodejs'

const PAYMENT_FILTERS = new Set(['paid', 'pending', 'all'])

export async function GET(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const url    = new URL(req.url)
  const status = (url.searchParams.get('status') ?? 'all').trim()
  if (!PAYMENT_FILTERS.has(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  const { data: bp } = await admin
    .from('facial_providers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!bp) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  let q = admin
    .from('vendor_orders')
    .select('*')
    .eq('vendor_type', 'facial')
    .eq('vendor_id', bp.id)
    .order('created_at', { ascending: false })
    .limit(500)

  if (status === 'paid')    q = q.eq('payment_status', 'paid')
  if (status === 'pending') q = q.eq('payment_status', 'pending')

  const { data: orders, error } = await q
  if (error) {
    console.error('[me/orders] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  return NextResponse.json({ orders: orders ?? [] })
}
