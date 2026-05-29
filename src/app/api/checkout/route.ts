// ============================================================================
// POST /api/checkout
// ----------------------------------------------------------------------------
// Anonymous-customer checkout entry point. The flow:
//
//   1. Look up the vendor (currently only 'beautician' is supported — others
//      are rejected with 501 until we propagate per the all-verticals rule).
//   2. Recompute the total server-side from line_items × price_idr × qty
//      (never trust the client total).
//   3. Insert a vendor_orders row with payment_status='pending'.
//   4. Branch on vendor.payment_provider:
//        • 'stripe'   → decrypt key → Stripe Checkout Session → return url
//        • 'midtrans' → decrypt key → Midtrans Snap → return redirect_url
//        • 'none'     → 400 payments_not_enabled
//   5. On any provider failure, mark the order 'failed' and return 502.
//
// TODO(v2): cross-check each line item's price_idr against the vendor's
// service_photos / place_offers row so a malicious client can't underprice
// items. For v1 we accept client-sent prices — the vendor controls the
// public page that produces them, so the abuse vector is low.
// ============================================================================

import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { decryptKey } from '@/lib/security/keyVault'
import { createStripeCheckoutSession } from '@/lib/payments/stripe'
import { createMidtransSnapTransaction } from '@/lib/payments/midtrans'
import type {
  CheckoutLineItem,
  CheckoutRequest,
  CheckoutResponse,
  VendorPaymentRow,
} from '@/lib/payments/types'

export const runtime = 'nodejs'  // needs `crypto` (keyVault) + Node fetch

// vendor_type → provider table the API will look up keys on. Each
// entry here also requires the matching /api/<vertical>/* routes + the
// vendor_orders constraint to include the type (see mig 0142 / 0143).
//
// ⚠ NEVER ADD ride/transport TYPES HERE. ⚠
// 'driver', 'car_driver', 'bike_rider', 'rental_driver', 'truck',
// 'bus' — all explicitly excluded. CityRiders is positioned as a
// directory + driver SaaS (Permenhub 118/2018 light lane), not a
// transport aplikator. The platform must never collect ride fares.
// See the policy comment at the top of `src/app/cari/page.tsx`.
const VENDOR_TABLES: Record<string, string> = {
  beautician: 'beautician_providers',
  facial:     'facial_providers',
  skincare:   'skincare_providers',
}
const SUPPORTED_VENDOR_TYPES = new Set(Object.keys(VENDOR_TABLES))

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && Math.floor(v) === v
}

function validateItems(items: unknown): items is CheckoutLineItem[] {
  if (!Array.isArray(items) || items.length === 0) return false
  return items.every((it) => {
    if (!it || typeof it !== 'object') return false
    const x = it as Record<string, unknown>
    return (
      isString(x.offer_id) &&
      isString(x.name)     &&
      isPositiveInt(x.price_idr) &&
      isPositiveInt(x.qty)
    )
  })
}

function getReturnOriginUrl(req: Request): string {
  // Prefer an explicit env so we don't get tricked into open-redirects by
  // Host/Forwarded headers. Fall back to the request origin in dev.
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_PUBLIC_URL
  if (envOrigin) return envOrigin.replace(/\/+$/, '')
  try {
    const u = new URL(req.url)
    return `${u.protocol}//${u.host}`
  } catch {
    return ''
  }
}

