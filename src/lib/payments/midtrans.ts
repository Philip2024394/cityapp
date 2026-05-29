// ============================================================================
// Midtrans Snap — per-vendor transaction creation + webhook signature
// ----------------------------------------------------------------------------
// Vendors store their Midtrans server key encrypted in beautician_providers.
// We decrypt at request time, hit Snap's REST endpoint with HTTP Basic auth
// (server-key:blank), and hand the resulting `redirect_url` back to the
// browser for a hosted-checkout redirect.
//
// We deliberately use raw fetch instead of the `midtrans-client` npm
// package — that SDK is not installed and adding it would be redundant for
// the single endpoint we need. See snap.ts (existing Kita2u subscription
// flow) for prior art on the platform-level call; this module mirrors its
// signature-verification helper but parameterised on the vendor's key.
// ============================================================================

import { createHash } from 'crypto'
import type { CheckoutOrderContext } from './types'

const SANDBOX_HOST = 'https://app.sandbox.midtrans.com'
const PROD_HOST    = 'https://app.midtrans.com'

export type CreateMidtransSnapInput = {
  vendorServer:        string   // decrypted Midtrans server key
  vendorIsProduction:  boolean
  order:               CheckoutOrderContext
  returnOriginUrl:     string
}

export type CreateMidtransSnapResult = {
  snap_token:    string
  redirect_url:  string
  snap_order_id: string  // the prefixed order_id we sent to Midtrans
}

/**
 * Snap requires globally-unique order ids (across the vendor's account).
 * UUIDs are unique enough, but the dashboard is easier to scan with a
 * human-prefix. ORDER-<first-12-chars-of-uuid> stays under Snap's 50-char
 * limit and remains reversible to the vendor_orders row via payment_ref.
 */
function buildSnapOrderId(orderId: string): string {
  return `ORDER-${orderId.replace(/-/g, '').slice(0, 24)}`
}

export async function createMidtransSnapTransaction(
  input: CreateMidtransSnapInput,
): Promise<CreateMidtransSnapResult> {
  const { vendorServer, vendorIsProduction, order, returnOriginUrl } = input

  if (!vendorServer) throw new Error('midtrans_server_key_missing')
  if (!order.items?.length) throw new Error('midtrans_no_items')

  const host = vendorIsProduction ? PROD_HOST : SANDBOX_HOST
  const auth = Buffer.from(`${vendorServer}:`).toString('base64')
  const snapOrderId = buildSnapOrderId(order.orderId)

  const body = {
    transaction_details: {
      order_id:     snapOrderId,
      gross_amount: Math.round(order.totalIdr),
    },
    // Midtrans validates that sum(item.price × item.quantity) === gross_amount,
    // so we cannot send the raw fractional rupiah figures — round each one.
    item_details: order.items.map((item) => ({
      id:       item.offer_id,
      name:     item.name.slice(0, 50),  // Midtrans hard-caps item name at 50 chars
      price:    Math.round(item.price_idr),
      quantity: item.qty,
    })),
    customer_details: {
      first_name: (order.customerName || 'Customer').slice(0, 20),
      email:      order.customerEmail || undefined,
      phone:      order.customerPhone || undefined,
    },
    callbacks: {
      finish: `${returnOriginUrl}/order/${order.orderId}/success`,
    },
    // Enable the standard Indonesian payment menu — QRIS first, then e-wallets,
    // VA banks, and credit card as a fallback.
    enabled_payments: [
      'qris', 'gopay', 'shopeepay', 'bca_va', 'bni_va', 'bri_va',
      'permata_va', 'echannel', 'credit_card', 'akulaku', 'kredivo',
    ],
  }

  const res = await fetch(`${host}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`midtrans_snap_create_failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const json = (await res.json()) as { token?: string; redirect_url?: string }
  if (!json.token || !json.redirect_url) {
    throw new Error('midtrans_snap_missing_token_or_redirect')
  }

  return {
    snap_token:    json.token,
    redirect_url:  json.redirect_url,
    snap_order_id: snapOrderId,
  }
}

/**
 * Verify a Midtrans notification's signature using the vendor's own server key.
 * sha512(order_id + status_code + gross_amount + serverKey) === signature_key
 *
 * Returns false on any missing field so the caller can 400 the webhook.
 */
export function verifyMidtransSignature(
  payload: {
    order_id?:      string
    status_code?:   string
    gross_amount?:  string
    signature_key?: string
  },
  vendorServerKey: string,
): boolean {
  if (
    !payload?.order_id        ||
    !payload?.status_code     ||
    !payload?.gross_amount    ||
    !payload?.signature_key   ||
    !vendorServerKey
  ) return false

  const expected = createHash('sha512')
    .update(payload.order_id + payload.status_code + payload.gross_amount + vendorServerKey)
    .digest('hex')
  return expected === payload.signature_key
}

/**
 * Map a Midtrans transaction_status (+ fraud_status for credit-card) to our
 * vendor_orders.payment_status enum. Returns null for statuses we don't
 * handle so the caller can no-op safely.
 */
export function midtransStatusToPaymentStatus(
  transaction_status: string,
  fraud_status?: string,
): 'paid' | 'failed' | 'pending' | 'cancelled' | null {
  if (transaction_status === 'capture') {
    // Credit-card auth-captured. Only treat as paid if fraud check accepted.
    return fraud_status === 'accept' ? 'paid' : 'pending'
  }
  if (transaction_status === 'settlement') return 'paid'
  if (transaction_status === 'pending')    return 'pending'
  if (transaction_status === 'deny')       return 'failed'
  if (transaction_status === 'expire')     return 'failed'
  if (transaction_status === 'cancel')     return 'cancelled'
  return null
}
