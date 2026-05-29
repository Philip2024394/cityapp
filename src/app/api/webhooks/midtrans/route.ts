// ============================================================================
// POST /api/webhooks/midtrans
// ----------------------------------------------------------------------------
// Midtrans posts a JSON body when a transaction's status changes. We:
//
//   1. Parse the body.
//   2. Look up the vendor_orders row by payment_ref = body.order_id.
//   3. Look up the vendor's encrypted Midtrans server key and decrypt it.
//   4. Verify the signature: sha512(order_id + status_code + gross_amount +
//      serverKey) === body.signature_key. Reject on mismatch with 400.
//   5. Map transaction_status (+ fraud_status for credit-card) to our
//      payment_status enum and write it back.
//
// We MUST acknowledge with 200 even when the body is for an order we don't
// recognise — otherwise Midtrans retries forever. Only return 4xx for
// signature failures (where retrying would re-fail anyway).
// ============================================================================

import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { decryptKey } from '@/lib/security/keyVault'
import {
  midtransStatusToPaymentStatus,
  verifyMidtransSignature,
} from '@/lib/payments/midtrans'

export const runtime = 'nodejs'  // needs crypto.createHash

type MidtransNotification = {
  order_id?:           string
  status_code?:        string
  gross_amount?:       string
  signature_key?:      string
  transaction_status?: string
  fraud_status?:       string
}

export async function POST(req: Request) {
  // ─── Parse body ────────────────────────────────────────────────────────
  let body: MidtransNotification
  try {
    body = (await req.json()) as MidtransNotification
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (
    !body?.order_id           ||
    !body.status_code         ||
    !body.gross_amount        ||
    !body.signature_key       ||
    !body.transaction_status
  ) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 503 })
  }

  // ─── Find the order (payment_ref = the Snap order_id we minted) ────────
  const { data: order, error: orderErr } = await admin
    .from('vendor_orders')
    .select('id, vendor_type, vendor_id, payment_status')
    .eq('payment_ref', body.order_id)
    .maybeSingle()

  if (orderErr) {
    return NextResponse.json({ error: 'order_lookup_failed' }, { status: 500 })
  }
  if (!order) {
    // Unknown order_id. Acknowledge with 200 so Midtrans stops retrying
    // (could be a stale webhook from a deleted test order).
    return NextResponse.json({ received: true, note: 'order_not_found' })
  }

  // ─── Look up vendor's encrypted server key ─────────────────────────────
  // Mirror the checkout-route allowlist. Each supported vertical has the
  // same payment columns thanks to mig 0142 / 0143.
  const VENDOR_TABLES: Record<string, string> = {
    beautician: 'beautician_providers',
    facial:     'facial_providers',
    skincare:   'skincare_providers',
  }
  const vendorTable = VENDOR_TABLES[order.vendor_type]
  if (!vendorTable) {
    return NextResponse.json({ received: true, note: 'vendor_type_unsupported' })
  }

  const { data: vendor, error: vendorErr } = await admin
    .from(vendorTable)
    .select('midtrans_server_key_enc')
    .eq('id', order.vendor_id)
    .maybeSingle()

  if (vendorErr || !vendor?.midtrans_server_key_enc) {
    // Can't verify the signature without the vendor's key — refuse, but
    // 200 (a 4xx would make Midtrans retry forever on a config error).
    return NextResponse.json({ received: true, note: 'vendor_key_missing' })
  }

  let serverKey: string
  try {
    serverKey = decryptKey(vendor.midtrans_server_key_enc)
  } catch {
    return NextResponse.json({ received: true, note: 'vendor_key_undecryptable' })
  }

  // ─── Verify signature ──────────────────────────────────────────────────
  const sigOk = verifyMidtransSignature(
    {
      order_id:      body.order_id,
      status_code:   body.status_code,
      gross_amount:  body.gross_amount,
      signature_key: body.signature_key,
    },
    serverKey,
  )
  if (!sigOk) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  // ─── Map status + persist ──────────────────────────────────────────────
  const nextStatus = midtransStatusToPaymentStatus(
    body.transaction_status,
    body.fraud_status,
  )
  if (!nextStatus) {
    // Status we don't model (e.g. 'refund' partial). Acknowledge + skip.
    return NextResponse.json({ received: true, note: 'unmapped_status' })
  }

  // Idempotency: if we're already at the same status, no-op. Avoids
  // overwriting paid_at on duplicate notifications.
  if (order.payment_status === nextStatus) {
    return NextResponse.json({ received: true, note: 'already_applied' })
  }

  const update: { payment_status: typeof nextStatus; paid_at?: string } = {
    payment_status: nextStatus,
  }
  if (nextStatus === 'paid') {
    update.paid_at = new Date().toISOString()
  }

  const { error: updateErr } = await admin
    .from('vendor_orders')
    .update(update)
    .eq('id', order.id)

  if (updateErr) {
    // 500 so Midtrans retries — could be a transient supabase blip.
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ received: true, status: nextStatus })
}