export async function POST(req: Request) {
  // ─── Parse + validate ──────────────────────────────────────────────────
  let body: CheckoutRequest
  try {
    body = (await req.json()) as CheckoutRequest
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!isString(body.vendor_type) || !isString(body.vendor_id)) {
    return NextResponse.json({ error: 'vendor_required' }, { status: 400 })
  }
  if (!SUPPORTED_VENDOR_TYPES.has(body.vendor_type)) {
    return NextResponse.json(
      { error: 'vendor_type_not_supported_yet' },
      { status: 501 },
    )
  }
  if (!validateItems(body.items)) {
    return NextResponse.json({ error: 'invalid_items' }, { status: 400 })
  }

  // ─── Recompute totals server-side ──────────────────────────────────────
  const subtotalIdr = body.items.reduce(
    (sum, it) => sum + Math.round(it.price_idr) * it.qty,
    0,
  )
  const serviceFeeIdr = 0  // platform fee deferred; vendors keep 100% in v1
  const totalIdr      = subtotalIdr + serviceFeeIdr
  if (totalIdr <= 0) {
    return NextResponse.json({ error: 'zero_total' }, { status: 400 })
  }

  // ─── Vendor lookup ─────────────────────────────────────────────────────
  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 503 })
  }

  const vendorTable = VENDOR_TABLES[body.vendor_type]
  const { data: vendorRaw, error: vendorErr } = await admin
    .from(vendorTable)
    .select(
      'id, payment_provider, ' +
      'stripe_secret_key_enc, stripe_publishable_key, ' +
      'midtrans_server_key_enc, midtrans_client_key, midtrans_is_production',
    )
    .eq('id', body.vendor_id)
    .maybeSingle()

  if (vendorErr) {
    return NextResponse.json({ error: 'vendor_lookup_failed' }, { status: 500 })
  }
  if (!vendorRaw) {
    return NextResponse.json({ error: 'vendor_not_found' }, { status: 404 })
  }

  const vendor = vendorRaw as unknown as VendorPaymentRow

  if (vendor.payment_provider === 'none') {
    return NextResponse.json({ error: 'payments_not_enabled' }, { status: 400 })
  }
  if (vendor.payment_provider !== 'stripe' && vendor.payment_provider !== 'midtrans') {
    return NextResponse.json({ error: 'payments_misconfigured' }, { status: 400 })
  }

  // ─── Insert pending order ──────────────────────────────────────────────
  const { data: orderRow, error: insertErr } = await admin
    .from('vendor_orders')
    .insert({
      vendor_type:      body.vendor_type,
      vendor_id:        body.vendor_id,
      line_items:       body.items,
      subtotal_idr:     subtotalIdr,
      service_fee_idr:  serviceFeeIdr,
      total_idr:        totalIdr,
      currency:         'IDR',
      customer_name:    body.customer_name  || null,
      customer_email:   body.customer_email || null,
      customer_phone:   body.customer_phone || null,
      notes:            body.notes          || null,
      scheduled_at:     body.scheduled_at   || null,
      payment_provider: vendor.payment_provider,
      payment_status:   'pending',
      fulfillment_status: 'new',
    })
    .select('id')
    .single()

  if (insertErr || !orderRow) {
    return NextResponse.json(
      { error: insertErr?.message || 'order_insert_failed' },
      { status: 500 },
    )
  }
  const orderId = orderRow.id as string
  const returnOriginUrl = getReturnOriginUrl(req)

  // ─── Dispatch to provider ──────────────────────────────────────────────
  try {
    if (vendor.payment_provider === 'stripe') {
      if (!vendor.stripe_secret_key_enc) {
        throw new Error('stripe_key_missing')
      }
      const secret = decryptKey(vendor.stripe_secret_key_enc)
      const session = await createStripeCheckoutSession({
        vendorSecret: secret,
        order: {
          orderId,
          totalIdr,
          items:         body.items,
          customerName:  body.customer_name,
          customerEmail: body.customer_email,
          customerPhone: body.customer_phone,
        },
        returnOriginUrl,
      })
      await admin
        .from('vendor_orders')
        .update({ payment_ref: session.session_id })
        .eq('id', orderId)
      const out: CheckoutResponse = { order_id: orderId, checkout_url: session.url }
      return NextResponse.json(out)
    }

    // midtrans
    if (!vendor.midtrans_server_key_enc) {
      throw new Error('midtrans_key_missing')
    }
    const server = decryptKey(vendor.midtrans_server_key_enc)
    const snap = await createMidtransSnapTransaction({
      vendorServer:       server,
      vendorIsProduction: !!vendor.midtrans_is_production,
      order: {
        orderId,
        totalIdr,
        items:         body.items,
        customerName:  body.customer_name,
        customerEmail: body.customer_email,
        customerPhone: body.customer_phone,
      },
      returnOriginUrl,
    })
    await admin
      .from('vendor_orders')
      .update({ payment_ref: snap.snap_order_id })
      .eq('id', orderId)
    const out: CheckoutResponse = { order_id: orderId, checkout_url: snap.redirect_url }
    return NextResponse.json(out)
  } catch (e) {
    // Mark order failed so we don't accumulate stranded pending rows.
    await admin
      .from('vendor_orders')
      .update({ payment_status: 'failed' })
      .eq('id', orderId)

    const msg = e instanceof Error ? e.message : 'provider_error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
