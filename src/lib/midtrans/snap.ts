// ============================================================================
// Midtrans Snap integration helpers
// ----------------------------------------------------------------------------
// Snap is Midtrans' hosted-checkout flow — server creates a transaction,
// returns a one-time `snap_token`, client opens the Snap popup, customer
// completes payment, Midtrans posts a webhook back to us with the result.
//
// Env vars (production):
//   MIDTRANS_SERVER_KEY      — Mid-server-XXX (PROD) or SB-Mid-server-XXX (sandbox)
//   MIDTRANS_CLIENT_KEY      — Mid-client-XXX  / SB-Mid-client-XXX
//   MIDTRANS_PRODUCTION      — 'true' to hit api.midtrans.com, otherwise sandbox
//   MIDTRANS_NOTIFICATION_URL — public URL of /api/payments/snap/webhook
//
// We send the SERVER_KEY in the Basic-Auth header to the create-transaction
// endpoint. The webhook signature is verified server-side using the same
// SERVER_KEY (sha512 of order_id + status_code + gross_amount + server_key).
// ============================================================================

import { createHash } from 'crypto'

export type SnapCreateInput = {
  orderId: string           // unique; we set it = payment_intents.id
  amountIdr: number         // gross_amount in IDR
  customer: {
    name: string
    phone?: string          // E.164 preferred
    email?: string
  }
  itemName: string          // e.g. 'City Rider Subscription · 30 days'
  callbackFinishUrl?: string
}

export type SnapCreateResult = {
  token: string             // snap_token to hand to the client SDK
  redirectUrl: string       // fallback URL to redirect non-JS clients
}

const SANDBOX_HOST = 'https://app.sandbox.midtrans.com'
const PROD_HOST    = 'https://app.midtrans.com'
const SANDBOX_API  = 'https://api.sandbox.midtrans.com'
const PROD_API     = 'https://api.midtrans.com'

function isProd(): boolean {
  return (process.env.MIDTRANS_PRODUCTION || '').toLowerCase() === 'true'
}

export function midtransApiHost(): string {
  return isProd() ? PROD_API : SANDBOX_API
}

export function midtransAppHost(): string {
  return isProd() ? PROD_HOST : SANDBOX_HOST
}

function getServerKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY
  if (!key) throw new Error('MIDTRANS_SERVER_KEY not configured')
  return key
}

/**
 * Create a Snap transaction. Returns the token + redirect URL.
 * Throws on Midtrans API error so the caller can surface 502/500 to the
 * client cleanly.
 */
export async function createSnapTransaction(input: SnapCreateInput): Promise<SnapCreateResult> {
  const serverKey = getServerKey()
  const auth = Buffer.from(`${serverKey}:`).toString('base64')

  const body = {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: Math.round(input.amountIdr),
    },
    item_details: [{
      id: 'cr-sub-30d',
      price: Math.round(input.amountIdr),
      quantity: 1,
      name: input.itemName.slice(0, 50),  // Midtrans limits item name to 50 chars
    }],
    customer_details: {
      first_name: input.customer.name.slice(0, 20),
      email: input.customer.email,
      phone: input.customer.phone,
    },
    callbacks: input.callbackFinishUrl ? { finish: input.callbackFinishUrl } : undefined,
    // Enable QRIS, GoPay, ShopeePay, BCA VA, bank transfer, credit card
    enabled_payments: [
      'qris', 'gopay', 'shopeepay', 'bca_va', 'bni_va', 'bri_va',
      'permata_va', 'echannel', 'credit_card', 'akulaku', 'kredivo',
    ],
  }

  const res = await fetch(`${isProd() ? PROD_HOST : SANDBOX_HOST}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Midtrans Snap create failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const json = (await res.json()) as { token?: string; redirect_url?: string }
  if (!json.token || !json.redirect_url) {
    throw new Error('Midtrans Snap response missing token/redirect_url')
  }
  return { token: json.token, redirectUrl: json.redirect_url }
}

/**
 * Verify a Midtrans webhook payload's signature.
 * sha512(order_id + status_code + gross_amount + server_key) must
 * match the signature_key field on the notification body.
 */
export function verifyNotificationSignature(payload: {
  order_id?: string
  status_code?: string
  gross_amount?: string
  signature_key?: string
}): boolean {
  if (!payload?.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
    return false
  }
  const serverKey = getServerKey()
  const expected = createHash('sha512')
    .update(payload.order_id + payload.status_code + payload.gross_amount + serverKey)
    .digest('hex')
  return expected === payload.signature_key
}

/**
 * Translate a Midtrans transaction_status + fraud_status into our internal
 * payment_intents.status enum. Keeps the API route logic-free.
 */
export function midtransStatusToInternal(transaction_status: string, fraud_status?: string):
  'paid' | 'failed' | 'pending' | 'expired' | 'cancelled' | null
{
  // 'capture' is only for credit-card; treat as paid only if fraud accepted
  if (transaction_status === 'capture') {
    return fraud_status === 'accept' ? 'paid' : 'pending'
  }
  if (transaction_status === 'settlement') return 'paid'
  if (transaction_status === 'pending')    return 'pending'
  if (transaction_status === 'deny')       return 'failed'
  if (transaction_status === 'expire')     return 'expired'
  if (transaction_status === 'cancel')     return 'cancelled'
  if (transaction_status === 'refund')     return 'cancelled'
  return null
}
