import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GET /api/orders/[id]
// ----------------------------------------------------------------------------
// Public, no auth. Powers the customer-facing /order/[id]/success page.
// Anyone with the order id can read a minimal subset — items + total +
// payment status + vendor display info — but customer PII (name, email,
// phone, notes) is NEVER returned. The vendor sees the full row from
// /api/beautician/me/orders/[id] gated on session.
//
// vendor_type + vendor_id are translated into { display_name, slug } via
// a table lookup. New verticals get added to the VENDOR_TABLES map below.

export const runtime = 'nodejs'

// Map vendor_type → provider table. Service-role admin client only;
// public RLS is locked on vendor_orders.
const VENDOR_TABLES: Record<string, string> = {
  beautician:   'beautician_providers',
  handyman:     'handyman_providers',
  laundry:      'laundry_providers',
  massage:      'massage_providers',
  'home-clean': 'home_clean_providers',
  'tour-guide': 'tour_guide_listings',
  rentals:      'rental_listings',
  place:        'places',
  facial:       'facial_providers',
  skincare:     'skincare_providers',
}

type LineItem = {
  offer_id?:  string
  name:       string
  price_idr:  number
  qty:        number
  image_url?: string | null
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { data: order, error } = await admin
    .from('vendor_orders')
    .select(`
      id,
      line_items,
      total_idr,
      currency,
      payment_status,
      payment_provider,
      vendor_type,
      vendor_id,
      scheduled_at,
      created_at
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[orders/:id] fetch failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Look up the vendor's display name + slug. If the vertical isn't in
  // the map (shouldn't happen — DB CHECK constrains the column) we
  // still return the order with a fallback vendor block.
  let vendor: { display_name: string; slug: string | null } = {
    display_name: 'Vendor',
    slug:         null,
  }
  const table = VENDOR_TABLES[order.vendor_type]
  if (table) {
    const { data: v } = await admin
      .from(table)
      .select('display_name, slug')
      .eq('id', order.vendor_id)
      .maybeSingle()
    if (v) vendor = { display_name: v.display_name ?? 'Vendor', slug: v.slug ?? null }
  }

  return NextResponse.json({
    order: {
      id:               order.id,
      line_items:       (order.line_items as LineItem[]) ?? [],
      total_idr:        order.total_idr,
      currency:         order.currency,
      payment_status:   order.payment_status,
      payment_provider: order.payment_provider,
      vendor_type:      order.vendor_type,
      vendor_id:        order.vendor_id,
      scheduled_at:     order.scheduled_at,
      created_at:       order.created_at,
    },
    vendor,
  })
}
