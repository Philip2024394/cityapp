// ============================================================================
// POST /api/webhooks/stripe
// ----------------------------------------------------------------------------
// Stripe-hosted Checkout posts events here when the customer pays, cancels,
// or the session expires. We:
//
//   1. Read the RAW body (signature verification needs byte-exact input).
//   2. Call stripe.webhooks.constructEvent(raw, signature, endpointSecret)
//      where endpointSecret comes from env STRIPE_WEBHOOK_SECRET — for v1
//      this is a platform-wide endpoint secret (one URL, one secret).
//      v2 will move to per-vendor endpoints to remove the shared-trust
//      assumption, but the SaaS overhead of vendor-side endpoint config
//      makes a single endpoint the right v1 trade-off.
//   3. Map event.type → vendor_orders.payment_status:
//        checkout.session.completed   → 'paid'   + paid_at = now()
//        checkout.session.expired     → 'failed'
//        payment_intent.payment_failed → 'failed' (looked up by metadata.order_id)
//      All other events: log + 200 OK so Stripe stops retrying.
// ============================================================================

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAdminSupabase } from '@/lib/supabase/admin'

export const runtime = 'nodejs'  // needs raw body + crypto

type OrderUpdate = {
  payment_status: 'paid' | 'failed' | 'cancelled'
  paid_at?: string
}

async function applyOrderUpdate(sessionOrIntentId: string, update: OrderUpdate) {
  const admin = getAdminSupabase()
  if (!admin) return { ok: false, error: 'server_not_configured' as const }

  const { error } = await admin
    .from('vendor_orders')
    .update(update)
    .eq('payment_ref', sessionOrIntentId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function POST(req: Request) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!endpointSecret) {
    return NextResponse.json(
      { error: 'stripe_webhook_secret_missing' },
      { status: 503 },
    )
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 })
  }

  // RAW body — must be the exact bytes Stripe signed. `req.text()` returns
  // the body untouched; do NOT call req.json() first because that would
  // re-serialise and invalidate the signature.
  const raw = await req.text()

  // Stripe's constructEvent only needs the SDK constructor to exist —
  // the API key is unused for verification, so a placeholder is safe.
  const stripe = new Stripe('sk_placeholder_for_webhook_verification_only')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, signature, endpointSecret)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'signature_verification_failed' },
      { status: 400 },
    )
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      await applyOrderUpdate(session.id, {
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
      })
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      await applyOrderUpdate(session.id, { payment_status: 'failed' })
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent
      // PaymentIntent.id ≠ session.id, but Stripe Checkout stamps the
      // order id we minted onto the session metadata, which propagates
      // to the PaymentIntent via the Checkout flow — so we look up by
      // metadata.order_id rather than payment_ref here.
      const orderId = (intent.metadata as Record<string, string> | null)?.order_id
      if (orderId) {
        const admin = getAdminSupabase()
        if (admin) {
          await admin
            .from('vendor_orders')
            .update({ payment_status: 'failed' })
            .eq('id', orderId)
        }
      }
    } else {
      // Unknown event — acknowledge with 200 so Stripe stops retrying.
      console.log('[stripe-webhook] unhandled event:', event.type)
    }
  } catch (e) {
    console.error('[stripe-webhook] processing error:', e)
    // Still return 200 — the signature was valid and we don't want
    // Stripe to retry forever on our own bug. Operator dashboard will
    // catch it.
  }

  return NextResponse.json({ received: true })
}
