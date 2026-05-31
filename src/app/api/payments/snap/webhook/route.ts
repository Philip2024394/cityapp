import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { midtransStatusToInternal, verifyNotificationSignature } from '@/lib/midtrans/snap'
import { fireAlertServer } from '@/lib/ops/alert'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'
import type { Json } from '@/types/supabase'

// ============================================================================
// POST /api/payments/snap/webhook
// ----------------------------------------------------------------------------
// Receive Midtrans transaction-status notifications. Verify signature,
// look up the payment_intent by order_id, update its status. The DB
// trigger pi_extend_subscription then auto-bumps subscriptions.
//
// IMPORTANT: configure this URL in Midtrans Dashboard → Settings →
// Configuration → Payment Notification URL:
//   https://citydrivers.id/api/payments/snap/webhook
//
// Signature scheme (sha512):
//   sha512(order_id + status_code + gross_amount + server_key)
//
// Always return 200 to acknowledge — Midtrans retries 4xx/5xx for up
// to 6 hours, which leads to duplicate work. We use the intent's
// own status idempotency to ensure repeat notifications are no-ops.
// ============================================================================

type MidtransNotification = {
  order_id?: string
  status_code?: string
  gross_amount?: string
  signature_key?: string
  transaction_status?: string
  fraud_status?: string
  transaction_id?: string
  payment_type?: string
  status_message?: string
  // Many other fields possible
  [k: string]: unknown
}

export async function POST(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })

  let body: MidtransNotification
  try {
    body = (await req.json()) as MidtransNotification
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  // Verify signature — drop the request silently (200) if it doesn't
  // match so we don't leak which order IDs exist via error responses.
  // Bad signatures are a CRITICAL ops alert: either Midtrans is misconfigured,
  // someone is probing us, or our MIDTRANS_SERVER_KEY env is wrong.
  if (!verifyNotificationSignature(body)) {
    void fireAlertServer({
      severity: 'critical',
      source: 'midtrans-webhook',
      title: 'Midtrans webhook signature mismatch',
      detail: `order_id=${body.order_id ?? 'unknown'}, status=${body.transaction_status ?? 'unknown'}`,
      suggested_fix: 'Verify MIDTRANS_SERVER_KEY on Vercel matches the value in Midtrans dashboard → Settings → Access Keys. Also confirm prod/sandbox keys aren\'t swapped.',
      meta: { order_id: body.order_id, transaction_status: body.transaction_status },
    })
    return NextResponse.json({ ok: true, ignored: 'bad signature' })
  }

  if (!body.order_id || !body.transaction_status) {
    return NextResponse.json({ ok: true, ignored: 'missing fields' })
  }

  // Look up the intent
  const { data: intent } = await admin
    .from('payment_intents')
    .select('id, status, driver_user_id')
    .eq('id', body.order_id)
    .maybeSingle()
  if (!intent) {
    // Unknown order — likely a stray sandbox replay. Acknowledge silently.
    return NextResponse.json({ ok: true, ignored: 'unknown order' })
  }

  // Idempotency: if already paid, don't re-process
  if (intent.status === 'paid' && body.transaction_status === 'settlement') {
    return NextResponse.json({ ok: true, idempotent: true })
  }

  const next = midtransStatusToInternal(body.transaction_status, body.fraud_status)
  if (!next) {
    return NextResponse.json({ ok: true, ignored: 'unmapped status' })
  }

  const update: TableUpdate<'payment_intents'> = {
    status: next,
    raw_notification: body as Json,
  }
  if (body.transaction_id) update.provider_txn_id = body.transaction_id
  if (next === 'paid')     update.paid_at = new Date().toISOString()

  const { error } = await admin
    .from('payment_intents')
    .update(update)
    .eq('id', intent.id)

  if (error) {
    // Return 500 — Midtrans will retry, which is what we want
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// GET supported so health-checks (and the user) can verify the URL is
// reachable from the public internet before configuring Midtrans.
export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/payments/snap/webhook' })
}
