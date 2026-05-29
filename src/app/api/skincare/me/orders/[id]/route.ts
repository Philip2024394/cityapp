import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/skincare/me/orders/[id]
// ----------------------------------------------------------------------------
// Vendor updates an order's fulfillment_status: new → accepted → fulfilled,
// or cancelled from any state. Payment status is never touched here — only
// the webhook handler writes that.
//
// Ownership enforced by joining vendor_id → skincare_providers.user_id.

export const runtime = 'nodejs'

const FULFILLMENT_STATUSES = new Set(['accepted', 'fulfilled', 'cancelled'])

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { fulfillment_status?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const next = (body.fulfillment_status || '').trim()
  if (!FULFILLMENT_STATUSES.has(next)) {
    return NextResponse.json({ error: 'invalid_fulfillment_status' }, { status: 400 })
  }

  const { data: bp } = await admin
    .from('skincare_providers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!bp) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  const { data, error } = await admin
    .from('vendor_orders')
    .update({ fulfillment_status: next, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('vendor_type', 'skincare')
    .eq('vendor_id', bp.id)
    .select('*')
    .maybeSingle()
  if (error) {
    console.error('[skincare/me/orders/:id] update failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ ok: true, order: data })
}
